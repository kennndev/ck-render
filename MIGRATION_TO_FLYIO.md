# Migration Guide: Railway → Fly.io

## Why We Switched

Railway lacks **SSH access to containers**, which is critical for OpenClaw channel setup:
- WhatsApp requires QR code scanning + device approval
- Signal requires CLI-based registration
- Device pairing needs `openclaw devices approve` commands

**Fly.io provides `flyctl ssh console`**, enabling full OpenClaw functionality.

---

## What Changed

| Component | Railway | Fly.io |
|-----------|---------|--------|
| **Deployment API** | GraphQL | REST Machines API |
| **Container Management** | Railway services | Fly.io machines |
| **Environment Variables** | Direct injection | Secrets API (encrypted) |
| **SSH Access** | ❌ None | ✅ `flyctl ssh console` |
| **Public URL** | `<service>.railway.app` | `<app>.fly.dev` |
| **Pricing** | $5/month minimum | Pay per usage (~$3-5/month) |

---

## Migration Steps

### 1. Install Fly.io CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
flyctl version
```

### 2. Create Fly.io Account & Login

```bash
flyctl auth signup   # Create account
flyctl auth login    # Login to existing account
```

### 3. Get API Token

```bash
# Create a personal access token
flyctl tokens create deploy

# Copy the token - you'll need it for .env
```

### 4. Get Your Organization Slug

```bash
# List your organizations
flyctl orgs list

# Output shows:
# my-username    personal
# my-company     shared

# Your org slug is the first column (e.g., "my-username")
```

### 5. Update Environment Variables

Edit your `.env` file:

```env
# Remove these (Railway)
# RAILWAY_TOKEN=...
# RAILWAY_PROJECT_ID=...
# RAILWAY_ENVIRONMENT_ID=...

# Add these (Fly.io)
FLY_API_TOKEN="<your-token-from-step-3>"
FLY_ORG_SLUG="<your-org-from-step-4>"
```

### 6. Test Fly.io Connection

```bash
# Verify your token works
flyctl apps list

# You should see a list of apps (may be empty if new account)
```

### 7. Database Migration (If Needed)

If you have existing Railway deployments, you can either:

**Option A: Clean Start**
- Users re-deploy their instances
- Old Railway services can be manually deleted

**Option B: Migrate Data**
```sql
-- Update instance records to mark as migrated
UPDATE instances SET status = 'STOPPED', containerName = NULL WHERE containerName LIKE 'openclaw-%';
```

### 8. Deploy First Test Instance

```bash
# Start your dev server
npm run dev

# Register a new user or login
# Complete onboarding
# Select FREE tier
# Deploy!

# Check Fly.io dashboard
flyctl apps list
# You should see: openclaw-<userId>-<timestamp>
```

---

## New Features with Fly.io

### SSH Terminal Access

Users can now access a web terminal in your dashboard to:

```bash
# Approve WhatsApp pairing
POST /api/instance/terminal
{
  "action": "list-devices"
}

# Get WhatsApp QR code
POST /api/instance/terminal
{
  "action": "get-whatsapp-qr"
}

# Approve device
POST /api/instance/terminal
{
  "action": "approve-device",
  "requestId": "abc123"
}

# Run OpenClaw doctor
POST /api/instance/terminal
{
  "action": "run-doctor"
}
```

### Direct flyctl Commands

For advanced users, you can provide direct SSH access:

```bash
# From your server/local machine
flyctl ssh console --app openclaw-<userId> --command "openclaw devices list"
```

---

## Pricing Comparison

### Railway (Old)
- $5/month minimum per project
- 500GB bandwidth included
- 8GB RAM / 8 vCPU shared

### Fly.io (New)
- Pay per usage
- $0.0000022/sec for 1 CPU (~$5.70/month if always running)
- **But**: Machines can auto-stop when idle!
- $0.15/GB bandwidth (first 100GB included)
- **Typical cost for always-on bot: $3-5/month**

### Cost Optimization

Enable auto-stop in your machine config:
```typescript
services: [{
  auto_stop_machines: true,   // Stop when no traffic
  auto_start_machines: true,  // Start on first request
  min_machines_running: 0,    // Allow full stop
}]
```

**Result**: Bot sleeps when not in use, ~$1-2/month for light usage.

---

## Troubleshooting

### "flyctl: command not found"

Add Fly.io to your PATH:

```bash
# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Windows: Installer should do this automatically
# If not, add manually: C:\Users\<username>\.fly\bin
```

### "Token invalid" or "Unauthorized"

```bash
# Re-login
flyctl auth login

# Generate new token
flyctl tokens create deploy

# Update .env with new token
```

### "Organization not found"

```bash
# List orgs again
flyctl orgs list

# Use exact slug (case-sensitive!)
FLY_ORG_SLUG="your-exact-org-slug"
```

### "Machine failed to start"

Check logs:
```bash
flyctl logs --app openclaw-<userId>
```

Common issues:
- Missing OPENCLAW_GATEWAY_TOKEN secret
- Invalid OpenClaw config JSON
- Image pull failed (check OPENCLAW_IMAGE env var)

### "SSH connection failed"

Ensure flyctl is installed and working:
```bash
flyctl version
flyctl auth whoami

# Test SSH to a running app
flyctl ssh console --app openclaw-<userId>
```

---

## Rollback (If Needed)

If something goes wrong, you can temporarily rollback to Railway:

1. Revert code changes:
```bash
git checkout HEAD~1 -- lib/fly lib/railway app/api/instance
```

2. Restore Railway env vars in `.env`

3. Restart your app

---

## Health Check

After migration, verify everything works:

- [ ] New user registration works
- [ ] FREE tier deployment succeeds
- [ ] Fly.io app appears in `flyctl apps list`
- [ ] Instance status shows "RUNNING" in dashboard
- [ ] Terminal endpoint responds: `GET /api/instance/terminal`
- [ ] Can list devices: `POST /api/instance/terminal {"action":"list-devices"}`
- [ ] Paid tier Stripe checkout works
- [ ] Webhook triggers deployment to Fly.io

---

## Support

**Fly.io Docs**: https://fly.io/docs
**Fly.io Community**: https://community.fly.io
**Kainat Issues**: https://github.com/your-repo/issues

---

**Migration completed!** Your Kainat SaaS now supports full OpenClaw functionality with SSH access. 🚀
