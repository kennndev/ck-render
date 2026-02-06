import { RailwayClient } from './client'
import { prisma } from '@/lib/prisma'
import { allocatePort } from '@/lib/utils/port-allocator'
import {
  generateOpenClawConfig,
  buildEnvironmentVariables,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'

const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/openclaw/openclaw:latest'

const POLL_INTERVAL_MS = 3000
const DEPLOY_TIMEOUT_MS = 120_000 // 2 minutes
const RAILWAY_COOLDOWN_MAX_MS = 180_000 // 3 minutes
const RAILWAY_COOLDOWN_BASE_DELAY_MS = 5000

interface DeploymentResult {
  instanceId: string
  containerId: string   // Railway service ID
  containerName: string
  port: number          // Unique DB value; not an actual network port
  accessUrl: string     // Railway-assigned public URL
  status: string
}

export async function deployInstance(
  userId: string,
  config: UserConfiguration
): Promise<DeploymentResult> {
  const railway = new RailwayClient()
  const serviceName = `openclaw-${userId}`

  // --- Clean up any pre-existing instance ---
  const existing = await prisma.instance.findUnique({ where: { userId } })
  if (existing) {
    console.log(`⚠️  Cleaning up existing DB instance for user ${userId}...`)
    try {
      if (existing.containerId) {
        await railway.deleteService(existing.containerId)
      }
      await prisma.instance.delete({ where: { id: existing.id } })
      console.log('✅ DB instance cleaned up')
    } catch (err) {
      console.warn('⚠️  DB cleanup error (continuing):', err)
    }
  }

  // --- Also clean up orphaned Railway service by name (in case previous deploy failed mid-way) ---
  try {
    const orphanedServiceId = await railway.findServiceByName(serviceName)
    if (orphanedServiceId) {
      console.log(`⚠️  Found orphaned Railway service ${serviceName}, deleting...`)
      await railway.deleteService(orphanedServiceId)
      console.log('✅ Orphaned service deleted')
    }
  } catch (err) {
    console.warn('⚠️  Orphan cleanup error (continuing):', err)
  }

  // --- Create placeholder DB record ---
  const port = await allocatePort()
  const instance = await prisma.instance.create({
    data: {
      userId,
      containerId: null,  // filled in after Railway service is created
      containerName: serviceName,
      port,
      status: InstanceStatus.DEPLOYING,
    },
  })

  await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Railway service...')

  try {
    // --- Build env vars for the OpenClaw container ---
    const envVars = buildEnvironmentVariables(config)
    const openclawConfig = generateOpenClawConfig(config)
    // Serialized config; the start command writes it to the expected file path
    envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)
    // Gateway token required by OpenClaw (generate a random one per instance)
    const gatewayToken = crypto.randomUUID()
    envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken

    // --- Create Railway service (image + env vars, auto-deploys) ---
    const { id: serviceId } = await railway.createService(
      serviceName,
      OPENCLAW_IMAGE,
      envVars
    )

    // Persist the Railway service ID and gateway token immediately
    try {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { containerId: serviceId, gatewayToken },
      })
    } catch (err) {
      console.warn('⚠️  Failed to persist containerId (will retry later):', err)
    }

    // Small delay to let Railway propagate the new service internally
    await sleep(3000)

    // --- Override start command so the config JSON is written before OpenClaw starts ---
    // The auto-deploy triggered by createService may finish before this update lands;
    // redeployService below ensures the corrected command is actually used.
    //
    // Docker image runs as user "node" (home = /home/node).
    // OpenClaw gateway reads config from ~/.openclaw/openclaw.json by default.
    // We write the config there, then start the gateway.
    // Docker image has no "openclaw" binary in PATH.
    // The image CMD is: node dist/index.js gateway --allow-unconfigured
    // We write config to the default path the gateway reads from.
    const configDir = '/home/node/.openclaw'
    const startCmd =
      `mkdir -p ${configDir} && ` +
      `printf '%s' "$OPENCLAW_CONFIG" > ${configDir}/openclaw.json && ` +
      `exec node dist/index.js gateway --allow-unconfigured`

    await retryRailwayCooldown(
      () => railway.updateServiceInstance(serviceId, { startCommand: startCmd }),
      'updateServiceInstance'
    )
    await retryRailwayCooldown(
      () => railway.redeployService(serviceId),
      'redeployService'
    )

    // --- Poll until the deployment is live ---
    const accessUrl = await waitForDeployment(railway, serviceId)

    // Build internal serviceUrl for API calls (uses Railway's internal networking)
    const serviceUrl = `https://${serviceName}.railway.internal:18789`

    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status: InstanceStatus.RUNNING,
        accessUrl,
        serviceUrl,
        containerId: serviceId
      },
    })

    await logDeployment(instance.id, 'DEPLOY', 'SUCCESS', 'Deployment completed')

    return {
      instanceId: instance.id,
      containerId: serviceId,
      containerName: serviceName,
      port,
      accessUrl,
      status: 'RUNNING',
    }
  } catch (error: any) {
    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: InstanceStatus.ERROR },
    })

    await logDeployment(instance.id, 'DEPLOY', 'FAILED', 'Deployment failed', error.message)
    throw new Error(`Deployment failed: ${error.message}`)
  }
}

async function retryRailwayCooldown<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const startedAt = Date.now()
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase()
      const isRetryable =
        message.includes('too recently updated') ||
        message.includes('rate limit') ||
        message.includes('rate limited') ||
        message.includes('http 400') ||
        message.includes('problem processing request')

      if (!isRetryable) throw error

      const elapsed = Date.now() - startedAt
      if (elapsed >= RAILWAY_COOLDOWN_MAX_MS) {
        throw new Error(`[Railway] ${label} blocked by cooldown for >3 minutes`)
      }

      attempt += 1
      const delay = Math.min(
        RAILWAY_COOLDOWN_BASE_DELAY_MS * attempt,
        20_000
      )
      console.warn(
        `[Railway] ${label} blocked by cooldown; retry ${attempt} in ${delay}ms`
      )
      await sleep(delay)
    }
  }
}

/**
 * Poll Railway until the latest deployment reaches a terminal state.
 * Returns the public URL on SUCCESS.
 */
async function waitForDeployment(
  railway: RailwayClient,
  serviceId: string
): Promise<string> {
  const deadline = Date.now() + DEPLOY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const deployment = await railway.getLatestDeployment(serviceId)

    if (!deployment) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    console.log(`  [Railway] deployment ${deployment.id} → ${deployment.status}`)

    switch (deployment.status) {
      case 'SUCCESS':
        return deployment.url || ''

      case 'FAILED':
      case 'CRASHED': {
        let logSnippet = ''
        try {
          const logs = await railway.getLogs(deployment.id, 30)
          logSnippet = logs.map(l => `[${l.severity}] ${l.message}`).join('\n')
        } catch { /* best-effort */ }
        throw new Error(`Railway deployment ${deployment.status}.\n${logSnippet}`)
      }
    }

    // BUILDING / DEPLOYING / other transient states — keep polling
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Deployment timed out (2 min)')
}

async function ensureContainerId(
  railway: RailwayClient,
  instance: { id: string; containerId: string | null; containerName: string | null }
): Promise<string> {
  if (instance.containerId) return instance.containerId
  if (!instance.containerName) throw new Error('Instance has no container name')

  const found = await railway.findServiceByName(instance.containerName)
  if (!found) throw new Error('Railway service not found for instance')

  await prisma.instance.update({
    where: { id: instance.id },
    data: { containerId: found },
  })

  return found
}

export async function stopInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)
  if (!deployment) throw new Error('No active deployment found')

  await railway.removeDeployment(deployment.id)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.STOPPED },
  })

  await logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
}

export async function startInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  await railway.redeployService(containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
}

export async function restartInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RESTARTING },
  })

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)

  if (deployment && deployment.status === 'SUCCESS') {
    await railway.restartDeployment(deployment.id)
  } else {
    await railway.redeployService(containerId)
  }

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
}

export async function getInstanceLogs(instanceId: string, tail = 100): Promise<string> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)
  if (!deployment) return 'No deployments found.'

  const logs = await railway.getLogs(deployment.id, tail)
  return logs.map(l => `[${l.timestamp}] [${l.severity}] ${l.message}`).join('\n')
}

export async function checkInstanceHealth(instanceId: string): Promise<boolean> {
  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) return false

    const railway = new RailwayClient()
    const containerId = await ensureContainerId(railway, instance)
    const deployment = await railway.getLatestDeployment(containerId)
    const isHealthy = deployment?.status === 'SUCCESS'

    await prisma.instance.update({
      where: { id: instanceId },
      data: {
        lastHealthCheck: new Date(),
        status: isHealthy ? InstanceStatus.RUNNING : InstanceStatus.ERROR,
      },
    })

    return isHealthy
  } catch {
    return false
  }
}

async function logDeployment(
  instanceId: string,
  action: string,
  status: string,
  message: string,
  error?: string
): Promise<void> {
  await prisma.deploymentLog.create({
    data: { instanceId, action, status, message, error },
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
