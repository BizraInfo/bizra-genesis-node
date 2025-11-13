# BIZRA Genesis – Environment Matrix

**Version:** 1.0.0
**Last Updated:** 2025-11-13
**Owner:** BIZRA Engineering Team

---

## Overview

This document defines the standard environment configuration for all BIZRA Genesis Node deployments. All infrastructure, documentation, and operational procedures must align with these specifications to ensure consistency, auditability, and enterprise readiness.

---

## Identity & Authentication

### OIDC Provider
- **Provider:** Keycloak (self-hosted)
- **Mode:** Self-hosted within BIZRA VPC
- **Rationale:** Maintains data sovereignty and eliminates third-party identity dependencies
- **Deployment:** Containerized Keycloak instance in ECS Fargate

### OIDC Configuration
```bash
OIDC_PROVIDER="keycloak"
OIDC_MODE="self_hosted"
OIDC_REGION="me-central-1"
OIDC_ISSUER="https://auth.bizra-genesis.com/realms/bizra"
```

### Authentication Flow
- **Protocol:** OpenID Connect (OIDC) with OAuth 2.0
- **Token Type:** JWT with RS256 signing
- **Session Management:** Redis-backed session store
- **RBAC Roles:** Admin, Operator, Viewer, API Client

---

## Geographic Distribution

### Primary Region
- **Region Code:** `me-central-1` (AWS Middle East - UAE)
- **Location:** Dubai, United Arab Emirates
- **Rationale:**
  - Lowest latency for MENA operations
  - Data residency compliance
  - Regional sovereignty alignment

### Disaster Recovery Region
- **Region Code:** `me-south-1` (AWS Middle East - Bahrain)
- **Mode:** Warm standby (Phase 2), Cold standby (Phase 1)
- **Failover RTO:** 15 minutes (target)
- **Failover RPO:** 5 minutes (target)

### Future Expansion (Phase 3+)
- **EU Region:** `eu-central-1` (Frankfurt) - GDPR compliance
- **Asia-Pacific:** `ap-southeast-1` (Singapore) - APAC expansion

### Region Configuration
```bash
CLOUD_PROVIDER="aws"
PRIMARY_REGION="me-central-1"
DR_REGION="me-south-1"
```

---

## Deployment Targets

### Development Environment
- **Target:** Local workstation
- **Platform:** Docker Compose
- **Purpose:** Local development, unit testing, integration testing
- **Characteristics:**
  - Single-node operation
  - In-memory or containerized databases
  - Mock external services
  - Hot reload for rapid iteration

```bash
DEPLOYMENT_TARGET_DEV="docker-compose"
```

### Staging Environment
- **Target:** AWS ECS Fargate
- **Region:** `me-central-1`
- **Purpose:** Pre-production validation, E2E testing, performance benchmarking
- **Characteristics:**
  - Production-like configuration
  - Real managed services (RDS, ElastiCache)
  - Full observability stack
  - Canary testing endpoint

```bash
DEPLOYMENT_TARGET_STAGING="ecs-fargate"
STAGING_CLUSTER="bizra-genesis-staging"
STAGING_URL="https://staging.bizra-genesis.com"
```

### Production Environment
- **Target:** AWS ECS Fargate
- **Primary Region:** `me-central-1`
- **DR Region:** `me-south-1`
- **Purpose:** Live customer traffic
- **Characteristics:**
  - High availability (multi-AZ)
  - Auto-scaling based on metrics
  - Blue-green deployment capability
  - Full disaster recovery setup

```bash
DEPLOYMENT_TARGET_PROD="ecs-fargate"
PROD_CLUSTER="bizra-genesis-prod"
PROD_URL="https://api.bizra-genesis.com"
```

---

## Database Systems

### Development Databases
```bash
DB_DEV="docker-postgres + docker-redis"
```

#### PostgreSQL (Development)
- **Version:** 15.x
- **Deployment:** Docker container
- **Configuration:**
  - Port: 5432
  - Database: `bizra_genesis_dev`
  - Connection Pool: 10 connections
  - Storage: Local volume mount

#### Redis (Development)
- **Version:** 7.x
- **Deployment:** Docker container
- **Configuration:**
  - Port: 6379
  - Mode: Standalone
  - Persistence: RDB snapshots (15min)
  - Max Memory: 512MB

### Staging Databases
```bash
DB_STAGING="aws-rds-postgres + aws-elasticache-redis"
```

#### RDS PostgreSQL (Staging)
- **Instance Class:** `db.t4g.medium` (2 vCPU, 4 GiB RAM)
- **Engine:** PostgreSQL 15.x
- **Multi-AZ:** No (cost optimization)
- **Storage:** 100 GB gp3 (3000 IOPS)
- **Backup:** Daily automated backups, 7-day retention
- **Encryption:** At-rest (KMS), in-transit (TLS 1.3)

#### ElastiCache Redis (Staging)
- **Node Type:** `cache.t4g.medium` (2 vCPU, 3.09 GiB)
- **Engine:** Redis 7.x
- **Cluster Mode:** Disabled
- **Replication:** Single node
- **Backup:** Daily snapshots, 7-day retention

### Production Databases
```bash
DB_PROD="aws-rds-postgres + aws-elasticache-redis"
```

#### RDS PostgreSQL (Production)
- **Instance Class:** `db.r6g.xlarge` (4 vCPU, 32 GiB RAM)
- **Engine:** PostgreSQL 15.x
- **Multi-AZ:** Yes (automatic failover)
- **Storage:** 500 GB gp3 (12000 IOPS)
- **Backup:**
  - Automated daily backups, 30-day retention
  - Manual snapshots before major changes
  - Cross-region backup replication to `me-south-1`
- **Encryption:** At-rest (KMS), in-transit (TLS 1.3)
- **Connection Pooling:** PgBouncer (100-500 connections)

#### ElastiCache Redis (Production)
- **Node Type:** `cache.r6g.large` (2 vCPU, 13.07 GiB)
- **Engine:** Redis 7.x
- **Cluster Mode:** Enabled (3 shards)
- **Replication:** 1 primary + 1 replica per shard
- **Backup:** Daily snapshots, 30-day retention
- **Failover:** Automatic with <30s downtime

---

## Database Schemas

### PostgreSQL Tables

#### `synthesis_receipts`
Stores cryptographic receipts for all synthesis operations.
```sql
CREATE TABLE synthesis_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) NOT NULL,
    winner_id VARCHAR(255) NOT NULL,
    signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    INDEX idx_task_id (task_id),
    INDEX idx_timestamp (timestamp)
);
```

#### `telemetry_events`
Stores operational telemetry for analysis and auditing.
```sql
CREATE TABLE telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    synthesis_id UUID REFERENCES synthesis_receipts(id),
    metrics JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_event_type (event_type),
    INDEX idx_timestamp (timestamp)
);
```

#### `proof_of_impact`
Tracks Proof-of-Impact attestations and validations.
```sql
CREATE TABLE proof_of_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synthesis_id UUID REFERENCES synthesis_receipts(id),
    impact_score DECIMAL(10, 4) NOT NULL,
    attestation JSONB NOT NULL,
    validator VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_synthesis_id (synthesis_id),
    INDEX idx_impact_score (impact_score DESC)
);
```

### Redis Key Patterns

#### Caching
- `cache:route:{route_id}` - Thompson Sampling router state (TTL: 5min)
- `cache:candidate:{candidate_id}` - Candidate evaluation cache (TTL: 1min)
- `cache:ihsan:{task_hash}` - Ihsan gate scores (TTL: 10min)

#### Rate Limiting
- `ratelimit:{api_key}:{window}` - API request counters (TTL: 1min-1hr)
- `ratelimit:global:{window}` - Global rate limit tracking

#### Session Management
- `session:{session_id}` - OIDC session data (TTL: 1hr)

---

## Network Configuration

### VPC Architecture
- **CIDR Block:** `10.0.0.0/16`
- **Subnets:**
  - Public Subnets: `10.0.1.0/24`, `10.0.2.0/24` (ALB, NAT)
  - Private Subnets: `10.0.10.0/24`, `10.0.11.0/24` (ECS tasks)
  - Database Subnets: `10.0.20.0/24`, `10.0.21.0/24` (RDS, ElastiCache)

### Security Groups
- **ALB Security Group:** Allow 443 from 0.0.0.0/0, 80 redirect to 443
- **ECS Task Security Group:** Allow from ALB, outbound to RDS/Redis
- **RDS Security Group:** Allow 5432 from ECS tasks only
- **Redis Security Group:** Allow 6379 from ECS tasks only

### DNS Configuration
- **Primary Domain:** `bizra-genesis.com`
- **API Endpoint:** `api.bizra-genesis.com` (prod)
- **Staging Endpoint:** `staging.bizra-genesis.com`
- **Auth Endpoint:** `auth.bizra-genesis.com` (Keycloak)
- **Metrics Endpoint:** `metrics.bizra-genesis.com` (Grafana)

---

## Observability Stack

### Prometheus
- **Deployment:** ECS Fargate container
- **Scrape Interval:** 5 seconds
- **Retention:** 30 days
- **Storage:** EBS volume (100 GB)
- **Endpoint:** `http://prometheus.internal.bizra-genesis.com:9090`

### Grafana
- **Deployment:** ECS Fargate container
- **Version:** Latest stable
- **Data Sources:** Prometheus, Jaeger
- **Authentication:** Keycloak OIDC integration
- **Endpoint:** `https://metrics.bizra-genesis.com`

### Jaeger
- **Deployment:** ECS Fargate container
- **Backend:** ElastiCache Redis
- **Sampling Rate:** 10% (adjustable)
- **Retention:** 7 days

### Logging
- **Solution:** AWS CloudWatch Logs (Phase 1) → ELK Stack (Phase 2)
- **Log Groups:**
  - `/ecs/bizra-genesis/orchestrator`
  - `/ecs/bizra-genesis/api`
  - `/ecs/bizra-genesis/keycloak`
- **Retention:** 90 days

---

## Service Level Objectives (SLOs)

### Staging Environment SLOs
- **Availability:** 99.9% (rolling 7-day window)
- **P95 Latency:** < 8ms (orchestrator core)
- **P99 Latency:** < 10ms (orchestrator core)
- **Error Rate:** < 0.1% (non-4xx errors)
- **Thompson Router P99:** < 2.3µs
- **Consensus P99:** < 46µs

### Production Environment SLOs
- **Availability:** 99.99% (monthly error budget: 0.01% = ~4.3 minutes/month)
- **P95 Latency:** < 5ms (orchestrator core)
- **P99 Latency:** < 10ms (orchestrator core)
- **API P95 Latency:** < 200ms (end-to-end)
- **API P99 Latency:** < 500ms (end-to-end)
- **Error Rate:** < 0.01% (non-4xx errors)
- **MTTR:** < 30 minutes
- **Change Failure Rate:** < 5%

---

## CI/CD Configuration

### Build Pipeline
- **Platform:** GitHub Actions
- **Triggers:** Push to main, PR creation
- **Build Matrix:**
  - OS: Ubuntu 22.04, Windows Server 2022, macOS 13
  - Rust: stable, beta
  - Features: default, simd, avx2

### Quality Gates
- ✅ Zero unsafe code (`cargo geiger`)
- ✅ Zero clippy warnings (`-D warnings`)
- ✅ Formatting check (`cargo fmt --check`)
- ✅ Test coverage ≥95% (`cargo tarpaulin`)
- ✅ Security audit clean (`cargo audit`)
- ✅ License compliance (`cargo deny`)
- ✅ Container security scan (`trivy`)
- ✅ Performance benchmarks (no >5% regression)

### Deployment Pipeline
- **Staging:** Automatic deployment on main branch merge
- **Production:** Manual approval required + canary deployment
- **Rollback:** Automatic on SLO violations, manual override available

---

## Security Configuration

### Encryption
- **At-Rest:** AWS KMS-managed keys (CMK)
- **In-Transit:** TLS 1.3 for all external connections
- **Internal:** mTLS between services (Phase 2)

### Secrets Management
- **Provider:** AWS Secrets Manager
- **Rotation:** Automatic 90-day rotation for DB credentials
- **Access:** IAM role-based, no hardcoded credentials

### Compliance
- **Standards:** ISO 27001, SOC 2 Type II
- **Audit Logging:** All API calls, DB changes, authentication events
- **Data Retention:** Per GDPR requirements (user data deletion on request)

---

## Cost Optimization

### Development
- **Estimated Monthly Cost:** $0 (local Docker)

### Staging
- **ECS Fargate:** ~$50/month (0.5 vCPU, 1GB RAM, 24/7)
- **RDS:** ~$75/month (db.t4g.medium)
- **ElastiCache:** ~$40/month (cache.t4g.medium)
- **Data Transfer:** ~$10/month
- **Total:** ~$175/month

### Production
- **ECS Fargate:** ~$300/month (2 vCPU, 4GB RAM, auto-scaling)
- **RDS:** ~$500/month (db.r6g.xlarge, Multi-AZ)
- **ElastiCache:** ~$300/month (cache.r6g.large, cluster mode)
- **Data Transfer:** ~$100/month
- **Observability:** ~$50/month
- **Total:** ~$1,250/month (scales with usage)

---

## Disaster Recovery

### Backup Strategy
- **Database:**
  - Automated daily backups to S3
  - Cross-region replication to `me-south-1`
  - Point-in-time recovery enabled (35-day window)
- **Configuration:**
  - Infrastructure as Code (Terraform) in Git
  - Secrets in AWS Secrets Manager with replication
- **Audit Logs:**
  - CloudWatch Logs with S3 export
  - 7-year retention for compliance

### Recovery Procedures
- **RTO (Recovery Time Objective):** 15 minutes
- **RPO (Recovery Point Objective):** 5 minutes
- **Runbook:** `docs/ops/runbooks/disaster-recovery.md`

---

## Environment Variables Reference

### Common Variables
```bash
# Cloud Provider
CLOUD_PROVIDER="aws"
PRIMARY_REGION="me-central-1"
DR_REGION="me-south-1"

# Identity
OIDC_PROVIDER="keycloak"
OIDC_MODE="self_hosted"
OIDC_ISSUER="https://auth.bizra-genesis.com/realms/bizra"

# Deployment
DEPLOYMENT_TARGET="ecs-fargate"  # or "docker-compose" for dev
CLUSTER_NAME="bizra-genesis-prod"

# Database
DB_HOST="bizra-genesis-prod.cluster-xyz.me-central-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="bizra_genesis"
DB_USER="bizra_admin"
DB_PASSWORD="<from-secrets-manager>"

# Redis
REDIS_HOST="bizra-genesis-prod.cache.amazonaws.com"
REDIS_PORT="6379"
REDIS_TLS="true"

# Observability
PROMETHEUS_URL="http://prometheus.internal.bizra-genesis.com:9090"
GRAFANA_URL="https://metrics.bizra-genesis.com"
JAEGER_ENDPOINT="http://jaeger.internal.bizra-genesis.com:14268"

# Application
LOG_LEVEL="info"  # trace, debug, info, warn, error
RUST_LOG="bizra_genesis=info,tokio=warn"
METRICS_PORT="9090"
API_PORT="8080"
```

---

## Validation Checklist

Before deploying to any environment, verify:

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Secrets rotated within 90 days
- [ ] Security groups configured
- [ ] Health checks passing
- [ ] Observability stack operational
- [ ] SLO dashboards configured
- [ ] Runbooks up-to-date
- [ ] Disaster recovery tested (quarterly)
- [ ] Cost budgets set in AWS

---

## Change Control

### Modification Process
1. Propose change via Pull Request to this document
2. Document rationale in ADR if architectural
3. Update Terraform configs to match
4. Update CI/CD pipelines if needed
5. Notify team via Slack #bizra-engineering
6. Get approval from 2+ engineers
7. Merge and deploy changes

### Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-13 | BIZRA Team | Initial environment matrix |

---

## References

- [AWS ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Keycloak Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Redis Documentation](https://redis.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

**End of Document**
