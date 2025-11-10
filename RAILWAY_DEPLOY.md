# Deploy BIZRA Growth Flywheel to Railway

## 🚀 Quick Deploy (5 Minutes)

Railway is the fastest way to deploy your Growth Flywheel system to production.

---

## Prerequisites

- Railway account (free at https://railway.app)
- GitHub repository (optional but recommended)

---

## Option A: One-Click Deploy from GitHub (Recommended)

### Step 1: Push to GitHub

```bash
# If not already a git repo
cd c:\bizra-genesis-node
git remote add origin https://github.com/YOUR_USERNAME/bizra-genesis-node.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `bizra-genesis-node`
5. Railway will automatically detect Node.js and deploy!

### Step 3: Set Environment Variables

In Railway dashboard:

1. Click on your project
2. Go to "Variables" tab
3. Add these variables:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=<click-generate>
JWT_SECRET=<click-generate>
ENABLE_ACHIEVEMENTS=true
ENABLE_REFERRALS=true
ENABLE_ANALYTICS=true
```

Railway will auto-generate secrets if you click the generate button.

### Step 4: Deploy

Railway deploys automatically! Check the "Deployments" tab for progress.

---

## Option B: Deploy from CLI

### Step 1: Install Railway CLI

```powershell
# Windows PowerShell
iwr https://railway.app/install.ps1 -useb | iex
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize Project

```bash
cd c:\bizra-genesis-node
railway init
```

Select "Create new project"

### Step 4: Set Environment Variables

```bash
# Generate and set secrets
railway variables set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set feature flags
railway variables set ENABLE_ACHIEVEMENTS=true
railway variables set ENABLE_REFERRALS=true
railway variables set ENABLE_ANALYTICS=true
railway variables set NODE_ENV=production
```

### Step 5: Deploy

```bash
railway up
```

### Step 6: Get Your URL

```bash
railway domain
```

Railway will provide a URL like: `https://bizra-genesis-node-production.up.railway.app`

---

## Add PostgreSQL Database (Optional)

```bash
# Add PostgreSQL
railway add postgres
```

Railway automatically sets `DATABASE_URL` environment variable.

---

## Add Custom Domain

### Step 1: In Railway Dashboard

1. Go to Settings → Domains
2. Click "Custom Domain"
3. Enter your domain (e.g., `bizra.ai`)

### Step 2: Update DNS

Add a CNAME record:
```
Type: CNAME
Name: @ (or www)
Value: <your-railway-app>.up.railway.app
```

### Step 3: Wait for SSL

Railway automatically provisions SSL certificates!

---

## Verify Deployment

### Test Health Endpoint

```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "uptime": 123.45
}
```

### Test Achievements API

```bash
curl https://your-app.up.railway.app/api/v1/achievements/list
```

### Access Dashboard

Open in browser:
```
https://your-app.up.railway.app
```

---

## Monitor Your App

### View Logs

```bash
railway logs
```

Or in Railway dashboard → Deployments → View Logs

### Metrics

Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request volume

---

## Troubleshooting

### Build Failed

**Check railway.json**:

Create `railway.json` in project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:dashboard"
  },
  "deploy": {
    "startCommand": "node backend/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Port Issues

Railway automatically sets `PORT` environment variable. Your app should listen on `process.env.PORT`.

**Check backend/server.js**:
```javascript
const PORT = process.env.PORT || 3000;
```

### Canvas Graphics Not Working

Railway doesn't support native dependencies by default.

**Solutions**:
1. Accept graceful degradation (text-only sharing)
2. Use Docker buildpack (add Dockerfile)

### Database Connection Errors

If using PostgreSQL:
```bash
# Check DATABASE_URL is set
railway variables
```

---

## Update Deployment

### Automatic (GitHub)

Just push to main branch:
```bash
git push origin main
```

Railway auto-deploys!

### Manual (CLI)

```bash
railway up
```

---

## Cost Estimate

**Free Tier**:
- ✅ 500 execution hours/month
- ✅ 512MB RAM
- ✅ 1GB disk
- ✅ Shared CPU
- Perfect for MVP and testing!

**Starter Plan** ($5/month):
- 2000 execution hours/month
- 1GB RAM
- 5GB disk
- Shared CPU
- Custom domains

**Pro Plan** ($20/month):
- 10,000 execution hours/month
- 8GB RAM
- 100GB disk
- Dedicated CPU
- Priority support

---

## Next Steps

1. ✅ Deploy to Railway
2. Test all Growth Flywheel features
3. Generate Alpha-100 invitation codes
4. Share with early adopters
5. Monitor growth metrics!

---

## Quick Reference

```bash
# View logs
railway logs

# Open in browser
railway open

# Check status
railway status

# Add environment variable
railway variables set KEY=value

# Link to different project
railway link

# Run command in Railway environment
railway run npm test
```

---

**Your Growth Flywheel is now live! 🚀**

Access your deployment at the Railway URL and start inviting Alpha users.

Monitor viral growth in your metrics dashboard:
`https://your-app.up.railway.app/dashboard/growth-metrics`

---

*Built with إحسان (Excellence) • Deployed to Railway • Powered by Phase 7 Growth Flywheel 🌟*
