# ============================================
# BIZRA Deployment Guide
# Domains: bizra.info | bizra.ai
# Contact: m.beshr@bizra.ai | m.beshr@bizra.info
# ============================================

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   # Use: m.beshr@bizra.ai
   ```

3. **Deploy from Dashboard folder**
   ```bash
   cd bizra-genesis-node/apps/dashboard
   vercel
   ```

4. **Production Deploy**
   ```bash
   vercel --prod
   ```

5. **Add Custom Domains in Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project → Settings → Domains
   - Add: `bizra.info`
   - Add: `bizra.ai`
   - Add: `app.bizra.ai` (for dashboard)

### DNS Configuration

**For bizra.info (Vercel):**
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

**For bizra.ai (Vercel):**
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
CNAME   app     cname.vercel-dns.com
```

---

### Option 2: Docker + VPS (Full Control)

1. **Build Docker Image**
   ```bash
   cd bizra-genesis-node/apps/dashboard
   docker build -t bizra-dashboard:latest \
     --build-arg NEXT_PUBLIC_API_URL=https://api.bizra.ai \
     --build-arg NEXT_PUBLIC_WS_URL=wss://ws.bizra.ai .
   ```

2. **Push to Container Registry**
   ```bash
   # Docker Hub
   docker tag bizra-dashboard:latest bizrainfo/bizra-dashboard:latest
   docker push bizrainfo/bizra-dashboard:latest
   
   # Or GitHub Container Registry
   docker tag bizra-dashboard:latest ghcr.io/bizrainfo/bizra-dashboard:latest
   docker push ghcr.io/bizrainfo/bizra-dashboard:latest
   ```

3. **Deploy on VPS (docker-compose.yml)**
   ```yaml
   version: '3.8'
   services:
     dashboard:
       image: bizrainfo/bizra-dashboard:latest
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - NEXT_PUBLIC_API_URL=https://api.bizra.ai
         - NEXT_PUBLIC_WS_URL=wss://ws.bizra.ai
       restart: unless-stopped
       
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - /etc/letsencrypt:/etc/letsencrypt
       depends_on:
         - dashboard
       restart: unless-stopped
   ```

---

### Option 3: Cloudflare Pages

1. **Connect GitHub Repository**
   - Go to: https://dash.cloudflare.com
   - Pages → Create a project → Connect to Git
   - Select: `bizra-genesis-node`

2. **Build Settings**
   ```
   Framework preset: Next.js
   Build command: cd apps/dashboard && npm run build
   Build output directory: apps/dashboard/.next
   Root directory: /
   ```

3. **Environment Variables**
   ```
   NEXT_PUBLIC_API_URL = https://api.bizra.ai
   NEXT_PUBLIC_WS_URL = wss://ws.bizra.ai
   ```

4. **Custom Domain**
   - Add `bizra.info` and `bizra.ai`

---

## 🔐 SSL Certificates

### Vercel/Cloudflare: Automatic ✅

### VPS with Certbot:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d bizra.info -d www.bizra.info -d bizra.ai -d www.bizra.ai -d app.bizra.ai

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 📧 Email Configuration

Your email domains:
- **m.beshr@bizra.ai** - Primary contact
- **m.beshr@bizra.info** - Alternative contact

### Recommended: Add SPF, DKIM, DMARC records

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:m.beshr@bizra.ai
```

---

## 🌐 Recommended Domain Structure

| Domain | Purpose | Redirect |
|--------|---------|----------|
| `bizra.info` | Landing/Marketing | Main site |
| `bizra.ai` | Product/Platform | Main site |
| `app.bizra.ai` | Dashboard | Dashboard app |
| `api.bizra.ai` | Backend API | Rust backend |
| `ws.bizra.ai` | WebSocket | Real-time |
| `docs.bizra.ai` | Documentation | Optional |

---

## 🚀 Deploy Now

### Fastest Path (Vercel):
```bash
cd c:\award-winner-design\bizra-genesis-node\apps\dashboard
npx vercel --prod
```

Then add your domains in the Vercel dashboard.

---

## 📞 Support

- **Email**: m.beshr@bizra.ai
- **Alt Email**: m.beshr@bizra.info
- **GitHub**: https://github.com/BizraInfo/bizra-genesis-node
