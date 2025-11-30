# Bizra Genesis Node - Kubernetes Deployment

This directory contains production-grade Kubernetes manifests for deploying the Bizra Genesis Node with elite-level DevOps practices.

## 📁 Directory Structure

```
k8s/
├── base/               # Base Kubernetes manifests
│   ├── deployment.yml  # Deployment with security, HA, autoscaling
│   ├── service.yml     # Services, HPA, PDB, NetworkPolicy
│   └── config.yml      # ConfigMaps, Secrets, Ingress, Quotas
├── overlays/           # Kustomize overlays for environments
│   ├── dev/
│   ├── staging/
│   └── production/
└── monitoring/         # Observability stack manifests
    ├── prometheus/
    ├── grafana/
    └── loki/
```

## 🚀 Features

### Elite-Level Kubernetes Architecture

#### 1. **High Availability & Resilience**
- **Multi-AZ Deployment**: Topology spread constraints ensure pods are distributed across availability zones
- **Pod Anti-Affinity**: Prevents multiple replicas on the same node
- **Pod Disruption Budget**: Guarantees minimum 2 replicas during voluntary disruptions
- **Zero-Downtime Deployments**: Rolling updates with `maxUnavailable: 0`

#### 2. **Auto-Scaling Excellence**
- **HPA with Multiple Metrics**: 
  - CPU utilization (70% target)
  - Memory utilization (80% target)
  - Custom metrics: HTTP requests/sec, WebSocket connections
- **Intelligent Scale Behavior**:
  - Fast scale-up (60s stabilization, 100% increase)
  - Gradual scale-down (300s stabilization, 50% reduction)
- **Min 3 replicas, Max 20 replicas**

#### 3. **Security Hardening**
- **Non-Root Execution**: All containers run as user 1000
- **Read-Only Root Filesystem**: Prevents runtime file modifications
- **Drop All Capabilities**: Minimal privilege escalation
- **SeccompProfile**: Runtime security enforcement
- **Network Policies**: Zero-trust networking with explicit allow rules
- **TLS Ingress**: HTTPS-only with strong ciphers (TLSv1.2+)
- **Security Headers**: XSS, CSP, Frame-Options protection

#### 4. **Health & Observability**
- **Triple Health Probes**:
  - **Liveness**: Detects if pod is alive (30s delay, 10s interval)
  - **Readiness**: Determines if pod can receive traffic (10s delay, 5s interval)
  - **Startup**: Handles slow initialization (150s max startup time)
- **Prometheus Metrics**: Automatic scraping via ServiceMonitor
- **Distributed Tracing**: OpenTelemetry integration
- **Structured Logging**: Fluent Bit sidecar for log aggregation

#### 5. **Resource Management**
- **Guaranteed QoS**: Requests == Limits for predictable performance
- **Resource Quotas**: Namespace-level limits prevent resource exhaustion
- **Limit Ranges**: Default constraints for all pods
- **Ephemeral Storage**: Controlled tmp and cache volumes

#### 6. **Graceful Lifecycle**
- **PreStop Hook**: 5s delay + SIGTERM for connection draining
- **60s Termination Grace Period**: Allows in-flight requests to complete
- **Init Container**: Database migrations before main container starts

## 📋 Prerequisites

### Required Tools
```bash
# Kubernetes cluster (v1.25+)
kubectl version --client

# Kustomize (v5.0+)
kustomize version

# Helm (v3.10+)
helm version

# Optional: ArgoCD for GitOps
argocd version
```

### Required Cluster Addons
- **Ingress Controller**: NGINX Ingress Controller
- **Certificate Management**: cert-manager
- **Monitoring**: Prometheus Operator, Grafana
- **Logging**: Loki, Fluent Bit
- **Secrets Management**: Sealed Secrets or External Secrets Operator
- **Auto-Scaling**: Metrics Server, Cluster Autoscaler

## 🔧 Deployment Guide

### Step 1: Create Namespace & Secrets

```bash
# Create namespace
kubectl apply -f k8s/base/config.yml --dry-run=client -o yaml | grep -A10 "kind: Namespace" | kubectl apply -f -

# Update secrets (CRITICAL: Replace CHANGEME values)
kubectl create secret generic bizra-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/bizra" \
  --from-literal=redis-url="redis://host:6379" \
  --from-literal=jwt-secret="$(openssl rand -base64 48)" \
  --namespace=bizra-production \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 2: Deploy Configuration

```bash
# Apply ConfigMaps and base configuration
kubectl apply -f k8s/base/config.yml
```

### Step 3: Deploy Application

```bash
# Apply deployment and services
kubectl apply -f k8s/base/deployment.yml
kubectl apply -f k8s/base/service.yml
```

### Step 4: Verify Deployment

```bash
# Check deployment status
kubectl get deployments -n bizra-production
kubectl get pods -n bizra-production
kubectl get hpa -n bizra-production

# Check pod logs
kubectl logs -n bizra-production -l app=bizra-genesis-node --tail=50

# Test health endpoints
kubectl port-forward -n bizra-production svc/bizra-genesis-node 8082:8082
curl http://localhost:8082/health/ready
```

### Step 5: Configure Ingress & TLS

```bash
# Install cert-manager (if not already installed)
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@bizra.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Verify ingress
kubectl get ingress -n bizra-production
kubectl describe ingress bizra-genesis-node -n bizra-production
```

## 📊 Monitoring & Observability

### Metrics Collection

```bash
# Check ServiceMonitor
kubectl get servicemonitor -n bizra-production

# View Prometheus targets
kubectl port-forward -n observability svc/prometheus-operated 9090:9090
# Navigate to http://localhost:9090/targets

# Example PromQL queries
# - CPU usage: rate(container_cpu_usage_seconds_total{pod=~"bizra-genesis-node.*"}[5m])
# - Memory usage: container_memory_working_set_bytes{pod=~"bizra-genesis-node.*"}
# - HTTP request rate: rate(http_requests_total{service="bizra-genesis-node"}[1m])
```

### Logging

```bash
# View aggregated logs in Loki
kubectl port-forward -n observability svc/loki 3100:3100

# Query logs with LogQL
# {job="bizra-genesis-node"} |= "error"
# {job="bizra-genesis-node",pod=~"bizra-genesis-node-.*"} | json | level="error"
```

### Distributed Tracing

```bash
# Check OTEL Collector
kubectl get pods -n observability -l app=otel-collector

# View traces in Jaeger
kubectl port-forward -n observability svc/jaeger-query 16686:16686
# Navigate to http://localhost:16686
```

## 🔐 Security Best Practices

### 1. Secrets Management
- **DO NOT** commit secrets to Git
- Use **Sealed Secrets** or **External Secrets Operator** for GitOps
- Rotate secrets regularly (90 days maximum)
- Use **HashiCorp Vault** for dynamic secrets

### 2. Network Security
- **NetworkPolicy** enforces zero-trust networking
- Only allow explicitly required ingress/egress
- Use **Istio** or **Linkerd** for mTLS between services
- Implement **WAF** (Web Application Firewall) at ingress

### 3. RBAC
- Follow principle of least privilege
- Create service-specific ServiceAccounts
- Audit RBAC permissions regularly

### 4. Image Security
- Scan images with **Trivy** or **Snyk**
- Use minimal base images (distroless, Alpine)
- Sign images with **Cosign**
- Implement admission controllers (**OPA Gatekeeper**, **Kyverno**)

## 🔄 GitOps Deployment (ArgoCD)

### Application Manifest

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bizra-genesis-node
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/BizraInfo/bizra-genesis-node.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: bizra-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## 🎯 Performance Tuning

### HPA Custom Metrics

```bash
# Install Prometheus Adapter for custom metrics
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace observability \
  --set prometheus.url=http://prometheus-operated.observability.svc

# Verify custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq
```

### Resource Limits Tuning

Based on load testing results, adjust:
- **CPU requests/limits**: Start conservative, increase based on P95 usage
- **Memory requests/limits**: Set based on RSS + 20% headroom
- **HPA targets**: 70% CPU, 80% memory for optimal balance
- **Replica counts**: Min 3, max based on traffic patterns

### Database Connection Pooling

```toml
[database]
max_connections = 20  # Per pod - tune based on DB capacity
min_connections = 5   # Keep warm connections
connection_timeout = 30  # seconds
idle_timeout = 600  # seconds (10 minutes)
max_lifetime = 3600  # seconds (1 hour)
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Pods not starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n bizra-production

# Check logs
kubectl logs <pod-name> -n bizra-production --previous

# Common causes:
# - Image pull errors (check ImagePullPolicy)
# - Resource constraints (check node capacity)
# - Init container failures (check migrations)
```

#### 2. HPA not scaling
```bash
# Check metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io

# Check HPA status
kubectl describe hpa bizra-genesis-node-hpa -n bizra-production

# Verify metrics availability
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

#### 3. Network connectivity issues
```bash
# Check NetworkPolicy
kubectl describe networkpolicy bizra-genesis-node-netpol -n bizra-production

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup bizra-genesis-node.bizra-production.svc.cluster.local

# Check service endpoints
kubectl get endpoints bizra-genesis-node -n bizra-production
```

## 📚 References

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Production-Grade Container Scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/)
- [NGINX Ingress Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)

## 🎓 Elite Practitioner Standards

This deployment follows **BIZRA Elite Full-Stack Blueprint** standards:

✅ **Zero-downtime deployments** with rolling updates  
✅ **Auto-scaling** with multiple metrics and intelligent behavior  
✅ **Security hardening** with non-root, read-only filesystem, network policies  
✅ **Comprehensive observability** with metrics, logs, traces  
✅ **High availability** with multi-AZ, anti-affinity, PDB  
✅ **Resource guarantees** with QoS, quotas, limits  
✅ **Graceful lifecycle** with health probes, preStop hooks  
✅ **Evidence-based operations** with ServiceMonitor, structured logs  

---

**Elite DevOps Excellence - Automated, Observable, Resilient**
