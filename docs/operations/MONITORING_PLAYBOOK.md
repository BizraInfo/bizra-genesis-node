# BIZRA Genesis Node - Monitoring Playbook

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Owner:** Platform Operations Team

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Alert Definitions](#alert-definitions)
4. [Alert Response Procedures](#alert-response-procedures)
5. [Metrics Reference](#metrics-reference)
6. [Dashboard Guide](#dashboard-guide)
7. [Escalation Procedures](#escalation-procedures)
8. [Common Scenarios](#common-scenarios)

---

## Overview

### Purpose

This playbook provides on-call engineers with clear procedures for responding to monitoring alerts from the BIZRA Genesis Node. It defines alert conditions, severity levels, and step-by-step response actions.

### Monitoring Philosophy

**Proactive vs. Reactive:**
- **Proactive:** Monitor SLO compliance, prevent incidents before users impacted
- **Reactive:** Respond quickly when alerts fire, minimize user impact
- **Continuous Improvement:** Learn from incidents, refine alerts and thresholds

### SLO Targets (Alpha-100)

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| **Availability** | ≥ 99.5% | < 99.5% in 24h window |
| **P95 Latency** | < 300ms | > 300ms for 5 minutes |
| **P99 Latency** | < 500ms | > 500ms for 5 minutes |
| **Error Rate** | ≤ 1% | > 1% for 2 minutes |
| **Throughput** | ≥ 100 req/s | < 100 req/s for 10 minutes |

---

## Monitoring Stack

### Components

**Prometheus** (https://prometheus.bizra.ai)
- Metrics collection every 15 seconds
- 30-day retention
- PromQL query language

**Grafana** (https://monitoring.bizra.ai)
- Real-time dashboards
- Alert manager integration
- Visualization

**PagerDuty**
- Alert routing and escalation
- On-call schedule management
- Incident tracking

### Access

| System | URL | Credentials |
|--------|-----|-------------|
| Grafana | https://monitoring.bizra.ai | 1Password: "BIZRA Monitoring" |
| Prometheus | https://prometheus.bizra.ai | 1Password: "BIZRA Monitoring" |
| PagerDuty | https://bizra.pagerduty.com | Your PagerDuty account |

---

## Alert Definitions

### Critical Alerts (SEV-1)

#### ALERT-001: Service Completely Down

**Condition:**
```promql
up{job="bizra-genesis-node"} == 0
```

**Meaning:** Prometheus cannot scrape the BIZRA Genesis Node metrics endpoint. Service is likely completely down.

**Severity:** CRITICAL (SEV-1)
**Response Time:** 5 minutes
**Auto-escalation:** 15 minutes

**Symptoms:**
- Health check endpoint not responding
- All user requests failing
- WebSocket connections dropped

**Response Procedure:** See [ALERT-001 Response](#alert-001-service-completely-down-1)

---

#### ALERT-002: High Error Rate

**Condition:**
```promql
(
  sum(rate(bizra_http_requests_total{status=~"5.."}[2m]))
  /
  sum(rate(bizra_http_requests_total[2m]))
) * 100 > 1
```

**Meaning:** More than 1% of HTTP requests are returning 5xx errors over 2 minutes.

**Severity:** CRITICAL (SEV-1)
**Response Time:** 5 minutes
**Auto-escalation:** 15 minutes

**Symptoms:**
- Users experiencing failures
- Database connection errors
- Service crashes or panics

**Response Procedure:** See [ALERT-002 Response](#alert-002-high-error-rate-1)

---

#### ALERT-003: Extreme P95 Latency

**Condition:**
```promql
histogram_quantile(0.95,
  sum(rate(bizra_http_request_duration_seconds_bucket[5m])) by (le)
) * 1000 > 300
```

**Meaning:** 95th percentile latency exceeds 300ms for 5 minutes (SLO violation).

**Severity:** CRITICAL (SEV-1)
**Response Time:** 15 minutes
**Auto-escalation:** 30 minutes

**Symptoms:**
- Slow page loads
- Timeouts
- User complaints about performance

**Response Procedure:** See [ALERT-003 Response](#alert-003-extreme-p95-latency-1)

---

#### ALERT-004: Database Connection Failure

**Condition:**
```promql
bizra_node_health_status{component="database"} == 0
```

**Meaning:** Health check cannot connect to PostgreSQL database.

**Severity:** CRITICAL (SEV-1)
**Response Time:** 5 minutes
**Auto-escalation:** 15 minutes

**Symptoms:**
- Authentication failures
- Data retrieval errors
- Service unable to serve requests

**Response Procedure:** See [ALERT-004 Response](#alert-004-database-connection-failure-1)

---

### High Priority Alerts (SEV-2)

#### ALERT-101: Elevated P99 Latency

**Condition:**
```promql
histogram_quantile(0.99,
  sum(rate(bizra_http_request_duration_seconds_bucket[5m])) by (le)
) * 1000 > 500
```

**Meaning:** 99th percentile latency exceeds 500ms for 5 minutes.

**Severity:** HIGH (SEV-2)
**Response Time:** 30 minutes
**Auto-escalation:** 1 hour

**Symptoms:**
- Some users experiencing slowness
- Database query delays
- Resource contention

**Response Procedure:** See [ALERT-101 Response](#alert-101-elevated-p99-latency-1)

---

#### ALERT-102: Authentication Failure Spike

**Condition:**
```promql
(
  sum(rate(bizra_auth_logins_total{result="failure"}[5m]))
  /
  sum(rate(bizra_auth_logins_total[5m]))
) > 0.5
```

**Meaning:** More than 50% of login attempts are failing over 5 minutes.

**Severity:** HIGH (SEV-2)
**Response Time:** 30 minutes
**Auto-escalation:** 1 hour

**Symptoms:**
- Users unable to log in
- Potential credential stuffing attack
- JWT secret rotation issue

**Response Procedure:** See [ALERT-102 Response](#alert-102-authentication-failure-spike-1)

---

#### ALERT-103: WebSocket Connection Drops

**Condition:**
```promql
rate(bizra_websocket_connections_total{status="error"}[5m]) > 10
```

**Meaning:** More than 10 WebSocket connection errors per second.

**Severity:** HIGH (SEV-2)
**Response Time:** 30 minutes
**Auto-escalation:** 1 hour

**Symptoms:**
- Real-time features not working
- Users experiencing disconnections
- WebSocket handshake failures

**Response Procedure:** See [ALERT-103 Response](#alert-103-websocket-connection-drops-1)

---

### Medium Priority Alerts (SEV-3)

#### ALERT-201: TLS Certificate Expiring Soon

**Condition:**
```promql
bizra_tls_certificate_expiry_days < 7
```

**Meaning:** TLS certificate expires in less than 7 days.

**Severity:** MEDIUM (SEV-3)
**Response Time:** 4 hours
**Auto-escalation:** 24 hours

**Symptoms:**
- No immediate user impact
- Potential future outage if not renewed

**Response Procedure:** See [ALERT-201 Response](#alert-201-tls-certificate-expiring-soon-1)

---

#### ALERT-202: High Rate Limit Hits

**Condition:**
```promql
rate(bizra_auth_rate_limit_hits_total[5m]) > 5
```

**Meaning:** More than 5 rate limit violations per second (potential attack or misconfigured client).

**Severity:** MEDIUM (SEV-3)
**Response Time:** 1 hour
**Auto-escalation:** 4 hours

**Symptoms:**
- Users receiving 429 errors
- Potential DDoS attack
- Client retry loops

**Response Procedure:** See [ALERT-202 Response](#alert-202-high-rate-limit-hits-1)

---

#### ALERT-203: Database Query Performance Degradation

**Condition:**
```promql
histogram_quantile(0.95,
  sum(rate(bizra_db_query_duration_seconds_bucket[5m])) by (le)
) * 1000 > 50
```

**Meaning:** 95th percentile database query latency exceeds 50ms.

**Severity:** MEDIUM (SEV-3)
**Response Time:** 1 hour
**Auto-escalation:** 4 hours

**Symptoms:**
- Slower API responses
- Database load increasing
- Missing indexes or inefficient queries

**Response Procedure:** See [ALERT-203 Response](#alert-203-database-query-performance-degradation-1)

---

### Low Priority Alerts (SEV-4)

#### ALERT-301: Alpha-100 Capacity Reached

**Condition:**
```promql
bizra_alpha_users_total{status="active"} >= 100
```

**Meaning:** Alpha-100 program has reached maximum capacity (100 users).

**Severity:** LOW (SEV-4)
**Response Time:** Best effort
**Auto-escalation:** None

**Symptoms:**
- New registrations failing with capacity error
- Invite codes no longer accepting redemptions

**Response Procedure:** See [ALERT-301 Response](#alert-301-alpha-100-capacity-reached-1)

---

## Alert Response Procedures

### ALERT-001: Service Completely Down

**Severity:** CRITICAL (SEV-1) | **Response Time:** 5 minutes

#### Immediate Actions (0-5 minutes)

1. **Acknowledge alert in PagerDuty**
   ```bash
   # Acknowledge via PagerDuty web, mobile app, or SMS
   ```

2. **Verify service is actually down**
   ```bash
   # Check health endpoint
   curl -k https://api.bizra.ai/health

   # Expected: Connection timeout or 503 error
   ```

3. **Check service status on server**
   ```bash
   ssh production-server
   sudo systemctl status bizra-genesis-node

   # If service is stopped or failed
   sudo journalctl -u bizra-genesis-node -n 100 --no-pager
   ```

4. **Post incident in Slack #incidents**
   ```
   🚨 SEV-1: BIZRA Genesis Node is completely down
   Investigating now. ETA for update: 10 minutes.
   ```

#### Diagnosis (5-15 minutes)

5. **Check recent deployments**
   ```bash
   # Review recent git commits
   git log -5 --oneline

   # Check deployment timestamp
   ls -lh /usr/local/bin/bizra-genesis-node
   ```

6. **Check system resources**
   ```bash
   # Disk space
   df -h

   # Memory
   free -m

   # CPU
   top -bn1 | head -20
   ```

7. **Check dependencies**
   ```bash
   # PostgreSQL
   sudo systemctl status postgresql
   psql -U bizra_user -d bizra_db -c "SELECT 1;"

   # Redis
   sudo systemctl status redis
   redis-cli PING
   ```

8. **Review error logs**
   ```bash
   # Application errors
   sudo journalctl -u bizra-genesis-node -n 500 --no-pager | grep -i error

   # Panic or crash
   sudo journalctl -u bizra-genesis-node -n 500 --no-pager | grep -i panic
   ```

#### Resolution (15-30 minutes)

9. **Restart service if simple failure**
   ```bash
   sudo systemctl restart bizra-genesis-node

   # Wait 30 seconds
   sleep 30

   # Verify health
   curl -k https://api.bizra.ai/health
   ```

10. **Rollback if recent deployment caused issue**
    ```bash
    ./scripts/rollback.sh

    # Verify service started
    sudo systemctl status bizra-genesis-node

    # Run quick validation
    ./scripts/integration-test.sh --quick
    ```

11. **Fix dependency if database/Redis down**
    ```bash
    # Restart PostgreSQL
    sudo systemctl restart postgresql

    # Restart Redis
    sudo systemctl restart redis

    # Restart application
    sudo systemctl restart bizra-genesis-node
    ```

#### Post-Incident (30+ minutes)

12. **Run canary monitoring**
    ```bash
    ./scripts/canary-monitor.sh --base-url https://api.bizra.ai --duration 300

    # Expected: SLO MET
    ```

13. **Update status page and Slack**
    ```
    ✅ RESOLVED: Service restored at HH:MM UTC
    Root cause: [Brief description]
    Downtime: X minutes
    Post-incident review scheduled.
    ```

14. **Schedule post-incident review**
    - Document timeline in incident log
    - Identify root cause
    - Create action items to prevent recurrence
    - Update runbook if needed

---

### ALERT-002: High Error Rate

**Severity:** CRITICAL (SEV-1) | **Response Time:** 5 minutes

#### Immediate Actions (0-5 minutes)

1. **Acknowledge alert and post to Slack #incidents**
   ```
   🚨 SEV-1: High error rate detected (>1%)
   Investigating now.
   ```

2. **Check error rate in Grafana**
   - Navigate to Alpha-100 dashboard
   - Review "Error Breakdown" panel
   - Identify which endpoints are failing

3. **Check recent error logs**
   ```bash
   ssh production-server
   sudo journalctl -u bizra-genesis-node -n 200 --no-pager | grep -E "ERROR|WARN"
   ```

#### Diagnosis (5-15 minutes)

4. **Identify error type**
   ```bash
   # Database connection errors
   sudo journalctl -u bizra-genesis-node -n 500 | grep -i "database"

   # Authentication errors
   sudo journalctl -u bizra-genesis-node -n 500 | grep -i "auth"

   # Panics/crashes
   sudo journalctl -u bizra-genesis-node -n 500 | grep -i "panic"
   ```

5. **Check database health**
   ```bash
   # Connection count
   psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

   # Max connections
   psql -U postgres -c "SHOW max_connections;"

   # Long-running queries
   psql -U postgres -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
   ```

6. **Check application metrics**
   ```bash
   curl -k https://api.bizra.ai/metrics | grep -E "(http_requests_total|db_connections)"
   ```

#### Resolution (15-30 minutes)

7. **If database connection exhaustion:**
   ```bash
   # Kill long-running queries
   psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > interval '5 minutes';"

   # Restart application to reset pool
   sudo systemctl restart bizra-genesis-node
   ```

8. **If recent deployment caused errors:**
   ```bash
   # Rollback immediately
   ./scripts/rollback.sh

   # Verify error rate drops
   # Monitor Grafana for 5 minutes
   ```

9. **If external dependency issue:**
   ```bash
   # Check Redis
   redis-cli PING

   # Check nginx
   sudo systemctl status nginx

   # Restart if needed
   sudo systemctl restart redis nginx bizra-genesis-node
   ```

#### Post-Incident

10. **Monitor error rate for 15 minutes**
    - Error rate should drop below 1%
    - P95 latency should stabilize
    - No new error spikes

11. **Update Slack and schedule post-incident review**

---

### ALERT-003: Extreme P95 Latency

**Severity:** CRITICAL (SEV-1) | **Response Time:** 15 minutes

#### Immediate Actions (0-10 minutes)

1. **Acknowledge alert and post to Slack**
   ```
   ⚠️ SEV-1: P95 latency exceeding 300ms SLO
   Current P95: XXXms
   Investigating performance degradation.
   ```

2. **Check current latency in Grafana**
   - Review "HTTP Request Latency" panel
   - Identify which routes are slow
   - Check for sudden spike vs. gradual increase

3. **Check system resources**
   ```bash
   ssh production-server

   # CPU usage
   top -bn1 | head -10

   # Memory usage
   free -m

   # Disk I/O
   iostat -x 1 5
   ```

#### Diagnosis (10-25 minutes)

4. **Check database performance**
   ```bash
   # Slow queries
   psql -U bizra_user -d bizra_db -c "
     SELECT query, mean_exec_time, calls
     FROM pg_stat_statements
     ORDER BY mean_exec_time DESC
     LIMIT 10;
   "

   # Active queries
   psql -U postgres -c "SELECT pid, now() - query_start AS duration, state, query FROM pg_stat_activity WHERE state != 'idle';"
   ```

5. **Check for resource contention**
   ```bash
   # Database connections
   curl -k https://api.bizra.ai/metrics | grep db_connections_active

   # WebSocket connections
   curl -k https://api.bizra.ai/metrics | grep websocket_connections_active

   # HTTP request rate
   curl -k https://api.bizra.ai/metrics | grep http_requests_total
   ```

6. **Check for memory leaks**
   ```bash
   # Application memory usage over time
   ps aux | grep bizra-genesis-node

   # If memory usage is very high (>80%), potential leak
   ```

#### Resolution (25-40 minutes)

7. **If database queries are slow:**
   ```bash
   # Add missing indexes (if identified)
   # Optimize queries in application code
   # Consider query result caching

   # Immediate mitigation: Restart to clear query cache
   sudo systemctl restart postgresql
   ```

8. **If memory leak suspected:**
   ```bash
   # Restart application
   sudo systemctl restart bizra-genesis-node

   # Monitor memory usage
   watch -n 5 'ps aux | grep bizra-genesis-node'
   ```

9. **If external service latency:**
   ```bash
   # Check Redis latency
   redis-cli --latency-history

   # Check network latency
   ping -c 10 database-host
   ```

10. **If recent deployment introduced performance regression:**
    ```bash
    # Rollback
    ./scripts/rollback.sh

    # Create ticket to optimize before redeploying
    ```

#### Post-Incident

11. **Run performance validation**
    ```bash
    ./scripts/performance-validation.sh --concurrent 50 --duration 60

    # Expected: P95 < 300ms
    ```

12. **Document findings and create optimization tickets**

---

### ALERT-004: Database Connection Failure

**Severity:** CRITICAL (SEV-1) | **Response Time:** 5 minutes

#### Immediate Actions (0-5 minutes)

1. **Acknowledge and post to Slack**
   ```
   🚨 SEV-1: Database connection failure
   Service degraded. Investigating.
   ```

2. **Check database service status**
   ```bash
   ssh production-server
   sudo systemctl status postgresql

   # If stopped or failed
   sudo systemctl start postgresql
   ```

3. **Test database connectivity**
   ```bash
   psql -U bizra_user -d bizra_db -c "SELECT 1;"

   # Expected: Returns 1 if connection successful
   ```

#### Diagnosis (5-15 minutes)

4. **Check database logs**
   ```bash
   sudo tail -100 /var/log/postgresql/postgresql-15-main.log

   # Look for:
   # - Connection limit errors
   # - Authentication failures
   # - Disk space issues
   ```

5. **Check connection limits**
   ```bash
   psql -U postgres -c "SHOW max_connections;"
   psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
   ```

6. **Check disk space**
   ```bash
   df -h /var/lib/postgresql

   # If >95% full, database may refuse connections
   ```

#### Resolution (15-30 minutes)

7. **If database is down, restart:**
   ```bash
   sudo systemctl restart postgresql

   # Wait for startup
   sleep 10

   # Verify connection
   psql -U bizra_user -d bizra_db -c "SELECT NOW();"
   ```

8. **If connection limit reached:**
   ```bash
   # Kill idle connections
   psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

   # Increase max_connections (if needed)
   sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 200;"
   sudo systemctl restart postgresql
   ```

9. **If disk space issue:**
   ```bash
   # Clear old logs
   sudo find /var/log/postgresql -name "*.log.*" -mtime +7 -delete

   # Vacuum database
   psql -U bizra_user -d bizra_db -c "VACUUM ANALYZE;"
   ```

10. **Restart application after database recovery:**
    ```bash
    sudo systemctl restart bizra-genesis-node

    # Verify health
    curl -k https://api.bizra.ai/health
    ```

#### Post-Incident

11. **Run pre-flight check**
    ```bash
    ./scripts/pre-flight-check.sh

    # Ensure all database checks pass
    ```

12. **Monitor database metrics for 30 minutes**

---

### ALERT-101: Elevated P99 Latency

**Severity:** HIGH (SEV-2) | **Response Time:** 30 minutes

#### Actions

1. **Acknowledge alert**
2. **Check Grafana "Slowest Endpoints" panel** to identify which routes are slow
3. **Review database query performance:**
   ```bash
   psql -U bizra_user -d bizra_db -c "
     SELECT query, mean_exec_time, calls
     FROM pg_stat_statements
     WHERE mean_exec_time > 50
     ORDER BY mean_exec_time DESC
     LIMIT 10;
   "
   ```

4. **Check for resource contention** (CPU, memory, disk I/O)
5. **If no immediate issue, create ticket** for performance investigation
6. **Monitor for escalation** to P95 latency alert (would become SEV-1)

---

### ALERT-102: Authentication Failure Spike

**Severity:** HIGH (SEV-2) | **Response Time:** 30 minutes

#### Actions

1. **Acknowledge alert**
2. **Check authentication metrics:**
   ```bash
   curl -k https://api.bizra.ai/metrics | grep auth_logins_total
   ```

3. **Review recent failed login attempts:**
   ```bash
   sudo journalctl -u bizra-genesis-node -n 500 | grep "login failed"
   ```

4. **Check for potential attack:**
   - Review IP addresses of failed attempts
   - Look for patterns (same email, different emails, IP ranges)
   - Check rate limit hits

5. **If credential stuffing attack detected:**
   ```bash
   # Block offending IPs in nginx
   sudo nano /etc/nginx/conf.d/blocklist.conf
   # Add: deny X.X.X.X;

   sudo systemctl reload nginx
   ```

6. **If legitimate issue (JWT secret rotation, clock skew):**
   - Check JWT_SECRET configuration
   - Verify system time: `timedatectl status`
   - Fix underlying issue

7. **Notify security team** if attack suspected

---

### ALERT-103: WebSocket Connection Drops

**Severity:** HIGH (SEV-2) | **Response Time:** 30 minutes

#### Actions

1. **Acknowledge alert**
2. **Check WebSocket metrics:**
   ```bash
   curl -k https://api.bizra.ai/metrics | grep websocket_
   ```

3. **Check nginx WebSocket configuration:**
   ```bash
   sudo nginx -T | grep -A 10 "location /ws"

   # Verify proxy_read_timeout is set appropriately
   ```

4. **Check for network issues:**
   - Packet loss: `ping -c 100 api.bizra.ai`
   - Firewall rules: `sudo iptables -L | grep 8080`

5. **Restart nginx if configuration issue:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Monitor connection success rate** for improvement

---

### ALERT-201: TLS Certificate Expiring Soon

**Severity:** MEDIUM (SEV-3) | **Response Time:** 4 hours

#### Actions

1. **Acknowledge alert**
2. **Check certificate expiry:**
   ```bash
   echo | openssl s_client -connect api.bizra.ai:443 2>/dev/null | openssl x509 -noout -dates
   ```

3. **Renew certificate:**
   ```bash
   sudo certbot renew

   # If renewal fails, check DNS and HTTP challenge
   sudo certbot renew --dry-run
   ```

4. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

5. **Verify new expiry:**
   ```bash
   echo | openssl s_client -connect api.bizra.ai:443 2>/dev/null | openssl x509 -noout -enddate

   # Should show >90 days in future
   ```

---

### ALERT-202: High Rate Limit Hits

**Severity:** MEDIUM (SEV-3) | **Response Time:** 1 hour

#### Actions

1. **Acknowledge alert**
2. **Identify source of rate limit violations:**
   ```bash
   # Check nginx access logs
   sudo tail -1000 /var/log/nginx/access.log | grep " 429 " | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
   ```

3. **Determine if legitimate or attack:**
   - Single IP: Likely misconfigured client or script
   - Multiple IPs: Potential distributed attack
   - Specific endpoint: May need higher rate limit

4. **If legitimate client:**
   - Contact user, help fix their integration
   - Consider increasing rate limit for specific use case

5. **If attack:**
   - Block IPs in nginx
   - Consider enabling Cloudflare rate limiting
   - Notify security team

---

### ALERT-203: Database Query Performance Degradation

**Severity:** MEDIUM (SEV-3) | **Response Time:** 1 hour

#### Actions

1. **Acknowledge alert**
2. **Identify slow queries:**
   ```bash
   psql -U bizra_user -d bizra_db -c "
     SELECT query, mean_exec_time, calls, total_exec_time
     FROM pg_stat_statements
     WHERE mean_exec_time > 50
     ORDER BY total_exec_time DESC
     LIMIT 10;
   "
   ```

3. **Check for missing indexes:**
   ```bash
   psql -U bizra_user -d bizra_db -c "
     SELECT schemaname, tablename, attname, n_distinct, correlation
     FROM pg_stats
     WHERE schemaname = 'public'
     ORDER BY n_distinct DESC;
   "
   ```

4. **Analyze query execution plans:**
   ```bash
   psql -U bizra_user -d bizra_db -c "EXPLAIN ANALYZE [slow query];"
   ```

5. **Create ticket** for database optimization
6. **Consider adding indexes** if obvious wins identified
7. **Run VACUUM ANALYZE** if table statistics are stale:
   ```bash
   psql -U bizra_user -d bizra_db -c "VACUUM ANALYZE;"
   ```

---

### ALERT-301: Alpha-100 Capacity Reached

**Severity:** LOW (SEV-4) | **Response Time:** Best effort

#### Actions

1. **Acknowledge alert (informational)**
2. **Verify user count:**
   ```bash
   curl -k https://api.bizra.ai/metrics | grep bizra_alpha_users_total
   ```

3. **Notify product team** that Alpha-100 is full
4. **Update marketing materials** to reflect waitlist status
5. **Prepare for Beta expansion** if planned
6. **No immediate technical action required**

---

## Metrics Reference

### HTTP Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `bizra_http_request_duration_seconds` | Histogram | HTTP request latency by route |

### Authentication Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_auth_logins_total` | Counter | Login attempts by result (success/failure) |
| `bizra_auth_refresh_total` | Counter | Token refresh attempts by result |
| `bizra_auth_rate_limit_hits_total` | Counter | Rate limit violations |

### Health Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_node_health_status` | Gauge | Component health (1=healthy, 0=unhealthy) |
| `bizra_tls_certificate_expiry_days` | Gauge | Days until TLS certificate expires |
| `bizra_deployment_gate_status` | Gauge | Pre-flight check status |

### Alpha-100 Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_alpha_users_total` | Gauge | Alpha-100 user count by status |
| `bizra_alpha_invite_redemptions_total` | Counter | Invite code redemptions |
| `bizra_node_contributors_total` | Gauge | Active node contributors |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_db_connections_active` | Gauge | Active database connections |
| `bizra_db_connections_idle` | Gauge | Idle database connections |
| `bizra_db_query_duration_seconds` | Histogram | Database query latency |

### WebSocket Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bizra_websocket_connections_total` | Counter | WebSocket connections by status |
| `bizra_websocket_connections_active` | Gauge | Currently active WebSocket connections |
| `bizra_websocket_messages_total` | Counter | WebSocket messages by direction |

---

## Dashboard Guide

### Alpha-100 Production Dashboard

**URL:** https://monitoring.bizra.ai/d/alpha-100

#### Panel 1: SLO Overview (Top Priority)

**What to watch:**
- **Success Rate:** Should always be > 99%
- **P95 Latency:** Should always be < 300ms
- **Status:** Should be green

**If status is yellow/red:**
- Indicates SLO violation in progress
- Check error panels below for details
- Follow appropriate alert response

#### Panel 2: Alpha-100 Funnel

**What to watch:**
- **Registered Users:** Tracks growth toward 100-user goal
- **Active Sessions:** Shows current usage
- **Invite Redemptions:** Remaining capacity

**Normal patterns:**
- Gradual growth in registered users
- Active sessions peak during business hours
- Invite redemptions correlate with marketing campaigns

#### Panel 3: Auth Activity

**What to watch:**
- **Login Success vs Failure:** Failure rate should be very low
- **Token Refresh Rate:** Should be steady
- **Rate Limit Hits:** Should be minimal

**Warning signs:**
- Sudden spike in login failures (attack or issue)
- High rate limit hits (misconfigured client or attack)
- No logins for extended period (service issue)

#### Panel 4: HTTP Traffic Breakdown

**What to watch:**
- **Requests by Route:** Identify hottest endpoints
- **Status Code Distribution:** Most should be 2xx
- **Request Rate Over Time:** Baseline traffic patterns

**Normal patterns:**
- Health checks most frequent (monitoring)
- Auth endpoints during peak hours
- Low 4xx/5xx error rates

#### Panel 5: Request Latency (P50/P95/P99)

**What to watch:**
- **P95 < 300ms:** SLO requirement
- **P99 < 500ms:** SLO requirement
- **Latency trends:** Should be stable

**Warning signs:**
- Gradual latency increase (memory leak, resource exhaustion)
- Sudden spike (deployment, database issue)
- Intermittent spikes (GC pauses, cache misses)

#### Panel 6: System Health Status

**What to watch:**
- **All components green:** Database, Redis, WebSocket, TLS
- **TLS days until expiry:** Should be >7 days

**If any component red:**
- Immediate attention required
- Check component-specific logs
- May trigger service outage

---

## Escalation Procedures

### When to Escalate

**Escalate to L2 (Platform Lead) if:**
- SEV-1 incident not resolved within 30 minutes
- SEV-2 incident not resolved within 1 hour
- Root cause unclear and assistance needed
- Incident requires architectural decision

**Escalate to L3 (Engineering Manager) if:**
- SEV-1 incident not resolved within 1 hour
- Multiple simultaneous incidents
- Potential data loss or security breach
- Coordination with external teams needed

**Escalate to L4 (CTO) if:**
- SEV-1 downtime exceeds 2 hours
- Security incident with user data exposure
- Regulatory compliance implications
- PR/communications needed

### Escalation Contacts

See [RUNBOOK.md](RUNBOOK.md#contact-information) for on-call rotation and contact details.

---

## Common Scenarios

### Scenario 1: Planned Deployment During Business Hours

**Before Deployment:**
1. Run pre-flight check: `./scripts/pre-flight-check.sh`
2. Backup database: `./scripts/backup-database.sh`
3. Notify #ops-status Slack channel

**During Deployment:**
4. Monitor Grafana SLO panel continuously
5. Run canary monitoring: `./scripts/canary-monitor.sh`
6. Be ready to rollback if SLO violated

**After Deployment:**
7. Run E2E tests
8. Monitor metrics for 30 minutes
9. Post "Deployment complete" in Slack

### Scenario 2: Weekend Maintenance Window

**Preparation:**
- Schedule maintenance window (low-traffic period)
- Notify users 72 hours in advance
- Update status page

**During Maintenance:**
- Enable maintenance mode (if applicable)
- Perform database migrations, system updates, etc.
- Run full test suite before re-enabling

**Post-Maintenance:**
- Disable maintenance mode
- Run integration tests
- Monitor for 1 hour before handing off

### Scenario 3: Sudden Traffic Spike

**Symptoms:**
- Request rate 2-3x normal
- Latency increasing
- Database connection pool saturating

**Response:**
1. **Verify spike is legitimate** (not attack)
2. **Scale database connections** if needed
3. **Enable caching** for hot endpoints
4. **Consider rate limiting** if necessary
5. **Monitor resource usage** (CPU, memory, disk)

**If attack:**
- Enable Cloudflare DDoS protection
- Block offending IPs
- Notify security team

---

**Document Control:**
- **Created:** 2025-11-15
- **Last Updated:** 2025-11-15
- **Version:** 1.0
- **Owner:** Platform Operations Team
- **Review Frequency:** Monthly or after major incidents
