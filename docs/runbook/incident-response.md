# BIZRA Node0 - Incident Response Runbook
# Document ID: BIZRA-NODE0-v1.0.1-RUNBOOK
# Elite Operations: Systematic Incident Management

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Response Procedures](#response-procedures)
3. [Service-Specific Runbooks](#service-specific-runbooks)
4. [Post-Incident Process](#post-incident-process)
5. [Contacts & Escalation](#contacts--escalation)

---

## Incident Classification

### Severity Levels

| Level | Name | Description | Response Time | Resolution Target |
|-------|------|-------------|---------------|-------------------|
| SEV-1 | Critical | Complete service outage, data loss risk | 5 minutes | 1 hour |
| SEV-2 | Major | Significant degradation, >50% users affected | 15 minutes | 4 hours |
| SEV-3 | Minor | Partial degradation, <50% users affected | 1 hour | 24 hours |
| SEV-4 | Low | Cosmetic issues, no user impact | 24 hours | 1 week |

### Impact Assessment Matrix

```
                    USER IMPACT
                 Low    Medium    High
URGENCY   High   SEV-3   SEV-2   SEV-1
         Medium  SEV-4   SEV-3   SEV-2
          Low    SEV-4   SEV-4   SEV-3
```

---

## Response Procedures

### Initial Response (All Severities)

1. **Acknowledge** - Confirm incident in monitoring system
2. **Assess** - Determine severity using classification matrix
3. **Communicate** - Update status page / notify stakeholders
4. **Investigate** - Begin systematic troubleshooting
5. **Mitigate** - Apply temporary fix if available
6. **Resolve** - Implement permanent fix
7. **Document** - Complete post-incident report

### SEV-1 Critical Response Checklist

```bash
# IMMEDIATE ACTIONS (0-5 minutes)
□ Acknowledge alert in Grafana/PagerDuty
□ Join incident Slack channel: #bizra-incidents
□ Notify on-call lead
□ Begin incident timeline documentation

# ASSESSMENT (5-15 minutes)
□ Check service health: curl https://api.bizra.ai/health
□ Review Grafana dashboards
□ Check recent deployments
□ Review error logs

# MITIGATION (15-30 minutes)
□ Rollback if recent deployment caused issue
□ Scale up resources if capacity issue
□ Failover to backup if primary failed
□ Enable maintenance mode if needed

# RESOLUTION (30-60 minutes)
□ Identify root cause
□ Apply fix
□ Verify fix in monitoring
□ Remove maintenance mode
□ Notify stakeholders of resolution
```

---

## Service-Specific Runbooks

### 1. API Server (Rust/Axum) - Port 8080

#### Health Check
```bash
# Local
curl http://localhost:8080/health

# Production
curl https://api.bizra.ai/health
```

#### Common Issues

**Issue: API returning 502/503**
```bash
# Check if process is running
docker ps | grep bizra-node0-api

# Check logs
docker logs bizra-node0-api --tail 100

# Restart service
docker-compose -f docker/docker-compose.node0.yml restart api

# Check database connection
docker exec bizra-node0-api psql -U bizra_node0 -d bizra_genesis -c "SELECT 1"
```

**Issue: High latency (>500ms)**
```bash
# Check PostgreSQL slow queries
docker exec bizra-node0-db psql -U bizra_node0 -d bizra_genesis -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Check Redis memory
docker exec bizra-node0-redis redis-cli info memory

# Check API metrics
curl http://localhost:8080/metrics | grep http_request_duration
```

**Issue: Memory leak**
```bash
# Check container memory
docker stats bizra-node0-api --no-stream

# Force garbage collection (if available)
curl -X POST http://localhost:8080/admin/gc

# Restart with limits
docker-compose -f docker/docker-compose.node0.yml up -d --force-recreate api
```

### 2. Dashboard (Next.js) - Port 3000

#### Health Check
```bash
curl http://localhost:3000/api/health
```

#### Common Issues

**Issue: Dashboard not loading**
```bash
# Check container
docker ps | grep bizra-node0-dashboard

# Check logs
docker logs bizra-node0-dashboard --tail 100

# Verify build
docker exec bizra-node0-dashboard ls -la .next/

# Rebuild and restart
docker-compose -f docker/docker-compose.node0.yml up -d --build dashboard
```

**Issue: Slow initial load**
```bash
# Check bundle size
docker exec bizra-node0-dashboard cat .next/analyze/client.html

# Check CDN/cache headers
curl -I http://localhost:3000 | grep -i cache

# Clear Next.js cache
docker exec bizra-node0-dashboard rm -rf .next/cache
docker-compose restart dashboard
```

### 3. PostgreSQL - Port 5432

#### Health Check
```bash
docker exec bizra-node0-db pg_isready -U bizra_node0 -d bizra_genesis
```

#### Common Issues

**Issue: Connection refused**
```bash
# Check if running
docker ps | grep bizra-node0-db

# Check logs
docker logs bizra-node0-db --tail 100

# Check disk space
docker exec bizra-node0-db df -h /var/lib/postgresql/data

# Restart
docker-compose -f docker/docker-compose.node0.yml restart postgres
```

**Issue: Slow queries**
```bash
# Enable query logging temporarily
docker exec bizra-node0-db psql -U bizra_node0 -c "
SET log_min_duration_statement = 100;
SET log_statement = 'all';"

# Check locks
docker exec bizra-node0-db psql -U bizra_node0 -d bizra_genesis -c "
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL;"

# Kill long-running queries
docker exec bizra-node0-db psql -U bizra_node0 -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE duration > interval '5 minutes';"
```

**Issue: Disk full**
```bash
# Check size
docker exec bizra-node0-db du -sh /var/lib/postgresql/data/*

# Vacuum
docker exec bizra-node0-db psql -U bizra_node0 -d bizra_genesis -c "VACUUM FULL;"

# Clear old WAL files
docker exec bizra-node0-db psql -U bizra_node0 -c "SELECT pg_switch_wal();"
```

### 4. Redis - Port 6379

#### Health Check
```bash
docker exec bizra-node0-redis redis-cli ping
```

#### Common Issues

**Issue: Memory full**
```bash
# Check memory usage
docker exec bizra-node0-redis redis-cli info memory

# Clear cache (safe - only session data)
docker exec bizra-node0-redis redis-cli FLUSHDB

# Adjust maxmemory
docker exec bizra-node0-redis redis-cli CONFIG SET maxmemory 1gb
```

### 5. Ollama (AI Models) - Port 11434

#### Health Check
```bash
curl http://localhost:11434/api/version
```

#### Common Issues

**Issue: Model not responding**
```bash
# Check status
curl http://localhost:11434/api/tags

# Check GPU memory
nvidia-smi

# Restart Ollama
systemctl restart ollama

# Reload model
curl http://localhost:11434/api/generate -d '{"model":"llama3:8b","prompt":"test","stream":false}'
```

**Issue: Out of GPU memory**
```bash
# Unload all models
curl http://localhost:11434/api/generate -d '{"model":"","keep_alive":0}'

# Check loaded models
curl http://localhost:11434/api/ps

# Load smaller model
curl http://localhost:11434/api/pull -d '{"name":"mistral:7b"}'
```

---

## Monitoring Commands

### Quick Status Check
```bash
#!/bin/bash
# save as: scripts/quick-status.sh

echo "=== BIZRA Node0 Status Check ==="
echo ""

echo "🐳 Docker Services:"
docker-compose -f docker/docker-compose.node0.yml ps

echo ""
echo "💾 Disk Usage:"
df -h / | tail -1

echo ""
echo "🧠 Memory Usage:"
free -h

echo ""
echo "🎮 GPU Status:"
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv

echo ""
echo "🌐 Service Health:"
echo -n "API: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
echo ""
echo -n "Dashboard: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
echo ""
echo -n "Ollama: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/version
echo ""
```

### Log Aggregation
```bash
# All service logs
docker-compose -f docker/docker-compose.node0.yml logs -f --tail 100

# Specific service
docker-compose -f docker/docker-compose.node0.yml logs -f api

# Error logs only
docker-compose -f docker/docker-compose.node0.yml logs 2>&1 | grep -i error
```

---

## Post-Incident Process

### Timeline Template
```markdown
## Incident: [TITLE]

**Severity**: SEV-X
**Duration**: HH:MM - HH:MM (X minutes)
**Impact**: [Description of user impact]

### Timeline

| Time | Event |
|------|-------|
| HH:MM | [Event description] |
| HH:MM | [Event description] |

### Root Cause

[Detailed technical explanation]

### Resolution

[What was done to fix the issue]

### Action Items

- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]

### Lessons Learned

[What we learned from this incident]
```

---

## Contacts & Escalation

### On-Call Schedule
- Primary: Check PagerDuty/Opsgenie
- Secondary: [Backup contact]
- Escalation: [Management contact]

### Communication Channels
- Incidents: #bizra-incidents (Slack/Discord)
- Updates: status.bizra.ai
- Postmortems: docs/incidents/

### External Dependencies
| Service | Support | SLA |
|---------|---------|-----|
| Cloudflare | support.cloudflare.com | 99.9% |
| GitHub | githubstatus.com | 99.9% |

---

## Appendix: Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# BIZRA Operations Aliases
alias bizra-logs='docker-compose -f docker/docker-compose.node0.yml logs -f'
alias bizra-ps='docker-compose -f docker/docker-compose.node0.yml ps'
alias bizra-restart='docker-compose -f docker/docker-compose.node0.yml restart'
alias bizra-status='./scripts/quick-status.sh'
alias bizra-shell-api='docker exec -it bizra-node0-api sh'
alias bizra-shell-db='docker exec -it bizra-node0-db psql -U bizra_node0 -d bizra_genesis'
alias bizra-shell-redis='docker exec -it bizra-node0-redis redis-cli'
```
