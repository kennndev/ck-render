# Kainat SaaS - OpenClaw AI Agent Deployment Platform

One-click AI assistant deployment platform built on OpenClaw. Deploy personalized AI agents to 17+ messaging channels with a full management dashboard.

## Features

- **Template Quick Start** - Pre-built bot templates (Customer Support, Personal Assistant, Community Manager, Technical Expert)
- **Free Tier** - Get started with no credit card (100 messages/month, 1 channel)
- **17 Channel Integrations** - WhatsApp, Telegram, Discord, Slack, Signal, LINE, MS Teams, Google Chat, Matrix, Feishu, Mattermost, Nostr, Twitch, WebChat, Zalo, iMessage (BlueBubbles), Nextcloud Talk
- **5 AI Providers** - Anthropic Claude, OpenAI GPT, OpenRouter (100+ models), Amazon Bedrock, Vercel AI Gateway
- **Multi-Agent Support** - Deploy multiple specialized agents with per-channel routing
- **Skills Marketplace** - Web search, browser automation, memory/RAG, TTS, canvas, cron scheduler, code execution, and more
- **Knowledge Base** - Upload PDFs, CSVs, and documents for RAG-powered responses
- **Automation** - Cron jobs, webhooks, and heartbeat monitoring
- **Team Collaboration** - Organizations with role-based access (Admin/Editor/Viewer)
- **Developer API** - REST API with API key management for programmatic access
- **Embeddable WebChat Widget** - Drop-in chat widget for any website
- **Real-time Dashboard** - 6-tab management console with logs, analytics, sessions, and channel health
- **Inline Config Editing** - Change model, prompt, and settings without redeploying

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for paid tiers)
- Railway account (for container deployments)

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Database Setup

```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
```

### Stripe Setup

1. Create Stripe account at https://stripe.com
2. Create 3 products: Monthly ($29), 3 Months ($75), Yearly ($299)
3. Copy price IDs to `.env`
4. Set up webhook: `https://yourdomain.com/api/stripe/webhook`
5. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Railway Setup

1. Create account at https://railway.app
2. Create a project
3. Get API token from account settings
4. Add `RAILWAY_API_TOKEN` and `RAILWAY_PROJECT_ID` to `.env`

### Run

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
app/
  page.tsx                     # Landing page
  onboard/page.tsx             # 6-step onboarding wizard
  (auth)/                      # Login & registration
  (marketing)/pricing/         # Pricing page (4 tiers)
  (dashboard)/dashboard/
    page.tsx                   # Main dashboard (6 tabs)
    settings/page.tsx          # Config editing & API keys
    agents/page.tsx            # Multi-agent builder
    skills/page.tsx            # Skills marketplace
    knowledge/page.tsx         # Knowledge base uploads
    analytics/page.tsx         # Deep analytics
    team/page.tsx              # Team management
  api/
    auth/                      # NextAuth + registration
    stripe/                    # Checkout + webhook
    instance/                  # 15 instance management endpoints
    team/                      # Organization CRUD
    v1/                        # Developer REST API

components/
  ui/                          # shadcn/ui base components
  forms/                       # 7 onboarding/config form components
  dashboard/                   # 12 dashboard feature components

lib/
  railway/                     # Railway API client + deployment
  openclaw/                    # OpenClaw config generation
  utils/                       # Encryption, port allocation, utilities
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `NEXTAUTH_URL` | Yes | App base URL |
| `STRIPE_SECRET_KEY` | Yes | Stripe API key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature secret |
| `STRIPE_PRICE_MONTHLY` | Yes | Stripe price ID |
| `STRIPE_PRICE_THREE_MONTH` | Yes | Stripe price ID |
| `STRIPE_PRICE_YEARLY` | Yes | Stripe price ID |
| `ENCRYPTION_KEY` | Yes | 32-byte hex for AES-256-GCM |
| `RAILWAY_API_TOKEN` | Yes | Railway deployment token |
| `RAILWAY_PROJECT_ID` | Yes | Railway project ID |

## Database Schema

Main models (see `prisma/schema.prisma`):

- **User** - Accounts with pendingConfig for pre-payment state
- **Subscription** - Stripe or free tier with usage tracking
- **Instance** - Railway container (status, accessUrl)
- **Configuration** - AI provider, model, channels, skills, prompts
- **Channel** - 18 channel types with per-channel config
- **UsageLog** - Per-message analytics
- **Organization / TeamMember** - Team collaboration with RBAC
- **ApiKey** - Developer API keys (`knt_` prefix)

## Security

- API keys encrypted with AES-256-GCM
- Passwords hashed with bcrypt
- Stripe webhook signature verification
- Container isolation via Railway
- Session-based auth (NextAuth JWT)
- Developer API keys with expiry support

## Testing

```bash
# Type check
npx tsc --noEmit

# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test card numbers (Stripe test mode)
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

## API

Developer REST API available at `/api/v1/`:

```bash
# Get instance status
curl -H "Authorization: Bearer knt_your_key" \
  https://your-domain.com/api/v1/instances

# Control instance
curl -X POST -H "Authorization: Bearer knt_your_key" \
  -H "Content-Type: application/json" \
  -d '{"action":"restart"}' \
  https://your-domain.com/api/v1/instances
```

Manage API keys from Dashboard > Settings.

## License

MIT License

## Credits

Built on [OpenClaw](https://github.com/openclaw/openclaw)
