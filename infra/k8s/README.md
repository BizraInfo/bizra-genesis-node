# BIZRA Genesis Node - Kubernetes Deployment Guide

**Production-grade Kubernetes deployment for BIZRA Genesis Node**

This directory contains production-ready Kubernetes manifests for deploying the complete BIZRA Genesis Node stack with high availability, auto-scaling, and observability.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              bizra-genesis Namespace                   │ │
│  │                                                         │ │
│  │  ┌──────────────┐     ┌──────────────┐                │ │
│  │  │  Application │     │  Application │                │ │
│  │  │   Pod 1      │ ... │   Pod N      │                │ │
│  │  │  (HPA 3-20)  │     │  (HPA 3-20)  │                │ │
│  │  └───────┬──────┘     └───────┬──────┘                │ │
│  │          │                     │                        │ │
│  │          └─────────┬───────────┘                        │ │
│  │                    │                                    │ │
│  │          ┌─────────▼─────────┐                         │ │
│  │          │   LoadBalancer    │                         │ │
│  │          │   bizra-lb:80     │                         │ │
│  │          └───────────────────┘                         │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              Database Layer                      │  │ │
│  │  │                                                   │  │ │
│  │  │  ┌───────────────┐     ┌────────────────┐       │  │ │
│  │  │  │  PostgreSQL   │     │  Redis         │       │  │ │
│  │  │  │  StatefulSet  │     │  StatefulSet   │       │  │ │
│  │  │  │  (Master + 2) │     │  (3 replicas)  │       │  │ │
│  │  │  │               │     │  + Sentinel    │       │  │ │
│  │  │  └───────┬───────┘     └───────┬────────┘       │  │ │
│  │  │          │                      │                │  │ │
│  │  │          │                      │                │  │ │
│  │  │  ┌───────▼──────────────────────▼────────┐      │  │ │
│  │  │  │   Persistent Volume Storage (100Gi)   │      │  │ │
│  │  │  └───────────────────────────────────────┘      │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │           Monitoring & Observability             │  │ │
│  │  │                                                   │  │ │
│  │  │  • Prometheus (metrics collection)               │  │ │
│  │  │  • Grafana (visualization)                       │  │ │
│  │  │  • Postgres Exporter                             │  │ │
│  │  │  • Redis Exporter                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
infra/k8s/
├── README.md                          # This file
├── database/
│   ├── postgres-statefulset.yaml     # PostgreSQL deployment
│   └── redis-statefulset.yaml        # Redis deployment
├── app/
│   └── bizra-deployment.yaml         # Application deployment
└── monitoring/                        # (Optional) Prometheus/Grafana
    ├── prometheus.yaml
    └── grafana.yaml
```

---

## Prerequisites

### 1. Kubernetes Cluster

**Minimum Requirements:**
- Kubernetes 1.25+
- 3+ worker nodes (for high availability)
- 16 CPU cores total (4 per node minimum)
- 32 GB RAM total (8 GB per node minimum)
- 300 GB storage (SSD recommended)

**Recommended Production Setup:**
- Kubernetes 1.28+
- 5+ worker nodes across multiple availability zones
- 32+ CPU cores total
- 64+ GB RAM total
- 500+ GB SSD storage with dynamic provisioning

**Tested Platforms:**
- ✅ Amazon EKS
- ✅ Google GKE
- ✅ Azure AKS
- ✅ Self-managed (kubeadm, k3s)
- ✅ Local development (minikube, kind)

### 2. kubectl CLI

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify installation
kubectl version --client
```

### 3. Storage Class

Ensure you have a storage class with SSD backing:

```bash
# Check available storage classes
kubectl get storageclass

# Create fast-ssd storage class if needed (example for AWS EBS)
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
```

### 4. Secrets Management

**IMPORTANT:** Never use default passwords in production!

**Option A: Kubernetes Secrets (Development)**
```bash
# Edit secrets directly in YAML files
vim infra/k8s/database/postgres-statefulset.yaml
vim infra/k8s/database/redis-statefulset.yaml
vim infra/k8s/app/bizra-deployment.yaml
```

**Option B: External Secrets Operator (Production)**
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Use with AWS Secrets Manager, HashiCorp Vault, etc.
```

---

## Quick Start (Development)

### 1. Create Namespace

```bash
kubectl create namespace bizra-genesis
```

### 2. Deploy Database Layer

```bash
# PostgreSQL
kubectl apply -f infra/k8s/database/postgres-statefulset.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n bizra-genesis --timeout=300s

# Redis
kubectl apply -f infra/k8s/database/redis-statefulset.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis -n bizra-genesis --timeout=300s
```

### 3. Verify Database Health

```bash
# Check pods
kubectl get pods -n bizra-genesis

# Check services
kubectl get svc -n bizra-genesis

# Test PostgreSQL connection
kubectl exec -it postgres-0 -n bizra-genesis -- psql -U bizra_user -d bizra_genesis -c "SELECT version();"

# Test Redis connection
kubectl exec -it redis-0 -n bizra-genesis -- redis-cli ping
```

### 4. Deploy Application

```bash
# Build and push Docker image (replace with your registry)
docker build -t your-registry/bizra-genesis-node:latest .
docker push your-registry/bizra-genesis-node:latest

# Update image in bizra-deployment.yaml
sed -i 's|bizra/genesis-node:latest|your-registry/bizra-genesis-node:latest|' infra/k8s/app/bizra-deployment.yaml

# Deploy application
kubectl apply -f infra/k8s/app/bizra-deployment.yaml

# Wait for application to be ready
kubectl wait --for=condition=ready pod -l app=bizra-genesis-node -n bizra-genesis --timeout=300s
```

### 5. Access Application

```bash
# Get LoadBalancer IP/hostname
kubectl get svc bizra-genesis-node-lb -n bizra-genesis

# Test health endpoint
BIZRA_URL=$(kubectl get svc bizra-genesis-node-lb -n bizra-genesis -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$BIZRA_URL/health/ready

# View logs
kubectl logs -f deployment/bizra-genesis-node -n bizra-genesis
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

- [ ] Kubernetes cluster meets minimum requirements
- [ ] Storage class configured with SSD backing
- [ ] Secrets stored in external secrets manager (not hardcoded)
- [ ] Database passwords changed from defaults
- [ ] Resource limits tuned based on load testing
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Disaster recovery plan documented

### 2. Security Hardening

```bash
# Update all passwords in secrets
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=bizra_user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=POSTGRES_DB=bizra_genesis \
  -n bizra-genesis --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secret \
  --from-literal=REDIS_PASSWORD=$(openssl rand -base64 32) \
  -n bizra-genesis --dry-run=client -o yaml | kubectl apply -f -

# Enable NetworkPolicy
kubectl label namespace bizra-genesis network-policy=enabled

# Enable Pod Security Standards
kubectl label namespace bizra-genesis pod-security.kubernetes.io/enforce=restricted
```

### 3. Production Configuration

**PostgreSQL:**
- Increase replicas to 3 for high availability
- Configure streaming replication
- Set up pg_basebackup for backups
- Tune `shared_buffers`, `work_mem` based on load

**Redis:**
- Use 3 replicas with Sentinel
- Enable AOF + RDB persistence
- Configure maxmemory based on workload
- Set up Redis Sentinel for automatic failover

**Application:**
- Set HPA min replicas to 5+ for production
- Tune resource limits based on load testing
- Configure PodDisruptionBudget for zero-downtime updates
- Enable Istio service mesh for traffic management

### 4. Deploy to Production

```bash
# 1. Deploy in order
kubectl apply -f infra/k8s/database/postgres-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n bizra-genesis --timeout=600s

kubectl apply -f infra/k8s/database/redis-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=redis -n bizra-genesis --timeout=600s

kubectl apply -f infra/k8s/app/bizra-deployment.yaml
kubectl wait --for=condition=ready pod -l app=bizra-genesis-node -n bizra-genesis --timeout=600s

# 2. Verify deployment
kubectl get all -n bizra-genesis

# 3. Run smoke tests
kubectl run smoke-test --image=curlimages/curl:latest --rm -it --restart=Never -- \
  curl -f http://bizra-genesis-node.bizra-genesis.svc.cluster.local:8080/health/ready
```

---

## Monitoring & Observability

### 1. Metrics Collection

**Prometheus ServiceMonitors are included for:**
- Application metrics (port 9090)
- PostgreSQL metrics (port 9187)
- Redis metrics (port 9121)

```bash
# Install Prometheus Operator (if not already installed)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Verify ServiceMonitors are discovered
kubectl get servicemonitor -n bizra-genesis
```

### 2. Key Metrics to Monitor

**Application:**
- `bizra_synthesis_requests_total` - Total synthesis requests
- `bizra_synthesis_duration_seconds` - Request duration
- `bizra_router_state_alpha` - Thompson Sampling alpha parameters
- `bizra_router_state_beta` - Thompson Sampling beta parameters
- `bizra_consensus_success_rate` - Ihsan threshold success rate

**Database:**
- `pg_stat_database_tup_inserted` - PostgreSQL write rate
- `pg_stat_database_tup_fetched` - PostgreSQL read rate
- `redis_commands_processed_total` - Redis command throughput
- `redis_memory_used_bytes` - Redis memory usage

### 3. Alerts

Example alert rules:

```yaml
groups:
  - name: bizra-genesis-alerts
    interval: 30s
    rules:
      - alert: BizraHighErrorRate
        expr: rate(bizra_synthesis_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: PostgreSQLDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "PostgreSQL is down"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        annotations:
          summary: "Redis is down"
```

---

## Backup & Recovery

### 1. Automated Backups

**PostgreSQL backups run daily at 2 AM:**
```bash
# Check backup CronJob
kubectl get cronjob postgres-backup -n bizra-genesis

# Manually trigger backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n bizra-genesis

# List backups
kubectl exec -it postgres-0 -n bizra-genesis -- ls -lh /backup
```

**Redis backups run daily at 3 AM:**
```bash
# Check backup CronJob
kubectl get cronjob redis-backup -n bizra-genesis

# Manually trigger backup
kubectl create job --from=cronjob/redis-backup manual-backup-$(date +%s) -n bizra-genesis
```

### 2. Manual Backup

**PostgreSQL:**
```bash
kubectl exec postgres-0 -n bizra-genesis -- \
  pg_dump -U bizra_user bizra_genesis | gzip > bizra-backup-$(date +%Y%m%d).sql.gz
```

**Redis:**
```bash
kubectl exec redis-0 -n bizra-genesis -- \
  redis-cli SAVE

kubectl cp bizra-genesis/redis-0:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### 3. Restore from Backup

**PostgreSQL:**
```bash
# 1. Upload backup to pod
kubectl cp bizra-backup-20250114.sql.gz bizra-genesis/postgres-0:/tmp/

# 2. Restore
kubectl exec -it postgres-0 -n bizra-genesis -- bash -c \
  "gunzip < /tmp/bizra-backup-20250114.sql.gz | psql -U bizra_user bizra_genesis"
```

**Redis:**
```bash
# 1. Stop Redis
kubectl scale statefulset redis --replicas=0 -n bizra-genesis

# 2. Copy backup to pod
kubectl cp redis-backup-20250114.rdb bizra-genesis/redis-0:/data/dump.rdb

# 3. Restart Redis
kubectl scale statefulset redis --replicas=3 -n bizra-genesis
```

---

## Scaling

### 1. Horizontal Scaling (Auto)

HPA automatically scales application pods based on CPU/memory:

```bash
# Check HPA status
kubectl get hpa -n bizra-genesis

# Manually adjust HPA limits
kubectl patch hpa bizra-genesis-node-hpa -n bizra-genesis --patch '{"spec":{"maxReplicas":50}}'
```

### 2. Vertical Scaling (Manual)

**Database Resources:**
```bash
# Edit StatefulSet
kubectl edit statefulset postgres -n bizra-genesis

# Update resource limits
resources:
  limits:
    cpu: "8"
    memory: "16Gi"
```

**Storage Expansion:**
```bash
# Expand PVC (if storage class supports it)
kubectl patch pvc postgres-data-postgres-0 -n bizra-genesis -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
```

---

## Troubleshooting

### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n bizra-genesis

# Check events
kubectl describe pod <pod-name> -n bizra-genesis

# Check logs
kubectl logs <pod-name> -n bizra-genesis --previous
```

### 2. Database Connection Issues

```bash
# Test PostgreSQL connectivity
kubectl run pg-test --image=postgres:15-alpine --rm -it --restart=Never -- \
  psql -h postgres.bizra-genesis.svc.cluster.local -U bizra_user -d bizra_genesis

# Test Redis connectivity
kubectl run redis-test --image=redis:7-alpine --rm -it --restart=Never -- \
  redis-cli -h redis-0.redis.bizra-genesis.svc.cluster.local ping
```

### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n bizra-genesis
kubectl top nodes

# Check database performance
kubectl exec -it postgres-0 -n bizra-genesis -- \
  psql -U bizra_user -d bizra_genesis -c "SELECT * FROM pg_stat_activity;"
```

### 4. View Logs

```bash
# Application logs
kubectl logs -f deployment/bizra-genesis-node -n bizra-genesis

# Database logs
kubectl logs -f statefulset/postgres -n bizra-genesis
kubectl logs -f statefulset/redis -n bizra-genesis

# All logs
kubectl logs -f -l app.kubernetes.io/part-of=bizra-platform -n bizra-genesis
```

---

## Cleanup

```bash
# Delete all resources
kubectl delete namespace bizra-genesis

# Delete PVCs (CAUTION: This deletes all data!)
kubectl delete pvc -l app.kubernetes.io/part-of=bizra-platform -n bizra-genesis

# Delete PVs if manually provisioned
kubectl get pv | grep bizra-genesis | awk '{print $1}' | xargs kubectl delete pv
```

---

## Next Steps

1. **[Configure Monitoring](../monitoring/README.md)** - Set up Prometheus and Grafana
2. **[Set Up CI/CD](../../docs/deployment/CI_CD.md)** - Automate deployments with GitHub Actions
3. **[Enable Istio](../service-mesh/README.md)** - Service mesh for traffic management
4. **[Configure Autoscaling](../autoscaling/README.md)** - Advanced HPA and VPA
5. **[Disaster Recovery](../disaster-recovery/README.md)** - Complete DR plan

---

## Support

- **Documentation**: [docs/](../../docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/bizra-genesis-node/issues)
- **Slack**: #bizra-genesis-support

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
