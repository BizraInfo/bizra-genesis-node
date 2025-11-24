#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - CANARY MONITORING SCRIPT                           ║
# ║  Post-deployment validation with SLO enforcement and rollback            ║
# ║  Part of Alpha-100 Deployment Plan (Day 6/12)                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration (override via environment variables)
CANARY_BASE_URL="${CANARY_BASE_URL:-https://console.bizra.ai}"
CANARY_HEALTH_PATH="${CANARY_HEALTH_PATH:-/health}"
CANARY_AUTH_PATH="${CANARY_AUTH_PATH:-/auth/login}"
CANARY_REQUESTS="${CANARY_REQUESTS:-20}"
CANARY_MAX_LATENCY_MS="${CANARY_MAX_LATENCY_MS:-300}"
CANARY_MAX_FAILURES="${CANARY_MAX_FAILURES:-1}"
CANARY_SLEEP_BETWEEN="${CANARY_SLEEP_BETWEEN:-2}"
CANARY_ROLLBACK_CMD="${CANARY_ROLLBACK_CMD:-}"
JSON_MODE="${JSON_MODE:-0}"

# Auth credentials for synthetic testing
CANARY_USER_EMAIL="${CANARY_USER_EMAIL:-canary@bizra.ai}"
CANARY_USER_PASSWORD="${CANARY_USER_PASSWORD:-ChangeMe123!}"

# Metrics
ok_count=0
fail_count=0
total_latency_ms=0
samples=0
max_latency_ms=0
min_latency_ms=999999

# Temporary files
TEMP_DIR="/tmp/canary-$$"
mkdir -p "$TEMP_DIR"

# Cleanup on exit
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Logging functions
log_info() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${BLUE}[INFO]${NC} $*"
    fi
}

log_ok() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${GREEN}[ OK ]${NC} $*"
    fi
}

log_warn() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${YELLOW}[WARN]${NC} $*"
    fi
}

log_err() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${RED}[FAIL]${NC} $*"
    fi
}

# Print step
print_step() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    fi
}

# Check required commands
require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log_err "Missing required command: $1"
        if [ "$JSON_MODE" -eq 1 ]; then
            echo "{\"status\":\"ERROR\",\"error\":\"Missing required command: $1\"}"
        fi
        exit 1
    fi
}

# Calculate latency in milliseconds from seconds
calc_latency_ms() {
    local time_s="$1"
    # Use awk for floating point arithmetic (more portable than bc)
    echo "$time_s" | awk '{printf "%.0f", $1 * 1000}'
}

# Health check endpoint
check_health() {
    local url="${CANARY_BASE_URL}${CANARY_HEALTH_PATH}"
    local output_file="${TEMP_DIR}/health_response"
    local timing_file="${TEMP_DIR}/health_timing"

    # Perform request with timing
    local http_code
    local time_total

    http_code=$(curl -s -w "%{http_code}\n%{time_total}" \
        -o "$output_file" \
        --max-time 10 \
        "$url" 2>/dev/null | tail -2 | head -1 || echo "000")

    time_total=$(curl -s -w "%{time_total}" \
        -o /dev/null \
        --max-time 10 \
        "$url" 2>/dev/null || echo "10.0")

    local latency_ms
    latency_ms=$(calc_latency_ms "$time_total")

    # Update metrics
    total_latency_ms=$((total_latency_ms + latency_ms))
    ((samples++)) || true

    if [ "$latency_ms" -gt "$max_latency_ms" ]; then
        max_latency_ms=$latency_ms
    fi

    if [ "$latency_ms" -lt "$min_latency_ms" ]; then
        min_latency_ms=$latency_ms
    fi

    # Validate response
    if [ -z "$http_code" ] || [ "$http_code" == "000" ]; then
        log_err "Health check failed: no response received"
        ((fail_count++)) || true
        return 1
    elif [ "$http_code" -ne 200 ]; then
        log_err "Health check HTTP $http_code, latency=${latency_ms}ms"
        ((fail_count++)) || true
        return 1
    else
        log_ok "Health check OK (200), latency=${latency_ms}ms"
        ((ok_count++)) || true

        # Check latency SLO
        if [ "$latency_ms" -gt "$CANARY_MAX_LATENCY_MS" ]; then
            log_warn "Health latency ${latency_ms}ms exceeds SLO ${CANARY_MAX_LATENCY_MS}ms"
        fi
        return 0
    fi
}

# Auth flow check
check_auth_flow() {
    local url="${CANARY_BASE_URL}${CANARY_AUTH_PATH}"
    local body_file="${TEMP_DIR}/auth_body"

    # Prepare JSON payload
    local payload
    payload=$(cat <<EOF
{
    "email": "${CANARY_USER_EMAIL}",
    "password": "${CANARY_USER_PASSWORD}"
}
EOF
)

    # Perform request
    local http_code
    local time_total

    http_code=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o "$body_file" \
        --max-time 10 \
        "$url" 2>/dev/null || echo "000")

    time_total=$(curl -s -w "%{time_total}" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /dev/null \
        --max-time 10 \
        "$url" 2>/dev/null || echo "10.0")

    local latency_ms
    latency_ms=$(calc_latency_ms "$time_total")

    # Update metrics
    total_latency_ms=$((total_latency_ms + latency_ms))
    ((samples++)) || true

    if [ "$latency_ms" -gt "$max_latency_ms" ]; then
        max_latency_ms=$latency_ms
    fi

    if [ "$latency_ms" -lt "$min_latency_ms" ]; then
        min_latency_ms=$latency_ms
    fi

    # Validate response
    if [ -z "$http_code" ] || [ "$http_code" == "000" ]; then
        log_err "Auth check failed: no response received"
        ((fail_count++)) || true
        return 1
    elif [ "$http_code" -ne 200 ]; then
        log_err "Auth check HTTP $http_code, latency=${latency_ms}ms"
        ((fail_count++)) || true
        return 1
    else
        # Validate token presence in response (if jq available)
        if command -v jq >/dev/null 2>&1; then
            if jq -e '.access_token and .refresh_token' "$body_file" >/dev/null 2>&1; then
                log_ok "Auth check OK (200), latency=${latency_ms}ms, tokens present"
                ((ok_count++)) || true
            else
                log_err "Auth check 200 but tokens missing/invalid in body"
                ((fail_count++)) || true
                return 1
            fi
        else
            log_ok "Auth check OK (200), latency=${latency_ms}ms"
            ((ok_count++)) || true
        fi

        # Check latency SLO
        if [ "$latency_ms" -gt "$CANARY_MAX_LATENCY_MS" ]; then
            log_warn "Auth latency ${latency_ms}ms exceeds SLO ${CANARY_MAX_LATENCY_MS}ms"
        fi
        return 0
    fi
}

# Calculate average latency
calc_avg_latency() {
    if [ "$samples" -eq 0 ]; then
        echo "0"
    else
        echo $((total_latency_ms / samples))
    fi
}

# Emit JSON summary
emit_json() {
    local avg_latency
    avg_latency=$(calc_avg_latency)

    local status="OK"
    if [ "$fail_count" -gt "$CANARY_MAX_FAILURES" ]; then
        status="FAIL"
    elif [ "$fail_count" -gt 0 ]; then
        status="WARN"
    fi

    local error_rate
    if [ "$samples" -eq 0 ]; then
        error_rate="0.0"
    else
        error_rate=$(awk "BEGIN {printf \"%.4f\", $fail_count / $samples}")
    fi

    local availability
    if [ "$samples" -eq 0 ]; then
        availability="1.0"
    else
        availability=$(awk "BEGIN {printf \"%.4f\", 1 - ($fail_count / $samples)}")
    fi

    if command -v jq >/dev/null 2>&1; then
        jq -n \
            --arg status "$status" \
            --arg base_url "$CANARY_BASE_URL" \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --argjson ok "$ok_count" \
            --argjson fail "$fail_count" \
            --argjson samples "$samples" \
            --argjson avg_latency_ms "$avg_latency" \
            --argjson max_latency_ms "$max_latency_ms" \
            --argjson min_latency_ms "$min_latency_ms" \
            --arg error_rate "$error_rate" \
            --arg availability "$availability" \
            --argjson slo_max_latency "$CANARY_MAX_LATENCY_MS" \
            --argjson slo_max_failures "$CANARY_MAX_FAILURES" \
            '{
                status: $status,
                timestamp: $timestamp,
                target: {
                    base_url: $base_url,
                    health_path: "'$CANARY_HEALTH_PATH'",
                    auth_path: "'$CANARY_AUTH_PATH'"
                },
                stats: {
                    ok: $ok,
                    fail: $fail,
                    samples: $samples,
                    avg_latency_ms: $avg_latency_ms,
                    max_latency_ms: $max_latency_ms,
                    min_latency_ms: $min_latency_ms,
                    error_rate: $error_rate,
                    availability: $availability
                },
                slo: {
                    max_latency_ms: $slo_max_latency,
                    max_failures: $slo_max_failures
                }
            }'
    else
        cat <<EOF
{
  "status": "$status",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": {
    "base_url": "$CANARY_BASE_URL",
    "health_path": "$CANARY_HEALTH_PATH",
    "auth_path": "$CANARY_AUTH_PATH"
  },
  "stats": {
    "ok": $ok_count,
    "fail": $fail_count,
    "samples": $samples,
    "avg_latency_ms": $avg_latency,
    "max_latency_ms": $max_latency_ms,
    "min_latency_ms": $min_latency_ms,
    "error_rate": $error_rate,
    "availability": $availability
  },
  "slo": {
    "max_latency_ms": $CANARY_MAX_LATENCY_MS,
    "max_failures": $CANARY_MAX_FAILURES
  }
}
EOF
    fi
}

# Header
if [ "$JSON_MODE" -eq 0 ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  BIZRA Genesis Node - Canary Monitor                          ║${NC}"
    echo -e "${BLUE}║  Post-Deployment SLO Validation & Rollback Gate               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
fi

# Prerequisites check
require_cmd curl

# Main monitoring loop
print_step "Starting Canary Monitoring"

log_info "Target: ${CANARY_BASE_URL}"
log_info "Requests: ${CANARY_REQUESTS}, max failures: ${CANARY_MAX_FAILURES}, latency SLO: ${CANARY_MAX_LATENCY_MS}ms"
log_info "Sleep between requests: ${CANARY_SLEEP_BETWEEN}s"
echo ""

for i in $(seq 1 "$CANARY_REQUESTS"); do
    log_info "Canary iteration $i/${CANARY_REQUESTS}"

    # Check health endpoint
    check_health || true

    # Check auth flow
    check_auth_flow || true

    # Sleep between iterations (except last)
    if [ "$i" -lt "$CANARY_REQUESTS" ]; then
        sleep "$CANARY_SLEEP_BETWEEN"
    fi
done

# Calculate summary metrics
avg_latency=$(calc_avg_latency)

# Determine status
status="OK"
if [ "$fail_count" -gt "$CANARY_MAX_FAILURES" ]; then
    status="FAIL"
elif [ "$fail_count" -gt 0 ]; then
    status="WARN"
fi

# Print summary
if [ "$JSON_MODE" -eq 0 ]; then
    print_step "Canary Summary"

    echo "Status:        $status"
    echo "OK Count:      $ok_count"
    echo "Fail Count:    $fail_count"
    echo "Total Samples: $samples"
    echo "Avg Latency:   ${avg_latency}ms"
    echo "Max Latency:   ${max_latency_ms}ms"
    echo "Min Latency:   ${min_latency_ms}ms"

    local error_rate
    if [ "$samples" -eq 0 ]; then
        error_rate="0.0%"
    else
        error_rate=$(awk "BEGIN {printf \"%.2f%%\", ($fail_count / $samples) * 100}")
    fi

    local availability
    if [ "$samples" -eq 0 ]; then
        availability="100.0%"
    else
        availability=$(awk "BEGIN {printf \"%.2f%%\", (1 - ($fail_count / $samples)) * 100}")
    fi

    echo "Error Rate:    $error_rate"
    echo "Availability:  $availability"
    echo ""

    # SLO validation
    if [ "$fail_count" -gt "$CANARY_MAX_FAILURES" ]; then
        echo -e "${RED}❌ SLO VIOLATION: Failures ($fail_count) exceed threshold ($CANARY_MAX_FAILURES)${NC}"
    fi

    if [ "$max_latency_ms" -gt "$CANARY_MAX_LATENCY_MS" ]; then
        echo -e "${YELLOW}⚠️  SLO WARNING: Max latency (${max_latency_ms}ms) exceeds threshold (${CANARY_MAX_LATENCY_MS}ms)${NC}"
    fi

    echo ""
fi

# Rollback on failure
if [ -n "$CANARY_ROLLBACK_CMD" ] && [ "$status" == "FAIL" ]; then
    log_err "Status=FAIL, invoking rollback: ${CANARY_ROLLBACK_CMD}"

    if [ "$JSON_MODE" -eq 0 ]; then
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ROLLBACK TRIGGERED                                           ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    fi

    eval "$CANARY_ROLLBACK_CMD" || log_err "Rollback command failed"
fi

# Emit JSON if requested
if [ "$JSON_MODE" -eq 1 ]; then
    emit_json
fi

# Exit with appropriate code
if [ "$status" == "FAIL" ]; then
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${RED}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${RED}│  ❌ Canary Monitoring FAILED                                    │${NC}"
        echo -e "${RED}│  SLO violations detected - deployment should be rolled back    │${NC}"
        echo -e "${RED}└─────────────────────────────────────────────────────────────────┘${NC}"
    fi
    exit 1
elif [ "$status" == "WARN" ]; then
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${YELLOW}│  ⚠️  Canary Monitoring PASSED WITH WARNINGS                     │${NC}"
        echo -e "${YELLOW}│  Some failures detected but within SLO thresholds              │${NC}"
        echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
    fi
    exit 0
else
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${GREEN}│  ✅ Canary Monitoring PASSED                                    │${NC}"
        echo -e "${GREEN}│  All checks successful - deployment validated                  │${NC}"
        echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
    fi
    exit 0
fi
