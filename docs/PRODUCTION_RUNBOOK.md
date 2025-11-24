# BIZRA GENESIS NODE - PRODUCTION RUNBOOK

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintainer**: DevOps Team

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Backup & Recovery](#backup--recovery)
8. [Security Procedures](#security-procedures)
9. [Maintenance Windows](#maintenance-windows)
10. [Contact Information](#contact-information)

---

## 🏗️ SYSTEM OVERVIEW

### Production Environment

- **Platform**: AWS EKS (Kubernetes 1.28)
- **Region**: us-east-1 (Primary), us-west-2 (DR)
- **Namespace**: `bizra-production`
- **Domain**: `bizra.ai`, `api.bizra.ai`

### Key Components

| Component | Technology | Endpoint |
|-----------|------------|----------|
| API Server | Rust/Axum | `https://api.bizra.ai` |
| Frontend | React/Vite | `https://bizra.ai` |
| Database | PostgreSQL 16 (RDS) | `bizra-production.xxxx.rds.amazonaws.com` |
| Cache | Redis 7 (ElastiCache) | `bizra-production.xxxxx.cache.amazonaws.com` |
| Monitoring | Prometheus + Grafana | `https://grafana.bizra.ai` |
| Tracing | Jaeger | `https://observability.bizra.ai/jaeger` |
| Logs | Grafana Loki | `https://logs.bizra.ai` |

### Service Level Objectives (SLOs)

- **Availability**: 99.9% (43 minutes downtime/month)
- **API Latency (P95)**: < 500ms
- **API Latency (P99)**: < 1000ms
- **Consensus Latency (P95)**: < 100ms
- **Error Rate**: < 1%
- **Synthesis Success Rate**: > 95%

---

## 🏛️ ARCHITECTURE

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     PRODUCTION ARCHITECTURE                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CloudFront CDN → ALB → EKS Cluster → RDS PostgreSQL        │
│                    ↓                                         │
│                  Services:                                   │
│                  - bizra-genesis-node (3 replicas)          │
│                  - frontend (2 replicas)                     │
│                  - websocket-server (2 replicas)            │
│                    ↓                                         │
│                  ElastiCache Redis (Multi-AZ)               │
│                                                              │
│  Observability:                                              │
│  - Prometheus (metrics)                                      │
│  - Jaeger (traces)                                           │
│  - Loki (logs)                                               │
│  - Grafana (dashboards)                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request Flow**: Client → CloudFront → ALB → Kubernetes Service → Pod
2. **Database Flow**: Pod → RDS (Primary) / Read Replica
3. **Cache Flow**: Pod → ElastiCache (Primary + Replicas)
4. **Observability Flow**: Pod → OpenTelemetry Collector → Jaeger/Prometheus/Loki

---

## 🚀 DEPLOYMENT PROCEDURES

### Pre-Deployment Checklist

- [ ] All tests passing in CI/CD
- [ ] Contract tests verified
- [ ] Security scan passed
- [ ] Database migrations reviewed
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)

### Standard Deployment (Rolling Update)

```bash
# 1. Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name bizra-genesis-node-production

# 2. Verify current state
kubectl get deployments -n bizra-production
kubectl get pods -n bizra-production

# 3. Deploy new version
kubectl set image deployment/bizra-genesis-node \
  bizra-genesis-node=ghcr.io/bizra/genesis-node:v1.1.0 \
  -n bizra-production

# 4. Monitor rollout
kubectl rollout status deployment/bizra-genesis-node -n bizra-production --timeout=15m

# 5. Verify health
kubectl get pods -n bizra-production
curl https://bizra.ai/api/v1/health

# 6. Check metrics
# Open Grafana: https://grafana.bizra.ai
# Monitor error rate, latency, throughput
```

### Canary Deployment

```bash
# 1. Deploy canary (10% traffic)
kubectl patch deployment bizra-genesis-node-canary \
  -n bizra-production \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/image", "value":"ghcr.io/bizra/genesis-node:v1.1.0"}]'

# 2. Wait 10 minutes, monitor metrics

# 3. If healthy, proceed to full deployment
# If issues detected, rollback canary

# 4. Full deployment
kubectl set image deployment/bizra-genesis-node \
  bizra-genesis-node=ghcr.io/bizra/genesis-node:v1.1.0 \
  -n bizra-production
```

### Database Migrations

```bash
# 1. Backup database
aws rds create-db-snapshot \
  --db-instance-identifier bizra-production \
  --db-snapshot-identifier bizra-production-pre-migration-$(date +%Y%m%d-%H%M%S)

# 2. Run migrations (via job)
kubectl apply -f k8s/jobs/migration-job.yaml -n bizra-production

# 3. Monitor migration
kubectl logs -f job/migration-$(date +%Y%m%d) -n bizra-production

# 4. Verify migration
kubectl exec -it deployment/bizra-genesis-node -n bizra-production -- \
  sqlx migrate info
```

### Rollback Procedures

```bash
# Emergency Rollback (immediate)
kubectl rollout undo deployment/bizra-genesis-node -n bizra-production

# Rollback to specific version
kubectl set image deployment/bizra-genesis-node \
  bizra-genesis-node=ghcr.io/bizra/genesis-node:v1.0.0 \
  -n bizra-production

# Verify rollback
kubectl rollout status deployment/bizra-genesis-node -n bizra-production
```

---

## 📊 MONITORING & ALERTING

### Key Dashboards

1. **BIZRA Overview** - `https://grafana.bizra.ai/d/bizra-overview`
   - Synthesis requests, latency, Ihsan score, error rate

2. **Consensus Metrics** - `https://grafana.bizra.ai/d/bizra-consensus`
   - Consensus latency, timeouts, success rate

3. **Infrastructure** - `https://grafana.bizra.ai/d/bizra-infrastructure`
   - Pod resources, DB connections, Redis cache hits

### Critical Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| HighSynthesisLatency | P95 > 2s for 5m | Investigate routing, check model availability |
| SynthesisFailureRate | > 5% for 5m | Check API keys, model endpoints, logs |
| ConsensusTimeout | > 0.01/s for 5m | Review consensus algorithm, check DB performance |
| LowIhsanScore | Avg < 0.7 for 10m | Investigate model quality, check scoring logic |
| HighPodMemoryUsage | > 90% for 5m | Scale up pods or investigate memory leak |
| DatabaseConnectionPoolExhaustion | < 10% idle for 5m | Increase pool size or investigate connection leaks |

### Checking System Health

```bash
# Health endpoint
curl https://bizra.ai/api/v1/health

# Readiness endpoint
curl https://bizra.ai/api/v1/ready

# Metrics endpoint
curl https://bizra.ai/api/v1/metrics

# Pod status
kubectl get pods -n bizra-production

# Pod logs
kubectl logs -f deployment/bizra-genesis-node -n bizra-production --tail=100

# Events
kubectl get events -n bizra-production --sort-by='.lastTimestamp'
```

---

## 🚨 INCIDENT RESPONSE

### Incident Severity Levels

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **SEV-1** | Complete service outage | Immediate |
| **SEV-2** | Degraded performance affecting >50% users | 15 minutes |
| **SEV-3** | Partial functionality impaired | 1 hour |
| **SEV-4** | Minor issues, no user impact | Next business day |

### SEV-1 Incident Response (Service Outage)

1. **Immediate Actions** (0-5 minutes)
   ```bash
   # Check service status
   kubectl get pods -n bizra-production
   kubectl get deployments -n bizra-production

   # Check recent events
   kubectl get events -n bizra-production --sort-by='.lastTimestamp' | tail -20

   # Check application logs
   kubectl logs -f deployment/bizra-genesis-node -n bizra-production --tail=200
   ```

2. **Diagnosis** (5-15 minutes)
   - Check Grafana dashboards for anomalies
   - Review recent deployments: `kubectl rollout history deployment/bizra-genesis-node -n bizra-production`
   - Check external dependencies (OpenAI, Anthropic APIs)
   - Verify database connectivity: `kubectl exec -it deployment/bizra-genesis-node -n bizra-production -- pg_isready`

3. **Resolution** (15-30 minutes)
   - If recent deployment: Rollback immediately
   - If infrastructure: Check AWS Console for RDS, ElastiCache, EKS status
   - If third-party API: Enable fallback routes, notify users
   - If database: Check RDS CPU, connections, slow queries

4. **Communication**
   - Post status update: `https://status.bizra.ai`
   - Notify team via Slack: `#incidents`
   - Update PagerDuty incident

5. **Post-Mortem** (Within 48 hours)
   - Document incident timeline
   - Identify root cause
   - Action items to prevent recurrence
   - Share with team

### SEV-2 Incident Response (Performance Degradation)

1. **Check Performance Metrics**
   ```bash
   # API latency
   curl https://grafana.bizra.ai/api/datasources/proxy/1/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))

   # Error rate
   curl https://grafana.bizra.ai/api/datasources/proxy/1/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
   ```

2. **Common Causes**
   - High traffic → Scale up: `kubectl scale deployment/bizra-genesis-node --replicas=6 -n bizra-production`
   - Database slow → Check slow query log, add indexes
   - Cache miss → Warm cache, check Redis eviction
   - External API slow → Increase timeouts, enable fallback

### Emergency Contacts

| Role | Contact | Phone | PagerDuty |
|------|---------|-------|-----------|
| On-Call Engineer | rotating | - | Primary |
| DevOps Lead | devops@bizra.ai | +1-XXX-XXX-XXXX | Secondary |
| CTO | cto@bizra.ai | +1-XXX-XXX-XXXX | Escalation |

---

## 🔧 COMMON ISSUES & SOLUTIONS

### Issue: Pod CrashLoopBackOff

**Symptoms**: Pod repeatedly restarting

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n bizra-production
kubectl logs <pod-name> -n bizra-production --previous
```

**Solutions**:
1. Check environment variables and secrets
2. Verify database connectivity
3. Check resource limits (CPU, memory)
4. Review recent configuration changes

### Issue: High Memory Usage

**Symptoms**: Pods using >80% memory

**Diagnosis**:
```bash
kubectl top pods -n bizra-production
kubectl exec -it <pod-name> -n bizra-production -- ps aux --sort=-%mem | head
```

**Solutions**:
1. Increase memory limit: Update `resources.limits.memory` in deployment
2. Investigate memory leak: Enable profiling, analyze heap
3. Scale horizontally: Increase replicas

### Issue: Database Connection Pool Exhausted

**Symptoms**: "connection pool timeout" errors in logs

**Diagnosis**:
```bash
# Check active connections
kubectl exec -it deployment/bizra-genesis-node -n bizra-production -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'bizra_genesis';"
```

**Solutions**:
1. Increase pool size: Update `DB_POOL_MAX_CONNECTIONS` environment variable
2. Investigate connection leaks: Check for unclosed connections in code
3. Optimize queries: Add indexes, reduce query complexity

### Issue: High API Latency

**Symptoms**: P95 latency > 500ms

**Diagnosis**:
```bash
# Check Jaeger traces
# Visit: https://observability.bizra.ai/jaeger
# Search for slow traces

# Check database performance
# Visit: https://console.aws.amazon.com/rds/
# Check Performance Insights
```

**Solutions**:
1. Optimize slow queries: Add indexes, refactor queries
2. Enable caching: Cache frequently accessed data in Redis
3. Optimize routing: Adjust Thompson Sampling parameters
4. Scale up: Increase database instance size or add read replicas

---

## 💾 BACKUP & RECOVERY

### Automated Backups

- **Database**: Daily snapshots at 03:00 UTC, 30-day retention
- **Redis**: Daily snapshots at 02:00 UTC, 7-day retention
- **Configuration**: GitOps (ArgoCD) - all config in Git
- **Secrets**: AWS Secrets Manager with automatic rotation

### Manual Backup

```bash
# Database snapshot
aws rds create-db-snapshot \
  --db-instance-identifier bizra-production \
  --db-snapshot-identifier bizra-manual-$(date +%Y%m%d-%H%M%S)

# Export data
kubectl exec -it deployment/bizra-genesis-node -n bizra-production -- \
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://bizra-production-backups/manual/
```

### Disaster Recovery

**RPO (Recovery Point Objective)**: 1 hour
**RTO (Recovery Time Objective)**: 4 hours

**DR Procedure**:

1. **Activate DR Environment** (us-west-2)
   ```bash
   # Update DNS to point to DR region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456 \
     --change-batch file://dr-failover.json
   ```

2. **Restore Database**
   ```bash
   # Restore from latest snapshot
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier bizra-production-dr \
     --db-snapshot-identifier <latest-snapshot>
   ```

3. **Deploy Application**
   ```bash
   # Update kubeconfig for DR cluster
   aws eks update-kubeconfig --region us-west-2 --name bizra-genesis-node-dr

   # Deploy via ArgoCD
   kubectl apply -f infra/gitops/argocd/application-dr.yaml
   ```

4. **Verify Service**
   ```bash
   curl https://bizra.ai/api/v1/health
   # Monitor metrics for 30 minutes
   ```

---

## 🔐 SECURITY PROCEDURES

### Secret Rotation

```bash
# Rotate JWT secret
aws secretsmanager rotate-secret \
  --secret-id bizra-production-jwt-secret

# Update pods with new secret
kubectl rollout restart deployment/bizra-genesis-node -n bizra-production
```

### Security Incident Response

1. **Suspected Breach**
   - Immediately revoke all API keys
   - Force logout all users
   - Enable maintenance mode
   - Collect logs and artifacts
   - Contact security team

2. **API Key Leak**
   ```bash
   # Revoke compromised key
   aws secretsmanager update-secret \
     --secret-id bizra-production-openai-key \
     --secret-string "new-api-key"

   # Restart pods to pick up new key
   kubectl rollout restart deployment/bizra-genesis-node -n bizra-production
   ```

### Access Audit

```bash
# Review AWS CloudTrail logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --max-items 100

# Review Kubernetes audit logs
kubectl get events -n bizra-production --sort-by='.lastTimestamp' | grep -i "delete\|create"
```

---

## 🔧 MAINTENANCE WINDOWS

### Scheduled Maintenance

- **Frequency**: Monthly (2nd Sunday, 02:00-04:00 UTC)
- **Notification**: 7 days advance notice via email + status page
- **Scope**: System updates, database optimization, security patches

### Maintenance Checklist

- [ ] Update status page: `https://status.bizra.ai`
- [ ] Notify users via email
- [ ] Create database backup
- [ ] Test deployment in staging
- [ ] Execute maintenance
- [ ] Verify all services healthy
- [ ] Update status page (resolved)

---

## 📞 CONTACT INFORMATION

### Internal Contacts

- **DevOps Team**: devops@bizra.ai
- **Security Team**: security@bizra.ai
- **Support Team**: support@bizra.ai

### External Vendors

- **AWS Support**: Enterprise Support (24/7)
- **OpenAI Support**: platform@openai.com
- **Anthropic Support**: support@anthropic.com

### Escalation Path

1. On-Call Engineer (Primary)
2. DevOps Lead (Secondary)
3. Engineering Manager
4. CTO

---

## 📝 CHANGE LOG

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-15 | 1.0.0 | Initial production runbook | DevOps Team |

---

**Last Reviewed**: 2025-11-15
**Next Review**: 2026-02-15
