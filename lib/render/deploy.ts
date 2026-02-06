import { RenderClient } from './client'
import { prisma } from '@/lib/prisma'
import { allocatePort } from '@/lib/utils/port-allocator'
import {
  generateOpenClawConfig,
  buildEnvironmentVariables,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'

const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/openclaw/openclaw:latest'

interface DeploymentResult {
  instanceId: string
  serviceId: string
  serviceName: string
  port: number
  accessUrl: string
  shellUrl: string
  status: string
}

export async function deployInstance(
  userId: string,
  config: UserConfiguration
): Promise<DeploymentResult> {
  const render = new RenderClient()
  const serviceName = `openclaw-${userId.slice(0, 8)}`

  // --- Clean up any pre-existing instance ---
  const existing = await prisma.instance.findUnique({ where: { userId } })
  if (existing) {
    console.log(`⚠️  Cleaning up existing instance for user ${userId}...`)
    try {
      if (existing.containerId) {
        await render.deleteService(existing.containerId)
      }
      await prisma.instance.delete({ where: { id: existing.id } })
      console.log('✅ Existing instance cleaned up')
    } catch (err) {
      console.warn('⚠️  Cleanup error (continuing):', err)
    }
  }

  // --- Create placeholder DB record ---
  const port = await allocatePort()
  const instance = await prisma.instance.create({
    data: {
      userId,
      containerId: null,
      containerName: serviceName,
      port,
      status: InstanceStatus.DEPLOYING,
    },
  })

  await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Render service...')

  try {
    // --- Generate OpenClaw config ---
    const openclawConfig = generateOpenClawConfig(config)
    const envVars = buildEnvironmentVariables(config)

    // Generate gateway token
    const gatewayToken = crypto.randomUUID()

    // --- Prepare environment variables ---
    const env: Record<string, string> = {
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
      OPENCLAW_CONFIG: JSON.stringify(openclawConfig),
      NODE_ENV: 'production',
      OPENCLAW_WORKSPACE: '/home/node/.openclaw/workspace',
      ...envVars, // AI provider keys, channel tokens, etc.
    }

    // Start command: Write config to file, then start gateway
    const startCommand =
      'mkdir -p /home/node/.openclaw && ' +
      'echo "$OPENCLAW_CONFIG" > /home/node/.openclaw/openclaw.json && ' +
      'node dist/index.js gateway'

    // --- Create Render service ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Render service...')

    const service = await render.createService({
      name: serviceName,
      image: OPENCLAW_IMAGE,
      env,
      startCommand,
      plan: 'starter', // Free tier
      region: 'oregon', // US West
    })

    // Store service ID and gateway token
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        containerId: service.id,
        gatewayToken,
      },
    })

    // --- Wait for deployment to complete ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Waiting for deployment...')

    // Render auto-deploys on service creation
    // We need to wait for it to become live
    await sleep(10000) // Give Render time to start deployment

    // Poll service status
    let attempts = 0
    const maxAttempts = 60 // 5 minutes
    let serviceUrl = ''

    while (attempts < maxAttempts) {
      const updatedService = await render.getService(service.id)

      if (updatedService.serviceDetails.url) {
        serviceUrl = updatedService.serviceDetails.url
        console.log(`✅ Render service is live!`)
        break
      }

      console.log(`[Render] Waiting for service to become live (attempt ${attempts + 1}/${maxAttempts})`)
      await sleep(5000)
      attempts++
    }

    if (!serviceUrl) {
      serviceUrl = `https://${serviceName}.onrender.com`
      console.warn('⚠️  Service URL not available yet, using default')
    }

    const accessUrl = serviceUrl
    const shellUrl = render.getShellUrl(service.id)

    console.log(`✅ Render deployment complete!`)
    console.log(`   Service ID: ${service.id}`)
    console.log(`   Access URL: ${accessUrl}`)
    console.log(`   Shell URL: ${shellUrl}`)

    // --- Health check ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Verifying OpenClaw Gateway...')

    // Wait for gateway to fully start
    await sleep(20000)

    let healthOk = false
    try {
      const healthResponse = await fetch(`${accessUrl}/health`, {
        headers: { Authorization: `Bearer ${gatewayToken}` },
        signal: AbortSignal.timeout(10000),
      })

      healthOk = healthResponse.ok

      if (healthOk) {
        console.log('✅ Gateway health check passed')
      } else {
        console.warn(`⚠️  Gateway health check returned ${healthResponse.status}`)
      }
    } catch (err) {
      console.warn('⚠️  Gateway health check failed:', err)
      // Don't throw - deployment record is created, user can debug
    }

    // --- Update instance status ---
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status: healthOk ? InstanceStatus.RUNNING : InstanceStatus.ERROR,
        accessUrl,
        serviceUrl: shellUrl, // Store shell URL in serviceUrl field
        containerId: service.id,
      },
    })

    await logDeployment(
      instance.id,
      'DEPLOY',
      healthOk ? 'SUCCESS' : 'PARTIAL',
      healthOk ? 'Deployment completed' : 'Deployment completed but health check failed'
    )

    return {
      instanceId: instance.id,
      serviceId: service.id,
      serviceName,
      port,
      accessUrl,
      shellUrl,
      status: healthOk ? 'RUNNING' : 'ERROR',
    }
  } catch (error: any) {
    console.error('❌ Deployment failed:', error)

    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: InstanceStatus.ERROR },
    })

    await logDeployment(instance.id, 'DEPLOY', 'FAILED', 'Deployment failed', error.message)

    throw new Error(`Deployment failed: ${error.message}`)
  }
}

export async function stopInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId) {
    throw new Error('Instance missing Render service ID')
  }

  const render = new RenderClient()
  await render.suspendService(instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.STOPPED },
  })

  await logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
}

export async function startInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId) {
    throw new Error('Instance missing Render service ID')
  }

  const render = new RenderClient()
  await render.resumeService(instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
}

export async function restartInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId) {
    throw new Error('Instance missing Render service ID')
  }

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RESTARTING },
  })

  const render = new RenderClient()
  await render.restartService(instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
}

export async function getInstanceLogs(instanceId: string, tail = 100): Promise<string> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  // Render doesn't have a logs API endpoint in the public API
  // Users should use the Render dashboard or shell
  return `Logs are available in the Render dashboard:\n${instance.serviceUrl || 'https://dashboard.render.com'}`
}

export async function checkInstanceHealth(instanceId: string): Promise<boolean> {
  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) return false

    if (!instance.containerId) {
      return false
    }

    const render = new RenderClient()
    const service = await render.getService(instance.containerId)

    // Check if service is suspended or has issues
    const isHealthy =
      service.suspended === 'not_suspended' &&
      service.serviceDetails.url !== undefined

    await prisma.instance.update({
      where: { id: instanceId },
      data: {
        lastHealthCheck: new Date(),
        status: isHealthy ? InstanceStatus.RUNNING : InstanceStatus.ERROR,
      },
    })

    return isHealthy
  } catch (error) {
    console.error('Health check failed:', error)
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
