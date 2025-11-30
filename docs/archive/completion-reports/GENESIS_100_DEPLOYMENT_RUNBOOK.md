# GENESIS 100 DEPLOYMENT RUNBOOK

**Professional Elite Deployment Standard**

## 1. Environment Preparation

### Backend (.env)

Ensure the following variables are set in `c:\bizra-genesis-node\.env`:

- `DATABASE_URL`: (Production Neon DB URL)
- `JWT_SECRET`: (Secure Random String)
- `RUST_LOG`: info
- `PORT`: 3000

### Frontend (.env)

Ensure `c:\bizra-genesis-node\apps\dashboard\.env` exists:

- `VITE_API_URL`: <http://localhost:3000> (or production URL)

## 2. Backend Deployment

**Option A: Local Production Mode (Windows)**

```powershell
cd c:\bizra-genesis-node
cargo build --release
./target/release/api_server.exe
```

**Option B: Railway/Docker**

```bash
docker build -f Dockerfile.production -t bizra-genesis-backend .
docker run -p 3000:3000 --env-file .env bizra-genesis-backend
```

## 3. Frontend Deployment

**Option A: Local Production Serve**

```powershell
cd c:\bizra-genesis-node\apps\dashboard
npm run build
npm run preview -- --port 4173
```

**Option B: Vercel**

```bash
cd c:\bizra-genesis-node\apps\dashboard
vercel --prod
```

## 4. Support Bot Deployment

```powershell
cd c:\bizra-genesis-node\support-bot
npm install
npm start
```

## 5. Verification Steps

1. **Health Check:** `curl http://localhost:3000/health` -> `{"status":"ok"}`
2. **Metrics:** `curl http://localhost:3000/metrics` -> Prometheus data
3. **Frontend:** Open browser to Dashboard URL. Login with test account.
4. **Agents:** Verify WebSocket connection in Dashboard.

## 6. Rollback Plan

If Error Rate > 5% or Critical Bug found:

1. **Stop Services:** Ctrl+C in all terminals.
2. **Revert Code:** `git checkout main` (or previous stable tag).
3. **Redeploy:** Follow steps 2-4 with stable version.
4. **Notify Users:** Post in #announcements about maintenance.
