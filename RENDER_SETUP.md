# 🚀 Render.com Setup - SUPER EASY!

## Why Render.com?

✅ **No CLI required** - Everything in web dashboard
✅ **One-click shell access** - Click "Shell" button to get terminal
✅ **Simple API** - Just REST, no GraphQL complexity
✅ **Clear errors** - You'll know what's wrong
✅ **Free tier** - Start for $0/month

---

## Step 1: Create Render Account (2 minutes)

1. Go to: https://render.com
2. Click "Get Started"
3. Sign up with:
   - **GitHub** (recommended - fastest)
   - Or email/password

---

## Step 2: Get API Key (1 minute)

### Method 1: Direct Link (Easiest)
1. Go to: https://dashboard.render.com/u/settings#api-keys
2. Click "Create API Key"
3. Name it: `kainat-saas`
4. Click "Create"
5. **Copy the key** (starts with `rnd_`)

### Method 2: Via Dashboard
1. Login to Render dashboard
2. Click your **avatar** (top right)
3. Click "Account Settings"
4. Click "API Keys" (left sidebar)
5. Click "Create API Key"
6. Name it: `kainat-saas`
7. Click "Create"
8. **Copy the key** (starts with `rnd_`)

---

## Step 3: Add to .env

Open your `.env` file and add:

```env
RENDER_API_KEY="rnd_paste_your_key_here"
```

**Example:**
```env
RENDER_API_KEY="rnd_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t"
```

**⚠️ Important:** The key starts with `rnd_` - make sure to copy the whole thing!

---

## Step 4: Test It Works

```bash
# Start your app
npm run dev

# Open browser
http://localhost:3000

# Register → Complete onboarding → Deploy FREE tier

# Should work! ✅
```

---

## ✅ Verification

After deployment, check Render dashboard:

1. Go to: https://dashboard.render.com
2. You should see: `openclaw-<userId>`
3. Click on it
4. Status should show: **Live** 🟢

---

## 🖥️ Shell Access (For Device Approval)

When users need to approve devices (WhatsApp pairing, etc.):

### Option 1: Via Dashboard UI
1. Your dashboard shows instance
2. User clicks "Open Shell" button
3. Redirects to: `https://dashboard.render.com/web/<serviceId>/shell`
4. Click "Connect" → Terminal opens!
5. Run: `openclaw devices list`
6. Run: `openclaw devices approve <requestId>`

### Option 2: Direct Link
Your app can provide direct link:
```typescript
const shellUrl = `https://dashboard.render.com/web/${serviceId}/shell`
// Store in database, show to user
```

---

## 💰 Pricing

### Free Tier (Starter)
- **Cost:** $0/month
- **Specs:** 512MB RAM, 0.5 CPU
- **Sleep:** After 15 min inactivity
- **Wake:** Auto-starts on request (30s delay)

**Perfect for testing!**

### Paid Tier (Standard)
- **Cost:** $7/month
- **Specs:** 2GB RAM, 1 CPU
- **Sleep:** Never
- **Always on:** Yes

**For production bots**

---

## 🎯 What's Different from Fly.io?

| Feature | Fly.io | Render.com |
|---------|--------|------------|
| **Setup** | CLI required ❌ | Web only ✅ |
| **API Key** | Token + Org Slug ❌ | One key ✅ |
| **Shell Access** | flyctl CLI ❌ | Click button ✅ |
| **Errors** | Cryptic ❌ | Clear ✅ |
| **Free Tier** | Complex ❌ | Simple ✅ |

---

## 🐛 Troubleshooting

### "Invalid API key"

**Check:**
1. Key starts with `rnd_`
2. No extra spaces in `.env`
3. Key is not revoked (check dashboard)

**Fix:**
```bash
# Create new key
# Go to: https://dashboard.render.com/u/settings#api-keys
# Copy new key to .env
RENDER_API_KEY="rnd_new_key_here"
```

### "Service creation failed"

**Check:**
1. Render account verified (check email)
2. Payment method added (even for free tier)
3. Service name not taken

**Fix:**
```bash
# Try deploying again
# Render will show exact error in response
```

### "Can't access shell"

**Check:**
1. Service is running (status: Live)
2. You're logged into Render dashboard
3. You own the service

**Fix:**
```bash
# Go to: https://dashboard.render.com
# Find service: openclaw-<userId>
# Click it → Click "Shell" tab → Click "Connect"
```

---

## 📋 Quick Reference

### Environment Variables
```env
RENDER_API_KEY="rnd_your_key"      # Required
OPENCLAW_IMAGE="ghcr.io/..."       # Optional (has default)
```

### Useful Links
- **Dashboard:** https://dashboard.render.com
- **API Keys:** https://dashboard.render.com/u/settings#api-keys
- **Docs:** https://render.com/docs
- **API Docs:** https://api-docs.render.com

### Common Commands
```bash
# Start dev server
npm run dev

# Deploy (via your app)
# Just use the web interface - no CLI needed!
```

---

## 🎉 That's It!

Render.com setup is **DONE**. No CLI, no confusion, no headaches.

Now deploy your first instance and see it work! 🚀

---

## 💡 Pro Tips

1. **Add Payment Method** - Even for free tier, some features need it
2. **Monitor Usage** - Dashboard shows resource usage
3. **Check Status** - Green = good, Yellow = deploying, Red = error
4. **Use Shell** - Best way to debug and run OpenClaw commands

---

**Need help?** Check Render docs or paste the error message here! ✅
