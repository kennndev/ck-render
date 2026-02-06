# Kainat - Architecture & Configuration Reference

## System Architecture

```
User Browser
    |
    v
Next.js SaaS App (Vercel / self-hosted)
    |
    |--- NextAuth (JWT sessions)
    |--- Prisma ORM ---> PostgreSQL
    |--- Stripe API (payments)
    |--- Railway API (deployments)
          |
          v
    Railway Project
    +---------------------------+
    | Service: openclaw-{userId}|  (isolated per user)
    | Image: openclaw:latest    |
    | Env: ANTHROPIC_API_KEY,   |
    |      TELEGRAM_TOKEN, ...  |
    | Config: openclaw.json     |
    +---------------------------+
    +---------------------------+
    | Service: openclaw-{userId}|  (another user)
    +---------------------------+
    ...
```

### Flow

1. User registers and completes 6-step onboarding
2. Config stored as `pendingConfig` JSON on User model
3. Stripe checkout (or free tier direct deploy)
4. Webhook triggers `deployToRailway()` in `lib/railway/deploy.ts`
5. `buildOpenClawConfig()` generates OpenClaw JSON from user selections
6. `buildEnvironmentVariables()` creates env vars (provider keys, channel tokens)
7. Railway API creates a new service with the OpenClaw Docker image
8. Instance record created with `accessUrl` for API proxy
9. Dashboard polls status and proxies management requests

---

## Pricing Tiers

| Plan | Price | Messages | Channels | Features |
|------|-------|----------|----------|----------|
| FREE | $0 | 100/month | 1 | Basic model, no skills |
| Monthly | $29/mo | Unlimited | All 17 | All features |
| 3 Months | $75 ($25/mo) | Unlimited | All 17 | All features, 13% savings |
| Yearly | $299 ($24.92/mo) | Unlimited | All 17 | All features, 14% savings |

---

## Supported Channels (17)

### Popular
| Channel | Key Config | Notes |
|---------|-----------|-------|
| WhatsApp | QR code pairing | Via Baileys, no API key needed |
| Telegram | Bot Token | From @BotFather |
| Discord | Bot Token + App ID | Discord Developer Portal |
| WebChat | Embeddable widget | Theme + position customization |

### Enterprise
| Channel | Key Config | Notes |
|---------|-----------|-------|
| Slack | Bot OAuth + App Token | Slack API portal |
| MS Teams | App ID + Password | Azure Bot Framework |
| Google Chat | Service Account JSON | Google Cloud Console |
| LINE | Channel Access Token + Secret | LINE Developers |
| Feishu/Lark | App ID + Secret | Feishu Open Platform |
| Mattermost | Bot Token + Server URL | Self-hosted compatible |

### Privacy-Focused
| Channel | Key Config | Notes |
|---------|-----------|-------|
| Signal | Phone number | Via signal-cli |
| Matrix | Homeserver URL + Access Token | Any Matrix server |
| Nostr | Private Key | Decentralized protocol |
| Nextcloud Talk | Server URL + credentials | Self-hosted |

### Developer / Niche
| Channel | Key Config | Notes |
|---------|-----------|-------|
| Twitch | Bot Username + OAuth Token | Twitch Developer Console |
| Zalo | App ID + Secret Key | Zalo Developers |
| iMessage | BlueBubbles Server URL + Password | Requires macOS + BlueBubbles |

---

## AI Providers (5)

| Provider | Models | Config |
|----------|--------|--------|
| Anthropic | Claude Opus 4.5, Claude Sonnet 4.5 | API key |
| OpenAI | GPT-5.2, GPT-5.2 Mini | API key |
| OpenRouter | 100+ models from multiple providers | API key |
| Amazon Bedrock | Claude, Titan, Llama via AWS | Access Key + Secret + Region |
| Vercel AI Gateway | Aggregated provider access | API key + Gateway URL |

Model failover is supported: set a primary model and an automatic fallback.

---

## Skills

| Skill | Description | Requires |
|-------|-------------|----------|
| Web Search | Search the internet | Brave API key |
| Browser | Automated web browsing | - |
| Memory/RAG | Long-term memory and document retrieval | - |
| TTS | Text-to-speech voice responses | ElevenLabs API key |
| Canvas | Visual workspace for diagrams | - |
| Cron Scheduler | Scheduled tasks and reminders | - |
| Code Execution | Run code snippets | - |
| PDF Reader | Parse and understand PDFs | - |
| GitHub | Interact with GitHub repos | GitHub token |
| Notion | Read/write Notion pages | Notion API key |
| Email | Send and receive emails | SMTP credentials |
| Weather | Weather lookups | Weather API key |

---

## Database Schema

### Core Models

```
User (id, email, name, password, pendingConfig)
  |-- Subscription (plan, status, stripeCustomerId, messagesUsed, messagesLimit)
  |-- Instance (containerId, containerName, port, status, accessUrl)
  |     |-- Configuration (provider, model, failoverModel, agentName, systemPrompt, ...)
  |     |     |-- Channel[] (type, enabled, config JSON)
  |     |-- UsageLog[] (channel, direction, tokensUsed, responseMs)
  |-- ApiKey[] (name, key, lastUsedAt, expiresAt)

Organization (name, slug, ownerId)
  |-- TeamMember[] (userId, email, role: ADMIN/EDITOR/VIEWER)

DeploymentLog (instanceId, action, status, message, error)
```

### Key Enums

- **Plan**: FREE, MONTHLY, THREE_MONTH, YEARLY
- **AIProvider**: ANTHROPIC, OPENAI, OPENROUTER, BEDROCK, VERCEL
- **ChannelType**: 18 values (WHATSAPP through NEXTCLOUD_TALK)
- **InstanceStatus**: DEPLOYING, RUNNING, STOPPED, ERROR, RESTARTING
- **TeamRole**: ADMIN, EDITOR, VIEWER
- **MessageDirection**: INBOUND, OUTBOUND

---

## API Routes

### Auth
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handler |
| `/api/auth/register` | POST | User registration |

### Payments
| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe events, trigger deploy |

### Instance Management
| Route | Method | Description |
|-------|--------|-------------|
| `/api/instance/status` | GET | Instance + subscription status |
| `/api/instance/start` | POST | Start Railway service |
| `/api/instance/stop` | POST | Stop Railway service |
| `/api/instance/restart` | POST | Restart Railway service |
| `/api/instance/logs` | GET | Stream instance logs |
| `/api/instance/deploy-free` | POST | Deploy free tier (no Stripe) |
| `/api/instance/config` | GET/PATCH | Read/update config with auto-redeploy |
| `/api/instance/channels` | GET/POST/DELETE | Post-deploy channel management |
| `/api/instance/sessions` | GET/DELETE | Session management (proxy) |
| `/api/instance/cron` | GET/POST/PATCH/DELETE | Cron job CRUD (proxy) |
| `/api/instance/webhooks` | GET/POST/DELETE | Webhook endpoint CRUD (proxy) |
| `/api/instance/agents` | GET/PUT | Multi-agent configuration |
| `/api/instance/skills` | POST/DELETE | Skill install/uninstall |
| `/api/instance/knowledge` | GET/POST/DELETE | Knowledge base documents |
| `/api/instance/usage` | GET | Usage analytics data |

### Teams
| Route | Method | Description |
|-------|--------|-------------|
| `/api/team` | GET | List user's organizations |
| `/api/team` | POST | Actions: create-org, invite, remove-member, update-role |

### Developer API (v1)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/keys` | GET/POST/DELETE | API key management |
| `/api/v1/instances` | GET | Instance status via API key |
| `/api/v1/instances` | POST | Control instance (start/stop/restart) |

---

## OpenClaw Config Generation

The `lib/openclaw/config-builder.ts` file transforms user selections into an OpenClaw JSON config:

```typescript
buildOpenClawConfig(config) -> {
  agents: {
    defaults: {
      model: { primary, failover },
      workspace, agentName, systemPrompt, thinkingMode
    }
  },
  channels: {
    whatsapp: { enabled, allowFrom },
    telegram: { enabled, botToken },
    discord: { enabled, botToken, appId },
    // ... all 17 channels
  },
  tools: {
    web: { search: { enabled, apiKey } },
    browser: { enabled },
    tts: { enabled, apiKey },
    // ...
  },
  sessions: { mode },
  security: { dmPolicy }
}
```

`buildEnvironmentVariables(config)` generates the flat env var map for Railway deployment.

---

## Security

| Area | Implementation |
|------|----------------|
| API key storage | AES-256-GCM encryption (`lib/utils/encryption.ts`) |
| Passwords | bcrypt with 10 salt rounds |
| Sessions | NextAuth JWT tokens |
| Payments | Stripe PCI compliance, webhook signature verification |
| Instance isolation | Separate Railway services per user |
| Developer API | `knt_` prefixed keys with expiry, per-request lastUsedAt tracking |
| Team access | Role-based (ADMIN/EDITOR/VIEWER), owner-only for destructive actions |

---

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_THREE_MONTH="price_..."
STRIPE_PRICE_YEARLY="price_..."
ENCRYPTION_KEY="<64-char hex string>"
RAILWAY_API_TOKEN="..."
RAILWAY_PROJECT_ID="..."
```

---

**Version:** 2.0.0
**Last Updated:** 2026-02-06
