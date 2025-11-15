# BIZRA Genesis Node - Operational Runbook

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Status:** Production Ready
**Owner:** Platform Operations Team

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Rollback Procedures](#rollback-procedures)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
8. [Maintenance Windows](#maintenance-windows)
9. [Security Operations](#security-operations)
10. [Contact Information](#contact-information)

---

## Overview

### Purpose

This runbook provides operational procedures for managing the BIZRA Genesis Node in production. It covers deployment, monitoring, incident response, and troubleshooting for the Alpha-100 launch program.

### Scope

- **Environment:** Production (Alpha-100)
- **User Capacity:** Up to 100 concurrent users
- **Availability Target:** 99.5% uptime
- **Support Hours:** 24/7 for critical incidents

### Service Level Objectives (SLOs)

| Metric | Target | Alerting Threshold |
|--------|--------|-------------------|
| P95 Latency | < 300ms | > 300ms for 5 minutes |
| P99 Latency | < 500ms | > 500ms for 5 minutes |
| Error Rate | ≤ 1% | > 1% for 2 minutes |
| Availability | ≥ 99.5% | < 99.5% in rolling 24h |
| Throughput | ≥ 100 req/s | < 100 req/s for 10 minutes |

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Users                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              nginx Reverse Proxy (TLS)                   │
│              - Let's Encrypt SSL/TLS                     │
│              - Rate Limiting                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           BIZRA Genesis Node (Rust/Axum)                 │
│           - REST API (:8080)                            │
│           - WebSocket (:8080)                           │
│           - Metrics Endpoint (/metrics)                 │
└─────┬───────────────┬───────────────────────────────────┘
      │               │
      ▼               ▼
┌─────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │
│  (Primary)   │ │   (Cache)    │
└─────────────┘ └──────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│              Prometheus + Grafana                        │
│              - Metrics Collection                        │
│              - Alerting                                  │
│              - Dashboards                                │
└─────────────────────────────────────────────────────────┘
```

### Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| API | `https://api.bizra.ai` | Main API endpoint |
| WebSocket | `wss://api.bizra.ai/ws` | Real-time connections |
| Metrics | `https://api.bizra.ai/metrics` | Prometheus metrics |
| Health Check | `https://api.bizra.ai/health` | Service health status |
| Grafana | `https://monitoring.bizra.ai` | Observability dashboard |

### Dependencies

- **PostgreSQL 15+**: Primary data store
- **Redis 7+**: Session cache and rate limiting
- **nginx 1.24+**: Reverse proxy with TLS termination
- **Prometheus 2.45+**: Metrics collection
- **Grafana 10+**: Visualization and alerting

---

## Deployment Procedures

### Pre-Deployment Checklist

Execute the pre-flight validation script before every deployment:

```bash
# Run pre-flight check
./scripts/pre-flight-check.sh

# Expected output: All checks PASS
# Exit code: 0 (success)
```

The pre-flight check validates:
- ✅ PostgreSQL connectivity and version
- ✅ Redis connectivity
- ✅ TLS certificates validity (>7 days)
- ✅ Disk space (>20% free)
- ✅ Memory availability (>2GB)
- ✅ Environment variables configured
- ✅ Database migrations status
- ✅ Backup verification

**Critical:** Never proceed with deployment if pre-flight check fails.

### Standard Deployment (Production)

#### 1. Prepare Deployment

```bash
# Navigate to project directory
cd /opt/bizra-genesis-node

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Verify version tag
git describe --tags

# Backup current database
./scripts/backup-database.sh
```

#### 2. Build Application

```bash
# Build release binary
cargo build --release

# Run tests
cargo test --release

# Expected: All tests passing (260+ tests)
```

#### 3. Generate/Rotate Secrets (if needed)

```bash
# Generate new secrets for first deployment
./scripts/generate-secrets.sh

# Or rotate existing secrets (requires downtime)
ENV_FILE=".env.production" ./scripts/generate-secrets.sh
```

#### 4. Deploy Application

```bash
# Stop current service
sudo systemctl stop bizra-genesis-node

# Replace binary
sudo cp target/release/bizra-genesis-node /usr/local/bin/

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start bizra-genesis-node

# Verify startup
sudo systemctl status bizra-genesis-node
```

#### 5. Run Canary Validation

```bash
# Monitor deployment for 5 minutes (30 requests)
./scripts/canary-monitor.sh \
  --base-url https://api.bizra.ai \
  --requests 30 \
  --interval 10

# Expected output: SLO MET (P95 < 300ms, error rate ≤ 1%)
# Exit code: 0 (success)
```

#### 6. Run E2E Tests

```bash
# Execute end-to-end tests
E2E_BASE_URL="https://api.bizra.ai" cargo test --test e2e_* -- --ignored

# Expected: All E2E tests passing (22 tests)
```

#### 7. Verify Metrics & Monitoring

```bash
# Check Prometheus metrics
curl -k https://api.bizra.ai/metrics | grep bizra_

# Verify Grafana dashboard
# Navigate to: https://monitoring.bizra.ai/d/alpha-100
# Confirm: Green health indicators
```

### Zero-Downtime Deployment (Blue-Green)

For zero-downtime deployments:

```bash
# Deploy to staging environment
./scripts/deploy-staging.sh

# Run full validation
./scripts/integration-test.sh --base-url https://staging.bizra.ai

# Promote to production
./scripts/promote-to-production.sh

# Nginx switches traffic to new instance automatically
```

### Database Migrations

```bash
# Check pending migrations
sqlx migrate info

# Apply migrations (with backup)
./scripts/backup-database.sh
sqlx migrate run

# Verify migration success
sqlx migrate info
```

---

## Monitoring & Alerting

### Grafana Dashboard Access

**URL:** https://monitoring.bizra.ai/d/alpha-100
**Credentials:** Stored in 1Password under "BIZRA Monitoring"

### Key Metrics to Monitor

#### 1. SLO Compliance Panel

Monitor continuously:
- **Success Rate:** Should be > 99%
- **P95 Latency:** Should be < 300ms
- **Alert Status:** Should be green

#### 2. Alpha-100 Funnel Panel

Track user growth:
- **Registered Users:** Max 100 for Alpha-100
- **Active Sessions:** Peak usage patterns
- **Invite Code Usage:** Remaining capacity

#### 3. System Health Panel

Component health:
- **Database:** Should be "healthy"
- **Redis:** Should be "healthy"
- **WebSocket:** Should be "healthy"
- **TLS Certificates:** Days until expiry

### Alert Definitions

| Alert | Severity | Threshold | Response Time |
|-------|----------|-----------|---------------|
| High P95 Latency | Critical | > 300ms for 5m | 15 minutes |
| High Error Rate | Critical | > 1% for 2m | 15 minutes |
| Service Down | Critical | Health check fails 3x | 5 minutes |
| Low Availability | High | < 99.5% in 24h | 1 hour |
| TLS Cert Expiry | Medium | < 7 days | 24 hours |
| Database Slow | Medium | P95 > 50ms | 1 hour |
| Alpha-100 Full | Low | 100 users reached | 4 hours |

### Log Locations

```bash
# Application logs
sudo journalctl -u bizra-genesis-node -f

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **SEV-1** | Complete service outage | 5 minutes | Immediate |
| **SEV-2** | Partial service degradation | 15 minutes | If not resolved in 30m |
| **SEV-3** | Minor issues, low impact | 1 hour | If not resolved in 4h |
| **SEV-4** | Maintenance or informational | Best effort | None |

### SEV-1: Service Outage

**Symptoms:**
- Health check endpoint returning 503
- Complete inability to serve requests
- Database connection failures

**Immediate Actions:**

```bash
# 1. Check service status
sudo systemctl status bizra-genesis-node

# 2. Check logs for errors
sudo journalctl -u bizra-genesis-node -n 100 --no-pager

# 3. Verify dependencies
./scripts/pre-flight-check.sh

# 4. If database is down
sudo systemctl restart postgresql

# 5. If service crashed, restart
sudo systemctl restart bizra-genesis-node

# 6. Execute rollback if recent deployment
./scripts/rollback.sh
```

**Communication:**
- Post in #incidents Slack channel
- Update status page: https://status.bizra.ai
- Notify on-call lead

### SEV-2: Performance Degradation

**Symptoms:**
- P95 latency > 300ms for 5+ minutes
- Error rate > 1% sustained
- Intermittent timeouts

**Diagnostic Steps:**

```bash
# 1. Check current performance metrics
curl -k https://api.bizra.ai/metrics | grep -E "(http_request_duration|http_requests_total)"

# 2. Check database performance
psql -U bizra_user -d bizra_db -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# 3. Check Redis performance
redis-cli INFO stats

# 4. Check system resources
htop
df -h
free -m

# 5. Identify slow queries
psql -U bizra_user -d bizra_db -c "SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Remediation:**
- Scale database connections if needed
- Clear Redis cache if stale
- Restart service if memory leak detected
- Consider rollback if related to recent deployment

---

## Rollback Procedures

### Automatic Rollback (Canary Failure)

If canary monitoring detects SLO violations:

```bash
# Canary script automatically triggers rollback
CANARY_ROLLBACK_CMD="./scripts/rollback.sh" ./scripts/canary-monitor.sh

# Rollback script will:
# 1. Stop current service
# 2. Restore previous binary from /opt/backups/
# 3. Restart service
# 4. Verify health
```

### Manual Rollback

```bash
# Option 1: Rollback to previous version
./scripts/rollback.sh

# Option 2: Rollback to specific version
./scripts/rollback.sh --version v1.2.3

# Option 3: Database rollback (if migrations applied)
sqlx migrate revert
```

### Verification After Rollback

```bash
# 1. Check service health
curl -k https://api.bizra.ai/health

# 2. Verify version
curl -k https://api.bizra.ai/health | jq '.version'

# 3. Run smoke tests
./scripts/integration-test.sh --quick

# 4. Monitor metrics for 15 minutes
watch -n 5 'curl -sk https://api.bizra.ai/metrics | grep http_requests_total'
```

---

## Common Issues & Troubleshooting

### Issue 1: High Latency

**Symptoms:** P95 latency > 300ms

**Diagnosis:**
```bash
# Check database query performance
psql -U bizra_user -d bizra_db -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check connection pool saturation
curl -k https://api.bizra.ai/metrics | grep db_connections
```

**Solutions:**
- Increase database connection pool: Edit `.env.production`, set `DATABASE_MAX_CONNECTIONS=20`
- Add database indexes for slow queries
- Enable query caching in Redis

### Issue 2: Authentication Failures

**Symptoms:** High rate of 401 errors, users cannot login

**Diagnosis:**
```bash
# Check auth metrics
curl -k https://api.bizra.ai/metrics | grep auth_logins_total

# Verify JWT secret is configured
grep JWT_SECRET .env.production

# Check token expiry settings
grep TOKEN_EXPIRY .env.production
```

**Solutions:**
- Verify JWT secret hasn't changed unexpectedly
- Check system time sync: `timedatectl status`
- Rotate secrets if compromised: `./scripts/generate-secrets.sh`

### Issue 3: WebSocket Connection Drops

**Symptoms:** Frequent WebSocket disconnections, ping/pong failures

**Diagnosis:**
```bash
# Check WebSocket metrics
curl -k https://api.bizra.ai/metrics | grep websocket_

# Check nginx WebSocket configuration
sudo nginx -T | grep -A 10 "location /ws"

# Monitor active connections
netstat -an | grep :8080 | grep ESTABLISHED | wc -l
```

**Solutions:**
- Increase nginx proxy timeouts: `proxy_read_timeout 3600s;`
- Check firewall rules for WebSocket traffic
- Verify load balancer WebSocket support

### Issue 4: Rate Limiting Blocking Users

**Symptoms:** Users receiving 429 Too Many Requests errors

**Diagnosis:**
```bash
# Check rate limit hits
curl -k https://api.bizra.ai/metrics | grep auth_rate_limit_hits_total

# Check Redis rate limiter state
redis-cli KEYS "rate_limit:*"
```

**Solutions:**
- Adjust rate limits in `src/api/mod.rs`: `.per_second(5)` and `.burst_size(10)`
- Clear specific rate limit: `redis-cli DEL "rate_limit:user@example.com"`
- Whitelist trusted IPs in nginx

### Issue 5: Database Connection Exhaustion

**Symptoms:** `too many clients already` errors in logs

**Diagnosis:**
```bash
# Check current connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
psql -U postgres -c "SHOW max_connections;"
```

**Solutions:**
```bash
# Increase PostgreSQL max connections
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 200;"
sudo systemctl restart postgresql

# Reduce application pool size temporarily
# Edit .env.production: DATABASE_MAX_CONNECTIONS=10
sudo systemctl restart bizra-genesis-node
```

---

## Maintenance Windows

### Scheduled Maintenance

**Preferred Window:** Sundays 02:00-04:00 UTC (Lowest traffic)

**Notification Requirements:**
- 72 hours advance notice to users
- Status page update 24 hours before
- Slack announcement in #general

**Maintenance Checklist:**
```bash
# 1. Pre-maintenance backup
./scripts/backup-database.sh
./scripts/backup-config.sh

# 2. Enable maintenance mode
sudo systemctl stop bizra-genesis-node

# 3. Perform maintenance tasks
# - Database optimization
# - Log rotation
# - Certificate renewal
# - System updates

# 4. Post-maintenance validation
./scripts/pre-flight-check.sh
./scripts/integration-test.sh

# 5. Disable maintenance mode
sudo systemctl start bizra-genesis-node

# 6. Monitor for 30 minutes
./scripts/canary-monitor.sh --duration 1800
```

### Emergency Maintenance

For unplanned maintenance:
1. Post immediate notification in Slack #incidents
2. Update status page with ETA
3. Follow standard deployment/rollback procedures
4. Post-incident review within 48 hours

---

## Security Operations

### Secret Rotation

**Frequency:** Every 90 days or immediately if compromised

```bash
# Generate new secrets
ENV_FILE=".env.production" ./scripts/generate-secrets.sh

# Restart services with new secrets
sudo systemctl restart bizra-genesis-node
sudo systemctl restart nginx
```

### TLS Certificate Renewal

**Automated:** Let's Encrypt auto-renews at 30 days before expiry

**Manual Renewal:**
```bash
# Renew certificates
sudo certbot renew

# Reload nginx
sudo systemctl reload nginx

# Verify expiry
echo | openssl s_client -connect api.bizra.ai:443 2>/dev/null | openssl x509 -noout -dates
```

### Security Scanning

**Weekly:**
```bash
# Dependency audit
cargo audit

# OWASP security check
./scripts/security-scan.sh
```

**Monthly:**
- Penetration testing review
- Access control audit
- Log analysis for suspicious activity

### Incident Response (Security)

1. **Isolate:** Disconnect affected systems
2. **Preserve:** Capture logs and evidence
3. **Notify:** Security team + management
4. **Investigate:** Root cause analysis
5. **Remediate:** Apply patches/fixes
6. **Document:** Post-incident report

---

## Contact Information

### On-Call Rotation

| Role | Primary | Backup |
|------|---------|--------|
| Platform Ops | See PagerDuty | See PagerDuty |
| Database Admin | See PagerDuty | See PagerDuty |
| Security Lead | See PagerDuty | See PagerDuty |

### Escalation Path

1. **L1:** On-call engineer (PagerDuty)
2. **L2:** Platform lead (15 minutes)
3. **L3:** Engineering manager (30 minutes)
4. **L4:** CTO (60 minutes for SEV-1)

### Communication Channels

- **Incidents:** #incidents (Slack)
- **Status Updates:** #ops-status (Slack)
- **Emergency:** PagerDuty page (SEV-1/SEV-2)
- **General Ops:** #platform-ops (Slack)

### External Services

- **Status Page:** https://status.bizra.ai
- **Monitoring:** https://monitoring.bizra.ai
- **Documentation:** https://docs.bizra.ai
- **Support:** support@bizra.ai

---

## Document Maintenance

This runbook should be reviewed and updated:
- **Monthly:** Operations team review
- **After incidents:** Update troubleshooting sections
- **After deployments:** Verify procedures accuracy
- **Quarterly:** Full audit and update

**Last Review:** 2025-11-15
**Next Review:** 2025-12-15
**Owner:** Platform Operations Team
