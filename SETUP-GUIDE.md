# Kainat SaaS - Setup Guide

## What This Platform Does

Kainat lets users deploy their own AI assistant (powered by OpenClaw) with a few clicks. Users configure their bot through a guided UI, pay (or use the free tier), and get an isolated AI agent running on Railway that responds on their chosen messaging platforms.

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kainat"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32>"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_THREE_MONTH="price_..."
STRIPE_PRICE_YEARLY="price_..."

# Railway
RAILWAY_API_TOKEN="your-railway-token"
RAILWAY_PROJECT_ID="your-project-id"

# Encryption (for API key storage)
ENCRYPTION_KEY="<openssl rand -hex 32>"
```

### 3. Set Up Database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to PostgreSQL
```

### 4. Set Up Stripe

1. Create account at https://stripe.com
2. Create 3 recurring products:
   - **Monthly**: $29/month
   - **3 Months**: $75 every 3 months
   - **Yearly**: $299/year
3. Copy each product's price ID to `.env`
4. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
5. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Copy webhook signing secret to `.env`

For local testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 5. Set Up Fly.io

1. Install Fly.io CLI:
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Create account and login:
   ```bash
   flyctl auth signup   # or: flyctl auth login
   ```

3. Create API token:
   ```bash
   flyctl tokens create deploy
   ```

4. Get your organization slug:
   ```bash
   flyctl orgs list
   # Use the first column value (e.g., "your-username")
   ```

5. Add to `.env`:
   ```env
   FLY_API_TOKEN="your-token-here"
   FLY_ORG_SLUG="your-org-slug"
   ```

### 6. Run Dev Server

```bash
npm run dev
```

Open http://localhost:3000

---

## User Flow

### Onboarding (6 Steps)

1. **Template** - Pick a pre-built template or start from scratch
   - Customer Support Bot, Personal Assistant, Community Manager, Technical Expert
2. **Plan** - Choose subscription tier
   - FREE ($0, 100 msgs/mo, 1 channel), Monthly ($29), 3 Months ($75), Yearly ($299)
3. **AI Provider** - Select provider and enter API key
   - Anthropic, OpenAI, OpenRouter, Amazon Bedrock, Vercel AI Gateway
   - Model selection + optional failover model
4. **Channels** - Pick messaging platforms
   - 17 channels organized by category (Popular, Enterprise, Privacy, Developer)
   - Per-channel config fields (tokens, keys, etc.)
5. **Personality** - Configure system prompt
   - Guided mode (section-by-section) or freeform
   - 4 prompt templates to start from
6. **Skills** - Enable capabilities
   - Web search, browser, TTS, canvas, cron, memory/RAG

### After Payment

- Stripe webhook fires
- `deployToRailway()` creates an isolated container
- OpenClaw config JSON generated from user selections
- Instance starts and becomes accessible
- User redirected to dashboard

### Free Tier

- No Stripe checkout required
- Direct deployment via `/api/instance/deploy-free`
- 100 messages/month, 1 channel, basic model
- Usage tracked in `Subscription.messagesUsed`

---

## Dashboard

The main dashboard has 6 tabs:

| Tab | Features |
|-----|----------|
| **Overview** | Instance status, quick actions, onboarding tour, quick access links |
| **Channels** | Channel manager (add/remove/toggle channels post-deploy) |
| **Sessions** | Active sessions viewer, session pruning |
| **Automation** | Cron jobs, webhooks, heartbeat config, WebChat widget |
| **Analytics** | Usage stats, message charts, channel breakdown |
| **Logs** | Real-time log streaming with level filtering |

### Additional Pages

- **Settings** (`/dashboard/settings`) - Inline config editing, API key management
- **Agents** (`/dashboard/agents`) - Multi-agent configuration with routing
- **Skills** (`/dashboard/skills`) - Skills marketplace browser
- **Knowledge** (`/dashboard/knowledge`) - RAG document uploads
- **Analytics** (`/dashboard/analytics`) - Deep analytics with charts
- **Team** (`/dashboard/team`) - Organization & member management

---

## Key Architecture Decisions

### Fly.io (not Railway/Docker)

User instances deploy to Fly.io via their Machines API. Each user gets an isolated Fly.io machine running the OpenClaw Docker image. This handles scaling, SSL, and uptime automatically. **Crucially, Fly.io provides SSH access via `flyctl ssh console`, enabling channel setup and device approval.**

### API Proxy Pattern

Dashboard management routes (sessions, cron, webhooks) proxy requests to the user's running OpenClaw instance via its `accessUrl`. The SaaS app authenticates the user, then forwards requests to their bot.

### Config Hot-Reload

When users edit config from the Settings page, the PATCH endpoint:
1. Updates the database
2. Rebuilds the OpenClaw config JSON
3. Pushes new environment variables to Railway
4. Triggers a redeploy

No manual redeployment needed.

### Developer API

The `/api/v1/` namespace provides REST access authenticated via Bearer tokens (`knt_` prefixed API keys). Developers can programmatically manage instances, check status, and control their bots.

---

## Testing Checklist

- [ ] Landing page loads correctly
- [ ] Registration and login work
- [ ] Onboarding flow completes (all 6 steps)
- [ ] Template selection pre-fills config
- [ ] Free tier deploys without Stripe
- [ ] Stripe checkout works (test mode, card: 4242 4242 4242 4242)
- [ ] Webhook triggers deployment
- [ ] Dashboard shows instance status
- [ ] Start/stop/restart controls work
- [ ] Channels display with access links
- [ ] Log viewer streams logs
- [ ] Settings page saves config changes
- [ ] API key creation and deletion work

---

## Troubleshooting

**"Prisma client errors"**
```bash
npm run db:generate
```

**"Stripe webhook not working locally"**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**"Database connection failed"**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check credentials and database exists

**"Railway deployment fails"**
- Verify `RAILWAY_API_TOKEN` is valid
- Check project ID matches
- Ensure Railway account has available resources

---

## Documentation

- `CLAUDE.md` - Project context and conventions for AI assistants
- `README.md` - Project overview and quick start
- `kainat.md` - Detailed architecture and configuration reference
- OpenClaw Docs: https://docs.openclaw.ai
