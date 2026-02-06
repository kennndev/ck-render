import { AIProvider, ChannelType } from '@prisma/client'

export interface UserConfiguration {
  provider: AIProvider
  apiKey: string
  model?: string
  failoverModel?: string
  channels: {
    type: ChannelType
    config: Record<string, any>
  }[]
  webSearchEnabled?: boolean
  braveApiKey?: string
  browserEnabled?: boolean
  ttsEnabled?: boolean
  elevenlabsApiKey?: string
  canvasEnabled?: boolean
  cronEnabled?: boolean
  memoryEnabled?: boolean
  workspace?: string
  agentName?: string
  systemPrompt?: string
  thinkingMode?: string
  sessionMode?: string
  dmPolicy?: string
}

/** Coerce a value that may be a comma-separated string or an array into a string[] */
function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

const defaultModels: Record<string, string> = {
  ANTHROPIC: 'anthropic/claude-opus-4-5',
  OPENAI: 'openai/gpt-5.2',
  OPENROUTER: 'anthropic/claude-opus-4-5',
  BEDROCK: 'bedrock/anthropic.claude-opus-4-5',
  VERCEL: 'vercel/anthropic/claude-opus-4-5',
}

export function generateOpenClawConfig(userConfig: UserConfiguration) {
  const primaryModel = userConfig.model || defaultModels[userConfig.provider] || 'anthropic/claude-opus-4-5'

  const config: any = {
    agents: {
      defaults: {
        workspace: userConfig.workspace || '~/.openclaw/workspace',
        model: {
          primary: primaryModel,
          ...(userConfig.failoverModel && { failover: userConfig.failoverModel })
        }
      }
    },
    channels: {},
    gateway: {
      port: 18789,
      bind: "lan",  // ✅ CRITICAL: Bind to 0.0.0.0 for Docker containers
      auth: {
        token: "${OPENCLAW_GATEWAY_TOKEN}"  // Reference env var
      },
      http: {
        endpoints: {
          chatCompletions: { enabled: true },
        },
      },
    },
    tools: {
      web: {
        search: {
          enabled: userConfig.webSearchEnabled || false,
          ...(userConfig.braveApiKey && { apiKey: "${BRAVE_API_KEY}" })  // Use env var ref
        }
      }
    }
  }

  // Add agent name/identity
  if (userConfig.agentName) {
    config.agents.defaults.identity = {
      name: userConfig.agentName
    }
  }

  // Add system prompt
  if (userConfig.systemPrompt) {
    config.agents.defaults.systemPrompt = userConfig.systemPrompt
  }

  // Add thinking mode
  if (userConfig.thinkingMode) {
    config.agents.defaults.thinking = userConfig.thinkingMode
  }

  // Add session settings
  if (userConfig.sessionMode) {
    config.session = {
      mode: userConfig.sessionMode
    }
  }

  // Configure channels
  userConfig.channels.forEach(channel => {
    switch (channel.type) {
      case 'WHATSAPP': {
        const dmPolicy = channel.config.dmPolicy || userConfig.dmPolicy || 'pairing'
        const groupPolicy = channel.config.groupPolicy || 'allowlist'
        const groups = toArray(channel.config.groups)
        const groupsConfig: any = {}
        if (groupPolicy === 'open') {
          groupsConfig['*'] = { requireMention: channel.config.requireMention || false }
        } else if (groups.length > 0) {
          for (const g of groups) {
            groupsConfig[g] = { requireMention: channel.config.requireMention || false }
          }
        }
        config.channels.whatsapp = {
          enabled: true,
          dmPolicy,
          allowFrom: toArray(channel.config.allowlist),
          ...(Object.keys(groupsConfig).length > 0 && { groups: groupsConfig })
        }
        break
      }

      case 'TELEGRAM': {
        const dmPolicy = channel.config.dmPolicy || userConfig.dmPolicy || 'pairing'
        const groupPolicy = channel.config.groupPolicy || 'allowlist'
        const groups = toArray(channel.config.groups)
        const groupsConfig: any = {}
        if (groupPolicy === 'open') {
          groupsConfig['*'] = { requireMention: channel.config.requireMention || false }
        } else if (groups.length > 0) {
          for (const g of groups) {
            groupsConfig[g] = { requireMention: channel.config.requireMention || false }
          }
        }
        config.channels.telegram = {
          enabled: true,
          botToken: "${TELEGRAM_BOT_TOKEN}",  // ✅ Use env var reference
          dmPolicy,
          allowFrom: toArray(channel.config.allowlist),
          ...(Object.keys(groupsConfig).length > 0 && { groups: groupsConfig })
        }
        break
      }

      case 'DISCORD': {
        const dmPolicy = channel.config.dmPolicy || userConfig.dmPolicy || 'pairing'
        const groupPolicy = channel.config.groupPolicy || 'allowlist'
        const guilds = toArray(channel.config.groups)
        const guildsConfig: any = {}
        if (groupPolicy === 'open') {
          guildsConfig['*'] = { requireMention: channel.config.requireMention || false }
        } else if (guilds.length > 0) {
          for (const g of guilds) {
            guildsConfig[g] = { requireMention: channel.config.requireMention || false }
          }
        }
        config.channels.discord = {
          enabled: true,
          token: "${DISCORD_TOKEN}",  // ✅ Use env var reference
          applicationId: "${DISCORD_APPLICATION_ID}",  // ✅ Use env var reference
          dm: {
            policy: dmPolicy,
            allowFrom: toArray(channel.config.allowlist)
          },
          ...(Object.keys(guildsConfig).length > 0 && { guilds: guildsConfig })
        }
        break
      }

      case 'SLACK': {
        const dmPolicy = channel.config.dmPolicy || userConfig.dmPolicy || 'pairing'
        config.channels.slack = {
          enabled: true,
          botToken: channel.config.botToken,
          appToken: channel.config.appToken,
          dm: {
            policy: dmPolicy,
            allowFrom: toArray(channel.config.allowlist)
          }
        }
        break
      }

      case 'SIGNAL': {
        const dmPolicy = channel.config.dmPolicy || userConfig.dmPolicy || 'pairing'
        config.channels.signal = {
          enabled: true,
          phoneNumber: channel.config.phoneNumber,
          dmPolicy,
          allowFrom: toArray(channel.config.allowlist)
        }
        break
      }

      case 'GOOGLE_CHAT':
        config.channels.googlechat = {
          enabled: true,
          serviceAccount: channel.config.serviceAccount
        }
        break

      case 'MATRIX':
        config.channels.matrix = {
          enabled: true,
          homeserverUrl: channel.config.homeserverUrl,
          accessToken: channel.config.accessToken,
          userId: channel.config.userId
        }
        break

      case 'MSTEAMS':
        config.channels.msteams = {
          enabled: true,
          appId: channel.config.appId,
          appPassword: channel.config.appPassword
        }
        break

      case 'LINE':
        config.channels.line = {
          enabled: true,
          channelAccessToken: channel.config.channelAccessToken,
          channelSecret: channel.config.channelSecret
        }
        break

      case 'FEISHU':
        config.channels.feishu = {
          enabled: true,
          appId: channel.config.appId,
          appSecret: channel.config.appSecret
        }
        break

      case 'MATTERMOST':
        config.channels.mattermost = {
          enabled: true,
          url: channel.config.url,
          token: channel.config.token
        }
        break

      case 'WEBCHAT':
        config.channels.webchat = {
          enabled: true
        }
        break

      case 'NOSTR':
        config.channels.nostr = {
          enabled: true,
          privateKey: channel.config.privateKey
        }
        break

      case 'TWITCH':
        config.channels.twitch = {
          enabled: true,
          username: channel.config.username,
          oauthToken: channel.config.oauthToken,
          channels: toArray(channel.config.channels)
        }
        break

      case 'ZALO':
        config.channels.zalo = {
          enabled: true,
          oaId: channel.config.oaId,
          accessToken: channel.config.accessToken
        }
        break

      case 'BLUEBUBBLES':
        config.channels.bluebubbles = {
          enabled: true,
          serverUrl: channel.config.serverUrl,
          password: channel.config.password
        }
        break

      case 'NEXTCLOUD_TALK':
        config.channels.nextcloudtalk = {
          enabled: true,
          serverUrl: channel.config.serverUrl,
          username: channel.config.username,
          password: channel.config.password
        }
        break
    }
  })

  // Add skills configuration
  config.skills = {
    entries: {}
  }

  if (userConfig.ttsEnabled && userConfig.elevenlabsApiKey) {
    config.tts = {
      enabled: true,
      provider: 'elevenlabs',
      elevenlabs: {
        apiKey: userConfig.elevenlabsApiKey
      }
    }
  }

  if (userConfig.browserEnabled) {
    config.browser = {
      enabled: true
    }
  }

  if (userConfig.canvasEnabled) {
    config.canvas = {
      enabled: true
    }
  }

  if (userConfig.cronEnabled) {
    config.cron = {
      enabled: true
    }
  }

  if (userConfig.memoryEnabled) {
    config.memory = {
      enabled: true
    }
  }

  return config
}

export function buildEnvironmentVariables(userConfig: UserConfiguration): Record<string, string> {
  const env: Record<string, string> = {}

  // Add AI provider API key based on provider type
  switch (userConfig.provider) {
    case 'ANTHROPIC':
      env.ANTHROPIC_API_KEY = userConfig.apiKey
      break
    case 'OPENAI':
      env.OPENAI_API_KEY = userConfig.apiKey
      break
    case 'OPENROUTER':
      env.OPENROUTER_API_KEY = userConfig.apiKey
      break
    case 'BEDROCK':
      env.AWS_ACCESS_KEY_ID = userConfig.apiKey
      break
    case 'VERCEL':
      env.VERCEL_AI_API_KEY = userConfig.apiKey
      break
  }

  // Add channel-specific tokens
  userConfig.channels.forEach(channel => {
    switch (channel.type) {
      case 'TELEGRAM':
        if (channel.config.botToken) env.TELEGRAM_BOT_TOKEN = channel.config.botToken
        break
      case 'DISCORD':
        if (channel.config.token) env.DISCORD_TOKEN = channel.config.token
        if (channel.config.applicationId) env.DISCORD_APPLICATION_ID = channel.config.applicationId
        break
      case 'SLACK':
        if (channel.config.botToken) env.SLACK_BOT_TOKEN = channel.config.botToken
        if (channel.config.appToken) env.SLACK_APP_TOKEN = channel.config.appToken
        break
      case 'LINE':
        if (channel.config.channelAccessToken) env.LINE_CHANNEL_ACCESS_TOKEN = channel.config.channelAccessToken
        if (channel.config.channelSecret) env.LINE_CHANNEL_SECRET = channel.config.channelSecret
        break
      case 'FEISHU':
        if (channel.config.appId) env.FEISHU_APP_ID = channel.config.appId
        if (channel.config.appSecret) env.FEISHU_APP_SECRET = channel.config.appSecret
        break
      case 'MATTERMOST':
        if (channel.config.token) env.MATTERMOST_TOKEN = channel.config.token
        break
    }
  })

  // Add skill API keys
  if (userConfig.braveApiKey) {
    env.BRAVE_API_KEY = userConfig.braveApiKey
  }

  if (userConfig.elevenlabsApiKey) {
    env.ELEVENLABS_API_KEY = userConfig.elevenlabsApiKey
  }

  return env
}
