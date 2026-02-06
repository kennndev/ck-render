# CLAUDE.md - Kainat SaaS Project Guide

## Project Overview

Kainat is a SaaS platform that deploys OpenClaw AI agent instances to Railway containers. Users register, configure their bot (AI provider, channels, skills, personality), pay via Stripe (or use the free tier), and get a running AI assistant accessible on messaging platforms.

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui (Radix primitives)
- **Database**: PostgreSQL via Prisma ORM
- **Payments**: Stripe (checkout, webhooks, subscriptions)
- **Deployment**: Railway API (GraphQL) for per-user isolated containers
- **Auth**: NextAuth with credentials provider (bcrypt + JWT sessions)
- **Encryption**: AES-256-GCM for stored API keys

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run Prisma migrations
npx tsc --noEmit     # Type check (requires npm install first)
```

## Project Structure

```
app/
  page.tsx                          # Landing page
  layout.tsx                        # Root layout with SessionProvider
  globals.css                       # Tailwind globals
  onboard/page.tsx                  # 6-step onboarding wizard
  (auth)/
    login/page.tsx                  # Login page
    register/page.tsx               # Registration page
  (marketing)/
    pricing/page.tsx                # Pricing page with 4 tiers (FREE/MONTHLY/3MO/YEARLY)
  (dashboard)/
    dashboard/
      page.tsx                      # Main dashboard (6 tabs: Overview/Channels/Sessions/Automation/Analytics/Logs)
      settings/page.tsx             # Inline config editing + API key management
      agents/page.tsx               # Multi-agent configuration
      skills/page.tsx               # Skills marketplace browser
      knowledge/page.tsx            # Knowledge base / RAG file uploads
      analytics/page.tsx            # Deep analytics (charts, sentiment, hourly activity)
      team/page.tsx                 # Organization & team management (RBAC)
  api/
    auth/
      [...nextauth]/route.ts        # NextAuth handler
      register/route.ts             # User registration
    stripe/
      checkout/route.ts             # Create Stripe checkout session
      webhook/route.ts              # Handle payment webhooks, trigger deployment
    instance/
      status/route.ts               # Instance status + subscription info
      start/route.ts                # Start Railway service
      stop/route.ts                 # Stop Railway service
      restart/route.ts              # Restart Railway service
      logs/route.ts                 # Stream instance logs
      deploy-free/route.ts          # Free tier deployment (no Stripe)
      config/route.ts               # GET/PATCH inline config editing with auto-redeploy
      channels/route.ts             # GET/POST/DELETE channel management
      sessions/route.ts             # GET/DELETE session management (proxy to OpenClaw)
      cron/route.ts                 # CRUD for cron jobs (proxy to OpenClaw)
      webhooks/route.ts             # CRUD for webhook endpoints (proxy to OpenClaw)
      agents/route.ts               # GET/PUT multi-agent configuration
      skills/route.ts               # POST/DELETE skill install/uninstall
      knowledge/route.ts            # GET/POST/DELETE knowledge base documents
      usage/route.ts                # Usage analytics data
    team/route.ts                   # Organization CRUD (create-org, invite, remove-member, update-role)
    v1/
      keys/route.ts                 # Developer API key management (knt_ prefix)
      instances/route.ts            # Developer REST API (Bearer token auth)

components/
  ui/                               # shadcn/ui base components (button, card, input, label, badge, checkbox)
  forms/
    template-selector.tsx            # Pre-built bot templates (quick start)
    plan-selection.tsx               # Pricing tier selection (FREE/MONTHLY/3MO/YEARLY)
    provider-config.tsx              # AI provider + model + API key config (5 providers)
    channel-selector.tsx             # 17 channels in 4 categories (Popular/Enterprise/Privacy/Developer)
    skills-config.tsx                # Skill toggle switches
    prompt-builder.tsx               # Guided system prompt builder with templates
    agent-builder.tsx                # Multi-agent configuration UI
  dashboard/
    instance-status.tsx              # Real-time instance status with polling
    channel-access.tsx               # Channel access links & QR codes
    channel-manager.tsx              # Post-deploy channel add/remove/toggle
    usage-stats.tsx                  # Usage analytics with charts
    log-viewer.tsx                   # Terminal-style log streaming
    sessions.tsx                     # Active session viewer with prune
    cron-manager.tsx                 # Cron job CRUD with expression builder
    webhook-manager.tsx              # Webhook endpoint management
    heartbeat-config.tsx             # Periodic awareness check config
    webchat-widget.tsx               # Embeddable widget config + embed code generator
    skills-browser.tsx               # Skills marketplace with install/config
    onboarding-tour.tsx              # First-time user checklist

lib/
  prisma.ts                          # Prisma client singleton
  auth.ts                            # NextAuth configuration
  stripe.ts                          # Stripe client + plan configs (including FREE)
  railway/
    client.ts                        # RailwayClient class (GraphQL API)
    deploy.ts                        # deployToRailway(), updateServiceInstance(), redeployService()
  openclaw/
    config-builder.ts                # buildOpenClawConfig() - generates OpenClaw JSON from user selections
  utils/
    encryption.ts                    # AES-256-GCM encrypt/decrypt for API keys
    port-allocator.ts                # Port allocation for instances
    cn.ts                            # Tailwind class merge utility

prisma/
  schema.prisma                      # Full database schema
```

## Database Models

| Model | Purpose |
|-------|---------|
| User | Accounts with email/password, pendingConfig for pre-payment state |
| Subscription | Stripe subscription or free tier, usage tracking (messagesUsed/messagesLimit) |
| Instance | Railway container reference (containerId, accessUrl, status) |
| Configuration | OpenClaw config (provider, model, channels, skills, prompts, fullConfig JSON) |
| Channel | Per-channel config (17 types), enabled flag, access info |
| DeploymentLog | Deployment action history |
| UsageLog | Per-message analytics (channel, direction, tokens, response time) |
| Organization | Team/org with owner, slug |
| TeamMember | Org membership with role (ADMIN/EDITOR/VIEWER) |
| ApiKey | Developer API keys (knt_ prefix, expiry, lastUsed) |

## Key Enums

- **Plan**: FREE, MONTHLY, THREE_MONTH, YEARLY
- **AIProvider**: ANTHROPIC, OPENAI, OPENROUTER, BEDROCK, VERCEL
- **ChannelType**: WHATSAPP, TELEGRAM, DISCORD, SLACK, SIGNAL, GOOGLE_CHAT, IMESSAGE, MATRIX, MSTEAMS, LINE, FEISHU, MATTERMOST, WEBCHAT, NOSTR, TWITCH, ZALO, BLUEBUBBLES, NEXTCLOUD_TALK
- **TeamRole**: ADMIN, EDITOR, VIEWER
- **InstanceStatus**: DEPLOYING, RUNNING, STOPPED, ERROR, RESTARTING

## Architecture Patterns

### API Proxy Pattern
Dashboard API routes authenticate the user via NextAuth session, find their instance, then proxy requests to the OpenClaw instance's REST API via `accessUrl`. Example in `app/api/instance/sessions/route.ts`.

### Config Hot-Reload
The `config/route.ts` PATCH endpoint rebuilds OpenClaw config JSON and pushes it to Railway via `setVariables()` + `redeployService()`, allowing config changes without manual redeployment.

### Deployment Flow
1. User completes onboarding (6 steps) or selects template
2. Config stored in `user.pendingConfig` as JSON
3. Payment via Stripe checkout (or direct deploy for FREE tier)
4. Stripe webhook triggers `deployToRailway()` in `lib/railway/deploy.ts`
5. Railway creates isolated container with OpenClaw Docker image
6. Environment variables set from `buildEnvironmentVariables()` in config-builder
7. Instance record created with `accessUrl` pointing to Railway service

### Security
- API keys encrypted with AES-256-GCM before database storage
- Passwords hashed with bcrypt (10 rounds)
- Stripe webhook signature verification
- Developer API keys use `knt_` prefix with `randomBytes(32)`
- NextAuth JWT sessions

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - App base URL
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_THREE_MONTH` / `STRIPE_PRICE_YEARLY` - Stripe price IDs
- `ENCRYPTION_KEY` - 32-byte hex key for AES-256-GCM
- `RAILWAY_API_TOKEN` - Railway API token for deployments
- `RAILWAY_PROJECT_ID` - Railway project ID

## Conventions

- All API routes use `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`
- Components use `'use client'` directive for client-side interactivity
- shadcn/ui components imported from `@/components/ui/*`
- Path aliases: `@/` maps to project root
- Error responses follow `{ error: string }` pattern with appropriate HTTP status codes
- All timestamps use `DateTime` with `@default(now())` in Prisma
- IDs use `cuid()` generation
