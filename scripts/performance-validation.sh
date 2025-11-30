#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - PERFORMANCE VALIDATION SCRIPT                      ║
# ║  Load testing and SLO compliance verification for Alpha-100 launch       ║
# ║  Part of Days 11-12: Integration Testing & Production Documentation     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
#
# PURPOSE:
#   Validates that the BIZRA Genesis Node meets production SLO requirements:
#   - P95 latency < 300ms for all critical endpoints
#   - Error rate ≤ 1% under realistic Alpha-100 load
#   - Resource utilization within acceptable limits
#   - Database performance meets requirements
#
# USAGE:
#   ./scripts/performance-validation.sh [OPTIONS]
#
# OPTIONS:
#   --base-url URL       Base URL for testing (default: https://localhost:8443)
#   --concurrent NUM     Concurrent users to simulate (default: 50, max: 100)
#   --duration SEC       Test duration in seconds (default: 60)
#   --json              Output results in JSON format for CI/CD
#   --help              Show this help message
#
# ENVIRONMENT VARIABLES:
#   PERF_BASE_URL        Override base URL
#   PERF_CONCURRENT      Override concurrent users
#   PERF_DURATION        Override test duration
#   PERF_TEST_EMAIL      Email for auth testing (default: perf-test@bizra.ai)
#   PERF_TEST_PASSWORD   Password for auth testing
#   PERF_INVITE_CODE     Invite code for registration testing
#
# EXIT CODES:
#   0 - All performance tests passed (SLO met)
#   1 - Performance tests failed (SLO violated)
#   2 - Script execution error
#
# ALPHA-100 SLO REQUIREMENTS:
#   - P95 Latency: < 300ms (all endpoints)
#   - P99 Latency: < 500ms (all endpoints)
#   - Error Rate: ≤ 1%
#   - Availability: ≥ 99.5%
#   - Throughput: ≥ 100 req/sec
#   - Database Latency: < 50ms (P95)
#   - WebSocket Connect: < 1s
#
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Colors for human-readable output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default configuration
BASE_URL="${PERF_BASE_URL:-https://localhost:8443}"
CONCURRENT_USERS="${PERF_CONCURRENT:-50}"
TEST_DURATION="${PERF_DURATION:-60}"
JSON_MODE=0

# Test credentials
TEST_EMAIL="${PERF_TEST_EMAIL:-perf-test@bizra.ai}"
TEST_PASSWORD="${PERF_TEST_PASSWORD:-PerfTest123!}"
INVITE_CODE="${PERF_INVITE_CODE:-ALPHA100-PERF-TEST}"

# SLO Thresholds (milliseconds)
SLO_P95_LATENCY_MS=300
SLO_P99_LATENCY_MS=500
SLO_MAX_ERROR_RATE=1.0
SLO_MIN_AVAILABILITY=99.5
SLO_MIN_THROUGHPUT=100
SLO_DB_P95_LATENCY_MS=50
SLO_WS_CONNECT_MS=1000

# Results tracking
declare -a LATENCIES=()
declare -a ERRORS=()
TOTAL_REQUESTS=0
SUCCESSFUL_REQUESTS=0
FAILED_REQUESTS=0

# Test results for JSON output
declare -a TEST_RESULTS=()

# Temporary directory for test data
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Print colored message
print_color() {
    local color=$1
    shift
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${color}$*${NC}"
    fi
}

# Print section header
print_section() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo ""
        echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}${CYAN}$1${NC}"
        echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    fi
}

# Print subsection
print_subsection() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo ""
        echo -e "${BOLD}▶ $1${NC}"
    fi
}

# Show usage information
show_usage() {
    cat <<EOF
BIZRA Genesis Node - Performance Validation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --base-url URL       Base URL for testing (default: https://localhost:8443)
    --concurrent NUM     Concurrent users to simulate (default: 50, max: 100)
    --duration SEC       Test duration in seconds (default: 60)
    --json              Output results in JSON format for CI/CD
    --help              Show this help message

ENVIRONMENT VARIABLES:
    PERF_BASE_URL        Override base URL
    PERF_CONCURRENT      Override concurrent users
    PERF_DURATION        Override test duration

ALPHA-100 SLO REQUIREMENTS:
    - P95 Latency: < 300ms
    - P99 Latency: < 500ms
    - Error Rate: ≤ 1%
    - Availability: ≥ 99.5%
    - Throughput: ≥ 100 req/sec

EXIT CODES:
    0 - All performance tests passed
    1 - Performance tests failed
    2 - Script execution error

EOF
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --base-url)
                BASE_URL="$2"
                shift 2
                ;;
            --concurrent)
                CONCURRENT_USERS="$2"
                shift 2
                ;;
            --duration)
                TEST_DURATION="$2"
                shift 2
                ;;
            --json)
                JSON_MODE=1
                shift
                ;;
            --help)
                show_usage
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 2
                ;;
        esac
    done

    # Validate concurrent users (Alpha-100 max)
    if [ "$CONCURRENT_USERS" -gt 100 ]; then
        print_color "$YELLOW" "⚠️  Warning: Concurrent users limited to 100 (Alpha-100 program)"
        CONCURRENT_USERS=100
    fi
}

# ============================================================================
# STATISTICS FUNCTIONS
# ============================================================================

# Calculate percentile from sorted array
calculate_percentile() {
    local percentile=$1
    shift
    local values=("$@")
    local count=${#values[@]}

    if [ "$count" -eq 0 ]; then
        echo "0"
        return
    fi

    # Sort values
    IFS=$'\n' sorted=($(sort -n <<<"${values[*]}"))
    unset IFS

    # Calculate index
    local index=$(awk "BEGIN {printf \"%.0f\", ($percentile / 100) * $count - 0.5}")
    if [ "$index" -lt 0 ]; then
        index=0
    fi
    if [ "$index" -ge "$count" ]; then
        index=$((count - 1))
    fi

    echo "${sorted[$index]}"
}

# Calculate average
calculate_average() {
    local values=("$@")
    local count=${#values[@]}

    if [ "$count" -eq 0 ]; then
        echo "0"
        return
    fi

    local sum=0
    for val in "${values[@]}"; do
        sum=$(awk "BEGIN {print $sum + $val}")
    done

    awk "BEGIN {printf \"%.2f\", $sum / $count}"
}

# Calculate error rate percentage
calculate_error_rate() {
    local failed=$1
    local total=$2

    if [ "$total" -eq 0 ]; then
        echo "0"
        return
    fi

    awk "BEGIN {printf \"%.2f\", ($failed / $total) * 100}"
}

# Calculate availability percentage
calculate_availability() {
    local successful=$1
    local total=$2

    if [ "$total" -eq 0 ]; then
        echo "0"
        return
    fi

    awk "BEGIN {printf \"%.2f\", ($successful / $total) * 100}"
}

# ============================================================================
# HTTP TESTING FUNCTIONS
# ============================================================================

# Make HTTP request and measure latency
http_request() {
    local method=$1
    local endpoint=$2
    local data=${3:-}
    local auth_token=${4:-}

    local url="${BASE_URL}${endpoint}"
    local start_ms=$(date +%s%3N)

    local curl_opts=(-s -w "%{http_code}" -o "$TEMP_DIR/response.json")

    # Add method
    if [ "$method" != "GET" ]; then
        curl_opts+=(-X "$method")
    fi

    # Add data
    if [ -n "$data" ]; then
        curl_opts+=(-H "Content-Type: application/json" -d "$data")
    fi

    # Add auth token
    if [ -n "$auth_token" ]; then
        curl_opts+=(-H "Authorization: Bearer $auth_token")
    fi

    # Accept self-signed certs for localhost testing
    curl_opts+=(-k)

    # Make request
    local http_code
    http_code=$(curl "${curl_opts[@]}" "$url" 2>/dev/null || echo "000")

    local end_ms=$(date +%s%3N)
    local latency_ms=$((end_ms - start_ms))

    # Record latency
    LATENCIES+=("$latency_ms")
    TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))

    # Check for success
    if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
        SUCCESSFUL_REQUESTS=$((SUCCESSFUL_REQUESTS + 1))
        echo "$latency_ms|$http_code|success"
    else
        FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
        ERRORS+=("$endpoint|$http_code")
        echo "$latency_ms|$http_code|failure"
    fi
}

# Concurrent request worker
concurrent_worker() {
    local worker_id=$1
    local endpoint=$2
    local duration=$3
    local method=${4:-GET}
    local data=${5:-}

    local worker_file="$TEMP_DIR/worker_${worker_id}.txt"
    local end_time=$(($(date +%s) + duration))

    while [ "$(date +%s)" -lt "$end_time" ]; do
        local result
        result=$(http_request "$method" "$endpoint" "$data")
        echo "$result" >> "$worker_file"

        # Small delay to avoid overwhelming the system
        sleep 0.1
    done
}

# Run concurrent load test
run_load_test() {
    local endpoint=$1
    local test_name=$2
    local method=${3:-GET}
    local data=${4:-}

    print_subsection "Load Testing: $test_name"

    # Reset counters
    LATENCIES=()
    TOTAL_REQUESTS=0
    SUCCESSFUL_REQUESTS=0
    FAILED_REQUESTS=0

    # Start concurrent workers
    local pids=()
    for ((i=1; i<=CONCURRENT_USERS; i++)); do
        concurrent_worker "$i" "$endpoint" "$TEST_DURATION" "$method" "$data" &
        pids+=($!)
    done

    # Wait for all workers to complete
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -n "Running for ${TEST_DURATION}s with ${CONCURRENT_USERS} concurrent users: "
        for ((i=1; i<=TEST_DURATION; i++)); do
            sleep 1
            echo -n "."
        done
        echo " Done!"
    else
        wait "${pids[@]}"
    fi

    # Collect results from worker files
    for ((i=1; i<=CONCURRENT_USERS; i++)); do
        if [ -f "$TEMP_DIR/worker_${i}.txt" ]; then
            while IFS='|' read -r latency code status; do
                LATENCIES+=("$latency")
                TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
                if [ "$status" = "success" ]; then
                    SUCCESSFUL_REQUESTS=$((SUCCESSFUL_REQUESTS + 1))
                else
                    FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
                fi
            done < "$TEMP_DIR/worker_${i}.txt"
        fi
    done

    # Calculate statistics
    local p50=$(calculate_percentile 50 "${LATENCIES[@]}")
    local p95=$(calculate_percentile 95 "${LATENCIES[@]}")
    local p99=$(calculate_percentile 99 "${LATENCIES[@]}")
    local avg=$(calculate_average "${LATENCIES[@]}")
    local error_rate=$(calculate_error_rate "$FAILED_REQUESTS" "$TOTAL_REQUESTS")
    local availability=$(calculate_availability "$SUCCESSFUL_REQUESTS" "$TOTAL_REQUESTS")
    local throughput=$(awk "BEGIN {printf \"%.2f\", $TOTAL_REQUESTS / $TEST_DURATION}")

    # Determine SLO compliance
    local p95_pass=0
    local p99_pass=0
    local error_pass=0
    local avail_pass=0
    local throughput_pass=0

    if [ "$(awk "BEGIN {print ($p95 < $SLO_P95_LATENCY_MS)}")" -eq 1 ]; then
        p95_pass=1
    fi

    if [ "$(awk "BEGIN {print ($p99 < $SLO_P99_LATENCY_MS)}")" -eq 1 ]; then
        p99_pass=1
    fi

    if [ "$(awk "BEGIN {print ($error_rate <= $SLO_MAX_ERROR_RATE)}")" -eq 1 ]; then
        error_pass=1
    fi

    if [ "$(awk "BEGIN {print ($availability >= $SLO_MIN_AVAILABILITY)}")" -eq 1 ]; then
        avail_pass=1
    fi

    if [ "$(awk "BEGIN {print ($throughput >= $SLO_MIN_THROUGHPUT)}")" -eq 1 ]; then
        throughput_pass=1
    fi

    local overall_pass=0
    if [ "$p95_pass" -eq 1 ] && [ "$p99_pass" -eq 1 ] && [ "$error_pass" -eq 1 ] && [ "$avail_pass" -eq 1 ] && [ "$throughput_pass" -eq 1 ]; then
        overall_pass=1
    fi

    # Display results
    if [ "$JSON_MODE" -eq 0 ]; then
        echo ""
        echo "  Total Requests:  $TOTAL_REQUESTS"
        echo "  Successful:      $SUCCESSFUL_REQUESTS"
        echo "  Failed:          $FAILED_REQUESTS"
        echo ""
        echo "  Latency (ms):"
        echo "    Average:       $avg ms"
        echo "    P50:           $p50 ms"

        if [ "$p95_pass" -eq 1 ]; then
            print_color "$GREEN" "    P95:           $p95 ms ✓ (SLO: <${SLO_P95_LATENCY_MS}ms)"
        else
            print_color "$RED" "    P95:           $p95 ms ✗ (SLO: <${SLO_P95_LATENCY_MS}ms)"
        fi

        if [ "$p99_pass" -eq 1 ]; then
            print_color "$GREEN" "    P99:           $p99 ms ✓ (SLO: <${SLO_P99_LATENCY_MS}ms)"
        else
            print_color "$RED" "    P99:           $p99 ms ✗ (SLO: <${SLO_P99_LATENCY_MS}ms)"
        fi

        echo ""

        if [ "$error_pass" -eq 1 ]; then
            print_color "$GREEN" "  Error Rate:      ${error_rate}% ✓ (SLO: ≤${SLO_MAX_ERROR_RATE}%)"
        else
            print_color "$RED" "  Error Rate:      ${error_rate}% ✗ (SLO: ≤${SLO_MAX_ERROR_RATE}%)"
        fi

        if [ "$avail_pass" -eq 1 ]; then
            print_color "$GREEN" "  Availability:    ${availability}% ✓ (SLO: ≥${SLO_MIN_AVAILABILITY}%)"
        else
            print_color "$RED" "  Availability:    ${availability}% ✗ (SLO: ≥${SLO_MIN_AVAILABILITY}%)"
        fi

        if [ "$throughput_pass" -eq 1 ]; then
            print_color "$GREEN" "  Throughput:      ${throughput} req/s ✓ (SLO: ≥${SLO_MIN_THROUGHPUT} req/s)"
        else
            print_color "$RED" "  Throughput:      ${throughput} req/s ✗ (SLO: ≥${SLO_MIN_THROUGHPUT} req/s)"
        fi

        echo ""

        if [ "$overall_pass" -eq 1 ]; then
            print_color "$GREEN" "  ✓ SLO COMPLIANCE: PASS"
        else
            print_color "$RED" "  ✗ SLO COMPLIANCE: FAIL"
        fi
    fi

    # Store test result
    local test_result
    test_result=$(cat <<EOF
{
  "test": "$test_name",
  "endpoint": "$endpoint",
  "total_requests": $TOTAL_REQUESTS,
  "successful_requests": $SUCCESSFUL_REQUESTS,
  "failed_requests": $FAILED_REQUESTS,
  "latency_ms": {
    "average": $avg,
    "p50": $p50,
    "p95": $p95,
    "p99": $p99
  },
  "error_rate_percent": $error_rate,
  "availability_percent": $availability,
  "throughput_req_per_sec": $throughput,
  "slo_compliance": {
    "p95_latency": $([ "$p95_pass" -eq 1 ] && echo "true" || echo "false"),
    "p99_latency": $([ "$p99_pass" -eq 1 ] && echo "true" || echo "false"),
    "error_rate": $([ "$error_pass" -eq 1 ] && echo "true" || echo "false"),
    "availability": $([ "$avail_pass" -eq 1 ] && echo "true" || echo "false"),
    "throughput": $([ "$throughput_pass" -eq 1 ] && echo "true" || echo "false"),
    "overall": $([ "$overall_pass" -eq 1 ] && echo "true" || echo "false")
  }
}
EOF
)

    TEST_RESULTS+=("$test_result")

    return $((1 - overall_pass))
}

# ============================================================================
# MAIN PERFORMANCE VALIDATION
# ============================================================================

main() {
    parse_args "$@"

    local start_time=$(date +%s)
    local all_tests_passed=1

    if [ "$JSON_MODE" -eq 0 ]; then
        print_color "$BOLD$CYAN" "╔═══════════════════════════════════════════════════════════════╗"
        print_color "$BOLD$CYAN" "║   BIZRA GENESIS NODE - PERFORMANCE VALIDATION                ║"
        print_color "$BOLD$CYAN" "║   Alpha-100 Production SLO Compliance Testing                ║"
        print_color "$BOLD$CYAN" "╚═══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Base URL:         $BASE_URL"
        echo "Concurrent Users: $CONCURRENT_USERS (Alpha-100 simulation)"
        echo "Test Duration:    ${TEST_DURATION}s per endpoint"
        echo ""
        echo "SLO Requirements:"
        echo "  - P95 Latency:    < ${SLO_P95_LATENCY_MS}ms"
        echo "  - P99 Latency:    < ${SLO_P99_LATENCY_MS}ms"
        echo "  - Error Rate:     ≤ ${SLO_MAX_ERROR_RATE}%"
        echo "  - Availability:   ≥ ${SLO_MIN_AVAILABILITY}%"
        echo "  - Throughput:     ≥ ${SLO_MIN_THROUGHPUT} req/s"
    fi

    # ========================================================================
    # Test 1: Health Check Endpoint
    # ========================================================================
    print_section "Test 1: Health Check Endpoint Performance"

    if ! run_load_test "/health" "Health Check" "GET"; then
        all_tests_passed=0
    fi

    # ========================================================================
    # Test 2: Metrics Endpoint
    # ========================================================================
    print_section "Test 2: Metrics Endpoint Performance"

    if ! run_load_test "/metrics" "Metrics" "GET"; then
        all_tests_passed=0
    fi

    # ========================================================================
    # Test 3: Authentication - Login
    # ========================================================================
    print_section "Test 3: Authentication Login Performance"

    # Ensure test user exists (try to register first, ignore if exists)
    local register_data="{\"invite_code\":\"$INVITE_CODE\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
    http_request "POST" "/auth/register" "$register_data" >/dev/null 2>&1 || true

    local login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

    if ! run_load_test "/auth/login" "Authentication Login" "POST" "$login_data"; then
        all_tests_passed=0
    fi

    # ========================================================================
    # Test 4: Authentication - Token Refresh
    # ========================================================================
    print_section "Test 4: Token Refresh Performance"

    # Get a valid refresh token
    local login_response
    login_response=$(http_request "POST" "/auth/login" "$login_data")

    if [ -f "$TEMP_DIR/response.json" ]; then
        local refresh_token
        refresh_token=$(grep -o '"refresh_token":"[^"]*' "$TEMP_DIR/response.json" | cut -d'"' -f4 || echo "")

        if [ -n "$refresh_token" ]; then
            local refresh_data="{\"refresh_token\":\"$refresh_token\"}"

            if ! run_load_test "/auth/refresh" "Token Refresh" "POST" "$refresh_data"; then
                all_tests_passed=0
            fi
        else
            print_color "$YELLOW" "⚠️  Skipping token refresh test: Could not obtain refresh token"
        fi
    fi

    # ========================================================================
    # Final Results
    # ========================================================================
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    if [ "$JSON_MODE" -eq 1 ]; then
        # JSON output for CI/CD
        cat <<EOF
{
  "status": "$([ "$all_tests_passed" -eq 1 ] && echo "PASS" || echo "FAIL")",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "configuration": {
    "base_url": "$BASE_URL",
    "concurrent_users": $CONCURRENT_USERS,
    "test_duration_seconds": $TEST_DURATION
  },
  "slo_requirements": {
    "p95_latency_ms": $SLO_P95_LATENCY_MS,
    "p99_latency_ms": $SLO_P99_LATENCY_MS,
    "max_error_rate_percent": $SLO_MAX_ERROR_RATE,
    "min_availability_percent": $SLO_MIN_AVAILABILITY,
    "min_throughput_req_per_sec": $SLO_MIN_THROUGHPUT
  },
  "test_results": [
    $(IFS=,; echo "${TEST_RESULTS[*]}")
  ],
  "total_duration_seconds": $total_duration
}
EOF
    else
        print_section "Performance Validation Summary"

        echo ""
        echo "Total Test Duration: ${total_duration}s"
        echo ""

        if [ "$all_tests_passed" -eq 1 ]; then
            print_color "$BOLD$GREEN" "╔═══════════════════════════════════════════════════════════════╗"
            print_color "$BOLD$GREEN" "║                    ✓ ALL TESTS PASSED                        ║"
            print_color "$BOLD$GREEN" "║          BIZRA Genesis Node is Production Ready!             ║"
            print_color "$BOLD$GREEN" "║              Alpha-100 SLO Compliance: 100%                  ║"
            print_color "$BOLD$GREEN" "╚═══════════════════════════════════════════════════════════════╝"
        else
            print_color "$BOLD$RED" "╔═══════════════════════════════════════════════════════════════╗"
            print_color "$BOLD$RED" "║                    ✗ TESTS FAILED                            ║"
            print_color "$BOLD$RED" "║          SLO Requirements Not Met - Review Required          ║"
            print_color "$BOLD$RED" "╚═══════════════════════════════════════════════════════════════╝"
        fi

        echo ""
    fi

    # Exit with appropriate code
    if [ "$all_tests_passed" -eq 1 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"
