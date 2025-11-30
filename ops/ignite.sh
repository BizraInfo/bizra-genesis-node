#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - IGNITION PROTOCOL                                  ║
# ║  Canonical startup wrapper aligned with Manifest terminology             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
#
# Usage:
#   ops/ignite.sh [MODE] [OPTIONS]
#
# Modes:
#   kernel       - Start Rust backend services (Kernel layer)
#   nervous      - Start Node.js orchestration layer (Nervous System)
#   cortex       - Start React dashboard (Visual Cortex)
#   full         - Start complete three-tier stack (DEFAULT)
#   dev          - Development mode with hot reload
#   prod         - Production mode with monitoring
#   database     - Database services only
#   monitoring   - Monitoring stack (Prometheus, Grafana)
#   test         - Test mode (no external services)
#
# Options:
#   --detach     - Run in background
#   --build      - Rebuild containers before starting
#   --logs       - Tail logs after starting
#   --clean      - Clean volumes before starting
#   --status     - Report system status and health (no startup)
#   --help       - Show this help message
#
# Examples:
#   ops/ignite.sh                    # Start full stack
#   ops/ignite.sh kernel --logs      # Start kernel with log output
#   ops/ignite.sh dev --build        # Dev mode with rebuild
#   ops/ignite.sh full --clean       # Full stack with clean start

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_CMD="docker-compose"
LOG_PREFIX="[🚀 IGNITION]"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

log_info() {
    echo -e "${BLUE}${LOG_PREFIX}${RESET} $*"
}

log_success() {
    echo -e "${GREEN}${LOG_PREFIX}${RESET} ✓ $*"
}

log_warn() {
    echo -e "${YELLOW}${LOG_PREFIX}${RESET} ⚠ $*"
}

log_error() {
    echo -e "${RED}${LOG_PREFIX}${RESET} ✗ $*" >&2
}

show_help() {
    cat << EOF
${BOLD}BIZRA GENESIS NODE - IGNITION PROTOCOL${RESET}

${BOLD}USAGE:${RESET}
    ops/ignite.sh [MODE] [OPTIONS]

${BOLD}MODES:${RESET}
    ${CYAN}kernel${RESET}       Start Rust backend services (Kernel layer)
    ${CYAN}nervous${RESET}      Start Node.js orchestration layer (Nervous System)
    ${CYAN}cortex${RESET}       Start React dashboard (Visual Cortex)
    ${CYAN}full${RESET}         Start complete three-tier stack ${GREEN}(DEFAULT)${RESET}
    ${CYAN}dev${RESET}          Development mode with hot reload
    ${CYAN}prod${RESET}         Production mode with monitoring
    ${CYAN}database${RESET}     Database services only
    ${CYAN}monitoring${RESET}   Monitoring stack (Prometheus, Grafana)
    ${CYAN}test${RESET}         Test mode (no external services)

${BOLD}OPTIONS:${RESET}
    --detach     Run in background
    --build      Rebuild containers before starting
    --logs       Tail logs after starting
    --clean      Clean volumes before starting
    --status     Report system status and health (no startup)
    --help       Show this help message

${BOLD}EXAMPLES:${RESET}
    ops/ignite.sh                    Start full stack
    ops/ignite.sh kernel --logs      Start kernel with log output
    ops/ignite.sh dev --build        Dev mode with rebuild
    ops/ignite.sh full --clean       Full stack with clean start

${BOLD}MANIFEST ALIGNMENT:${RESET}
    This ignition protocol implements the three-tier architecture from the
    BIZRA Manifest:
    - ${CYAN}Kernel${RESET}         → Rust cognitive engine (src/)
    - ${CYAN}Nervous System${RESET} → Node.js orchestration (backend/)
    - ${CYAN}Visual Cortex${RESET}  → React dashboard (apps/dashboard/)

${BOLD}DOCUMENTATION:${RESET}
    See BIZRA_IMPLEMENTATION_COMPANION_v1.0.md for architecture details.
EOF
}

check_prerequisites() {
    log_info "Running pre-flight checks..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi
    log_success "Docker installed ($(docker --version | head -1))"

    # Check Docker daemon
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon not running. Please start Docker."
        exit 1
    fi
    log_success "Docker daemon running"

    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        log_warn "docker-compose not found, trying 'docker compose' plugin"
        COMPOSE_CMD="docker compose"
        if ! docker compose version &> /dev/null; then
            log_error "Neither docker-compose nor 'docker compose' plugin found"
            exit 1
        fi
    fi
    log_success "Docker Compose available ($(docker-compose --version 2>/dev/null | head -1 || docker compose version 2>/dev/null | head -1))"

    # Check disk space (require at least 5GB free)
    local available_gb=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_gb" -lt 5 ]; then
        log_warn "Low disk space: ${available_gb}GB available (5GB+ recommended)"
    else
        log_success "Disk space OK (${available_gb}GB available)"
    fi

    # Check if required ports are available
    check_port_availability 3000 "Dashboard"
    check_port_availability 8080 "API Server"
    check_port_availability 5432 "PostgreSQL" || log_warn "Port 5432 in use (may be OK if database already running)"

    log_success "Pre-flight checks complete"
}

check_port_availability() {
    local port=$1
    local service=$2
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warn "Port $port ($service) already in use"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            log_warn "Port $port ($service) already in use"
            return 1
        fi
    fi
    return 0
}

clean_volumes() {
    log_info "Cleaning volumes and containers..."
    $COMPOSE_CMD down -v --remove-orphans 2>/dev/null || true
    log_success "Cleaned volumes"
}

# ═══════════════════════════════════════════════════════════════════════════
# HEALTH PROBES & STATUS REPORTING
# ═══════════════════════════════════════════════════════════════════════════

check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    log_info "Health check: $service_name ($health_url)"

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log_success "$service_name is healthy (attempt $attempt/$max_attempts)"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done

    log_error "$service_name health check failed after $max_attempts attempts"
    return 1
}

report_system_status() {
    log_info "System Status Report"
    echo ""
    echo -e "${BOLD}Service Status:${RESET}"

    # Check if containers are running
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "bizra"; then
        docker ps --format "  - {{.Names}}: {{.Status}}" | grep "bizra" | while read line; do
            if echo "$line" | grep -q "Up"; then
                echo -e "  ${GREEN}✓${RESET} $line"
            else
                echo -e "  ${RED}✗${RESET} $line"
            fi
        done
    else
        log_warn "No BIZRA containers running"
    fi

    echo ""
    echo -e "${BOLD}Health Endpoints:${RESET}"

    # Check API health endpoint
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${RESET} API Server: http://localhost:8080/health"
    else
        echo -e "  ${RED}✗${RESET} API Server: http://localhost:8080/health (not responding)"
    fi

    # Check dashboard (if running)
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${RESET} Dashboard: http://localhost:3000"
    else
        echo -e "  ${YELLOW}⚠${RESET} Dashboard: http://localhost:3000 (not running)"
    fi

    echo ""
    echo -e "${BOLD}Quick Links:${RESET}"
    echo "  - API Documentation: http://localhost:8080/docs"
    echo "  - Metrics: http://localhost:8080/metrics"
    echo "  - Dashboard: http://localhost:3000"
    echo ""
}

wait_for_services() {
    local services=("$@")
    log_info "Waiting for services to be ready..."

    for service in "${services[@]}"; do
        case "$service" in
            api|kernel)
                check_service_health "API Server" "http://localhost:8080/health" || log_warn "API Server may not be fully ready"
                ;;
            dashboard|cortex)
                check_service_health "Dashboard" "http://localhost:3000" || log_warn "Dashboard may not be fully ready"
                ;;
            database)
                # Wait for PostgreSQL to accept connections
                log_info "Waiting for PostgreSQL..."
                local attempt=1
                while [ $attempt -le 30 ]; do
                    if docker exec $(docker ps -qf "name=postgres") pg_isready &> /dev/null; then
                        log_success "PostgreSQL is ready"
                        break
                    fi
                    echo -n "."
                    sleep 2
                    ((attempt++))
                done
                ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# IGNITION MODES
# ═══════════════════════════════════════════════════════════════════════════

ignite_kernel() {
    local compose_file="docker-compose.prod.yml"
    log_info "Igniting Kernel layer (Rust backend)..."

    $COMPOSE_CMD -f "$compose_file" up "$@" api_server
}

ignite_nervous() {
    log_info "Igniting Nervous System layer (Node.js orchestration)..."

    # For now, this would be integrated into the kernel
    # In future, when separated, this would start backend/server.js
    log_warn "Nervous System currently integrated into Kernel"
    log_info "Future: Will start dedicated Node.js orchestration layer"
}

ignite_cortex() {
    local compose_file="docker-compose.dev.yml"
    log_info "Igniting Visual Cortex layer (React dashboard)..."

    $COMPOSE_CMD -f "$compose_file" up "$@" dashboard
}

ignite_full() {
    local compose_file="docker-compose.prod.yml"
    log_info "Igniting full three-tier stack..."

    $COMPOSE_CMD -f "$compose_file" up "$@"
}

ignite_dev() {
    local compose_file="docker-compose.dev.yml"
    log_info "Igniting development mode..."

    $COMPOSE_CMD -f "$compose_file" up "$@"
}

ignite_prod() {
    local compose_file="docker-compose.production.yml"
    log_info "Igniting production mode with monitoring..."

    # Start monitoring first
    $COMPOSE_CMD -f "docker-compose.monitoring.yml" up -d prometheus grafana

    # Then start main stack
    $COMPOSE_CMD -f "$compose_file" up "$@"
}

ignite_database() {
    local compose_file="docker-compose.database.yml"
    log_info "Igniting database services..."

    $COMPOSE_CMD -f "$compose_file" up "$@"
}

ignite_monitoring() {
    local compose_file="docker-compose.monitoring-elite.yml"
    log_info "Igniting monitoring stack..."

    $COMPOSE_CMD -f "$compose_file" up "$@"
}

ignite_test() {
    log_info "Igniting test mode..."

    # Run tests without external dependencies
    cargo test --all --lib --bins
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

main() {
    cd "$PROJECT_ROOT"

    # Parse mode (first argument if not an option)
    local mode="full"
    if [[ $# -gt 0 ]] && [[ ! "$1" =~ ^-- ]]; then
        mode="$1"
        shift
    fi

    # Parse options
    local compose_args=()
    local do_clean=false
    local do_logs=false
    local do_status=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --detach)
                compose_args+=("-d")
                shift
                ;;
            --build)
                compose_args+=("--build")
                shift
                ;;
            --logs)
                do_logs=true
                shift
                ;;
            --clean)
                do_clean=true
                shift
                ;;
            --status)
                do_status=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Run 'ops/ignite.sh --help' for usage information"
                exit 1
                ;;
        esac
    done

    # If --status flag is set, report status and exit
    if [ "$do_status" = true ]; then
        report_system_status
        exit 0
    fi

    # Show banner
    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║  BIZRA GENESIS NODE - IGNITION PROTOCOL                                  ║"
    echo "║  Mode: $(printf '%-65s' "$mode")║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"

    # Check prerequisites
    check_prerequisites

    # Clean if requested
    if [ "$do_clean" = true ]; then
        clean_volumes
    fi

    # Execute ignition mode
    local services_started=()
    case "$mode" in
        kernel)
            ignite_kernel "${compose_args[@]}"
            services_started=("api")
            ;;
        nervous)
            ignite_nervous "${compose_args[@]}"
            ;;
        cortex)
            ignite_cortex "${compose_args[@]}"
            services_started=("dashboard")
            ;;
        full)
            ignite_full "${compose_args[@]}"
            services_started=("api" "dashboard" "database")
            ;;
        dev)
            ignite_dev "${compose_args[@]}"
            services_started=("api" "dashboard" "database")
            ;;
        prod)
            ignite_prod "${compose_args[@]}"
            services_started=("api" "dashboard" "database")
            ;;
        database)
            ignite_database "${compose_args[@]}"
            services_started=("database")
            ;;
        monitoring)
            ignite_monitoring "${compose_args[@]}"
            ;;
        test)
            ignite_test
            ;;
        *)
            log_error "Unknown mode: $mode"
            echo "Run 'ops/ignite.sh --help' for available modes"
            exit 1
            ;;
    esac

    # Wait for services and run health checks (if detached mode)
    if [[ " ${compose_args[*]} " =~ " -d " ]] && [ ${#services_started[@]} -gt 0 ]; then
        echo ""
        wait_for_services "${services_started[@]}"
        echo ""
        report_system_status
    fi

    # Tail logs if requested and not in detached mode
    if [ "$do_logs" = true ] && [[ ! " ${compose_args[*]} " =~ " -d " ]]; then
        log_info "Following logs (Ctrl+C to exit)..."
        $COMPOSE_CMD logs -f
    fi

    log_success "Ignition sequence complete"
}

# Execute main function with all arguments
main "$@"
