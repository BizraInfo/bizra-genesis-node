# BIZRA Genesis Node Launch Plan
## Node Zero (You) → Genesis 100 (First Users)

> **Document Version**: 1.0 | **Created**: 2025-11-26
> **Target**: Production launch with first 100 alpha users

---

## Executive Summary

| Metric | Status |
|--------|--------|
| **Current Readiness** | 60-65% |
| **Time to Node Zero** | 1-2 weeks |
| **Time to Genesis 100** | 3-4 weeks |
| **Total Engineering Hours** | ~120 hours |
| **Critical Blockers** | 3 |

---

## What We HAVE (Complete)

### Backend Infrastructure (85%)
| Component | Status | Notes |
|-----------|--------|-------|
| Rust API Server | Code complete | **94 compile errors to fix** |
| Database Schema | Ready | 13 migrations, all tables defined |
| SQLx Offline Cache | Partial | `.sqlx/` has 11 query files |
| WebSocket Server | 85% | Encryption working, JWT TODO |
| Authentication Framework | 70% | JWT + RBAC structure exists |
| Health Endpoints | Ready | `/health`, `/health/live`, `/health/ready` |
| Metrics Export | Ready | Prometheus `/metrics` |
| Rate Limiting | Ready | Governor middleware on auth routes |

### Frontend Dashboard (95%)
| Component | Status | Notes |
|-----------|--------|-------|
| React 19.2 + Vite 7.2 | Ready | Zero TypeScript errors |
| Login/Register | Ready | UI complete |
| Dashboard | Ready | Main overview page |
| Agents Page | Ready | PAT/SAT agent display |
| Monitoring Page | Ready | System health view |
| Onboarding Wizard | Ready | Multi-step flow |
| 80+ UI Components | Ready | shadcn/ui library |

### DevOps & CI/CD (95%)
| Component | Status | Notes |
|-----------|--------|-------|
| GitHub Actions | Ready | 10+ workflow jobs |
| Docker Compose | Ready | Production + monitoring stacks |
| Dockerfile.production | Ready | Multi-stage build |
| Security Scanning | Ready | Trivy, cargo audit |
| Performance Benchmarks | Ready | Criterion, k6 |

### AI/ML Infrastructure (70%)
| Component | Status | Notes |
|-----------|--------|-------|
| Model Stack Config | Ready | `config/bizra-model-stack.toml` |
| Ollama Integration | Code exists | Needs testing |
| Thompson Sampling Router | Code exists | Needs live testing |
| Consensus Algorithm | Code exists | Needs integration |

### Cryptography (85%)
| Component | Status | Notes |
|-----------|--------|-------|
| Ed25519 Signatures | Ready | Trust receipts |
| BLAKE3 Hashing | Ready | Content verification |
| AES-256-GCM | Ready | WebSocket encryption |
| JWT Tokens | Ready | Structure defined |

---

## What We're MISSING (Blockers)

### CRITICAL BLOCKERS (Must Fix)

#### 1. API Server Won't Compile
- **Impact**: Cannot run backend at all
- **Errors**: 94 compilation errors
- **Root Causes**:
  - Missing module exports in `lib.rs`
  - SQLx offline metadata incomplete
  - Type mismatches in handlers
- **Fix Time**: 8-12 hours

#### 2. Email Service Not Implemented
- **Impact**: Cannot send alpha invites, confirmations
- **Current**: Just TODO comments
- **Needed**: SendGrid/AWS SES integration
- **Fix Time**: 8-12 hours

#### 3. JWT Validation Incomplete
- **Impact**: Security vulnerability
- **Current**: Placeholder validation
- **Needed**: Proper secret key validation
- **Fix Time**: 4-6 hours

### HIGH PRIORITY (Before Genesis 100)

| Item | Status | Fix Time |
|------|--------|----------|
| WebSocket JWT validation | TODO | 6-8 hrs |
| User email verification | Missing | 4-6 hrs |
| Password reset flow | Missing | 4-6 hrs |
| Session management | Partial | 8-10 hrs |
| Per-user rate limiting | TODO | 4-6 hrs |
| Database backups | Not configured | 4-6 hrs |

### MEDIUM PRIORITY (Before Scale)

| Item | Status | Fix Time |
|------|--------|----------|
| MFA/2FA | Not started | 12-16 hrs |
| OAuth social login | Not started | 8-12 hrs |
| Secrets management (KMS) | Stub only | 6-8 hrs |
| Kubernetes manifests | Docs only | 8-12 hrs |
| Disaster recovery | Not documented | 6-8 hrs |

---

## Launch Timeline

### PHASE 1: FIX BLOCKERS (Week 1)
**Goal**: Get API server running locally

```
Day 1-2: Compilation Fixes
├── Fix lib.rs module exports (2-3 hrs)
├── Regenerate SQLx offline cache (2 hrs)
├── Fix type mismatches in handlers (3-4 hrs)
├── Add missing OpenAPI annotations (1-2 hrs)
└── VERIFICATION: `cargo build --release` succeeds

Day 3-4: Core Auth & Email
├── Implement JWT validation properly (4-6 hrs)
├── Set up SendGrid/AWS SES account (1 hr)
├── Implement email service wrapper (4-6 hrs)
├── Create email templates (2-3 hrs)
│   ├── Alpha invite
│   ├── Welcome email
│   └── Password reset
└── VERIFICATION: Can send test emails

Day 5: Integration Testing
├── Run full test suite (2 hrs)
├── Fix any failing tests (2-4 hrs)
├── Manual API testing with Postman (2 hrs)
└── VERIFICATION: All endpoints respond correctly
```

**Deliverables Week 1**:
- [ ] `cargo build --release` succeeds
- [ ] `cargo test` passes
- [ ] API server starts on port 3000
- [ ] Health check returns 200
- [ ] Can register a user
- [ ] Can login and get JWT
- [ ] Can send alpha invite email

---

### PHASE 2: NODE ZERO LAUNCH (Week 2)
**Goal**: You (MuMu) running full stack locally

```
Day 6-7: Local Stack Deployment
├── Start PostgreSQL + Redis (docker-compose)
├── Run migrations
├── Start API server
├── Start frontend dev server
├── Configure Ollama with bizra-planner model
└── VERIFICATION: Full stack running on localhost

Day 8-9: WebSocket & Real-time
├── Fix WebSocket JWT validation (4-6 hrs)
├── Implement agent message routing (4-6 hrs)
├── Test real-time updates (2 hrs)
└── VERIFICATION: WebSocket connects, messages flow

Day 10: Node Zero Validation
├── Complete user registration flow
├── Test all dashboard pages
├── Run synthesis orchestrator manually
├── Verify trust receipts generated
├── Test SAT-LAB outbox
└── VERIFICATION: Can complete full user journey
```

**Deliverables Week 2**:
- [ ] Full stack running on your machine
- [ ] Can login to dashboard
- [ ] Dashboard shows live data
- [ ] WebSocket connections work
- [ ] Can trigger synthesis
- [ ] Trust receipts are signed
- [ ] SAT-LAB queue functional

**NODE ZERO MILESTONE**: You are User #0, system works end-to-end

---

### PHASE 3: ALPHA PREP (Week 3)
**Goal**: Ready for 10 alpha testers

```
Day 11-12: Security Hardening
├── Implement session management (4-6 hrs)
├── Add token blacklisting (2-3 hrs)
├── Implement password reset flow (4-6 hrs)
├── Add email verification requirement (2-3 hrs)
└── VERIFICATION: Security audit passes

Day 13-14: Production Environment
├── Set up cloud VPS (DigitalOcean/Vultr/etc.)
├── Configure domain + SSL (Let's Encrypt)
├── Deploy PostgreSQL + Redis
├── Deploy API server container
├── Deploy frontend (Vercel/Netlify or same VPS)
├── Configure monitoring (Prometheus + Grafana)
└── VERIFICATION: https://your-domain.com/health returns 200

Day 15: Alpha 10 Onboarding
├── Generate 10 alpha invite codes
├── Send invite emails
├── Monitor signups
├── Watch logs for errors
├── Respond to feedback
└── VERIFICATION: 10 users can register and login
```

**Deliverables Week 3**:
- [ ] Production server running
- [ ] SSL/HTTPS configured
- [ ] Monitoring dashboard live
- [ ] 10 alpha users onboarded
- [ ] Feedback collection system

---

### PHASE 4: GENESIS 100 LAUNCH (Week 4)
**Goal**: Scale to first 100 users

```
Day 16-17: Scale Preparation
├── Load test with k6 (target: 100 concurrent users)
├── Identify and fix bottlenecks
├── Configure database connection pooling
├── Set up database backups (daily)
├── Add per-user rate limiting
└── VERIFICATION: System handles 100+ concurrent

Day 18-19: Genesis 100 Rollout
├── Generate 90 more invite codes (batches of 25)
├── Stagger invites over 48 hours
├── Monitor error rates
├── Scale up if needed
├── Document issues encountered
└── VERIFICATION: 100 users active

Day 20-21: Stabilization
├── Fix any bugs discovered
├── Improve error messages
├── Add missing validation
├── Collect user feedback
├── Plan Genesis 1000 roadmap
└── VERIFICATION: <1% error rate, users happy
```

**Deliverables Week 4**:
- [ ] 100 registered users
- [ ] <1% error rate
- [ ] <500ms average response time
- [ ] Database backups running
- [ ] Monitoring alerts configured
- [ ] User feedback collected

---

## Infrastructure Requirements

### For Node Zero (Local)

```yaml
Hardware (Your Titan):
  CPU: i9-14900HX (more than enough)
  RAM: 128GB DDR5 (excellent)
  GPU: RTX 4090 (for Ollama models)
  Storage: 100GB+ free

Software:
  - Docker Desktop
  - Rust toolchain (rustup)
  - Node.js 20+
  - PostgreSQL 15 (via Docker)
  - Redis 7 (via Docker)
  - Ollama (native install)

Models (already on your machine):
  - bizra-planner:latest (6.3 GB)
  - qwen2.5:7b (4.7 GB)
  - llama3.2:latest (2.0 GB)
  - deepseek-r1:8b (5.2 GB)
```

### For Genesis 100 (Production)

```yaml
Cloud Infrastructure:
  Option A - Single VPS (Simpler):
    Provider: DigitalOcean / Vultr / Hetzner
    Spec: 8 vCPU, 32GB RAM, 500GB SSD
    Cost: ~$150-200/month

  Option B - Managed Services (Scalable):
    Database: Supabase / Neon (managed Postgres)
    Cache: Upstash (managed Redis)
    Compute: Railway / Render / Fly.io
    Cost: ~$100-150/month (pay-as-you-go)

Domain & SSL:
  - Domain: bizra.ai or similar
  - SSL: Let's Encrypt (free) or Cloudflare

External Services:
  - Email: SendGrid Free (100 emails/day) or AWS SES ($0.10/1000)
  - Monitoring: Grafana Cloud Free tier
  - Logging: Grafana Loki or Papertrail

AI Models (Cloud fallback if needed):
  - Anthropic API key (for Claude backup)
  - OpenAI API key (for GPT backup)
  - Budget: ~$50/month for 100 users
```

---

## Step-by-Step Instructions

### STEP 1: Fix Compilation (TODAY)

```bash
# 1. Check current status
cd C:\bizra-genesis-node
cargo check 2>&1 | head -50

# 2. Ensure SQLx offline mode
set SQLX_OFFLINE=true

# 3. Try building
cargo build --release

# If errors, we fix them one by one
# Most common fixes:
# - Add missing pub mod declarations
# - Fix type imports
# - Regenerate SQLx cache if needed
```

### STEP 2: Start Local Services

```bash
# 1. Start PostgreSQL + Redis
docker-compose -f docker-compose.database.yml up -d

# 2. Wait for healthy
docker-compose -f docker-compose.database.yml ps

# 3. Run migrations
cargo sqlx migrate run

# 4. Verify
docker exec -it bizra-postgres psql -U bizra -d bizra_genesis -c "\dt"
```

### STEP 3: Run API Server

```bash
# 1. Set environment
set DATABASE_URL=postgres://bizra:password@localhost:5432/bizra_genesis
set REDIS_URL=redis://localhost:6379/0
set RUST_LOG=info
set JWT_SECRET=your-secret-key-here-make-it-long

# 2. Start server
cargo run --bin api_server --release

# 3. Verify
curl http://localhost:3000/health
```

### STEP 4: Run Frontend

```bash
# 1. Navigate to dashboard
cd apps/dashboard

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
# http://localhost:5173
```

### STEP 5: Configure Ollama

```bash
# 1. Start Ollama (should already be running)
ollama serve

# 2. Verify models
ollama list

# 3. Test bizra-planner
ollama run bizra-planner:latest "Hello, test response"
```

---

## Success Metrics

### Node Zero Success (Week 2)
- [ ] API server running without crashes for 24 hours
- [ ] Can complete full registration → login → dashboard flow
- [ ] WebSocket maintains connection for 1+ hour
- [ ] Synthesis produces valid trust receipts
- [ ] No security vulnerabilities in basic scan

### Genesis 10 Success (Week 3)
- [ ] 10 users successfully registered
- [ ] Average login time < 2 seconds
- [ ] Zero data loss incidents
- [ ] <5% error rate
- [ ] Basic monitoring alerts working

### Genesis 100 Success (Week 4)
- [ ] 100 users registered and active
- [ ] <1% error rate
- [ ] P95 response time < 500ms
- [ ] Daily database backups verified
- [ ] User feedback > 7/10 satisfaction
- [ ] Zero security incidents

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Compilation takes longer | Delays everything | Budget 2x time, get help |
| Email service rejected | Can't send invites | Have backup provider ready |
| Database corruption | Data loss | Daily backups from day 1 |
| Server overload | Poor UX | Start with 10, scale gradually |
| Security breach | Reputation damage | Security audit before public |
| Model too slow | Bad UX | Have cloud API fallback |

---

## Budget Estimate

### Month 1 (Launch)

| Item | Cost |
|------|------|
| Domain registration | $15 |
| VPS (8 vCPU, 32GB) | $150 |
| SSL (Let's Encrypt) | Free |
| SendGrid (100 emails/day) | Free |
| Grafana Cloud | Free tier |
| Anthropic API credits | $50 |
| **Total** | **~$215/month** |

### Month 2+ (Genesis 100 Stable)

| Item | Cost |
|------|------|
| VPS | $150 |
| Email (1000/day if needed) | $20 |
| Monitoring | Free |
| AI API budget | $100 |
| Backup storage | $10 |
| **Total** | **~$280/month** |

---

## Next Immediate Actions

### TODAY (Next 4 Hours)

1. **Fix compilation errors**
   ```bash
   cargo check 2>&1 | tee compile_errors.txt
   ```

2. **Identify top 10 errors and fix**

3. **Get `cargo build` working**

### TOMORROW

1. **Start full local stack**
2. **Test all API endpoints manually**
3. **Verify frontend connects to backend**

### THIS WEEK

1. **Complete Phase 1**
2. **Achieve Node Zero milestone**
3. **Document any issues found**

---

## Support Resources

### If Stuck on Compilation
- Check `COMPILATION_FIX_STATUS.md` for known issues
- Run `cargo check` to see current errors
- Focus on one error category at a time

### If Stuck on Deployment
- Use `docker-compose.production.yml` as reference
- Check `docs/deployment/PRODUCTION_DEPLOYMENT.md`
- Start simple (single VPS) before Kubernetes

### If Stuck on Configuration
- All env vars documented in `CLAUDE.md`
- Example configs in `config/` directory
- Default values work for local development

---

*Last Updated: 2025-11-26*
*Target: Node Zero (Week 2) → Genesis 100 (Week 4)*
