          # Kainat SaaS - Critical Issues & Fixes

## Current Problem
**Instances deploy to Railway successfully, but channels cannot connect and bot functionality doesn't work.**

---

## 🔴 Critical Issues Identified

### 1. Railway Client Environment Variable Mismatch

**Issue**: The `RailwayClient` (lib/railway/client.ts) looks for environment variables that don't match your setup guides:

```typescript
// client.ts:27-29
const token = process.env.RAILWAY_TOKEN
const projectId = process.env.RAILWAY_PROJECT_ID
const environmentId = process.env.RAILWAY_ENVIRONMENT_ID
```

But your `.env.example` shows:
```env
RAILWAY_TOKEN="your-railway-api-token"
RAILWAY_PROJECT_ID="your-project-id"
RAILWAY_ENVIRONMENT_ID="your-environment-id"
```

However, CLAUDE.md and other docs reference `RAILWAY_API_TOKEN` (not `RAILWAY_TOKEN`).

**Fix**: Standardize on `RAILWAY_TOKEN` everywhere or update the client to use `RAILWAY_API_TOKEN`.

---

### 2. OpenClaw Gateway Not Binding to Correct Network Interface

**Issue**: In Docker containers, OpenClaw Gateway needs to bind to `0.0.0.0` (or use `lan` mode) to accept connections from outside the container. Your config doesn't specify this.

**Current config generated** (lib/openclaw/config-builder.ts:57-63):
```typescript
gateway: {
  http: {
    endpoints: {
      chatCompletions: { enabled: true },
    },
  },
}
```

**Missing critical settings**:
- Gateway bind mode (should be `lan` for Docker)
- Gateway port configuration
- Gateway authentication token (you generate it but don't put it in config)

**Fix**: Update config-builder.ts to include:
```typescript
gateway: {
  port: 18789,
  bind: "lan",  // CRITICAL for Docker - binds to 0.0.0.0
  auth: {
    token: "${OPENCLAW_GATEWAY_TOKEN}"  // Reference env var
  },
  http: {
    endpoints: {
      chatCompletions: { enabled: true },
    },
  },
}
```

---

### 3. Channel Tokens Not Properly Set in Environment Variables

**Issue**: You're putting channel tokens in the OpenClaw config file (like `botToken: channel.config.botToken`), but OpenClaw expects these as environment variables when running in Docker.

**Current config generation** (config-builder.ts:134-140):
```typescript
config.channels.telegram = {
  enabled: true,
  botToken: channel.config.botToken,  // ❌ Hardcoded token
  dmPolicy,
  allowFrom: toArray(channel.config.allowlist),
}
```

**Problem**:
1. You're putting raw tokens in config JSON (security issue)
2. OpenClaw best practice is to use environment variable references in config
3. Your `buildEnvironmentVariables()` function DOES extract these, but the config should reference them

**Fix**: Update config generation to use env var references:
```typescript
config.channels.telegram = {
  enabled: true,
  botToken: "${TELEGRAM_BOT_TOKEN}",  // ✅ Reference env var
  dmPolicy,
  allowFrom: toArray(channel.config.allowlist),
}
```

And ensure `buildEnvironmentVariables()` is setting them (it already does at line 359).

---

### 4. Docker Start Command May Be Failing

**Issue**: Your start command in deploy.ts:116-119:
```bash
mkdir -p /home/node/.openclaw && \
printf '%s' "$OPENCLAW_CONFIG" > /home/node/.openclaw/openclaw.json && \
exec node dist/index.js gateway --allow-unconfigured
```

**Problems**:
1. The `--allow-unconfigured` flag might cause OpenClaw to ignore your config
2. The config might not be valid JSON5 after printf
3. OpenClaw might not find the config if it's looking in a different location

**Fix**: Use OpenClaw's built-in config environment variable support:
```bash
# Instead of writing to file, use OPENCLAW_CONFIG_JSON env var
exec node dist/index.js gateway
```

Or if file-based:
```bash
mkdir -p /home/node/.openclaw && \
echo "$OPENCLAW_CONFIG" > /home/node/.openclaw/openclaw.json && \
exec node dist/index.js gateway
```

(Use `echo` instead of `printf` for better newline handling)

---

### 5. Railway Service Exposure & Port Configuration

**Issue**: Railway auto-exposes ONE port from your container. By default, it looks for:
- Port exposed in Dockerfile
- Application listening on a port

OpenClaw Gateway runs on port 18789, but your Railway service might not be exposing it correctly.

**Check**:
1. Does the OpenClaw Docker image (`ghcr.io/openclaw/openclaw:latest`) have `EXPOSE 18789` in its Dockerfile?
2. Is Railway detecting and exposing port 18789 automatically?
3. Is the accessUrl you're storing actually pointing to the correct port?

**Fix**: In Railway service settings, ensure:
- Port 18789 is explicitly exposed
- Health check endpoint is configured (if needed)
- Service generates a public domain

You might need to set this via Railway API or manually in the dashboard.

---

### 6. OpenClaw Config Validation Failing Silently

**Issue**: OpenClaw uses strict config validation. If your generated config has:
- Unknown keys
- Malformed values
- Missing required fields
- Wrong types

The Gateway will refuse to start, but you might not see the error in logs.

**Your config might fail validation because**:
1. Channel allowlists might be empty arrays (OpenClaw may require at least one entry or specific format)
2. Model names might not match OpenClaw's expected format (e.g., you use `anthropic/claude-opus-4-5` but OpenClaw might expect `claude-opus-4-5`)
3. Agent workspace path might not be valid in Docker

**Fix**: Test your generated config locally with:
```bash
# Save your generated config to a file
echo '<your-generated-json>' > test-config.json

# Validate with OpenClaw doctor
openclaw doctor --config test-config.json
```

Or add config validation in your deployment code:
```typescript
// After generating config
console.log('Generated OpenClaw config:', JSON.stringify(openclawConfig, null, 2))

// Check for required fields
if (!openclawConfig.agents?.defaults?.workspace) {
  throw new Error('Missing workspace in agent config')
}
if (Object.keys(openclawConfig.channels).length === 0) {
  throw new Error('No channels configured')
}
```

---

### 7. Channel-Specific Setup Requirements Not Met

**Issue**: Some channels require additional setup AFTER deployment:

#### WhatsApp
- Requires QR code pairing
- User must scan QR within ~60 seconds of gateway startup
- QR is displayed in gateway logs or Control UI
- **Your issue**: Users can't see the QR code because there's no UI to access it

**Fix**: Add a channel setup page that:
1. Shows QR code for WhatsApp (fetch from OpenClaw Gateway API or logs)
2. Provides setup instructions for each channel
3. Shows connection status

#### Telegram
- Bot must exist first (@BotFather)
- Bot token must be valid
- User must start conversation with bot (`/start`)

#### Discord
- Bot must be invited to servers
- Application ID and token must match

**Your current flow doesn't guide users through these steps.**

---

### 8. Instance Access URL vs Service URL Confusion

**Issue** (deploy.ts:134):
```typescript
const serviceUrl = `https://${serviceName}.railway.internal:18789`
```

Railway internal networking (`*.railway.internal`) is for **service-to-service** communication within the same Railway project. Your Next.js app (running on Vercel or elsewhere) **CANNOT** access this URL.

**You should use the public `accessUrl` for all dashboard API proxy requests.**

**Fix**:
1. Remove `serviceUrl` entirely or clarify its purpose
2. Use only `accessUrl` (the Railway-assigned public URL) for dashboard proxying
3. Ensure the public URL includes the correct port (Railway should handle this automatically)

---

### 9. Missing Health Checks & Deployment Verification

**Issue**: After deployment, you're not verifying that:
1. OpenClaw Gateway actually started
2. Config was loaded successfully
3. Channels are connected
4. Gateway is accessible

**Your deployment waits for Railway deployment status to be `SUCCESS`, but that doesn't mean OpenClaw is running correctly inside.**

**Fix**: Add health check after deployment:
```typescript
// After waitForDeployment() succeeds
console.log('✅ Railway deployment succeeded, verifying OpenClaw Gateway...')

// Wait a bit for gateway to start
await sleep(10000)

// Check health endpoint
const healthUrl = `${accessUrl}/health`
const healthResponse = await fetch(healthUrl, {
  headers: { Authorization: `Bearer ${gatewayToken}` }
})

if (!healthResponse.ok) {
  throw new Error(`Gateway health check failed: ${healthResponse.status}`)
}

console.log('✅ OpenClaw Gateway is healthy')

// Check channel status
const channelsUrl = `${accessUrl}/api/channels`  // Adjust to actual OpenClaw API endpoint
// ... verify channels are connected
```

---

### 10. Environment Variables Missing in Railway Deployment

**Issue**: You set `envVars` object and pass it to Railway, but some critical env vars might be missing:

**Check these are being set**:
- `ANTHROPIC_API_KEY` (or other AI provider key) ✅ (you're doing this)
- `TELEGRAM_BOT_TOKEN` ✅ (you're doing this)
- `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID` ✅ (you're doing this)
- `OPENCLAW_GATEWAY_TOKEN` ✅ (you're doing this)
- `OPENCLAW_CONFIG` ✅ (you're doing this)
- `NODE_ENV=production` ❌ (you're NOT setting this)
- `OPENCLAW_HOME` or workspace path ❌ (might need this)

**Fix**: Add in deploy.ts:77-83:
```typescript
const envVars = buildEnvironmentVariables(config)
const openclawConfig = generateOpenClawConfig(config)

envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)
envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken
envVars.NODE_ENV = 'production'  // ADD THIS
envVars.OPENCLAW_WORKSPACE = '/home/node/.openclaw/workspace'  // ADD THIS
```

---

## 🔧 Immediate Action Plan

### Step 1: Fix Environment Variables
1. Verify `.env` file has all required Railway variables
2. Ensure variable names match between code and .env
3. Add missing NODE_ENV and workspace env vars

### Step 2: Fix Gateway Configuration
Update `lib/openclaw/config-builder.ts`:

```typescript
export function generateOpenClawConfig(userConfig: UserConfiguration) {
  const primaryModel = userConfig.model || defaultModels[userConfig.provider] || 'anthropic/claude-opus-4-5'

  const config: any = {
    agents: {
      defaults: {
        workspace: '~/.openclaw/workspace',  // Will be created by OpenClaw
        model: {
          primary: primaryModel,
          ...(userConfig.failoverModel && { failover: userConfig.failoverModel })
        }
      }
    },
    channels: {},
    gateway: {
      port: 18789,
      bind: "lan",  // ✅ CRITICAL: Bind to 0.0.0.0 for Docker
      auth: {
        token: "${OPENCLAW_GATEWAY_TOKEN}"  // ✅ Reference env var
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
          ...(userConfig.braveApiKey && { apiKey: "${BRAVE_API_KEY}" })  // ✅ Use env var ref
        }
      }
    }
  }

  // ... rest of your code
}
```

### Step 3: Use Environment Variable References in Channel Configs

Update channel configs to use env var references instead of hardcoded values:

```typescript
case 'TELEGRAM': {
  config.channels.telegram = {
    enabled: true,
    botToken: "${TELEGRAM_BOT_TOKEN}",  // ✅ Reference, not value
    dmPolicy,
    allowFrom: toArray(channel.config.allowlist),
  }
  break
}

case 'DISCORD': {
  config.channels.discord = {
    enabled: true,
    token: "${DISCORD_TOKEN}",  // ✅ Reference
    applicationId: "${DISCORD_APPLICATION_ID}",  // ✅ Reference
    dm: { policy: dmPolicy, allowFrom: toArray(channel.config.allowlist) },
  }
  break
}
```

### Step 4: Fix Railway Start Command

Update `lib/railway/deploy.ts`:

```typescript
// Option 1: Use env var directly (recommended)
const startCmd = `exec node dist/index.js gateway`

// OpenClaw will read config from OPENCLAW_CONFIG env var automatically
// No need for --allow-unconfigured flag

// OR Option 2: Write to file (if env var doesn't work)
const configDir = '/home/node/.openclaw'
const startCmd =
  `mkdir -p ${configDir} && ` +
  `echo "$OPENCLAW_CONFIG" > ${configDir}/openclaw.json && ` +
  `exec node dist/index.js gateway`
```

### Step 5: Add Deployment Health Check

Add after line 131 in deploy.ts:

```typescript
const accessUrl = await waitForDeployment(railway, serviceId)

// ✅ ADD: Wait for gateway to start
console.log('Waiting for OpenClaw Gateway to start...')
await sleep(15000)  // Give it 15 seconds

// ✅ ADD: Verify gateway is responding
try {
  const healthCheck = await fetch(`${accessUrl}/health`, {
    headers: { Authorization: `Bearer ${gatewayToken}` },
    signal: AbortSignal.timeout(5000)
  })

  if (!healthCheck.ok) {
    console.warn(`⚠️  Gateway health check returned ${healthCheck.status}`)
  } else {
    console.log('✅ Gateway health check passed')
  }
} catch (err) {
  console.warn('⚠️  Gateway health check failed:', err)
  // Don't throw - deployment record still created so user can debug
}
```

### Step 6: Add Channel Setup UI

Create a new page/component to guide users through channel-specific setup:

**For WhatsApp**:
- Fetch QR code from OpenClaw Gateway logs or Control UI API
- Display QR for user to scan
- Show connection status

**For Telegram/Discord**:
- Show setup instructions
- Verify bot token is valid
- Test connection

### Step 7: Debug Existing Deployments

For your already-deployed instances, check:

```bash
# Get instance logs from Railway
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query deploymentLogs($deploymentId: String!) { deploymentLogs(deploymentId: $deploymentId, limit: 200) { timestamp message severity }}"
  }'

# Look for errors like:
# - "Config validation failed"
# - "Gateway failed to start"
# - "Port 18789 already in use"
# - "Invalid channel configuration"
# - "Missing required environment variable"
```

---

## 🧪 Testing Checklist

After implementing fixes, test:

- [ ] Free tier deployment completes without errors
- [ ] Railway service starts and stays running
- [ ] OpenClaw Gateway logs show "Gateway started on port 18789"
- [ ] Gateway health endpoint responds: `GET https://<accessUrl>/health`
- [ ] Telegram bot receives `/start` command
- [ ] Discord bot appears online in server
- [ ] WhatsApp QR code is accessible and scannable
- [ ] Dashboard can proxy API requests to instance
- [ ] Channels show as "connected" in dashboard
- [ ] Test message sent through channel reaches bot and gets response

---

## 📊 Root Cause Summary

The main issues preventing channels from connecting are:

1. **Gateway not binding to network interface accessible from outside container** (missing `bind: "lan"`)
2. **Channel tokens embedded in config instead of environment variables** (security + flexibility issue)
3. **No post-deployment verification** (deployment succeeds but OpenClaw fails silently)
4. **Missing channel-specific setup steps** (QR codes, bot invites, etc.)
5. **Config might be failing OpenClaw's strict validation** (needs testing)

---

## 🚀 Next Steps

1. Implement fixes in order (Steps 1-6)
2. Test with one channel (start with Telegram - easiest to verify)
3. Once working, add other channels
4. Build channel setup UI for better user experience
5. Add monitoring/alerting for failed deployments
6. Consider adding `openclaw doctor` check in deployment pipeline

---

## 📞 If Issues Persist

If after these fixes channels still don't connect:

1. **Get raw OpenClaw logs** from Railway deployment
2. **Test config locally** with OpenClaw CLI (`openclaw doctor --config your-config.json`)
3. **Verify OpenClaw Docker image** is correct version and arch
4. **Check Railway service networking** (is port 18789 exposed?)
5. **Test accessUrl manually** with curl to verify Gateway is reachable

**Debug command**:
```bash
# Test if Gateway is accessible
curl -v https://<your-accessUrl>/health \
  -H "Authorization: Bearer <gatewayToken>"

# Should return 200 OK with health status JSON
```

---

**Last Updated**: 2026-02-06
**Version**: 1.0
