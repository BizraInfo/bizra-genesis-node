# BIZRA Genesis Node – Environment Matrix (P1.6)

## 1. Environment Tiers

| Environment | Purpose | Exposure | Data Type | Infrastructure |
|-------------|---------|----------|-----------|----------------|
| **`dev`** | Local + experimental development | Local only (`localhost`) | Synthetic / test data | Docker Compose (local) |
| **`stage`** | Pre-production verification & testing | Restricted access (VPN) | Sanitized mirror data | Docker Compose (cloud) |
| **`prod`** | Live Genesis Node production | Public HTTPS (`genesis-node.bizra.ai`) | Real user data + PoI attestations | Docker Compose (production) |

---

## 2. Infrastructure Configuration

### 2.1 Shared Components & Ports

- **Application**: `bizra-genesis-node` Rust binary (containerized)
- **Container Registry**: `registry.bizra.ai/bizra/genesis-node`
- **Ports**:
  - HTTP: `8080` (behind TLS terminator in prod)
  - Health: `/healthz` endpoint
  - Metrics: `/metrics` (admin-only in prod)
- **Base Images**: `rust:1.75-slim` → `alpine:latest` (security hardening)
- **Core Dependencies**:
  - **PostgreSQL 16+** with pgvector extension
  - **Redis 7+** (caching, queue management)
  - **Prometheus + Grafana** (observability stack)

### 2.2 Environment-Specific Configurations

#### **`dev` Environment**
**Purpose**: Rapid iteration, debugging, local experiments

**Configuration**:
```yaml
# docker-compose.dev.yml overrides
DATABASE_URL: postgres://postgres:dev_password@localhost:5432/genesis_dev
REDIS_URL: redis://localhost:6379

# AI Configuration
OPENAI_API_KEY: "sk-dev-key...(from .env)"
ANTHROPIC_API_KEY: "sk-ant-dev-...(from .env)"

# Observability
LOG_LEVEL: debug
PROMETHEUS_ENABLED: true
GRAFANA_ENABLED: true
```

**Security Profile**:
- ✅ CORS: `localhost:3000` only
- ✅ Debug endpoints: Available for troubleshooting
- ✅ Full logging: Debug level with sensitive data (PII filtered)
- ✅ Rate limiting: Disabled for development speed

**Data Management**:
- 🧪 **Data Type**: Synthetic test data generated via scripts
- 🔄 **Reset Strategy**: `docker compose down -v && docker compose up` for clean state
- 📊 **Migration Testing**: Idempotent migration validation

#### **`stage` Environment**
**Purpose**: Pre-production validation, performance testing, security verification

**Configuration**:
```yaml
# docker-compose.stage.yml overrides
DATABASE_URL: postgres://stage_user:stage_secure_pass@stage-db.bizra.internal:5432/genesis_stage
REDIS_URL: redis://stage-cache.bizra.internal:6379

# AI Configuration
OPENAI_API_KEY: "sk-stage-prod-...(from secrets manager)"
ANTHROPIC_API_KEY: "sk-ant-stage-...(from secrets manager)"

# Security Hardening
SAPE_API_SECURITY_TOKEN: "stage-token-..."  # AI-specific auth
ALLOWED_ORIGINS: "https://stage.genesis.bizra.ai"
```

**Security Profile**:
- ✅ TLS: Certificate-based encryption
- ✅ CORS: Stage domain whitelist only
- ✅ Rate Limiting: Production-equivalent settings
- ✅ Security Headers: Full HTTP security headers enabled
- ✅ Debug Endpoints: Disabled (production simulation)

**Data Management**:
- 🛡️ **Data Type**: Sanitized mirror of production data (PII scrubbed)
- 🔒 **Backup Interval**: Weekly encrypted backups
- 📋 **Change Management**: Requires approval for destructive operations

#### **`prod` Environment**
**Purpose**: Live user-facing production Genesis Node

**Configuration**:
```yaml
# docker-compose.prod.yml overrides
DATABASE_URL: postgres://prod_user:prod_secure_pass@prod-db.bizra.prod:5432/genesis_prod
REDIS_URL: redis://prod-cache.bizra.prod:6379

# AI Configuration (Production Keys)
OPENAI_API_KEY: "sk-prod-real-...(from HashiCorp Vault)"
ANTHROPIC_API_KEY: "sk-ant-prod-...(from HashiCorp Vault)"
OLLAMA_BASE_URL: "https://ollama.bizra.prod:11434"

# Production Security
SAPE_API_SECURITY_TOKEN: "prod-token-secure-..."  # AI-specific auth
ALLOWED_ORIGINS: "https://genesis-node.bizra.ai,https://api.bizra.ai"
RATE_LIMIT_REQUESTS_PER_MINUTE: 1000
```

**Security Profile**:
- ✅ **TLS Termination**: Reverse proxy (nginx/Caddy) with auto-renewal certificates
- ✅ **Network Security**: Private subnets, security groups, WAF rules
- ✅ **Application Security**: Full security headers, CSP, rate limiting
- ✅ **Secrets Management**: HashiCorp Vault integration, zero .env files
- ✅ **Monitoring**: Security event alerting, SIEM integration planning

**Data Management**:
- 🏛️ **Data Type**: Live user data + cryptographic PoI attestations
- 🛡️ **Backup Strategy**: Daily encrypted backups, geo-redundant storage
- 📊 **Retention**: Configurable data retention policies (compliance-ready)
- 🔍 **Audit Trail**: Immutable security audit logging

---

## 3. Environment-Specific Risks & Mitigation

### **Risk Assessment Matrix**

| Risk Category | `dev` Impact | `stage` Impact | `prod` Impact | Mitigation Strategy |
|---------------|--------------|----------------|---------------|-------------------|
| **Data Breach** | Low | Medium | **Critical** | Environment isolation, encryption, access controls |
| **Service Outage** | Low | High | **Critical** | Monitoring, redundancy, failover procedures |
| **Performance Issues** | Low | Medium | High | Load testing, monitoring, auto-scaling |
| **Security Vulnerabilities** | Low | High | **Critical** | Automated scanning, security reviews, rapid patching |
| **Configuration Drift** | Medium | High | **Critical** | IaC, gitops, automated drift detection |

### **Blast Radius Containment**

**`dev`**: Single developer impact, full recovery via container restart
**`stage`**: Cross-team testing impact, controlled rollback procedures
**`prod`**: Live user impact, emergency procedures with stakeholder communication

---

## 4. Environment Promotion Path

### **Development → Staging**

**Automated Promotion Triggers**:
- ✅ All P1.1-P1.5 CI gates pass on `main` branch
- ✅ Performance benchmark shows <2% regression
- ✅ Security audit clean (no critical/high vulnerabilities)
- ✅ Database migration tested on staging schema
- ✅ Manual approval from technical owner

**Promotion Process**:
```bash
# Automated in CI (.github/workflows/promote-stage.yml)
git tag stage-$(date +%Y%m%d-%H%M%S)
docker build -t registry.bizra.ai/bizra/genesis-node:stage-latest
docker push registry.bizra.ai/bizra/genesis-node:stage-latest
kubectl set image deployment/genesis-node app=registry.bizra.ai/bizra/genesis-node:stage-latest
```

### **Staging → Production**

**Production Deployment Gates**:
- ✅ 7-day smoke test period completed in staging
- ✅ Production readiness criteria checklist signed off
- ✅ Security team review completed (architecture review)
- ✅ Business owner approval for release
- ✅ Scheduled maintenance window available

**Production Rollout Strategy**:
- 🔄 **Blue-Green Deployment**: Zero-downtime container replacement
- 📊 **Progressive Traffic Shift**: 10% → 50% → 100% gradual rollout
- 🔍 **Real-time Monitoring**: Error rate, latency, and business metrics tracking
- ↩️ **Instant Rollback**: Automated revert on SLA violation detection

---

## 5. Monitoring & Alerting Standards

### **Cross-Environment Consistency**

| Metric Category | `dev` Alerting | `stage` Alerting | `prod` Alerting |
|----------------|----------------|------------------|-----------------|
| **Health Checks** | Local monitoring | PagerDuty non-urgent | PagerDuty critical |
| **Error Rates** | Console logs only | Email alerts >5% | SMS alerts >1% |
| **Performance** | Local thresholds | Email alerts on SLO breach | SMS alerts + escalation |
| **Security Events** | Console logs | Email alerts | Immediate SMS + on-call |

### **SLA Definitions**

**Production Availability SLA**: 99.9% uptime (8.76 hours monthly downtime)
**Performance SLA**: P95 response time <50ms for `/sape/execute`
**Security SLA**: <15 minute incident detection and response

---

## 6. Compliance & Audit Framework

### **Regulatory Compliance**

- **Data Protection**: GDPR-ready architecture with PII minimization
- **Security Standards**: OWASP Top 10, defenses implemented
- **Audit Requirements**: Environment-specific logging and retention
- **Change Management**: Git-based change tracking and approval workflows

### **Operationalмом Excellence**

- **Runbook Compliance**: Documented procedures for all operational tasks
- **Knowledge Base**: Environment-specific troubleshooting guides
- **Training Requirements**: Environment-specific operation procedures
- **Continuous Improvement**: Post-mortem reviews and process optimization

---

## Conclusion

The BIZRA Genesis Node environment matrix provides a structured, enterprise-grade deployment pipeline that ensures:

🎯 **Development Velocity**: Rapid iteration in isolated development environments
🛡️ **Production Safety**: Multi-gate deployment process with rollback capabilities
📊 **Operational Visibility**: Comprehensive monitoring across all environment tiers
🔒 **Security Integrity**: Environment-specific security controls and compliance

This framework enables confident production deployments while maintaining development agility and ensuring system reliability.
