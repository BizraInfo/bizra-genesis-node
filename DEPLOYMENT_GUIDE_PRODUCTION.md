# 🚀 BIZRA GENESIS NODE - PRODUCTION DEPLOYMENT GUIDE

**Version**: 1.0.0
**Last Updated**: 2025-01-15
**Target Audience**: DevOps Engineers, SREs, System Administrators
**Compliance**: ISO/IEC 12207, CMMI Level 3+

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Deployment Methods](#deployment-methods)
4. [Configuration](#configuration)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Observability](#monitoring--observability)
7. [Scaling & Performance](#scaling--performance)
8. [Disaster Recovery](#disaster-recovery)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 PREREQUISITES

### Required Software

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Rust | 1.75+ | Backend compilation |
| Node.js | 20.x | Frontend build |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching layer |
| Nginx | 1.25+ | Reverse proxy |

### System Requirements

**Minimum (Development)**:
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 10 Mbps

**Recommended (Production)**:
- CPU: 8 cores (16 threads)
- RAM: 16 GB
- Storage: 100 GB NVMe SSD
- Network: 1 Gbps
- Backup: 500 GB

**Enterprise (High Availability)**:
- CPU: 16+ cores per node
- RAM: 32+ GB per node
- Storage: 500 GB+ NVMe SSD RAID 10
- Network: 10 Gbps with redundancy
- Nodes: 3+ for HA cluster

---

## 🏗️ INFRASTRUCTURE REQUIREMENTS

### Cloud Providers (Recommended)

#### AWS
```yaml
Services:
  - EC2: t3.xlarge or c6i.2xlarge
  - RDS: PostgreSQL 15 (db.t3.large)
  - ElastiCache: Redis 7 (cache.t3.medium)
  - ELB: Application Load Balancer
  - S3: Backup storage
  - CloudWatch: Monitoring
  - Route53: DNS management
```

#### Google Cloud Platform
```yaml
Services:
  - Compute Engine: n2-standard-4
  - Cloud SQL: PostgreSQL 15
  - Memorystore: Redis 7
  - Load Balancing: HTTPS Load Balancer
  - Cloud Storage: Backups
  - Cloud Monitoring: Observability
```

#### Azure
```yaml
Services:
  - Virtual Machines: Standard_D4s_v3
  - Azure Database for PostgreSQL
  - Azure Cache for Redis
  - Application Gateway: Load balancer
  - Blob Storage: Backups
  - Azure Monitor: Metrics
```

### Kubernetes (Production-Grade)

```yaml
Cluster Configuration:
  - Kubernetes: v1.28+
  - Node Count: 3+ (HA)
  - Node Type: 4 CPU, 16 GB RAM minimum
  - Ingress: NGINX Ingress Controller
  - Cert Manager: Let's Encrypt integration
  - Storage: Persistent Volumes (SSD)
```

---

## 🚢 DEPLOYMENT METHODS

### Method 1: Docker Compose (Recommended for Small-Medium Scale)

#### Step 1: Clone Repository
```bash
git clone https://github.com/bizra/genesis-node.git
cd genesis-node
```

#### Step 2: Configure Environment
```bash
# Copy production environment template
cp .env.production .env

# Edit with secure values
vim .env

# CRITICAL: Change these values:
# - JWT_SECRET
# - ENCRYPTION_KEY
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - GRAFANA_PASSWORD
```

#### Step 3: Build Images
```bash
# Build all services
docker-compose -f docker-compose.production.yml build

# Verify images
docker images | grep bizra
```

#### Step 4: Start Services
```bash
# Start in detached mode
docker-compose -f docker-compose.production.yml up -d

# Check service health
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

#### Step 5: Verify Deployment
```bash
# Health check
curl http://localhost:8080/health

# Metrics endpoint
curl http://localhost:9090/metrics

# Frontend
curl http://localhost:80
```

---

### Method 2: Kubernetes (Production HA Setup)

#### Step 1: Prepare Kubernetes Cluster
```bash
# Using kubectl
kubectl version --client

# Create namespace
kubectl create namespace bizra-production

# Set context
kubectl config set-context --current --namespace=bizra-production
```

#### Step 2: Create Secrets
```bash
# Create database secret
kubectl create secret generic bizra-db-credentials \
  --from-literal=username=bizra \
  --from-literal=password='YOUR_SECURE_PASSWORD'

# Create JWT secret
kubectl create secret generic bizra-jwt \
  --from-literal=secret='YOUR_JWT_SECRET_256_BITS'

# Create API keys
kubectl create secret generic bizra-api-keys \
  --from-literal=openai='sk-...' \
  --from-literal=anthropic='sk-ant-...'
```

#### Step 3: Deploy with Helm (Recommended)
```bash
# Add Helm repository
helm repo add bizra https://charts.bizra.ai
helm repo update

# Install chart
helm install bizra-genesis bizra/genesis-node \
  --namespace bizra-production \
  --values values.production.yaml \
  --set replicaCount=3 \
  --set autoscaling.enabled=true

# Verify deployment
kubectl get pods -n bizra-production
kubectl get svc -n bizra-production
```

#### Step 4: Configure Ingress
```bash
# Apply ingress configuration
kubectl apply -f k8s/ingress.yaml

# Verify ingress
kubectl get ingress -n bizra-production
```

---

### Method 3: Bare Metal / VPS Deployment

#### Step 1: System Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  postgresql-15 \
  redis-server \
  nginx \
  certbot \
  python3-certbot-nginx

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Step 2: Build Application
```bash
# Clone repository
git clone https://github.com/bizra/genesis-node.git
cd genesis-node

# Build backend
cargo build --release

# Build frontend
cd apps/dashboard
npm ci
npm run build
cd ../..
```

#### Step 3: Configure Services
```bash
# PostgreSQL
sudo -u postgres createuser bizra
sudo -u postgres createdb bizra_genesis -O bizra
sudo -u postgres psql -c "ALTER USER bizra WITH PASSWORD 'SECURE_PASSWORD';"

# Redis
sudo vim /etc/redis/redis.conf
# Set: requirepass YOUR_REDIS_PASSWORD

# Nginx
sudo cp infra/nginx/nginx.conf /etc/nginx/sites-available/bizra
sudo ln -s /etc/nginx/sites-available/bizra /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: Create Systemd Service
```bash
# Create service file
sudo vim /etc/systemd/system/bizra-genesis.service
```

```ini
[Unit]
Description=BIZRA Genesis Node
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=bizra
WorkingDirectory=/opt/bizra/genesis-node
Environment="RUST_LOG=info"
Environment="DATABASE_URL=postgresql://bizra:PASSWORD@localhost/bizra_genesis"
Environment="REDIS_URL=redis://:PASSWORD@localhost:6379"
ExecStart=/opt/bizra/genesis-node/target/release/bizra-genesis-node
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable bizra-genesis
sudo systemctl start bizra-genesis

# Check status
sudo systemctl status bizra-genesis
```

---

## 🔐 SECURITY HARDENING

### SSL/TLS Configuration

#### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d bizra.ai -d www.bizra.ai

# Auto-renewal
sudo certbot renew --dry-run
```

#### Custom Certificate
```bash
# Generate CSR
openssl req -new -newkey rsa:4096 -nodes \
  -keyout bizra.key -out bizra.csr

# After receiving certificate
sudo cp bizra.crt /etc/nginx/ssl/
sudo cp bizra.key /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/bizra.key
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Fail2ban (Brute force protection)
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Database Security
```bash
# PostgreSQL hardening
# Edit /etc/postgresql/15/main/pg_hba.conf
hostssl all all 0.0.0.0/0 md5

# Enable SSL
# Edit /etc/postgresql/15/main/postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
```

---

## 📊 MONITORING & OBSERVABILITY

### Prometheus Metrics

**Exposed Endpoints**:
- Application: `http://localhost:9090/metrics`
- Node Exporter: `http://localhost:9100/metrics`
- PostgreSQL Exporter: `http://localhost:9187/metrics`

**Key Metrics**:
```prometheus
# Request latency
bizra_http_request_duration_seconds

# Error rate
bizra_http_requests_total{status="5xx"}

# Consensus performance
bizra_consensus_duration_seconds

# Database connections
bizra_db_connections_active

# Cache hit rate
bizra_cache_hit_ratio
```

### Grafana Dashboards

Access Grafana at: `http://localhost:3000`

**Pre-configured Dashboards**:
1. **System Overview**: CPU, Memory, Disk, Network
2. **Application Performance**: Request rate, latency, errors
3. **Database Metrics**: Connections, query performance
4. **Consensus Analytics**: Agent performance, trust receipts
5. **Business Metrics**: User activity, API usage

### Logging

#### Centralized Logging (ELK Stack)
```bash
# Install Filebeat
sudo apt install filebeat

# Configure
sudo vim /etc/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/bizra/*.log
output.elasticsearch:
  hosts: ["localhost:9200"]
setup.kibana:
  host: "localhost:5601"
```

#### CloudWatch (AWS)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

---

## ⚡ SCALING & PERFORMANCE

### Horizontal Scaling (Load Balancing)

#### NGINX Load Balancer
```nginx
upstream bizra_backend {
    least_conn;
    server bizra-node-1:8080 max_fails=3 fail_timeout=30s;
    server bizra-node-2:8080 max_fails=3 fail_timeout=30s;
    server bizra-node-3:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name bizra.ai;

    location / {
        proxy_pass http://bizra_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Scaling

#### Read Replicas
```bash
# Create read replica (PostgreSQL)
pg_basebackup -h primary-db -D /var/lib/postgresql/15/replica \
  -U replication -v -P --wal-method=stream

# Configure standby
echo "standby_mode = 'on'" >> /var/lib/postgresql/15/replica/recovery.conf
echo "primary_conninfo = 'host=primary-db port=5432 user=replication'" \
  >> /var/lib/postgresql/15/replica/recovery.conf
```

#### Connection Pooling
```bash
# Install PgBouncer
sudo apt install pgbouncer

# Configure
sudo vim /etc/pgbouncer/pgbouncer.ini
```

```ini
[databases]
bizra_genesis = host=localhost port=5432 dbname=bizra_genesis

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### Caching Strategy

#### Redis Cluster
```bash
# Create Redis cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

---

## 🔄 DISASTER RECOVERY

### Backup Strategy

#### Automated PostgreSQL Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"
pg_dump bizra_genesis | gzip > $BACKUP_DIR/bizra_$DATE.sql.gz

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "bizra_*.sql.gz" -mtime +30 -delete
```

#### Continuous Archiving (WAL)
```bash
# Configure in postgresql.conf
archive_mode = on
archive_command = 'cp %p /archive/%f'
wal_level = replica
```

### Restore Procedures

#### Database Restore
```bash
# Stop application
sudo systemctl stop bizra-genesis

# Restore from backup
gunzip -c /backup/postgres/bizra_20250115.sql.gz | psql bizra_genesis

# Restart application
sudo systemctl start bizra-genesis
```

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue: High Memory Usage
```bash
# Check memory
free -h
docker stats

# Solution: Adjust resource limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

#### Issue: Slow Database Queries
```bash
# Enable slow query log
ALTER DATABASE bizra_genesis SET log_min_duration_statement = 1000;

# Analyze queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

#### Issue: SSL Certificate Expiration
```bash
# Check expiration
echo | openssl s_client -servername bizra.ai -connect bizra.ai:443 2>/dev/null | openssl x509 -noout -dates

# Renew with Certbot
sudo certbot renew --force-renewal
```

---

## 📞 SUPPORT

**Technical Support**: devops@bizra.ai
**Emergency**: +1-XXX-XXX-XXXX
**Documentation**: https://docs.bizra.ai
**Status Page**: https://status.bizra.ai

---

**Document Version**: 1.0.0
**Last Reviewed**: 2025-01-15
**Next Review**: 2025-04-15

**Classification**: CONFIDENTIAL - Internal Use Only
