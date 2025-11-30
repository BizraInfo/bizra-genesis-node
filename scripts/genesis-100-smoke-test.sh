#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS 100 - SMOKE TEST SCRIPT
# Validates all critical endpoints before launch
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "🚀 BIZRA Genesis 100 - Smoke Test Suite"
echo "════════════════════════════════════════"
echo ""

# Configuration
API_BASE="${API_BASE:-http://localhost:3000}"
TEST_RESULTS_FILE="genesis-100-smoke-test-results.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize results file
echo "BIZRA Genesis 100 Smoke Test Results" > "$TEST_RESULTS_FILE"
echo "Generated: $(date)" >> "$TEST_RESULTS_FILE"
echo "API Base: $API_BASE" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

PASS_COUNT=0
FAIL_COUNT=0

# Helper function to log test results
log_result() {
    local test_name=$1
    local status=$2
    local details=$3

    echo "$test_name: $status - $details" >> "$TEST_RESULTS_FILE"

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ $test_name${NC}"
        echo -e "${RED}   Details: $details${NC}"
        ((FAIL_COUNT++))
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: Health Check Endpoint
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 1: Health Check Endpoint${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_BASE/health" || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "200" ]; then
    log_result "Health Check" "PASS" "HTTP 200 - Server is healthy"
else
    log_result "Health Check" "FAIL" "HTTP $http_code - Expected 200"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Readiness Check Endpoint
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 2: Readiness Check Endpoint${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/ready_response.json "$API_BASE/ready" || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "200" ] || [ "$http_code" == "503" ]; then
    log_result "Readiness Check" "PASS" "HTTP $http_code - Endpoint responding"
else
    log_result "Readiness Check" "FAIL" "HTTP $http_code - Expected 200 or 503"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: Compare Endpoint (Genesis 100 Core Feature)
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 3: AI Comparison Endpoint${NC}"
compare_payload='{"prompt": "What is the meaning of consciousness?"}'
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/compare" \
    -H "Content-Type: application/json" \
    -d "$compare_payload" \
    -o /tmp/compare_response.json || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "200" ]; then
    # Verify response structure
    bizra_text=$(jq -r '.bizra.text' /tmp/compare_response.json 2>/dev/null || echo "")
    openai_text=$(jq -r '.openai.text' /tmp/compare_response.json 2>/dev/null || echo "")
    consensus_score=$(jq -r '.performance.bizraConsensusScore' /tmp/compare_response.json 2>/dev/null || echo "0")

    if [ -n "$bizra_text" ] && [ -n "$openai_text" ] && [ "$consensus_score" != "null" ]; then
        log_result "Compare Endpoint Structure" "PASS" "Response has correct structure with bizra, openai, and performance metrics"
    else
        log_result "Compare Endpoint Structure" "FAIL" "Missing required fields in response"
    fi
else
    log_result "Compare Endpoint" "FAIL" "HTTP $http_code - Expected 200"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: Agent Status Endpoint (Genesis 100 Dashboard)
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 4: Agent Status Endpoint${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/agents_status_response.json "$API_BASE/agents/status" || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "200" ]; then
    # Verify response structure
    total_agents=$(jq -r '.totalAgents' /tmp/agents_status_response.json 2>/dev/null || echo "0")
    active_count=$(jq -r '.activeCount' /tmp/agents_status_response.json 2>/dev/null || echo "0")

    if [ "$total_agents" == "12" ] && [ "$active_count" == "12" ]; then
        log_result "Agent Status Endpoint" "PASS" "12 agents reported, all active"
    else
        log_result "Agent Status Endpoint" "FAIL" "Expected 12 total and 12 active, got $total_agents total, $active_count active"
    fi
else
    log_result "Agent Status Endpoint" "FAIL" "HTTP $http_code - Expected 200"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: Prometheus Metrics Endpoint (Admin Protected)
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 5: Prometheus Metrics Endpoint${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/metrics_response.txt "$API_BASE/metrics" || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "401" ] || [ "$http_code" == "403" ]; then
    log_result "Metrics Endpoint Auth" "PASS" "HTTP $http_code - Correctly protected (requires admin auth)"
elif [ "$http_code" == "200" ]; then
    log_result "Metrics Endpoint Auth" "WARN" "HTTP 200 - Endpoint accessible without auth (check if this is intended)"
else
    log_result "Metrics Endpoint" "FAIL" "HTTP $http_code - Unexpected response"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: Swagger UI Endpoint
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 6: Swagger UI Documentation${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/swagger_response.html "$API_BASE/swagger-ui" || echo "000")
http_code="${response: -3}"

if [ "$http_code" == "200" ]; then
    log_result "Swagger UI" "PASS" "HTTP 200 - API documentation accessible"
else
    log_result "Swagger UI" "FAIL" "HTTP $http_code - Expected 200"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 7: CORS Headers (Genesis 100 Frontend Integration)
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 7: CORS Configuration${NC}"
response=$(curl -s -I -X OPTIONS "$API_BASE/compare" || echo "")

if echo "$response" | grep -qi "access-control-allow-origin"; then
    log_result "CORS Headers" "PASS" "CORS headers present"
else
    log_result "CORS Headers" "WARN" "No CORS headers detected (may need configuration for frontend)"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST 8: Performance - Compare Endpoint Latency
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}TEST 8: Performance - Compare Endpoint Latency${NC}"
start_time=$(date +%s%N)
curl -s -X POST "$API_BASE/compare" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Test performance"}' \
    -o /dev/null
end_time=$(date +%s%N)
latency_ms=$(( (end_time - start_time) / 1000000 ))

if [ "$latency_ms" -lt 1000 ]; then
    log_result "Compare Endpoint Latency" "PASS" "${latency_ms}ms - Under 1000ms SLO"
else
    log_result "Compare Endpoint Latency" "WARN" "${latency_ms}ms - Exceeds 1000ms target"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════"
echo -e "${BLUE}SMOKE TEST SUMMARY${NC}"
echo "════════════════════════════════════════"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

echo "" >> "$TEST_RESULTS_FILE"
echo "SUMMARY:" >> "$TEST_RESULTS_FILE"
echo "Passed: $PASS_COUNT" >> "$TEST_RESULTS_FILE"
echo "Failed: $FAIL_COUNT" >> "$TEST_RESULTS_FILE"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed! Genesis 100 ready for launch.${NC}"
    echo "RESULT: READY FOR LAUNCH" >> "$TEST_RESULTS_FILE"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review results in $TEST_RESULTS_FILE${NC}"
    echo "RESULT: FIXES REQUIRED" >> "$TEST_RESULTS_FILE"
    exit 1
fi
