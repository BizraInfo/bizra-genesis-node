# BIZRA Genesis Node - Vercel Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Platform**: Vercel
**Domain**: bizra.ai

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Domain Configuration](#domain-configuration)
5. [Environment Variables](#environment-variables)
6. [Deployment Process](#deployment-process)
7. [Backend Deployment](#backend-deployment)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## 🏗️ OVERVIEW

This guide covers deploying the BIZRA Genesis Node platform to Vercel. The deployment architecture is:

- **Frontend** (Dashboard + Landing Page): Deployed to Vercel
- **Backend** (Rust API): Deployed separately (Railway, Fly.io, or VPS)
- **Database**: Managed PostgreSQL (Neon, Supabase, or RDS)
- **Cache**: Managed Redis (Upstash, Redis Cloud)

### Why Vercel?

- ✅ **Global CDN**: Instant edge caching worldwide
- ✅ **Automatic HTTPS**: SSL certificates managed automatically
- ✅ **GitHub Integration**: Auto-deploy on push to main
- ✅ **Preview Deployments**: Every PR gets a unique URL
- ✅ **Zero Config**: Works out of the box for React/Vite apps
- ✅ **Serverless Functions**: Edge Functions for API routes (optional)

---

## 📦 PREREQUISITES

### Required Accounts

1. **Vercel Account**: https://vercel.com/signup
   - Sign up with GitHub for seamless integration
   - Join team: `bizrainfos-projects`

2. **GitHub Repository**: https://github.com/BizraInfo/bizra-genesis-node
   - Ensure you have push access
   - Enable Actions in repository settings

3. **Domain Registrar** (for bizra.ai)
   - Access to DNS settings
   - Ability to add CNAME and A records

### Required Tools

```bash
# Verify installations
node --version  # >= 20.x
npm --version   # >= 10.x
git --version   # >= 2.40

# Install Vercel CLI (optional, for local testing)
npm install -g vercel@latest
vercel --version
```

---

## 🚀 INITIAL SETUP

### Step 1: Link GitHub Repository to Vercel

1. **Login to Vercel**: https://vercel.com/bizrainfos-projects

2. **Import Project**:
   - Click "Add New" → "Project"
   - Select "Import Git Repository"
   - Choose `BizraInfo/bizra-genesis-node`
   - Click "Import"

3. **Configure Project Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `apps/dashboard/dist`
   - **Install Command**: `npm install`

4. **Click "Deploy"** (initial deployment will fail - that's OK, we need to configure environment variables first)

### Step 2: Configure Build Settings

In Vercel project settings → "General":

1. **Node.js Version**: 20.x
2. **Install Command**:
   ```bash
   npm install
   ```
3. **Build Command**:
   ```bash
   npm run build
   ```
4. **Output Directory**:
   ```
   apps/dashboard/dist
   ```

### Step 3: Get Vercel Project IDs

Run these commands locally:

```bash
# Login to Vercel CLI
vercel login

# Link project
cd bizra-genesis-node
vercel link

# This will create .vercel/project.json with:
# - projectId
# - orgId
```

Save these IDs - you'll need them for GitHub Actions.

---

## 🌐 DOMAIN CONFIGURATION

### Step 1: Add Domain to Vercel

1. **In Vercel Project Settings** → "Domains":
   - Click "Add"
   - Enter `bizra.ai`
   - Click "Add"

2. **Add Subdomains**:
   - `www.bizra.ai` (redirect to apex)
   - `app.bizra.ai` (dashboard)
   - `landing.bizra.ai` (landing page)

### Step 2: Configure DNS

In your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

1. **Add CNAME Record for www**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

2. **Add A Records for Apex Domain**:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   ```

3. **Add CNAME for API** (pointing to your backend):
   ```
   Type: CNAME
   Name: api
   Value: your-backend-url.railway.app
   TTL: 3600
   ```

4. **Verify DNS Propagation**:
   ```bash
   # Check DNS resolution
   nslookup bizra.ai
   nslookup www.bizra.ai
   nslookup api.bizra.ai

   # Or use online tools:
   # https://dnschecker.org
   ```

### Step 3: Enable HTTPS

Vercel automatically provisions SSL certificates via Let's Encrypt.

- Wait 5-10 minutes after adding domain
- Vercel will show "Valid" next to domain
- HTTPS will be enforced automatically

---

## 🔐 ENVIRONMENT VARIABLES

### Step 1: Add Variables in Vercel Dashboard

Go to Project Settings → "Environment Variables"

Add the following variables for **Production**, **Preview**, and **Development**:

#### Frontend Variables

```bash
# API Configuration
VITE_API_URL=https://api.bizra.ai
VITE_WS_URL=wss://api.bizra.ai/ws

# Application
NODE_ENV=production
VITE_APP_NAME=BIZRA Genesis Node
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

### Step 2: Add GitHub Secrets

Go to GitHub Repository → Settings → Secrets and Variables → Actions

Add the following secrets:

```bash
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

To get `VERCEL_TOKEN`:
1. Go to https://vercel.com/account/tokens
2. Create new token with name: "GitHub Actions"
3. Copy and save in GitHub Secrets

---

## 🚀 DEPLOYMENT PROCESS

### Automatic Deployment (Recommended)

Every push to `main` triggers automatic deployment:

```bash
# Make changes
git add .
git commit -m "feat: Add new feature"
git push origin main

# GitHub Actions will:
# 1. Run tests
# 2. Build project
# 3. Deploy to Vercel
# 4. Run post-deployment validation
```

### Manual Deployment via Vercel CLI

```bash
# Preview deployment (for testing)
vercel

# Production deployment
vercel --prod

# Deploy specific directory
vercel --cwd apps/dashboard --prod
```

### Deployment from Pull Request

Every PR automatically gets a preview deployment:

1. Create PR: `git push origin feature/my-feature`
2. GitHub Actions creates preview deployment
3. Bot comments on PR with preview URL
4. Test changes at preview URL
5. Merge PR → Auto-deploy to production

---

## 🔧 BACKEND DEPLOYMENT

The Rust backend should be deployed separately. Recommended platforms:

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

**Railway Configuration**:
- **Start Command**: `./target/release/bizra-genesis-node`
- **Build Command**: `cargo build --release`
- **Health Check**: `/api/v1/health`

### Option 2: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Deploy
fly deploy
```

### Option 3: AWS ECS (Production-Grade)

See separate guide: [docs/AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)

### Configure Backend Environment Variables

In your backend deployment platform, set:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/bizra_genesis
DB_POOL_MAX_CONNECTIONS=20

# Redis
REDIS_URL=redis://default:pass@host:6379

# API Keys (AI Providers)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# JWT
JWT_SECRET=<256-bit-secret>
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=604800

# CORS
CORS_ALLOWED_ORIGINS=https://bizra.ai,https://www.bizra.ai,https://app.bizra.ai

# Server
PORT=3000
RUST_LOG=info
```

---

## 📊 MONITORING & TROUBLESHOOTING

### Vercel Dashboard

Monitor deployments at: https://vercel.com/bizrainfos-projects/bizra-genesis-node

**Key Metrics**:
- **Build Time**: Should be < 2 minutes
- **Cold Start**: < 500ms
- **Bandwidth**: Monitor CDN usage
- **Functions**: Monitor serverless function invocations

### Logs

View real-time logs:

```bash
# Via Vercel CLI
vercel logs

# Via Vercel Dashboard
https://vercel.com/bizrainfos-projects/bizra-genesis-node/deployments
```

### Common Issues

#### 1. Build Fails

**Symptom**: Deployment fails during build

**Solution**:
```bash
# Check build logs in Vercel dashboard
# Common causes:
# - Missing dependencies in package.json
# - TypeScript errors
# - Environment variables not set

# Test build locally:
npm install
npm run build
```

#### 2. API Requests Fail (CORS)

**Symptom**: Frontend can't connect to backend

**Solution**:
1. Verify `VITE_API_URL` is set correctly
2. Check backend CORS configuration
3. Ensure backend is deployed and running

```bash
# Test backend health
curl https://api.bizra.ai/health
```

#### 3. Domain Not Working

**Symptom**: bizra.ai doesn't resolve

**Solution**:
1. Check DNS propagation (can take 24-48 hours)
2. Verify DNS records are correct
3. Check domain status in Vercel dashboard

```bash
# Verify DNS
dig bizra.ai
nslookup bizra.ai
```

#### 4. Preview Deployments Not Creating

**Symptom**: PRs don't get preview URLs

**Solution**:
1. Check GitHub Actions logs
2. Verify `VERCEL_TOKEN` is valid
3. Ensure Vercel GitHub integration is enabled

---

## 🔄 ROLLBACK PROCEDURE

If a deployment introduces issues:

### Via Vercel Dashboard

1. Go to: https://vercel.com/bizrainfos-projects/bizra-genesis-node/deployments
2. Find previous successful deployment
3. Click "•••" → "Promote to Production"

### Via Vercel CLI

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Via Git

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push -f origin main
```

---

## 📈 PERFORMANCE OPTIMIZATION

### Enable Edge Caching

In `vercel.json`, add:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Enable Compression

Vercel automatically compresses responses. Verify with:

```bash
curl -I -H "Accept-Encoding: gzip" https://bizra.ai
# Should see: Content-Encoding: gzip
```

### Monitor Performance

Use Vercel Analytics:
1. Go to Project Settings → "Analytics"
2. Enable "Web Analytics"
3. View real user metrics

---

## 📞 SUPPORT

### Vercel Support

- **Dashboard**: https://vercel.com/support
- **Documentation**: https://vercel.com/docs
- **Discord**: https://vercel.com/discord

### BIZRA Team

- **GitHub Issues**: https://github.com/BizraInfo/bizra-genesis-node/issues
- **Email**: devops@bizra.ai
- **Docs**: https://docs.bizra.ai

---

## 📝 CHECKLIST

Before going live, verify:

- [ ] Vercel project linked to GitHub repo
- [ ] Domain `bizra.ai` configured and verified
- [ ] All environment variables set (frontend + backend)
- [ ] SSL certificate provisioned and valid
- [ ] GitHub Actions workflow runs successfully
- [ ] Preview deployments work for PRs
- [ ] Backend deployed and health check passes
- [ ] API accessible at `https://api.bizra.ai`
- [ ] CORS configured correctly
- [ ] Database migrations run
- [ ] Redis cache connected
- [ ] Monitoring enabled (Vercel Analytics)
- [ ] Error tracking configured
- [ ] DNS propagation complete
- [ ] Performance tested (Lighthouse score > 90)
- [ ] Security headers configured
- [ ] Rate limiting tested

---

**Deployment Status**: ✅ Ready for Production

**Next Steps**:
1. Complete this checklist
2. Run end-to-end tests
3. Deploy to production
4. Monitor for 24 hours
5. Announce alpha launch!

