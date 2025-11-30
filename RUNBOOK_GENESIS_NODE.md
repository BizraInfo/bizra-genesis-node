# BIZRA Genesis Node – Operations Runbook (P1.6)

## 1. Overview

This operational runbook provides comprehensive procedures for:

- **Deploying** Genesis Node to development, staging, and production environments
- **Verifying** health and functionality post-deployment
- **Troubleshooting** common issues during operations
- **Rolling back** deployments safely when necessary
- **Maintaining** system health and performance

**Target Platforms**: Docker Compose (all environments), Kubernetes (future production)

---

## 2. Architecture Summary

### 2.1 Component Stack
- **API Server**: Rust/Axum binary container (`bizra-genesis-node`)
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis 7 for session and rate limit management
- **Observability**: Prometheus + Grafana for monitoring and visualization

### 2.2 Environment Configurations
- **`dev`**: Local development with docker-compose.yml
- **`stage`**: Cloud-hosted staging with docker-compose.stage.yml
- **`prod`**: Production environment with docker-compose.prod.yml

### 2.3 Critical Endpoints
- **Health**: `GET /health` - System availability check
- **Metrics**: `GET /metrics` - Prometheus metrics (admin-restricted)
- **SAPE API**: `POST /sape/execute` - Core AI processing
- **Agent Status**: `GET /agents/status` - System state monitoring

---

## 3. Pre-Deployment Checklist

### 3.1 Mandatory Prerequisites
- [ ] **PROD_READINESS_CRITERIA.md** all requirements satisfied
- [ ] All P1.1-P1.5 CI workflows green on `main` branch
- [ ] Production readiness criteria signed off by technical owner
- [ ] No active P0/critical incidents in production
- [ ] Scheduled maintenance window available (for production)

### 3.2 Environment-Specific Prerequisites

**For Development Deployment:**
- [ ] Local Docker Compose environment healthy
- [ ] PostgreSQL and Redis containers available
- [ ] Required environment variables configured (`.env`)

**For Staging Deployment:**
- [ ] Cloud infrastructure provisioned and accessible
- [ ] Database and Redis services running
- [ ] Container registry authentication working
- [ ] Network connectivity to AI providers verified

**For Production Deployment:**
- [ ] Vault/HSM secrets management accessible
- [ ] Load balancer and TLS termination configured
- [ ] DNS records pointing to correct endpoints
- [ ] Monitoring and alerting thresholds set
- [ ] On-call team notified of deployment window

---

## 4. Deployment Procedures

### 4.1 Development Environment Deployment

**Purpose**: Rapid iteration during development

```bash
# Step 1: Ensure clean state
docker compose down -v

# Step 2: Pull latest images (optional)
docker compose pull

# Step 3: Start services
docker compose up -d

# Step 4: Wait for initialization
sleep 30

# Step 5: Verify health
curl -f http://localhost:8080/health || exit 1

# Step 6: Run smoke tests
cargo test integration_test -- --test-threads=1
```

**Expected Duration**: 2-5 minutes  
**Rollback**: `docker compose down` and `docker compose up -d` with previous image

### 4.2 Staging Environment Deployment

**Purpose**: Pre-production validation and testing

```bash
#!/bin/bash
set -e

echo "🚀 Starting Genesis Node staging deployment..."

# Step 1: Authenticate to registry
echo $REGISTRY_PASSWORD | docker login registry.bizra.ai -u $REGISTRY_USER --password-stdin

# Step 2: Pull and verify images
docker pull registry.bizra.ai/bizra/genesis-node:$VERSION
docker inspect registry.bizra.ai/bizra/genesis-node:$VERSION | jq '.[] | select(.RepoTags[0] | contains($VERSION))'

# Step 3: Update docker-compose.stage.yml with new image version
sed -i "s|image: registry.bizra.ai/bizra/genesis-node:.*|image: registry.bizra.ai/bizra/genesis-node:$VERSION|g" docker-compose.stage.yml

# Step 4: Deploy new version
docker compose -f docker-compose.stage.yml pull
docker compose -f docker-compose.stage.yml up -d

# Step 5: Wait for health checks (2 minutes grace period)
echo "⏳ Waiting for staging deployment to stabilize..."
for i in {1..120}; do
  if curl -sf "https://stage.genesis.bizra.ai/health" -H "Authorization: Bearer $STAGING_API_KEY" > /dev/null; then
    echo "✅ Staging deployment verified healthy"
    break
  fi
  echo "Waiting for healthy response... ($i/120)"
  sleep 3
done

# Step 6: Run automated smoke tests
npm test integration/smoke-test.js -- --environment=staging

# Step 7: Notify team
echo "🎉 Staging deployment successful - notify QA team"
curl -X POST $SLACK_WEBHOOK -d "{\"text\": \"Genesis Node $VERSION deployed to staging successfully\"}"

echo "Staging deployment completed at $(date)"
```

**Expected Duration**: 5-15 minutes  
**Success Criteria**:
- Health endpoint returns 200 OK
- Smoke tests pass (100% success rate)
- No error spikes in Grafana dashboard
- Core API endpoints responding correctly

### 4.3 Production Environment Deployment

**Purpose**: Zero-downtime production releases

```bash
#!/bin/bash
set -e

# Production deployment with blue-green strategy
echo "🔄 Starting Genesis Node blue-green production deployment..."

VERSION=$1
ROLLBACK_WINDOW="30m"  # 30 minute rollback window

# Step 1: Pre-deployment verification
echo "🔍 Running pre-deployment verification..."

# Check production readiness criteria
if ! ./scripts/verify_prd_criteria.sh; then
  echo "❌ Production readiness criteria not met - aborting deployment"
  exit 1
fi

# Verify staging has been stable for minimum period
STAGING_UPTIME=$(curl -s https://stage.genesis.bizra.ai/metrics | grep "uptime" | awk '{print $2}')
if [ "$STAGING_UPTIME" -lt 604800 ]; then  # 7 days in seconds
  echo "❌ Staging has not been stable for 7+ days - aborting"
  exit 1
fi

# Step 2: Blue-green deployment preparation
echo "🎯 Preparing blue-green deployment..."

# Tag current production as "blue" (current)
BLUE_VERSION=$(docker ps | grep genesis-node | awk '{print $2}' | cut -d':' -f2)
if [ -z "$BLUE_VERSION" ]; then
  echo "❌ Could not determine current blue version"
  exit 1
fi

# Step 3: Deploy green environment
echo "🌅 Deploying green environment (v$VERSION)..."
docker tag registry.bizra.ai/bizra/genesis-node:$VERSION registry.bizra.ai/bizra/genesis-node:green
docker push registry.bizra.ai/bizra/genesis-node:green

# Update docker-compose.prod.yml green environment
cp docker-compose.prod.yml docker-compose.prod.green.yml
sed -i "s|registry.bizra.ai/bizra/genesis-node:.*|registry.bizra.ai/bizra/genesis-node:green|g" docker-compose.prod.green.yml

# Deploy green environment (on different port or with service label)
docker compose -f docker-compose.prod.green.yml up -d

# Step 4: Green environment health verification
echo "🩺 Verifying green environment health..."
for i in {1..300}; do  # 10 minutes grace period
  if curl -sf "http://localhost:8081/health" > /dev/null 2>&1; then
    echo "✅ Green environment healthy"
    break
  fi
  echo "Waiting for green environment... ($i/300)"
  sleep 2
done

# Additional health checks
curl -sf "http://localhost:8081/metrics" -H "Authorization: Bearer $ADMIN_API_KEY" > /dev/null
curl -sf -X POST "http://localhost:8081/sape/execute" -H "Content-Type: application/json" -d '{"query":"test"}' > /dev/null

# Step 5: Gradual traffic shift (10% → 50% → 100%)
echo "📊 Shifting traffic to green environment..."

# For this implementation, we'll use nginx upstream switching
# In production, this would use a load balancer or service mesh
./scripts/traffic_switch.sh green 10   # 10% traffic to green
sleep 300  # Monitor for 5 minutes

./scripts/traffic_switch.sh green 50   # 50% traffic to green
sleep 600  # Monitor for 10 minutes

./scripts/traffic_switch.sh green 100  # 100% traffic to green
sleep 600  # Final monitoring period

# Step 6: Production verification and rollback window
echo "🎯 Monitoring production for $ROLLBACK_WINDOW rollback window..."

# Monitor key metrics during rollback window
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 1800))  # 30 minutes

while [ $(date +%s) -lt $END_TIME ]; do
  # Check error rates in Grafana API
  ERROR_RATE=$(curl -s "https://grafana.bizra.ai/api/ds/query" \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "queries": [{
        "refId": "A",
        "expr": "rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])"
      }],
      "range": { "from": "now-5m", "to": "now" }
    }' | jq '.results.A.frames[0].data.values[0] || 0')

  # Check latency P95
  LATENCY_P95=$(curl -s "https://grafana.bizra.ai/api/ds/query" \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "queries": [{
        "refId": "A",
        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
      }],
      "range": { "from": "now-5m", "to": "now" }
    }' | jq '.results.A.frames[0].data.values[0] || 0')

  # Rollback triggers
  if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )) || (( $(echo "$LATENCY_P95 > 0.1" | bc -l) )); then
    echo "🚨 Rollback triggered - Error rate: ${ERROR_RATE}, Latency P95: ${LATENCY_P95}s"
    ./scripts/rollback_production.sh
    echo "❌ Production deployment rolled back due to SLA violation"
    exit 1
  fi

  echo "✅ Monitoring (${ERROR_RATE} errors, ${LATENCY_P95}s P95)..."
  sleep 60
done

# Step 7: Deployment success confirmation
echo "🎉 Production deployment successful - transitioning to post-deployment monitoring"

# Update deployment tracking
echo "Production deployment $VERSION completed at $(date)" >> deployment_history.log

# Notify stakeholders
curl -X POST $SLACK_WEBHOOK -d "{\"text\": \"✅ Genesis Node $VERSION successfully deployed to production\"}"

# Clean up old blue environment
docker compose -f docker-compose.prod.yml down
mv docker-compose.prod.green.yml docker-compose.prod.yml

echo "Production deployment completed successfully"
```

**Expected Duration**: 45-90 minutes (including monitoring window)  
**Success Criteria**:
- No rollback triggers activated during monitoring window
- All SLA metrics within acceptable ranges
- Business-critical user journeys functioning
- Grafana dashboards showing normal operation

---

## 5. Health Verification Procedures

### 5.1 Automated Health Checks

```bash
#!/bin/bash
# health_verification.sh

# Check 1: HTTP Health Endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://genesis-node.bizra.ai/health)
if [ "$HEALTH_STATUS" != "200" ]; then
  echo "❌ Health check failed: HTTP $HEALTH_STATUS"
  exit 1
fi

# Check 2: Database Connectivity (via health endpoint)
curl -s https://genesis-node.bizra.ai/health | jq -e '.database == "healthy"' > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Database connectivity check failed"
  exit 1
fi

# Check 3: Core API Functionality
SAP_RESPONSE=$(curl -s -X POST https://genesis-node.bizra.ai/sape/execute \
  -H "Content-Type: application/json" \
  -d '{"query":"What is AI?"}')
if [ -z "$SAP_RESPONSE" ] || ! echo "$SAP_RESPONSE" | jq -e '.result' > /dev/null; then
  echo "❌ SAPE API functionality test failed"
  exit 1
fi

# Check 4: Metrics Endpoint (admin access required)
METRICS_RESPONSE=$(curl -s https://genesis-node.bizra.ai/metrics \
  -H "Authorization: Bearer $ADMIN_API_KEY")
if ! echo "$METRICS_RESPONSE" | grep -q "# TYPE"; then
  echo "❌ Metrics endpoint check failed"
  exit 1
fi

echo "✅ All health checks passed"
```

### 5.2 Performance Verification

```bash
#!/bin/bash
# performance_verification.sh

echo "⚡ Running performance verification..."

# Run abbreviated K6 performance test (5 minutes)
k6 run --duration 5m --vus 50 --out json=perf_verify.json k6/performance-tests.js

# Check performance thresholds
AVG_RESPONSE=$(jq '.metrics."http_req_duration".values.avg // 0' perf_verify.json)
P95_RESPONSE=$(jq '.metrics."http_req_duration".values."p(95)" // 0' perf_verify.json)
ERROR_RATE=$(jq '.metrics.errors.values.rate // 0' perf_verify.json)

if (( $(echo "$AVG_RESPONSE >= 5.0" | bc -l) )) || \
   (( $(echo "$P95_RESPONSE >= 10.0" | bc -l) )) || \
   (( $(echo "$ERROR_RATE >= 0.001" | bc -l) )); then
  echo "❌ Performance verification failed"
  echo "Average: ${AVG_RESPONSE}ms, P95: ${P95_RESPONSE}ms, Errors: ${ERROR_RATE}%"
  exit 1
fi

echo "✅ Performance verification passed"
```

### 5.3 Business Logic Verification

```bash
#!/bin/bash
# business_logic_verification.sh

echo "🔍 Running business logic verification..."

# Test 1: Agent Status Functionality
AGENT_STATUS=$(curl -s https://genesis-node.bizra.ai/agents/status)
AGENT_COUNT=$(echo "$AGENT_STATUS" | jq '.total_agents // 0')
if [ "$AGENT_COUNT" -ne 12 ]; then
  echo "❌ Agent status verification failed: $AGENT_COUNT agents (expected 12)"
  exit 1
fi

# Test 2: API Compare Functionality (if exists)
COMPARE_RESPONSE=$(curl -s "https://genesis-node.bizra.ai/api/compare?query=test")
if ! echo "$COMPARE_RESPONSE" | jq -e '.comparisons' > /dev/null; then
  echo "❌ API compare functionality test failed"
  exit 1
fi

# Test 3: Trust Receipts Generation
TRUST_TEST=$(curl -s -X POST https://genesis-node.bizra.ai/sape/execute \
  -H "Content-Type: application/json" \
  -d '{"query":"Test trust receipt generation"}')
if ! echo "$TRUST_TEST" | jq -e '.trust_receipts' > /dev/null; then
  echo "⚠️ Trust receipt generation may need verification"
fi

echo "✅ Business logic verification completed"
```

---

## 6. Rollback Procedures

### 6.1 Development Rollback

**Duration**: <1 minute

```bash
# Quick rollback for development issues
docker compose down
docker compose pull  # Pull previous image tag
docker compose up -d

# Verify rollback
curl -f http://localhost:8080/health
```

### 6.2 Staging Rollback

**Duration**: 5-10 minutes

```bash
#!/bin/bash
# staging_rollback.sh

echo "🔄 Rolling back staging deployment..."

# Identify previous known-good tag
PREVIOUS_TAG=$(git tag --sort=-version:refname | grep -E "staging-" | head -2 | tail -1 | sed 's/staging-//')

# Revert docker-compose.stage.yml
git checkout HEAD~1 -- docker-compose.stage.yml

# Deploy previous version
docker compose -f docker-compose.stage.yml pull
docker compose -f docker-compose.stage.yml up -d

# Verify health
for i in {1..60}; do
  if curl -sf https://stage.genesis.bizra.ai/health > /dev/null; then
    echo "✅ Staging rollback successful"
    break
  fi
  sleep 3
done
```

### 6.3 Production Rollback

**Duration**: 15-30 minutes

```bash
#!/bin/bash
# production_rollback.sh

echo "🚨 Initiating production rollback procedure..."

# Step 1: Immediately shift all traffic back to blue environment
./scripts/traffic_switch.sh blue 100

# Step 2: Monitor traffic shift completion
while true; do
  BLUE_TRAFFIC=$(curl -s https://monitoring.bizra.ai/api/blue-traffic-percent)
  if [ "$BLUE_TRAFFIC" = "100" ]; then
    echo "✅ Traffic fully shifted to blue environment"
    break
  fi
  echo "Shifting traffic... (${BLUE_TRAFFIC}% blue)"
  sleep 5
done

# Step 3: Verify blue environment health
for i in {1..120}; do
  if curl -sf https://genesis-node.bizra.ai/health > /dev/null; then
    echo "✅ Blue environment confirmed healthy"
    break
  fi
  echo "Health check failed, environment may need restart..."
  sleep 2
done

# Step 4: Scale down green environment
docker compose -f docker-compose.prod.green.yml down

# Step 5: Restore original configuration
mv docker-compose.prod.blue.yml docker-compose.prod.yml

# Step 6: Post-incident analysis
echo "📋 Production rollback completed at $(date)"
echo "Root cause analysis required"
echo "Incident response team notified"

# Step 7: Notifications
curl -X POST $INCIDENT_WEBHOOK -d "{\"text\": \"🚨 PRODUCTION ROLLBACK COMPLETED - Investigation required\"}"
```

---

## 7. Troubleshooting Guide

### 7.1 Common Issues & Solutions

#### **Issue: Health Check Failing**
```
Symptoms: /health endpoint returns 5xx or connection timeout
Solutions:
1. Check Docker container logs: docker logs genesis-node
2. Verify database connectivity: docker exec postgres pg_isready
3. Check Redis availability: redis-cli ping
4. Review recent deployments in Grafana
5. Check disk space and memory usage
```

#### **Issue: High Latency or Error Rates**
```
Symptoms: Increased P95 latency or HTTP error rates
Solutions:
1. Review recent code deployments for changes
2. Check database query performance: EXPLAIN ANALYZE problem_query
3. Monitor Redis memory usage and eviction rates
4. Review AI provider rate limits and API quotas
5. Check for resource exhaustion (CPU, memory, connections)
```

#### **Issue: SAPE API Malfunctioning**
```
Symptoms: /sape/execute returning errors or incorrect responses
Solutions:
1. Verify AI provider API keys and rate limits
2. Check AI provider service status (OpenAI/Anthropic status pages)
3. Review recent prompt changes for injection vulnerabilities
4. Monitor OpenAI API usage via their dashboard
5. Check for network connectivity to AI providers
```

#### **Issue: Database Connection Pool Exhausted**
```
Symptoms: Error "connection pool is full" in logs
Solutions:
1. Check current database connection count
2. Review connection leak patterns in application logs
3. Increase connection pool size in configuration
4. Restart problematic application instances
5. Check for database performance degradation
```

#### **Issue: Metrics Collection Failing**
```
Symptoms: Prometheus scrape errors or missing metrics
Solutions:
1. Verify /metrics endpoint accessibility
2. Check admin API key validity
3. Review metrics formatting (must be Prometheus format)
4. Check Grafana data source configuration
5. Verify network connectivity between services
```

### 7.2 Emergency Contacts

**Primary On-Call (24/7):**
- 📱 Technical Lead: +971-XX-XXX-XXXX
- 📱 Security Lead: +971-XX-XXX-XXXX
- 💼 Business Owner: +971-XX-XXX-XXXX

**Escalation Matrix:**
```
Severity 1 (System Down): Immediate SMS to all on-call + management
Severity 2 (Major Impact): SMS to primary on-call + email to team
Severity 3 (Minor Impact): Slack alerts + email notifications
Severity 4 (Monitoring): Email alerts + Grafana notifications
```

### 7.3 Log Analysis Commands

```bash
# Recent error analysis
docker logs --since 1h genesis-node | grep -i error | tail -20

# Request pattern analysis
docker logs --since 24h genesis-node | grep "POST /sape/execute" | awk '{print $1, $9}' | sort | uniq -c | sort -nr | head -10

# Database connection analysis
docker logs --since 1h genesis-node | grep -i "connection\|pool" | grep -i "error\|failed"

# Performance analysis
docker logs --since 1h genesis-node | grep "duration\|latency" | awk '{sum += $NF; count++} END {print "Average latency:", sum/count, "ms"}'
```

---

## 8. Maintenance Procedures

### 8.1 Regular Maintenance Tasks

#### **Daily Checks**
- [ ] Review error rates and latency in Grafana dashboards
- [ ] Check database disk usage and connection counts
- [ ] Verify AI provider API quota status
- [ ] Review security alerts from automated scans
- [ ] Confirm backup completion status

#### **Weekly Maintenance**
- [ ] Review and update dependencies (cargo audit findings)
- [ ] Perform disk cleanup and log rotation
- [ ] Update security rules and threat intelligence
- [ ] Review performance baselines and trends
- [ ] Test backup restoration procedures

#### **Monthly Maintenance**
- [ ] Full security audit and penetration testing
- [ ] Performance benchmarking against baselines
- [ ] Deployment process documentation review
- [ ] Incident response plan updates and testing
- [ ] Compliance reporting and audit preparation

### 8.2 Emergency Maintenance

```bash
# Emergency database maintenance
docker exec -it postgres su - postgres -c "psql -d genesis_prod -c 'VACUUM ANALYZE;'"

# Emergency log rotation
docker exec genesis-node kill -USR1 1  # Graceful log rotation if configured

# Emergency AI provider failover
# Update environment variables and restart
export OPENAI_API_KEY="emergency-alternate-key"
export ANTHROPIC_API_KEY="emergency-alternate-key"
docker compose restart genesis-node
```

---

## 9. Security Incident Response

### 9.1 Incident Detection

**Automated Detection:**
- Unusual API call patterns (rate limiting triggers)
- Security signature matches in logs
- Compromised credential usage alerts
- Unexpected data exfiltration patterns

**Manual Detection:**
- Security review findings from threat modeling
- Code security audit results
- Penetration testing discoveries
- User-reported security concerns

### 9.2 Incident Response Process

```bash
#!/bin/bash
# incident_response.sh

INCIDENT_ID=$(date +%Y%m%d-%H%M%S)
echo "🔥 Security incident $INCIDENT_ID detected - initiating response"

# Step 1: Assessment (First 15 minutes)
SEVERITY=$(assess_incident_severity.py)
echo "Incident severity: $SEVERITY"

# Step 2: Containment (Next 30 minutes)
case $SEVERITY in
  "CRITICAL")
    # Immediate containment actions
    ./scripts/emergency_shutdown.sh
    ./scripts/activate_backup_site.sh
    ;;
  "HIGH")
    ./scripts/isolate_compromised_components.sh
    ./scripts/implement_additional_monitoring.sh
    ;;
  "MEDIUM"|"LOW")
    ./scripts/enhance_monitoring.sh
    ./scripts/prepare_compensating_controls.sh
    ;;
esac

# Step 3: Eradication and Recovery
./scripts/apply_security_patches.sh
./scripts/restore_from_clean_backup.sh

# Step 4: Lessons Learned
./scripts/generate_incident_report.sh $INCIDENT_ID

echo "Security incident response completed"
```

---

## 10. Deployment Metrics & Monitoring

### 10.1 Key Deployment Metrics

**Technical Metrics:**
- Deployment time and success rate
- Rollback frequency and success rate
- Mean time to detection (MTTD) for issues
- Mean time to resolution (MTTR)

**Business Metrics:**
- User impact during deployments
- Feature deployment frequency
- Time to market for new features
- Deployment-related incident rates

### 10.2 Continuous Improvement

**Deployment Quality Tracking:**

```bash
# Weekly deployment metrics collection
DEPLOY_COUNT=$(grep "deployment.*completed" deployment_history.log | wc -l)
ROLLBACK_COUNT=$(grep "rollback.*successful" deployment_history.log | wc -l)
SUCCESS_RATE=$((DEPLOY_COUNT * 100 / (DEPLOY_COUNT + ROLLBACK_COUNT)))

echo "Weekly Deployment Success Rate: $SUCCESS_RATE%"

# Alert on concerning trends
if [ "$SUCCESS_RATE" -lt 90 ]; then
  echo "⚠️ Deployment success rate below 90% - review required"
  curl -X POST $ALERT_WEBHOOK -d "{\"text\": \"Weekly deployment success rate: ${SUCCESS_RATE}%\"}"
fi
```

---

## Appendix: Environment-Specific Configurations

### Development Environment URLs
- API: `http://localhost:8080`
- Grafana: `http://localhost:3001`
- Logs: `docker logs genesis-node`

### Staging Environment URLs
- API: `https://stage.genesis.bizra.ai`
- Grafana: `https://stage-grafana.bizra.ai`
- Logs: `kubectl logs -l app=genesis-node -n staging`

### Production Environment URLs
- API: `https://genesis-node.bizra.ai`
- Grafana: `https://grafana.bizra.ai`
- Logs: Centralized logging aggregation

---

**Runbook Version:** 1.0  
**Last Updated:** 2025-11-24  
**Approved By:** Technical Leadership Team  
**Next Review:** 2026-02-24
