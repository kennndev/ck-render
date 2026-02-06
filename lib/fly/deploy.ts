import { FlyClient } from './client'
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
  machineId: string       // Fly.io machine ID
  appName: string
  port: number            // Unique DB value (not actual network port)
  accessUrl: string       // Public Fly.io URL
  status: string
}

export async function deployInstance(
  userId: string,
  config: UserConfiguration
): Promise<DeploymentResult> {
  const fly = new FlyClient()
  const appName = `openclaw-${userId.slice(0, 8)}-${Date.now().toString(36)}`

  // --- Clean up any pre-existing instance ---
  const existing = await prisma.instance.findUnique({ where: { userId } })
  if (existing) {
    console.log(`⚠️  Cleaning up existing instance for user ${userId}...`)
    try {
      if (existing.containerId) {
        // containerId stores the machineId, containerName stores appName
        if (existing.containerName) {
          const machines = await fly.listMachines(existing.containerName)
          for (const machine of machines) {
            await fly.deleteMachine(existing.containerName, machine.id)
          }
          await fly.deleteApp(existing.containerName)
        }
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
      containerId: null,      // Will be filled with machineId
      containerName: appName, // Fly.io app name
      port,
      status: InstanceStatus.DEPLOYING,
    },
  })

  await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Fly.io app...')

  try {
    // --- Verify Fly.io access ---
    await fly.verifyAccess()

    // --- Create Fly.io app ---
    console.log(`[Deploy] Creating Fly.io app: ${appName}`)
    await fly.createApp(appName)

    // --- Generate OpenClaw config ---
    const openclawConfig = generateOpenClawConfig(config)
    const envVars = buildEnvironmentVariables(config)

    // Generate gateway token
    const gatewayToken = crypto.randomUUID()

    // --- Set secrets (encrypted env vars) ---
    const secrets: Record<string, string> = {
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
      ...envVars, // AI provider keys, channel tokens, etc.
    }

    await fly.setSecrets(appName, secrets)

    // Store gateway token in database
    await prisma.instance.update({
      where: { id: instance.id },
      data: { gatewayToken },
    })

    // --- Prepare machine configuration ---
    // OpenClaw will read config from file or env var
    // We'll pass config as JSON in env var for simplicity
    const machineEnv = {
      OPENCLAW_CONFIG: JSON.stringify(openclawConfig),
      NODE_ENV: 'production',
      OPENCLAW_WORKSPACE: '/home/node/.openclaw/workspace',
    }

    // Start command: Write config to file, then start gateway
    const startCmd = [
      '/bin/sh',
      '-c',
      'mkdir -p /home/node/.openclaw && ' +
      'echo "$OPENCLAW_CONFIG" > /home/node/.openclaw/openclaw.json && ' +
      'exec node dist/index.js gateway'
    ]

    // --- Create machine ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Fly.io machine...')

    const machine = await fly.createMachine(appName, {
      image: OPENCLAW_IMAGE,
      env: machineEnv,
      cmd: startCmd,
      region: 'iad', // US East - change as needed
      guest: {
        cpus: 1,
        memory_mb: 512,
        cpu_kind: 'shared',
      },
      services: [
        {
          protocol: 'tcp',
          internal_port: 18789,
          ports: [
            {
              port: 443,
              handlers: ['http', 'tls'],
            },
            {
              port: 80,
              handlers: ['http'],
            },
          ],
          auto_stop_machines: false,
          auto_start_machines: true,
        },
      ],
    })

    // Update instance with machine ID
    await prisma.instance.update({
      where: { id: instance.id },
      data: { containerId: machine.id },
    })

    // --- Wait for machine to start ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Waiting for machine to start...')
    await fly.waitForMachineState(appName, machine.id, 'started', 120000)

    // --- Allocate public IP (for external access) ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Allocating public IP...')
    await fly.allocateIPAddress(appName, 'v6')

    // Wait a bit for DNS to propagate
    await sleep(10000)

    // --- Build access URL ---
    const accessUrl = fly.getAppUrl(appName)

    console.log(`✅ Fly.io deployment complete!`)
    console.log(`   App Name: ${appName}`)
    console.log(`   Machine ID: ${machine.id}`)
    console.log(`   Access URL: ${accessUrl}`)

    // --- Health check ---
    await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Verifying OpenClaw Gateway...')

    // Wait for gateway to fully start
    await sleep(15000)

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
        containerId: machine.id,
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
      machineId: machine.id,
      appName,
      port,
      accessUrl,
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

  if (!instance.containerId || !instance.containerName) {
    throw new Error('Instance missing Fly.io identifiers')
  }

  const fly = new FlyClient()
  await fly.stopMachine(instance.containerName, instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.STOPPED },
  })

  await logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
}

export async function startInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId || !instance.containerName) {
    throw new Error('Instance missing Fly.io identifiers')
  }

  const fly = new FlyClient()
  await fly.startMachine(instance.containerName, instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
}

export async function restartInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId || !instance.containerName) {
    throw new Error('Instance missing Fly.io identifiers')
  }

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RESTARTING },
  })

  const fly = new FlyClient()
  await fly.restartMachine(instance.containerName, instance.containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
}

export async function getInstanceLogs(instanceId: string, tail = 100): Promise<string> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  if (!instance.containerId || !instance.containerName) {
    throw new Error('Instance missing Fly.io identifiers')
  }

  const fly = new FlyClient()
  return await fly.getMachineLogs(instance.containerName, instance.containerId, tail)
}

export async function checkInstanceHealth(instanceId: string): Promise<boolean> {
  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) return false

    if (!instance.containerId || !instance.containerName) {
      return false
    }

    const fly = new FlyClient()
    const machine = await fly.getMachine(instance.containerName, instance.containerId)

    const isHealthy = machine.state === 'started' || machine.state === 'running'

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
