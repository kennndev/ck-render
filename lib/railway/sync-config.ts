import { prisma } from '@/lib/prisma'
import { RailwayClient } from './client'
import { generateOpenClawConfig, buildEnvironmentVariables } from '@/lib/openclaw/config-builder'

/**
 * Rebuild OpenClaw config from DB and push it to the running Railway container.
 * This updates the OPENCLAW_CONFIG env var and redeploys the service.
 * Call this after any config/channel change from the dashboard.
 */
export async function syncConfigToRailway(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
    include: {
      config: {
        include: { channels: true }
      }
    }
  })

  if (!instance?.containerId || !instance.config) {
    console.warn('[syncConfig] No containerId or config, skipping')
    return
  }

  const config = instance.config
  const userConfig = {
    provider: config.provider as any,
    apiKey: config.apiKey,
    model: config.model,
    failoverModel: config.failoverModel || undefined,
    channels: config.channels
      .filter(ch => ch.enabled)
      .map(ch => ({
        type: ch.type as any,
        config: ch.config as Record<string, any>,
      })),
    webSearchEnabled: config.webSearchEnabled,
    braveApiKey: config.braveApiKey || undefined,
    browserEnabled: config.browserEnabled,
    ttsEnabled: config.ttsEnabled,
    elevenlabsApiKey: config.elevenlabsApiKey || undefined,
    canvasEnabled: config.canvasEnabled,
    cronEnabled: config.cronEnabled,
    memoryEnabled: config.memoryEnabled,
    agentName: config.agentName || undefined,
    systemPrompt: config.systemPrompt || undefined,
    thinkingMode: config.thinkingMode,
    sessionMode: config.sessionMode,
    dmPolicy: config.dmPolicy,
  }

  const openclawConfig = generateOpenClawConfig(userConfig)
  const envVars = buildEnvironmentVariables(userConfig)
  envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)

  // Keep the existing gateway token
  if (instance.gatewayToken) {
    envVars.OPENCLAW_GATEWAY_TOKEN = instance.gatewayToken
  }

  const railway = new RailwayClient()
  await railway.setVariables(instance.containerId, envVars)
  await railway.redeployService(instance.containerId)

  console.log(`[syncConfig] Pushed config and redeployed instance ${instanceId}`)
}
