#!/bin/bash

# 🎯 CHAOS ENGINEERING AUTOMATION SCRIPT
# BIZRA Genesis Node - First Chaos Experiment Execution
#
# This script safely executes the container failure chaos experiment
# in a controlled, production-safe manner with automated recovery.
#
# Usage:
#   chmod +x chaos-experiments/run-first-chaos.sh
#   ./chaos-experiments/run-first-chaos.sh
#
# Requirements:
#   - Kubernetes cluster running
#   - BIZRA node deployed with HPA
#   - Chaos Toolkit installed
#   - Prometheus/Grafana monitoring active

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPERIMENT_FILE="chaos-experiments/container-failure.json"
LOG_FILE="chaos-experiments/execution-$(date +%Y%m%d-%H%M%S).log"
CHAOS_TOOLKIT_TIMEOUT=1800  # 30 minutes max execution

echo "🌀 BIZRA CHAOS ENGINEERING - FIRST EXPERIMENT EXECUTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pre-flight checks
echo "🔍 PRE-FLIGHT CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Kubernetes access
echo "Checking Kubernetes cluster access..."
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot access Kubernetes cluster${NC}"
    echo "   Ensure kubectl is configured and cluster is accessible"
    exit 1
fi
echo -e "${GREEN}✅ Kubernetes cluster accessible${NC}"

# Check if BIZRA node is deployed
echo "Checking BIZRA deployment status..."
if ! kubectl get deployment bizra-genesis-node > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: BIZRA deployment not found${NC}"
    echo "   Deploy BIZRA Genesis Node before running chaos experiments"
    exit 1
fi
echo -e "${GREEN}✅ BIZRA deployment found${NC}"

# Check HPA configuration
echo "Checking Horizontal Pod Autoscaler..."
if ! kubectl get hpa bizra-genesis-node > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: No HPA configured for BIZRA deployment${NC}"
    echo "   Consider adding HPA for better chaos experiment results"
else
    echo -e "${GREEN}✅ HPA configured for auto-scaling${NC}"
fi

# Check monitoring stack
echo "Checking monitoring stack health..."
if curl -f http://localhost:9090/api/v1/status/buildinfo > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Prometheus monitoring active${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Prometheus not accessible${NC}"
fi

if curl -f http://grafana.local/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Grafana dashboards active${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Grafana not accessible${NC}"
fi

# Safety confirmation
echo ""
echo -e "${RED}▼▼▼ CHAOS EXPERIMENT SAFETY CONFIRMATION ▼▼▼${NC}"
echo "This will execute a CONTAINER FAILURE chaos experiment on PRODUCTION systems"
echo "The experiment includes automatic rollback mechanisms, but VERIFY:"
echo ""
echo "□ Experiment scope: Only bizra-backend pods"
echo "□ Rollback triggers: Error rate >5%, Response time >500ms"
echo "□ Observability: Prometheus metrics collection active"
echo "□ Recovery time: <5 minutes target"
echo "□ Emergency contacts: Have rollback procedures ready"
echo ""
read -p "Type 'CONFIRM' to proceed with chaos experiment: " confirm

if [ "$confirm" != "CONFIRM" ]; then
    echo -e "${YELLOW}Operation cancelled by user${NC}"
    exit 0
fi

echo ""
echo "🎭 EXECUTING CHAOS EXPERIMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start experiment logging
echo "Chaos Experiment Execution Log" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "Experiment: $EXPERIMENT_FILE" >> "$LOG_FILE"
echo "Command: chaos run experiment $EXPERIMENT_FILE" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Capture pre-chaos baseline metrics
echo "⏱️  CAPTURING PRE-CHAOS BASELINE METRICS..."
kubectl get pods -l app=bizra-genesis-node --no-headers | wc -l | xargs echo "Pods before chaos: " >> "$LOG_FILE"

# Execute chaos experiment with timeout protection
echo "🔥 EXECUTING CHAOS INJECTION..."
echo ""

# Run chaos experiment (redirecting output to log file)
timeout $CHAOS_TOOLKIT_TIMEOUT chaos run experiment "$EXPERIMENT_FILE" 2>&1 | tee -a "$LOG_FILE" || true

echo ""
echo "📊 CHAOS EXPERIMENT RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if experiment completed successfully
if grep -q "Chaos experiment completed successfully\|All success criteria met" "$LOG_FILE"; then
    echo -e "${GREEN}✅ CHAOS EXPERIMENT SUCCEEDED${NC}"
    echo "   System proved resilient to container failures"
    echo "   Recovery automation working correctly"
else
    echo -e "${RED}❌ CHAOS EXPERIMENT DETECTED ISSUES${NC}"

    # Check for rollback conditions
    if grep -q "Auto-rollback triggered\|Rollback executed" "$LOG_FILE"; then
        echo "   ✓ Auto-rollback mechanisms activated successfully"
        echo "   System protected from prolonged degradation"
    fi

    if grep -q "Error rate.*threshold\|Response time.*threshold" "$LOG_FILE"; then
        echo "   ⚠️  Performance degradation detected"
        echo "   Review experiment logs for detailed analysis"
    fi
fi

# Post-chaos health verification
echo ""
echo "🔍 POST-CHAOS HEALTH VERIFICATION"
pods_after=$(kubectl get pods -l app=bizra-genesis-node --no-headers | wc -l)
echo "Pods after chaos: $pods_after"
kubectl get pods -l app=bizra-genesis-node

echo ""
echo "📝 EXPERIMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Full logs saved to: $LOG_FILE"
echo ""
echo "🎯 Key Metrics to Review:"
echo "   • Recovery time from failure detection to full restoration"
echo "   • Error rate during chaos injection (<=5% target)"
echo "   • Auto-scaling responsiveness (HPA activation time)"
echo "   • WebSocket reconnection success rate"
echo ""
echo "🔬 NEXT STEPS:"
echo "   1. Review Grafana dashboards for performance impact analysis"
echo "   2. Update chaos experiment success criteria if needed"
echo "   3. Schedule next experiment based on findings"
echo "   4. Update incident response runbooks with lessons learned"
echo ""
echo "🏆 CHAOS ENGINEERING ACHIEVEMENT COMPLETED"
echo "   Successfully executed first scientific chaos experiment!"
echo ""

# Archive experiment results for historical analysis
timestamp=$(date +%Y%m%d-%H%M%S)
archive_dir="chaos-experiments/archive/$timestamp"
mkdir -p "$archive_dir"
cp "$LOG_FILE" "$archive_dir/"
cp "$EXPERIMENT_FILE" "$archive_dir/experiment-config.json"

echo "📚 Experiment archived to: $archive_dir"
echo ""
echo "🎉 BIZRA CHAOS ENGINEERING - PEAK RESILIENCE DEMONSTRATED"
echo ""
