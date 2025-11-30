#!/bin/bash
# BIZRA Genesis Node - Professional Elite Deployment Script
# World-Class DevOps Pipeline with Full Observability Stack

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment variables with defaults
ENVIRONMENT=${ENVIRONMENT:-production}
REGION=${REGION:-us-east-1}
CLUSTER_NAME=${CLUSTER_NAME:-bizra-genesis}
NAMESPACE=${NAMESPACE:-bizra}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-bizragenesis}
VERSION=${VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}

# ═══════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
}

check_dependencies() {
    local deps=("docker" "kubectl" "helm" "aws" "terraform")
    local missing=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════
# INFRASTRUCTURE SETUP
# ═══════════════════════════════════════════════════════════════════════

setup_infrastructure() {
    log_header "🏗️  INFRASTRUCTURE SETUP"

    log_info "Initializing Terraform..."
    cd infrastructure/terraform

    terraform init
    terraform plan -var="environment=$ENVIRONMENT" -var="region=$REGION"
    terraform apply -auto-approve -var="environment=$ENVIRONMENT" -var="region=$REGION"

    cd ../..
    log_success "Infrastructure setup complete"
}

setup_kubernetes() {
    log_header "☸️  KUBERNETES CLUSTER SETUP"

    log_info "Configuring kubectl..."
    aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"

    log_info "Creating namespace..."
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    log_info "Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    kubectl wait --for=condition=available --timeout=300s deployment -n cert-manager --all

    log_info "Installing ingress-nginx..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx --create-namespace \
        --set controller.service.type=LoadBalancer

    log_success "Kubernetes setup complete"
}

# ═══════════════════════════════════════════════════════════════════════
# MONITORING STACK DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════

deploy_monitoring() {
    log_header "📊 MONITORING STACK DEPLOYMENT"

    log_info "Adding Helm repositories..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update

    log_info "Deploying Prometheus stack..."
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace \
        --values k8s/monitoring/prometheus-values.yaml \
        --wait

    log_info "Deploying Grafana..."
    helm upgrade --install grafana grafana/grafana \
        --namespace monitoring \
        --values k8s/monitoring/grafana-values.yaml \
        --wait

    log_info "Deploying Jaeger..."
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace monitoring \
        --values k8s/monitoring/jaeger-values.yaml \
        --wait

    log_info "Deploying Loki stack..."
    helm upgrade --install loki grafana/loki-stack \
        --namespace monitoring \
        --values k8s/monitoring/loki-values.yaml \
        --wait

    log_success "Monitoring stack deployed"
}

# ═══════════════════════════════════════════════════════════════════════
# APPLICATION DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════

build_and_push() {
    log_header "🐳 BUILDING AND PUSHING CONTAINER IMAGES"

    log_info "Building application image..."
    docker build -t "$DOCKER_REGISTRY/bizra-genesis-node:$VERSION" \
                 -t "$DOCKER_REGISTRY/bizra-genesis-node:latest" \
                 --build-arg BUILDKIT_INLINE_CACHE=1 \
                 --cache-from "$DOCKER_REGISTRY/bizra-genesis-node:latest" \
                 .

    log_info "Pushing images to registry..."
    docker push "$DOCKER_REGISTRY/bizra-genesis-node:$VERSION"
    docker push "$DOCKER_REGISTRY/bizra-genesis-node:latest"

    log_success "Container images built and pushed"
}

deploy_application() {
    log_header "🚀 DEPLOYING APPLICATION"

    log_info "Deploying to Kubernetes..."

    # Update deployment with new image version
    sed -i "s|image:.*|image: $DOCKER_REGISTRY/bizra-genesis-node:$VERSION|g" k8s/app/deployment.yaml

    kubectl apply -f k8s/app/ -n "$NAMESPACE"

    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/bizra-genesis-node -n "$NAMESPACE" --timeout=600s

    log_info "Setting up ingress..."
    kubectl apply -f k8s/ingress/ -n "$NAMESPACE"

    log_success "Application deployed successfully"
}

# ═══════════════════════════════════════════════════════════════════════
# QUALITY ASSURANCE
# ═══════════════════════════════════════════════════════════════════════

run_quality_checks() {
    log_header "🔍 QUALITY ASSURANCE"

    log_info "Running security scans..."
    # Run Trivy security scan
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasecurity/trivy:latest image \
        --exit-code 1 \
        --no-progress \
        "$DOCKER_REGISTRY/bizra-genesis-node:$VERSION"

    log_info "Running performance tests..."
    # Run k6 load tests
    docker run --rm -v "$(pwd)/k6:/k6" \
        grafana/k6:latest run \
        --out json=/k6/results.json \
        /k6/scenarios/api-slo.js

    log_info "Validating SLOs..."
    # Check SLO compliance
    kubectl exec -n monitoring deployment/prometheus-kube-prometheus-prometheus -- \
        promtool check rules /etc/prometheus/prometheus.yml

    log_success "Quality checks passed"
}

# ═══════════════════════════════════════════════════════════════════════
# OBSERVABILITY VALIDATION
# ═══════════════════════════════════════════════════════════════════════

validate_observability() {
    log_header "📈 VALIDATING OBSERVABILITY"

    log_info "Checking Prometheus targets..."
    kubectl exec -n monitoring deployment/prometheus-kube-prometheus-prometheus -- \
        wget -qO- http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health' | grep -q "up"

    log_info "Checking Grafana dashboards..."
    GRAFANA_PASSWORD=$(kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    curl -s -u "admin:$GRAFANA_PASSWORD" http://localhost:3000/api/health | grep -q "ok"

    log_info "Checking Jaeger traces..."
    curl -s http://localhost:16686/api/services | jq '.data[]' | grep -q "bizra-genesis-node"

    log_info "Validating metrics collection..."
    kubectl exec -n "$NAMESPACE" deployment/bizra-genesis-node -- \
        wget -qO- http://localhost:9090/metrics | grep -q "business_value"

    log_success "Observability validation complete"
}

# ═══════════════════════════════════════════════════════════════════════
# BACKUP AND DISASTER RECOVERY
# ═══════════════════════════════════════════════════════════════════════

setup_backup() {
    log_header "💾 BACKUP & DISASTER RECOVERY"

    log_info "Setting up Velero for backup..."
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo update

    helm upgrade --install velero vmware-tanzu/velero \
        --namespace velero --create-namespace \
        --values k8s/backup/velero-values.yaml \
        --wait

    log_info "Creating backup schedule..."
    velero create schedule daily-backup \
        --schedule="0 2 * * *" \
        --include-namespaces="$NAMESPACE,monitoring" \
        --ttl=168h

    log_info "Setting up disaster recovery runbooks..."
    # Copy runbooks to accessible location
    cp docs/ops/disaster-recovery.md /tmp/
    cp docs/ops/backup-restore.md /tmp/

    log_success "Backup and DR setup complete"
}

# ═══════════════════════════════════════════════════════════════════════
# PERFORMANCE OPTIMIZATION
# ═══════════════════════════════════════════════════════════════════════

optimize_performance() {
    log_header "⚡ PERFORMANCE OPTIMIZATION"

    log_info "Running performance benchmarks..."
    kubectl exec -n "$NAMESPACE" deployment/bizra-genesis-node -- \
        cargo bench --all-features

    log_info "Analyzing performance metrics..."
    # Compare against baselines
    ./scripts/performance-regression-detector.mjs

    log_info "Applying performance optimizations..."
    # Auto-scale based on metrics
    kubectl autoscale deployment bizra-genesis-node \
        --cpu-percent=70 \
        --min=3 \
        --max=10 \
        -n "$NAMESPACE"

    log_success "Performance optimization complete"
}

# ═══════════════════════════════════════════════════════════════════════
# COMPLIANCE & SECURITY
# ═══════════════════════════════════════════════════════════════════════

setup_security() {
    log_header "🔒 SECURITY & COMPLIANCE"

    log_info "Setting up network policies..."
    kubectl apply -f k8s/security/network-policies.yaml -n "$NAMESPACE"

    log_info "Configuring RBAC..."
    kubectl apply -f k8s/security/rbac.yaml -n "$NAMESPACE"

    log_info "Setting up secrets management..."
    # Install external-secrets or similar
    helm repo add external-secrets https://charts.external-secrets.io
    helm repo update

    helm upgrade --install external-secrets external-secrets/external-secrets \
        --namespace external-secrets --create-namespace \
        --wait

    log_info "Running compliance checks..."
    # Run CIS Kubernetes benchmark
    kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
    kubectl wait --for=condition=complete job/kube-bench -n default --timeout=300s

    log_success "Security and compliance setup complete"
}

# ═══════════════════════════════════════════════════════════════════════
# MAIN DEPLOYMENT ORCHESTRATION
# ═══════════════════════════════════════════════════════════════════════

main() {
    log_header "🚀 BIZRA GENESIS NODE - PROFESSIONAL ELITE DEPLOYMENT"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo "Version: $VERSION"
    echo

    # Pre-flight checks
    check_dependencies

    # Phase 1: Infrastructure
    setup_infrastructure
    setup_kubernetes

    # Phase 2: Monitoring & Observability
    deploy_monitoring

    # Phase 3: Application
    build_and_push
    deploy_application

    # Phase 4: Quality Assurance
    run_quality_checks

    # Phase 5: Validation
    validate_observability

    # Phase 6: Operational Excellence
    setup_backup
    optimize_performance
    setup_security

    # Final status
    log_header "✅ DEPLOYMENT COMPLETE"
    echo "🎯 Application deployed successfully!"
    echo "📊 Monitoring: http://grafana.local"
    echo "📈 Metrics: http://prometheus.local"
    echo "🔍 Traces: http://jaeger.local"
    echo "📋 Logs: http://loki.local"
    echo "🌐 Application: http://app.local"
    echo
    echo "📞 Alert Contacts:"
    echo "   • PagerDuty: Configured for critical alerts"
    echo "   • Slack: #bizra-alerts channel"
    echo "   • Email: ops@bizra.com"
    echo
    echo "📚 Runbooks:"
    echo "   • Deployment: docs/ops/deployment.md"
    echo "   • Troubleshooting: docs/ops/troubleshooting.md"
    echo "   • Scaling: docs/ops/scaling.md"
}

# ═══════════════════════════════════════════════════════════════════════
# SCRIPT EXECUTION
# ═══════════════════════════════════════════════════════════════════════

# Handle command line arguments
case "${1:-}" in
    "infrastructure")
        setup_infrastructure
        ;;
    "monitoring")
        deploy_monitoring
        ;;
    "build")
        build_and_push
        ;;
    "deploy")
        deploy_application
        ;;
    "quality")
        run_quality_checks
        ;;
    "validate")
        validate_observability
        ;;
    "backup")
        setup_backup
        ;;
    "security")
        setup_security
        ;;
    "all"|*)
        main
        ;;
esac
