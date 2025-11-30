#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - PRE-FLIGHT CHECK SCRIPT                            ║
# ║  Validates deployment environment before production deployment           ║
# ║  Part of Alpha-100 Deployment Plan (Day 4/12)                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="${ENV_FILE:-.env.production}"
JSON_MODE="${JSON_MODE:-0}"
EXIT_CODE=0

# JSON output array
declare -a JSON_CHECKS

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to add JSON check result
add_json_check() {
    local check_name="$1"
    local status="$2"
    local message="$3"

    JSON_CHECKS+=("{\"check\":\"$check_name\",\"status\":\"$status\",\"message\":\"$message\"}")
}

# Function to print step
print_step() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    fi
}

# Function to print success
print_success() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

# Function to print warning
print_warning() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
    fi
}

# Function to print error
print_error() {
    if [ "$JSON_MODE" -eq 0 ]; then
        echo -e "${RED}❌ $1${NC}"
    fi
    EXIT_CODE=1
}

# Header
if [ "$JSON_MODE" -eq 0 ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  BIZRA Genesis Node - Pre-flight Check                        ║${NC}"
    echo -e "${BLUE}║  Alpha-100 Deployment Readiness Validation                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Environment File Loading
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 1: Loading Environment Configuration"

if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file not found: $ENV_FILE"
    add_json_check "env_file" "FAIL" "Environment file not found: $ENV_FILE"

    if [ "$JSON_MODE" -eq 0 ]; then
        echo ""
        echo "Create $ENV_FILE from template:"
        echo "  cp .env.example $ENV_FILE"
        echo "  # Edit $ENV_FILE and set required values"
    fi

    # Early exit for missing env file
    if [ "$JSON_MODE" -eq 1 ]; then
        echo "{\"status\":\"FAIL\",\"checks\":[${JSON_CHECKS[*]}]}"
    fi
    exit 1
fi

print_success "Environment file found: $ENV_FILE"
add_json_check "env_file" "PASS" "Environment file loaded"

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: Prerequisites Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 2: Checking Prerequisites"

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    print_success "Docker installed: $DOCKER_VERSION"
    add_json_check "docker" "PASS" "Docker version $DOCKER_VERSION"
else
    print_error "Docker is not installed"
    add_json_check "docker" "FAIL" "Docker not found"
fi

# Check Docker Compose
if command_exists docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
    print_success "Docker Compose installed: $COMPOSE_VERSION"
    add_json_check "docker_compose" "PASS" "Docker Compose version $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed"
    add_json_check "docker_compose" "FAIL" "Docker Compose not found"
fi

# Check dig (DNS lookup)
if command_exists dig; then
    print_success "dig (DNS tool) installed"
    add_json_check "dig" "PASS" "dig command available"
else
    print_warning "dig not found (DNS validation will be skipped)"
    add_json_check "dig" "WARN" "dig not found - DNS validation skipped"
fi

# Check lsof (port checking)
if command_exists lsof; then
    print_success "lsof (port tool) installed"
    add_json_check "lsof" "PASS" "lsof command available"
else
    print_warning "lsof not found (port validation will be skipped)"
    add_json_check "lsof" "WARN" "lsof not found - port validation skipped"
fi

# Check psql (PostgreSQL client)
if command_exists psql; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    print_success "psql (PostgreSQL client) installed: $PSQL_VERSION"
    add_json_check "psql" "PASS" "psql version $PSQL_VERSION"
else
    print_warning "psql not found (database connectivity check will be skipped)"
    add_json_check "psql" "WARN" "psql not found - database check skipped"
fi

# Check openssl
if command_exists openssl; then
    OPENSSL_VERSION=$(openssl version | awk '{print $2}')
    print_success "OpenSSL installed: $OPENSSL_VERSION"
    add_json_check "openssl" "PASS" "OpenSSL version $OPENSSL_VERSION"
else
    print_error "OpenSSL is not installed"
    add_json_check "openssl" "FAIL" "OpenSSL not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: Configuration Validation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 3: Validating Configuration"

# Check JWT_SECRET
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "CHANGE_THIS_IN_PRODUCTION" ]; then
    print_error "JWT_SECRET is not configured"
    add_json_check "jwt_secret" "FAIL" "JWT_SECRET not set or using default value"
else
    JWT_LENGTH=${#JWT_SECRET}
    if [ $JWT_LENGTH -lt 32 ]; then
        print_warning "JWT_SECRET is too short ($JWT_LENGTH chars, recommend 32+)"
        add_json_check "jwt_secret" "WARN" "JWT_SECRET length $JWT_LENGTH (recommend 32+)"
    else
        print_success "JWT_SECRET configured ($JWT_LENGTH chars)"
        add_json_check "jwt_secret" "PASS" "JWT_SECRET length $JWT_LENGTH"
    fi
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not configured"
    add_json_check "database_url" "FAIL" "DATABASE_URL not set"
else
    print_success "DATABASE_URL configured"
    add_json_check "database_url" "PASS" "DATABASE_URL set"
fi

# Check DOMAIN
if [ -z "$DOMAIN" ]; then
    print_error "DOMAIN is not configured"
    add_json_check "domain" "FAIL" "DOMAIN not set"
else
    print_success "DOMAIN configured: $DOMAIN"
    add_json_check "domain" "PASS" "DOMAIN set to $DOMAIN"
fi

# Check SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
    print_error "SSL_EMAIL is not configured"
    add_json_check "ssl_email" "FAIL" "SSL_EMAIL not set"
else
    print_success "SSL_EMAIL configured: $SSL_EMAIL"
    add_json_check "ssl_email" "PASS" "SSL_EMAIL set to $SSL_EMAIL"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: DNS Verification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 4: Verifying DNS Configuration"

if [ -n "$DOMAIN" ] && command_exists dig; then
    CURRENT_IP=$(dig +short "$DOMAIN" | tail -n1)

    if [ -z "$CURRENT_IP" ]; then
        print_error "No DNS record found for $DOMAIN"
        add_json_check "dns_resolution" "FAIL" "No DNS record found for $DOMAIN"
    else
        print_success "DNS record found: $DOMAIN → $CURRENT_IP"
        add_json_check "dns_resolution" "PASS" "$DOMAIN resolves to $CURRENT_IP"

        # Get server public IP
        if command_exists curl; then
            SERVER_IP=$(curl -s --max-time 5 https://api.ipify.org || echo "unknown")

            if [ "$SERVER_IP" != "unknown" ]; then
                print_success "Server public IP: $SERVER_IP"

                if [ "$CURRENT_IP" != "$SERVER_IP" ]; then
                    print_warning "DNS IP ($CURRENT_IP) doesn't match server IP ($SERVER_IP)"
                    add_json_check "dns_match" "WARN" "DNS IP $CURRENT_IP != Server IP $SERVER_IP"
                else
                    print_success "DNS matches server IP"
                    add_json_check "dns_match" "PASS" "DNS matches server IP"
                fi
            fi
        fi
    fi
else
    print_warning "DNS verification skipped (DOMAIN not set or dig not available)"
    add_json_check "dns_resolution" "SKIP" "DNS verification skipped"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5: Port Availability Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 5: Checking Port Availability"

check_port() {
    local port=$1
    local port_name=$2

    if command_exists lsof; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Port $port ($port_name) is already in use"
            add_json_check "port_$port" "FAIL" "Port $port ($port_name) in use"

            if [ "$JSON_MODE" -eq 0 ]; then
                echo "  Process using port $port:"
                lsof -Pi :$port -sTCP:LISTEN
            fi
        else
            print_success "Port $port ($port_name) is available"
            add_json_check "port_$port" "PASS" "Port $port ($port_name) available"
        fi
    else
        print_warning "Port $port ($port_name) check skipped (lsof not available)"
        add_json_check "port_$port" "SKIP" "Port check skipped - lsof not available"
    fi
}

check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 6: PostgreSQL Connectivity Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 6: Testing PostgreSQL Connectivity"

if [ -n "$DATABASE_URL" ] && command_exists psql; then
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "PostgreSQL connection successful"
        add_json_check "postgres_connectivity" "PASS" "PostgreSQL connection successful"

        # Get PostgreSQL version
        PG_VERSION=$(psql "$DATABASE_URL" -tAc "SELECT version();" 2>/dev/null | head -n1)
        if [ -n "$PG_VERSION" ]; then
            print_success "PostgreSQL version: $PG_VERSION"
        fi
    else
        print_error "PostgreSQL connection failed"
        add_json_check "postgres_connectivity" "FAIL" "PostgreSQL connection failed"

        if [ "$JSON_MODE" -eq 0 ]; then
            echo ""
            echo "Troubleshooting:"
            echo "  1. Ensure PostgreSQL is running"
            echo "  2. Verify DATABASE_URL is correct"
            echo "  3. Check network connectivity"
        fi
    fi
else
    print_warning "PostgreSQL connectivity check skipped"
    add_json_check "postgres_connectivity" "SKIP" "Check skipped - DATABASE_URL or psql not available"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 7: SSL Certificate Validation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 7: Validating SSL Certificates (if exists)"

if [ -n "$DOMAIN" ]; then
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

    if [ -f "$CERT_PATH" ]; then
        print_success "SSL certificate found: $CERT_PATH"
        add_json_check "ssl_cert_exists" "PASS" "SSL certificate found"

        # Check certificate expiration
        if command_exists openssl; then
            CERT_EXPIRES=$(openssl x509 -in "$CERT_PATH" -noout -enddate 2>/dev/null | cut -d= -f2)

            if [ -n "$CERT_EXPIRES" ]; then
                print_success "Certificate expires: $CERT_EXPIRES"

                # Calculate days until expiration
                EXPIRY_EPOCH=$(date -d "$CERT_EXPIRES" +%s 2>/dev/null || echo "0")
                CURRENT_EPOCH=$(date +%s)

                if [ "$EXPIRY_EPOCH" -gt 0 ]; then
                    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

                    if [ $DAYS_UNTIL_EXPIRY -lt 7 ]; then
                        print_error "Certificate expires in $DAYS_UNTIL_EXPIRY days (renewal urgent)"
                        add_json_check "ssl_cert_expiry" "FAIL" "Expires in $DAYS_UNTIL_EXPIRY days"
                    elif [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                        print_warning "Certificate expires in $DAYS_UNTIL_EXPIRY days (renewal recommended)"
                        add_json_check "ssl_cert_expiry" "WARN" "Expires in $DAYS_UNTIL_EXPIRY days"
                    else
                        print_success "Certificate valid for $DAYS_UNTIL_EXPIRY days"
                        add_json_check "ssl_cert_expiry" "PASS" "Valid for $DAYS_UNTIL_EXPIRY days"
                    fi
                fi
            fi
        fi
    else
        print_warning "SSL certificate not found (will be generated during deployment)"
        add_json_check "ssl_cert_exists" "SKIP" "SSL certificate not yet generated"
    fi
else
    print_warning "SSL certificate check skipped (DOMAIN not set)"
    add_json_check "ssl_cert_exists" "SKIP" "DOMAIN not set"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 8: nginx Configuration Validation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 8: Validating nginx Configuration"

if [ -f "nginx/nginx.conf" ]; then
    print_success "nginx configuration found: nginx/nginx.conf"
    add_json_check "nginx_config" "PASS" "nginx configuration found"

    # Test nginx config if nginx is available
    if command_exists nginx; then
        if nginx -t -c nginx/nginx.conf >/dev/null 2>&1; then
            print_success "nginx configuration is valid"
            add_json_check "nginx_config_valid" "PASS" "nginx configuration valid"
        else
            print_error "nginx configuration has errors"
            add_json_check "nginx_config_valid" "FAIL" "nginx configuration invalid"
        fi
    else
        print_warning "nginx not installed (config validation skipped)"
        add_json_check "nginx_config_valid" "SKIP" "nginx not installed"
    fi
else
    print_error "nginx configuration not found: nginx/nginx.conf"
    add_json_check "nginx_config" "FAIL" "nginx configuration not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FINAL SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [ "$JSON_MODE" -eq 1 ]; then
    # JSON output for CI/CD
    CHECKS_JSON=$(IFS=,; echo "${JSON_CHECKS[*]}")
    STATUS=$([ $EXIT_CODE -eq 0 ] && echo "PASS" || echo "FAIL")
    echo "{\"status\":\"$STATUS\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"checks\":[$CHECKS_JSON]}"
else
    # Human-readable summary
    print_step "Pre-flight Check Complete"

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${GREEN}│  ✅ Pre-flight Check PASSED                                     │${NC}"
        echo -e "${GREEN}│  Environment is ready for production deployment                │${NC}"
        echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo "  1. Run production deployment: ./scripts/setup-production-ssl.sh"
        echo "  2. Monitor deployment: docker-compose -f docker-compose.production.yml logs -f"
        echo ""
    else
        echo -e "${RED}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${RED}│  ❌ Pre-flight Check FAILED                                     │${NC}"
        echo -e "${RED}│  Please fix the issues above before deployment                 │${NC}"
        echo -e "${RED}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "  1. Review errors above"
        echo "  2. Fix configuration issues in $ENV_FILE"
        echo "  3. Install missing prerequisites"
        echo "  4. Re-run pre-flight check"
        echo ""
    fi
fi

exit $EXIT_CODE
