# BIZRA Genesis Node - Operator Runbook v0.9.0

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Target Audience:** DevOps Engineers, Site Reliability Engineers, System Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [System Architecture](#system-architecture)
4. [Deployment Procedures](#deployment-procedures)
5. [Operational Commands](#operational-commands)
6. [Health Monitoring](#health-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Tuning](#performance-tuning)
10. [Security Operations](#security-operations)
11. [Emergency Procedures](#emergency-procedures)

---

## Overview

### Purpose
This runbook provides operational procedures for deploying, monitoring, and maintaining BIZRA Genesis Node v0.9.0 in production environments.

### Scope
- ✅ Deployment procedures (Docker-based)
- ✅ Health monitoring and status reporting
- ✅ Troubleshooting common issues
- ✅ Backup and recovery procedures
- ✅ Performance tuning guidelines
- ✅ Security operations

### Assumptions
- Operator has root/sudo access
- Docker and Docker Compose installed
- Basic knowledge of Linux, PostgreSQL, and Rust applications

---

## Prerequisites

### Hardware Requirements

**Minimum (Development):**
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB free space
- Network: 10 Mbps

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 50GB+ SSD
- Network: 100 Mbps+

### Software Requirements

| Software | Minimum Version | Recommended Version |
|:---------|:----------------|:--------------------|
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 1.29+ | 2.20+ |
| PostgreSQL | 15+ | 17+ (with pgvector) |
| Node.js | 20+ | 24.5.0 |
| Rust | 1.70+ | 1.80+ |

### Network Requirements

**Required Ports:**
- `8080` - API Server (HTTP)
- `5432` - PostgreSQL
- `3000` - Dashboard (HTTP)
- `9090` - Prometheus (optional)
- `3001` - Grafana (optional)

**Firewall Rules:**
```bash
# Allow API access
sudo ufw allow 8080/tcp

# Allow dashboard access
sudo ufw allow 3000/tcp

# Allow PostgreSQL (only from localhost or specific IPs)
sudo ufw allow from 127.0.0.1 to any port 5432
```

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    BIZRA GENESIS NODE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │  API Server  │  │  PostgreSQL  │    │
│  │  (React/Vite)│  │ (Rust/Axum)  │  │  (pgvector)  │    │
│  │   Port 3000  │  │   Port 8080  │  │   Port 5432  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         └──────────────────┴──────────────────┘            │
│                            │                               │
│                  ┌─────────┴─────────┐                     │
│                  │  SAPE Engine      │                     │
│                  │  (Cognitive Core) │                     │
│                  └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → Dashboard (React) → API Server (Rust)
2. **API Processing** → SAPE Engine → Database (PostgreSQL)
3. **Response** → API Server → Dashboard → User

---

## Deployment Procedures

### Initial Deployment

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/bizra-genesis-node.git
cd bizra-genesis-node
```

#### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```bash
# Database Configuration
DATABASE_URL=postgresql://bizra_user:CHANGE_ME@localhost:5432/bizra_genesis
POSTGRES_USER=bizra_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=bizra_genesis

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here

# API Configuration
RUST_LOG=info
API_PORT=8080
DASHBOARD_PORT=3000
```

#### Step 3: Run Pre-Flight Checks
```bash
# Check system prerequisites
ops/ignite.sh --status

# Expected output:
#   ✓ Docker installed
#   ✓ Docker daemon running
#   ✓ Docker Compose available
#   ✓ Disk space OK
#   ⚠ No BIZRA containers running (expected for first deployment)
```

#### Step 4: Start Services
```bash
# Full stack deployment in detached mode
ops/ignite.sh full --detach

# Monitor logs during startup
docker-compose logs -f

# Wait for services to be ready (automatic with --detach)
# Health checks will run automatically
```

#### Step 5: Verify Deployment
```bash
# Check system status
ops/ignite.sh --status

# Test API health
curl -i http://localhost:8080/health

# Expected response:
# HTTP/1.1 200 OK
# {"status":"ok"}

# Test readiness
curl -i http://localhost:8080/ready

# Expected response:
# HTTP/1.1 200 OK
# {"status":"ready","database":"connected"}
```

---

### Update Deployment

#### Step 1: Backup Current State
```bash
# Backup database
docker exec bizra_postgres pg_dump -U bizra_user bizra_genesis > backup_$(date +%Y%m%d).sql

# Backup configuration
cp .env .env.backup
```

#### Step 2: Pull New Code
```bash
git fetch origin
git checkout v0.9.0
```

#### Step 3: Update Dependencies
```bash
# Update Rust dependencies
cargo update

# Rebuild containers
ops/ignite.sh full --clean --build --detach
```

#### Step 4: Verify Update
```bash
# Check system status
ops/ignite.sh --status

# Verify all tests pass
cargo test --all --lib --bins
```

**Estimated Downtime:** 2-5 minutes

---

## Operational Commands

### ops/ignite.sh - Primary Control Script

#### Modes

| Mode | Command | Description |
|:-----|:--------|:------------|
| Full Stack | `ops/ignite.sh full` | Start all services (default) |
| Kernel Only | `ops/ignite.sh kernel` | Start Rust API server only |
| Dashboard Only | `ops/ignite.sh cortex` | Start React dashboard only |
| Database Only | `ops/ignite.sh database` | Start PostgreSQL only |
| Development | `ops/ignite.sh dev` | Dev mode with hot reload |
| Production | `ops/ignite.sh prod` | Prod mode with monitoring |
| Monitoring | `ops/ignite.sh monitoring` | Start Prometheus + Grafana |
| Test | `ops/ignite.sh test` | Run test suite |

#### Options

| Option | Flag | Description |
|:-------|:-----|:------------|
| Detached | `--detach` | Run in background |
| Build | `--build` | Rebuild containers first |
| Logs | `--logs` | Tail logs after start |
| Clean | `--clean` | Clean volumes before start |
| Status | `--status` | Report system status |
| Help | `--help` | Show help message |

#### Common Scenarios

**Start for development:**
```bash
ops/ignite.sh dev --build
```

**Start production with monitoring:**
```bash
ops/ignite.sh prod --detach
```

**Restart with clean state:**
```bash
ops/ignite.sh full --clean --build --detach
```

**Check system status:**
```bash
ops/ignite.sh --status
```

---

### Docker Commands

#### Container Management

```bash
# List running containers
docker ps

# View logs for specific service
docker-compose logs -f api_server

# Restart specific service
docker-compose restart api_server

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

#### Resource Usage

```bash
# Check container resource usage
docker stats

# View disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

---

## Health Monitoring

### Health Endpoints

| Endpoint | Purpose | Expected Response | SLO |
|:---------|:--------|:------------------|:----|
| `/health` | Liveness probe | `{"status":"ok"}` | < 1ms |
| `/ready` | Readiness probe | `{"status":"ready","database":"connected"}` | < 100ms |
| `/api/genesis/status` | System status | PoI, Ihsan, node health | < 500ms |
| `/metrics` | Prometheus metrics | Metrics in Prometheus format | < 100ms |

### Automated Health Checks

**ops/ignite.sh Integration:**
```bash
# Start with automatic health checks
ops/ignite.sh full --detach

# Health checks run automatically:
#   1. Wait for services to start
#   2. HTTP health probes (30 retries, 2s interval)
#   3. PostgreSQL pg_isready check
#   4. Status report displayed
```

**Manual Health Check:**
```bash
# Check all endpoints
curl -i http://localhost:8080/health
curl -i http://localhost:8080/ready
curl -i http://localhost:8080/api/genesis/status

# Or use ops script
ops/ignite.sh --status
```

### Kubernetes Integration

**Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 1
  failureThreshold: 3
```

**Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Services Won't Start

**Symptoms:**
- `docker-compose up` fails
- Containers exit immediately
- Port already in use errors

**Diagnosis:**
```bash
# Check if ports are available
netstat -tuln | grep -E ':(8080|5432|3000)'

# Check Docker logs
docker-compose logs

# Check system resources
df -h
free -h
```

**Resolution:**
```bash
# Option 1: Clean restart
ops/ignite.sh full --clean --build --detach

# Option 2: Manual port cleanup
# Find process using port 8080
lsof -i :8080
# Kill process
sudo kill -9 <PID>

# Option 3: Change ports in docker-compose.yml
```

---

#### Issue 2: Database Connection Failed

**Symptoms:**
- `/ready` returns 503
- Logs show "password authentication failed"
- API server can't connect to database

**Diagnosis:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test database connection
docker exec -it bizra_postgres psql -U bizra_user -d bizra_genesis -c "SELECT 1"

# Check environment variables
docker exec bizra_api_server env | grep DATABASE_URL
```

**Resolution:**
```bash
# Option 1: Restart database
docker-compose restart postgres

# Option 2: Check credentials in .env
cat .env | grep POSTGRES

# Option 3: Reset database
ops/ignite.sh database --clean --build --detach
```

---

#### Issue 3: Frontend Build Failures

**Symptoms:**
- Dashboard not loading
- `npm run build` fails
- Vite not found

**Diagnosis:**
```bash
# Check if dist/ exists
ls -lh apps/dashboard/dist/

# Check node_modules
ls -lh apps/dashboard/node_modules/.bin/vite

# Check Node.js version
node --version
npm --version
```

**Resolution:**
```bash
# Option 1: Use existing build
# No action needed if dist/ from Nov 23 exists

# Option 2: WSL build (if available)
wsl bash -c "cd /mnt/c/bizra-genesis-node/apps/dashboard && npm install && npm run build"

# Option 3: Docker container build
docker run --rm -v $(pwd)/apps/dashboard:/app -w /app node:24 npm install && npm run build
```

**Reference:** See [FRONTEND_BUILD_STATUS_v0_9_0.md](FRONTEND_BUILD_STATUS_v0_9_0.md) for detailed analysis.

---

#### Issue 4: API Returns 500 Errors

**Symptoms:**
- API requests return 500 Internal Server Error
- Logs show panic or database errors

**Diagnosis:**
```bash
# Check API logs
docker-compose logs api_server | tail -100

# Check database connectivity
curl http://localhost:8080/ready

# Run tests
cargo test --all --lib --bins
```

**Resolution:**
```bash
# Option 1: Restart API server
docker-compose restart api_server

# Option 2: Check database migrations
docker exec bizra_api_server sqlx migrate run

# Option 3: Full restart
ops/ignite.sh full --clean --build --detach
```

---

#### Issue 5: High Memory Usage

**Symptoms:**
- System becomes slow
- Docker containers killed by OOM
- `docker stats` shows high memory usage

**Diagnosis:**
```bash
# Check container memory usage
docker stats --no-stream

# Check system memory
free -h

# Check for memory leaks
docker-compose logs | grep -i "out of memory"
```

**Resolution:**
```bash
# Option 1: Increase Docker memory limit
# Edit /etc/docker/daemon.json:
# {
#   "default-runtime": "runc",
#   "default-shm-size": "2G"
# }

# Option 2: Restart containers
docker-compose restart

# Option 3: Tune PostgreSQL
# Edit docker-compose.yml postgres service:
# command: postgres -c shared_buffers=256MB -c max_connections=100
```

---

### Logs and Debugging

#### Log Locations

| Component | Command |
|:----------|:--------|
| All services | `docker-compose logs -f` |
| API Server | `docker-compose logs -f api_server` |
| Dashboard | `docker-compose logs -f dashboard` |
| PostgreSQL | `docker-compose logs -f postgres` |
| System logs | `journalctl -u docker` |

#### Log Levels

**Set via RUST_LOG environment variable:**
```bash
# .env file
RUST_LOG=trace  # Most verbose
RUST_LOG=debug
RUST_LOG=info   # Default
RUST_LOG=warn
RUST_LOG=error  # Least verbose
```

#### Debugging Techniques

**1. Interactive Shell:**
```bash
# Enter API server container
docker exec -it bizra_api_server bash

# Enter PostgreSQL container
docker exec -it bizra_postgres psql -U bizra_user -d bizra_genesis
```

**2. Database Queries:**
```sql
-- Check table counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'poi_attestations', COUNT(*) FROM poi_attestations
UNION ALL
SELECT 'agent_tasks', COUNT(*) FROM agent_tasks;

-- Check recent activity
SELECT * FROM security_audit_log ORDER BY created_at DESC LIMIT 10;

-- Check agent status
SELECT agent_id, agent_type, status, health_status FROM agent_state;
```

**3. API Testing:**
```bash
# Test health
curl -v http://localhost:8080/health

# Test authenticated endpoint
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bizra.io","password":"test123"}' \
  | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/user/profile
```

---

## Backup & Recovery

### Database Backup

**Automated Daily Backup:**
```bash
# Create backup script
cat > /usr/local/bin/backup-bizra.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/bizra
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec bizra_postgres pg_dump -U bizra_user bizra_genesis | gzip > $BACKUP_DIR/bizra_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "bizra_*.sql.gz" -mtime +7 -delete

echo "Backup completed: bizra_$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-bizra.sh

# Add to crontab
echo "0 2 * * * /usr/local/bin/backup-bizra.sh" | crontab -
```

**Manual Backup:**
```bash
# Full backup
docker exec bizra_postgres pg_dump -U bizra_user bizra_genesis > backup.sql

# Compressed backup
docker exec bizra_postgres pg_dump -U bizra_user bizra_genesis | gzip > backup.sql.gz

# Schema only
docker exec bizra_postgres pg_dump -U bizra_user -s bizra_genesis > schema.sql
```

### Database Restore

**From Backup:**
```bash
# Stop API server to prevent writes
docker-compose stop api_server

# Restore database
gunzip < backup.sql.gz | docker exec -i bizra_postgres psql -U bizra_user -d bizra_genesis

# Or from uncompressed backup
cat backup.sql | docker exec -i bizra_postgres psql -U bizra_user -d bizra_genesis

# Restart API server
docker-compose start api_server
```

**From Clean State:**
```bash
# Clean database
ops/ignite.sh database --clean

# Run migrations
docker exec bizra_api_server sqlx migrate run

# Restore data
cat backup.sql | docker exec -i bizra_postgres psql -U bizra_user -d bizra_genesis
```

### Configuration Backup

```bash
# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose*.yml \
  ops/ \
  migrations/

# Restore configuration
tar -xzf config_backup_YYYYMMDD.tar.gz
```

---

## Performance Tuning

### PostgreSQL Optimization

**Connection Pooling:**
```yaml
# docker-compose.yml
services:
  postgres:
    environment:
      POSTGRES_MAX_CONNECTIONS: 200
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=16MB
      -c maintenance_work_mem=128MB
```

**Monitoring Queries:**
```sql
-- Slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Connection count
SELECT COUNT(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('bizra_genesis'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### API Server Optimization

**Rust Configuration:**
```bash
# .env
RUST_LOG=info  # Reduce log verbosity in production
TOKIO_WORKER_THREADS=4  # Match CPU cores
```

**Resource Limits:**
```yaml
# docker-compose.yml
services:
  api_server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Monitoring Metrics

**Prometheus Metrics:**
```bash
# View all metrics
curl http://localhost:8080/metrics

# Key metrics to monitor:
# - http_requests_total
# - http_request_duration_seconds
# - database_connections
# - agent_tasks_pending
# - agent_tasks_completed
```

---

## Security Operations

### Security Checklist

**Before Production Deployment:**
- [ ] Change default passwords in `.env`
- [ ] Generate strong JWT secret (`openssl rand -base64 32`)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up automated backups
- [ ] Review and harden PostgreSQL configuration
- [ ] Enable rate limiting
- [ ] Configure CORS properly

### SSL/TLS Configuration

**Option 1: Nginx Reverse Proxy**
```nginx
server {
    listen 443 ssl http2;
    server_name api.bizra.io;

    ssl_certificate /etc/letsencrypt/live/api.bizra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bizra.io/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option 2: Traefik (Docker Compose)**
```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=ops@bizra.io"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  api_server:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.bizra.io`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
```

### Audit Log Monitoring

```bash
# Check recent audit logs
docker exec bizra_postgres psql -U bizra_user -d bizra_genesis -c \
  "SELECT * FROM security_audit_log ORDER BY created_at DESC LIMIT 20;"

# Monitor failed login attempts
docker exec bizra_postgres psql -U bizra_user -d bizra_genesis -c \
  "SELECT COUNT(*), action FROM security_audit_log WHERE action LIKE '%failed%' GROUP BY action;"
```

---

## Emergency Procedures

### Complete System Failure

**Symptoms:**
- All services down
- Cannot access API or dashboard
- Database unresponsive

**Recovery Steps:**

1. **Assess Damage:**
```bash
# Check Docker daemon
sudo systemctl status docker

# Check disk space
df -h

# Check system logs
journalctl -xe
```

2. **Restore from Backup:**
```bash
# Stop all services
docker-compose down

# Restore database
cat /var/backups/bizra/latest.sql | docker exec -i bizra_postgres psql -U bizra_user -d bizra_genesis

# Restart services
ops/ignite.sh full --detach
```

3. **Verify Recovery:**
```bash
# Check system status
ops/ignite.sh --status

# Run health checks
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

**Estimated Recovery Time:** 10-30 minutes

---

### Data Corruption

**Symptoms:**
- Database integrity errors
- Foreign key violations
- Unexpected NULL values

**Recovery Steps:**

1. **Stop Write Operations:**
```bash
# Stop API server
docker-compose stop api_server
```

2. **Run Integrity Checks:**
```bash
# Check database integrity
docker exec bizra_postgres psql -U bizra_user -d bizra_genesis -c \
  "SELECT * FROM pg_catalog.pg_database WHERE datname = 'bizra_genesis';"

# Run integration tests
cargo test --test database_integrity_v0_9_0
```

3. **Restore from Backup:**
```bash
# If corruption confirmed, restore from latest backup
cat /var/backups/bizra/latest.sql | docker exec -i bizra_postgres psql -U bizra_user -d bizra_genesis
```

---

### Security Breach

**If Breach Suspected:**

1. **Immediate Actions:**
   - Disconnect from network
   - Stop all services: `docker-compose down`
   - Preserve logs: `docker-compose logs > incident_$(date +%Y%m%d).log`

2. **Investigation:**
   - Review audit logs
   - Check for unauthorized access
   - Identify attack vector

3. **Remediation:**
   - Rotate all secrets (JWT, database passwords)
   - Update `.env` with new credentials
   - Rebuild containers: `ops/ignite.sh full --clean --build`
   - Restore from known-good backup if needed

4. **Post-Incident:**
   - Document incident
   - Update security measures
   - Notify stakeholders

---

## Appendix

### Quick Reference Card

**Start Services:**
```bash
ops/ignite.sh full --detach
```

**Check Status:**
```bash
ops/ignite.sh --status
```

**View Logs:**
```bash
docker-compose logs -f
```

**Backup Database:**
```bash
docker exec bizra_postgres pg_dump -U bizra_user bizra_genesis > backup.sql
```

**Run Tests:**
```bash
cargo test --all --lib --bins
```

**Restart Everything:**
```bash
ops/ignite.sh full --clean --build --detach
```

---

### Contact Information

**Support Channels:**
- **Documentation:** [RELEASE_NOTES_v0.9.0.md](RELEASE_NOTES_v0.9.0.md)
- **GitHub Issues:** https://github.com/your-org/bizra-genesis-node/issues
- **Emergency Contact:** ops@bizra.io

---

**Document Version:** 1.0
**Release:** v0.9.0
**Last Updated:** 2025-11-24
