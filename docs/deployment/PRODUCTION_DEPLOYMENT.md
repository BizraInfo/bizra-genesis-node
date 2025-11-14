# Production Deployment Guide - BIZRA Genesis Node

**Complete step-by-step guide for deploying to production Kubernetes cluster**

This guide provides a professional, battle-tested workflow for deploying the BIZRA Genesis Node to production with zero downtime, comprehensive monitoring, and disaster recovery capabilities.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Deployment](#database-deployment)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Monitoring & Observability](#monitoring--observability)
7. [Rolling Updates & Rollbacks](#rolling-updates--rollbacks)
8. [Disaster Recovery](#disaster-recovery)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

###  Security & Secrets

- [ ] All passwords changed from defaults
- [ ] Secrets stored in external secrets manager (AWS Secrets Manager, Vault, etc.)
- [ ] TLS/SSL certificates provisioned
- [ ] Network policies configured
- [ ] RBAC roles defined
- [ ] Image scanning enabled (Trivy, Snyk)
- [ ] Security context constraints applied

### Infrastructure

- [ ] Kubernetes cluster provisioned (EKS, GKE, AKS, or self-managed)
- [ ] Minimum 3 worker nodes across availability zones
- [ ] Storage class configured with SSD backing
- [ ] Load balancer provisioned
- [ ] DNS records configured
- [ ] Backup storage provisioned (S3, GCS, Azure Blob)

### Application

- [ ] Database migrations tested
- [ ] SQLx offline metadata generated (`cargo sqlx prepare`)
- [ ] Docker image built and pushed to registry
- [ ] Integration tests passing (`cargo test --test database_integration`)
- [ ] Performance benchmarks within targets (`cargo bench --bench database_performance`)
- [ ] Security audit completed (`cargo audit`)

### Monitoring

- [ ] Prometheus Operator installed
- [ ] Grafana dashboards prepared
- [ ] Alert rules configured
- [ ] PagerDuty/OpsGenie integration setup
- [ ] Log aggregation configured (ELK, Loki)

---

## Infrastructure Setup

### 1. Kubernetes Cluster Creation

#### AWS EKS (Recommended)

```bash
# Install eksctl
curl --silent --location "https://github.com/weksctl-io/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name bizra-genesis-prod \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --with-oidc \
  --ssh-access \
  --ssh-public-key ~/.ssh/id_rsa.pub \
  --managed
```

#### Google GKE

```bash
gcloud container clusters create bizra-genesis-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-stackdriver-kubernetes \
  --enable-ip-alias \
  --network "default" \
  --subnetwork "default" \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing
```

### 2. Storage Class Setup

```bash
# For AWS EBS GP3
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

# Verify storage class
kubectl get storageclass fast-ssd
```

### 3. Namespace and RBAC

```bash
# Create namespace
kubectl create namespace bizra-genesis
kubectl label namespace bizra-genesis pod-security.kubernetes.io/enforce=restricted

# Create service account
kubectl create serviceaccount bizra-genesis-node -n bizra-genesis

# Create RBAC role
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: bizra-genesis-role
  namespace: bizra-genesis
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bizra-genesis-rolebinding
  namespace: bizra-genesis
subjects:
  - kind: ServiceAccount
    name: bizra-genesis-node
    namespace: bizra-genesis
roleRef:
  kind: Role
  name: bizra-genesis-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

---

## Database Deployment

### Step 1: Generate Secure Passwords

```bash
# Generate strong passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Save to secure location (do NOT commit these!)
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD" > .secrets/prod-passwords.txt
echo "REDIS_PASSWORD: $REDIS_PASSWORD" >> .secrets/prod-passwords.txt
chmod 600 .secrets/prod-passwords.txt
```

### Step 2: Create Kubernetes Secrets

```bash
# PostgreSQL secret
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=bizra_user \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB=bizra_genesis \
  -n bizra-genesis

# Redis secret
kubectl create secret generic redis-secret \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  -n bizra-genesis

# Verify secrets created
kubectl get secrets -n bizra-genesis
```

### Step 3: Deploy PostgreSQL

```bash
# Update postgres-statefulset.yaml with production settings
# - Change replicas to 3 for HA
# - Update storage size (e.g., 200Gi)
# - Remove LoadBalancer service (use internal only)

# Deploy PostgreSQL
kubectl apply -f infra/k8s/database/postgres-statefulset.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod/postgres-0 -n bizra-genesis --timeout=600s

# Verify PostgreSQL health
kubectl exec -it postgres-0 -n bizra-genesis -- psql -U bizra_user -d bizra_genesis -c "SELECT version();"
```

### Step 4: Run Database Migrations

```bash
# Create migration job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: bizra-db-migration
  namespace: bizra-genesis
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: your-registry/bizra-genesis-node:${VERSION}
          command: ["/usr/local/bin/sqlx"]
          args: ["migrate", "run"]
          env:
            - name: DATABASE_URL
              value: "postgres://bizra_user:${POSTGRES_PASSWORD}@postgres.bizra-genesis.svc.cluster.local:5432/bizra_genesis"
      restartPolicy: OnFailure
EOF

# Wait for migration to complete
kubectl wait --for=condition=complete job/bizra-db-migration -n bizra-genesis --timeout=300s

# Check migration logs
kubectl logs job/bizra-db-migration -n bizra-genesis
```

### Step 5: Deploy Redis

```bash
# Deploy Redis with Sentinel
kubectl apply -f infra/k8s/database/redis-statefulset.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod/redis-0 -n bizra-genesis --timeout=600s
kubectl wait --for=condition=ready pod/redis-1 -n bizra-genesis --timeout=600s
kubectl wait --for=condition=ready pod/redis-2 -n bizra-genesis --timeout=600s

# Verify Redis cluster health
kubectl exec -it redis-0 -n bizra-genesis -- redis-cli ping
kubectl exec -it redis-0 -n bizra-genesis -- redis-cli -p 26379 SENTINEL masters
```

---

## Application Deployment

### Step 1: Build and Push Docker Image

```bash
# Set version
export VERSION=$(git describe --tags --always --dirty)
export REGISTRY="your-registry.azurecr.io" # Or ECR, GCR, Docker Hub

# Build image
docker build -t ${REGISTRY}/bizra-genesis-node:${VERSION} .

# Push to registry
docker push ${REGISTRY}/bizra-genesis-node:${VERSION}

# Tag as latest (optional)
docker tag ${REGISTRY}/bizra-genesis-node:${VERSION} ${REGISTRY}/bizra-genesis-node:latest
docker push ${REGISTRY}/bizra-genesis-node:latest
```

### Step 2: Update Application Manifests

```bash
# Update image in bizra-deployment.yaml
sed -i "s|bizra/genesis-node:latest|${REGISTRY}/bizra-genesis-node:${VERSION}|g" infra/k8s/app/bizra-deployment.yaml

# Create application secrets
DATABASE_URL="postgres://bizra_user:${POSTGRES_PASSWORD}@postgres.bizra-genesis.svc.cluster.local:5432/bizra_genesis"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis-0.redis.bizra-genesis.svc.cluster.local:6379/0"

kubectl create secret generic bizra-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=POSTGRES_USER=bizra_user \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB=bizra_genesis \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  -n bizra-genesis \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Deploy Application

```bash
# Deploy application
kubectl apply -f infra/k8s/app/bizra-deployment.yaml

# Wait for deployment to be ready
kubectl wait --for=condition=available deployment/bizra-genesis-node -n bizra-genesis --timeout=600s

# Check deployment status
kubectl get deployment bizra-genesis-node -n bizra-genesis
kubectl get pods -l app=bizra-genesis-node -n bizra-genesis
```

### Step 4: Expose Application

```bash
# Get LoadBalancer IP/hostname
LOAD_BALANCER=$(kubectl get svc bizra-genesis-node-lb -n bizra-genesis -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Application available at: http://$LOAD_BALANCER"

# Update DNS records
# Point your domain (e.g., api.bizra.ai) to $LOAD_BALANCER
```

---

## Post-Deployment Validation

### 1. Health Checks

```bash
# Test startup probe
curl http://$LOAD_BALANCER/health/startup

# Test liveness probe
curl http://$LOAD_BALANCER/health/live

# Test readiness probe
curl http://$LOAD_BALANCER/health/ready

# Expected response (all):
# {"status": "ok", "version": "1.0.0"}
```

### 2. Smoke Tests

```bash
# Run smoke test pod
kubectl run smoke-test \
  --image=curlimages/curl:latest \
  --rm -it --restart=Never \
  -- curl -f http://bizra-genesis-node.bizra-genesis.svc.cluster.local:8080/health/ready

# Expected output:
# {"status":"ok","database":"connected","cache":"connected"}
```

### 3. Database Connectivity

```bash
# Test database connection
kubectl exec -it deployment/bizra-genesis-node -n bizra-genesis -- /bin/sh -c '
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM trust_receipts;"
'

# Expected: No errors, returns count
```

### 4. Cache Connectivity

```bash
# Test Redis connection
kubectl exec -it redis-0 -n bizra-genesis -- redis-cli -a "$REDIS_PASSWORD" INFO stats
```

### 5. End-to-End Test

```bash
# Run full integration test
kubectl run e2e-test \
  --image=${REGISTRY}/bizra-genesis-node:${VERSION} \
  --rm -it --restart=Never \
  --env="DATABASE_URL=$DATABASE_URL" \
  --env="REDIS_URL=$REDIS_URL" \
  -- /usr/local/bin/bizra-genesis-node test
```

---

## Monitoring & Observability

### 1. Install Prometheus Operator

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### 2. Verify ServiceMonitors

```bash
# Check ServiceMonitors are discovered
kubectl get servicemonitor -n bizra-genesis

# Verify Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Open http://localhost:9090/targets
# Should see: bizra-genesis-node, postgres, redis targets
```

### 3. Access Grafana

```bash
# Get Grafana password
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open http://localhost:3000
# Login: admin / <password from above>
```

### 4. Import Dashboards

```bash
# Import pre-built dashboards
kubectl apply -f infra/k8s/monitoring/dashboards/
```

---

## Rolling Updates & Rollbacks

### Rolling Update

```bash
# Build new version
export NEW_VERSION=$(git describe --tags --always)
docker build -t ${REGISTRY}/bizra-genesis-node:${NEW_VERSION} .
docker push ${REGISTRY}/bizra-genesis-node:${NEW_VERSION}

# Update deployment
kubectl set image deployment/bizra-genesis-node \
  bizra-genesis-node=${REGISTRY}/bizra-genesis-node:${NEW_VERSION} \
  -n bizra-genesis

# Watch rollout
kubectl rollout status deployment/bizra-genesis-node -n bizra-genesis

# Verify new version
kubectl get pods -l app=bizra-genesis-node -n bizra-genesis -o jsonpath='{.items[0].spec.containers[0].image}'
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/bizra-genesis-node -n bizra-genesis

# Rollback to previous version
kubectl rollout undo deployment/bizra-genesis-node -n bizra-genesis

# Rollback to specific revision
kubectl rollout undo deployment/bizra-genesis-node -n bizra-genesis --to-revision=3

# Verify rollback
kubectl rollout status deployment/bizra-genesis-node -n bizra-genesis
```

---

## Disaster Recovery

### 1. Database Backup

```bash
# Manual backup (ad-hoc)
kubectl exec -it postgres-0 -n bizra-genesis -- \
  pg_dump -U bizra_user bizra_genesis | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d-%H%M%S).sql.gz s3://bizra-backups/postgres/

# Automated backups run via CronJob (already configured)
kubectl get cronjob postgres-backup -n bizra-genesis
```

### 2. Database Restore

```bash
# Download backup from S3
aws s3 cp s3://bizra-backups/postgres/backup-20250114-020000.sql.gz .

# Copy to pod
kubectl cp backup-20250114-020000.sql.gz bizra-genesis/postgres-0:/tmp/

# Restore
kubectl exec -it postgres-0 -n bizra-genesis -- bash -c '
  gunzip < /tmp/backup-20250114-020000.sql.gz | psql -U bizra_user bizra_genesis
'
```

### 3. Redis Backup

```bash
# Manual backup
kubectl exec redis-0 -n bizra-genesis -- redis-cli -a "$REDIS_PASSWORD" SAVE
kubectl cp bizra-genesis/redis-0:/data/dump.rdb redis-backup-$(date +%Y%m%d).rdb

# Upload to S3
aws s3 cp redis-backup-$(date +%Y%m%d).rdb s3://bizra-backups/redis/
```

### 4. Complete Cluster Rebuild

```bash
# 1. Backup all PVCs
kubectl get pvc -n bizra-genesis
velero backup create bizra-full-backup --include-namespaces bizra-genesis

# 2. Recreate cluster (if needed)
eksctl create cluster --config-file cluster-config.yaml

# 3. Restore from backup
velero restore create --from-backup bizra-full-backup

# 4. Verify restoration
kubectl get all -n bizra-genesis
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n bizra-genesis

# Describe pod for events
kubectl describe pod <pod-name> -n bizra-genesis

# Check logs
kubectl logs <pod-name> -n bizra-genesis --previous

# Common issues:
# - ImagePullBackOff: Check image exists and registry access
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource availability and PVC binding
```

### Database Connection Issues

```bash
# Test DNS resolution
kubectl run debug --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup postgres.bizra-genesis.svc.cluster.local

# Test TCP connectivity
kubectl run debug --image=busybox:1.36 --rm -it --restart=Never -- \
  nc -zv postgres.bizra-genesis.svc.cluster.local 5432

# Check PostgreSQL logs
kubectl logs postgres-0 -n bizra-genesis

# Check connection pool stats
kubectl exec -it deployment/bizra-genesis-node -n bizra-genesis -- \
  curl localhost:9090/metrics | grep bizra_db_pool
```

### High Latency

```bash
# Check Prometheus metrics
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Run queries:
# - histogram_quantile(0.99, rate(bizra_db_query_duration_seconds_bucket[5m]))
# - bizra_db_pool_active_connections
# - bizra_cache_hit_rate

# Check node resources
kubectl top nodes
kubectl top pods -n bizra-genesis

# Scale up if needed
kubectl scale deployment bizra-genesis-node --replicas=10 -n bizra-genesis
```

---

## Production Checklist Summary

### Before Deployment
- [ ] All tests passing
- [ ] Performance benchmarks meet targets
- [ ] Security scan clean
- [ ] Secrets generated and stored securely
- [ ] DNS records configured

### During Deployment
- [ ] Database deployed and migrations run
- [ ] Cache deployed and healthy
- [ ] Application deployed (rolling update)
- [ ] Health checks passing
- [ ] Smoke tests passing

### After Deployment
- [ ] Monitoring dashboards showing data
- [ ] Alerts configured and tested
- [ ] Backups configured and tested
- [ ] Documentation updated
- [ ] Team notified

---

**Deployment Timeline:**
- Infrastructure setup: 30-60 minutes
- Database deployment: 15-20 minutes
- Application deployment: 10-15 minutes
- Validation & monitoring: 15-30 minutes
- **Total: ~90 minutes for first deployment**

**Subsequent deployments (rolling updates):**
- ~5-10 minutes with zero downtime

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
