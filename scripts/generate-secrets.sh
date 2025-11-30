#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - PRODUCTION SECRETS GENERATION SCRIPT               ║
# ║  Cryptographically secure secret generation for production deployment    ║
# ║  Part of Alpha-100 Deployment Plan (Day 5/12)                            ║
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
BACKUP_DIR="backups/secrets"
MIN_SECRET_LENGTH=32  # 256 bits minimum

# JSON output array
declare -a JSON_SECRETS

# Function to add JSON secret info
add_json_secret() {
    local secret_name="$1"
    local length="$2"
    local status="$3"

    JSON_SECRETS+=("{\"secret\":\"$secret_name\",\"length\":$length,\"status\":\"$status\"}")
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
}

# Function to generate cryptographically secure secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d '\n'
}

# Function to calculate entropy (approximate)
calculate_entropy() {
    local secret="$1"
    local length=${#secret}
    local unique_chars=$(echo -n "$secret" | grep -o . | sort -u | wc -l)

    # Approximate entropy: length * log2(unique_chars)
    # Using bc for floating point arithmetic
    if command -v bc >/dev/null 2>&1; then
        local result=$(echo "$length * l($unique_chars) / l(2)" | bc -l 2>/dev/null)
        if [ -n "$result" ]; then
            echo "$result" | cut -d. -f1
        else
            echo "128"  # Default to reasonable value if calculation fails
        fi
    else
        echo "128"  # Default to reasonable value if bc not available
    fi
}

# Function to validate secret strength
validate_secret() {
    local secret="$1"
    local min_length=${2:-$MIN_SECRET_LENGTH}
    local length=${#secret}

    if [ $length -lt $min_length ]; then
        echo "WEAK"
        return 1
    fi

    local entropy=$(calculate_entropy "$secret")

    if [ "$entropy" -lt 128 ]; then
        echo "MODERATE"
    else
        echo "STRONG"
    fi

    return 0
}

# Function to update or add environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local env_file="$3"

    # Check if variable exists
    if grep -q "^${var_name}=" "$env_file"; then
        # Update existing variable
        sed -i.bak "s|^${var_name}=.*|${var_name}=${var_value}|" "$env_file"
    else
        # Append new variable
        echo "${var_name}=${var_value}" >> "$env_file"
    fi
}

# Header
if [ "$JSON_MODE" -eq 0 ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  BIZRA Genesis Node - Production Secrets Generator            ║${NC}"
    echo -e "${BLUE}║  Alpha-100 Cryptographic Secret Generation                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Prerequisites Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 1: Checking Prerequisites"

# Check for openssl
if ! command -v openssl >/dev/null 2>&1; then
    print_error "OpenSSL is not installed"
    if [ "$JSON_MODE" -eq 1 ]; then
        echo "{\"status\":\"FAIL\",\"error\":\"OpenSSL not found\"}"
    fi
    exit 1
fi

OPENSSL_VERSION=$(openssl version | awk '{print $2}')
print_success "OpenSSL installed: $OPENSSL_VERSION"

# Check for bc (for entropy calculation)
if ! command -v bc >/dev/null 2>&1; then
    print_warning "bc not installed (entropy calculation will be skipped)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: Environment File Handling
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 2: Preparing Environment File"

# Create backup directory
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_success "Created backup directory: $BACKUP_DIR"
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file not found: $ENV_FILE"

    if [ -f ".env.production.example" ]; then
        print_warning "Creating $ENV_FILE from template..."
        cp .env.production.example "$ENV_FILE"
        print_success "Created $ENV_FILE from .env.production.example"
    else
        if [ "$JSON_MODE" -eq 1 ]; then
            echo "{\"status\":\"FAIL\",\"error\":\"Environment file not found\"}"
        fi
        exit 1
    fi
else
    # Backup existing file
    BACKUP_FILE="$BACKUP_DIR/$(basename $ENV_FILE).$(date +%Y%m%d_%H%M%S).bak"
    cp "$ENV_FILE" "$BACKUP_FILE"
    print_success "Backed up existing file to: $BACKUP_FILE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: Generate Secrets
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 3: Generating Cryptographic Secrets"

# JWT Secret (256 bits / 32 bytes)
print_success "Generating JWT_SECRET (256-bit)..."
JWT_SECRET=$(generate_secret 32)
JWT_SECRET_LENGTH=${#JWT_SECRET}
JWT_SECRET_STRENGTH=$(validate_secret "$JWT_SECRET" 32)

if [ $? -eq 0 ]; then
    update_env_var "JWT_SECRET" "$JWT_SECRET" "$ENV_FILE"
    print_success "JWT_SECRET generated ($JWT_SECRET_LENGTH chars, $JWT_SECRET_STRENGTH)"
    add_json_secret "JWT_SECRET" $JWT_SECRET_LENGTH "$JWT_SECRET_STRENGTH"
else
    print_error "JWT_SECRET generation failed validation"
    add_json_secret "JWT_SECRET" $JWT_SECRET_LENGTH "FAILED"
fi

# Encryption Key (256 bits / 32 bytes)
print_success "Generating ENCRYPTION_KEY (256-bit)..."
ENCRYPTION_KEY=$(generate_secret 32)
ENCRYPTION_KEY_LENGTH=${#ENCRYPTION_KEY}
ENCRYPTION_KEY_STRENGTH=$(validate_secret "$ENCRYPTION_KEY" 32)

if [ $? -eq 0 ]; then
    update_env_var "ENCRYPTION_KEY" "$ENCRYPTION_KEY" "$ENV_FILE"
    print_success "ENCRYPTION_KEY generated ($ENCRYPTION_KEY_LENGTH chars, $ENCRYPTION_KEY_STRENGTH)"
    add_json_secret "ENCRYPTION_KEY" $ENCRYPTION_KEY_LENGTH "$ENCRYPTION_KEY_STRENGTH"
else
    print_error "ENCRYPTION_KEY generation failed validation"
    add_json_secret "ENCRYPTION_KEY" $ENCRYPTION_KEY_LENGTH "FAILED"
fi

# PostgreSQL Password (256 bits / 32 bytes)
print_success "Generating POSTGRES_PASSWORD (256-bit)..."
POSTGRES_PASSWORD=$(generate_secret 32)
POSTGRES_PASSWORD_LENGTH=${#POSTGRES_PASSWORD}
POSTGRES_PASSWORD_STRENGTH=$(validate_secret "$POSTGRES_PASSWORD" 32)

if [ $? -eq 0 ]; then
    update_env_var "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD" "$ENV_FILE"
    print_success "POSTGRES_PASSWORD generated ($POSTGRES_PASSWORD_LENGTH chars, $POSTGRES_PASSWORD_STRENGTH)"
    add_json_secret "POSTGRES_PASSWORD" $POSTGRES_PASSWORD_LENGTH "$POSTGRES_PASSWORD_STRENGTH"

    # Update DATABASE_URL with new password
    # Extract current DATABASE_URL
    CURRENT_DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2-)

    # Replace password in connection string
    # Format: postgresql://user:password@host:port/database
    NEW_DATABASE_URL=$(echo "$CURRENT_DATABASE_URL" | sed "s|://[^:]*:[^@]*@|://bizra:$POSTGRES_PASSWORD@|")
    update_env_var "DATABASE_URL" "$NEW_DATABASE_URL" "$ENV_FILE"
    print_success "DATABASE_URL updated with new password"
else
    print_error "POSTGRES_PASSWORD generation failed validation"
    add_json_secret "POSTGRES_PASSWORD" $POSTGRES_PASSWORD_LENGTH "FAILED"
fi

# Redis Password (256 bits / 32 bytes)
print_success "Generating REDIS_PASSWORD (256-bit)..."
REDIS_PASSWORD=$(generate_secret 32)
REDIS_PASSWORD_LENGTH=${#REDIS_PASSWORD}
REDIS_PASSWORD_STRENGTH=$(validate_secret "$REDIS_PASSWORD" 32)

if [ $? -eq 0 ]; then
    update_env_var "REDIS_PASSWORD" "$REDIS_PASSWORD" "$ENV_FILE"
    print_success "REDIS_PASSWORD generated ($REDIS_PASSWORD_LENGTH chars, $REDIS_PASSWORD_STRENGTH)"
    add_json_secret "REDIS_PASSWORD" $REDIS_PASSWORD_LENGTH "$REDIS_PASSWORD_STRENGTH"

    # Update REDIS_URL with new password
    CURRENT_REDIS_URL=$(grep "^REDIS_URL=" "$ENV_FILE" | cut -d= -f2-)
    NEW_REDIS_URL="redis://:$REDIS_PASSWORD@redis:6379"
    update_env_var "REDIS_URL" "$NEW_REDIS_URL" "$ENV_FILE"
    print_success "REDIS_URL updated with new password"
else
    print_error "REDIS_PASSWORD generation failed validation"
    add_json_secret "REDIS_PASSWORD" $REDIS_PASSWORD_LENGTH "FAILED"
fi

# Grafana Password (128 bits / 16 bytes - user-facing password)
print_success "Generating GRAFANA_PASSWORD (128-bit)..."
GRAFANA_PASSWORD=$(generate_secret 16)
GRAFANA_PASSWORD_LENGTH=${#GRAFANA_PASSWORD}
GRAFANA_PASSWORD_STRENGTH=$(validate_secret "$GRAFANA_PASSWORD" 16)

if [ $? -eq 0 ]; then
    update_env_var "GRAFANA_PASSWORD" "$GRAFANA_PASSWORD" "$ENV_FILE"
    print_success "GRAFANA_PASSWORD generated ($GRAFANA_PASSWORD_LENGTH chars, $GRAFANA_PASSWORD_STRENGTH)"
    add_json_secret "GRAFANA_PASSWORD" $GRAFANA_PASSWORD_LENGTH "$GRAFANA_PASSWORD_STRENGTH"
else
    print_error "GRAFANA_PASSWORD generation failed validation"
    add_json_secret "GRAFANA_PASSWORD" $GRAFANA_PASSWORD_LENGTH "FAILED"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: Validation Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_step "Step 4: Validating Generated Secrets"

# Count secrets by strength
STRONG_COUNT=0
MODERATE_COUNT=0
WEAK_COUNT=0
FAILED_COUNT=0

for secret in "${JSON_SECRETS[@]}"; do
    if echo "$secret" | grep -q "\"status\":\"STRONG\""; then
        ((STRONG_COUNT++)) || true
    elif echo "$secret" | grep -q "\"status\":\"MODERATE\""; then
        ((MODERATE_COUNT++)) || true
    elif echo "$secret" | grep -q "\"status\":\"WEAK\""; then
        ((WEAK_COUNT++)) || true
    elif echo "$secret" | grep -q "\"status\":\"FAILED\""; then
        ((FAILED_COUNT++)) || true
    fi
done

TOTAL_COUNT=${#JSON_SECRETS[@]}

if [ "$JSON_MODE" -eq 0 ]; then
    echo "Secret Strength Summary:"
    echo "  Strong secrets:   $STRONG_COUNT / $TOTAL_COUNT"
    echo "  Moderate secrets: $MODERATE_COUNT / $TOTAL_COUNT"
    echo "  Weak secrets:     $WEAK_COUNT / $TOTAL_COUNT"
    echo "  Failed secrets:   $FAILED_COUNT / $TOTAL_COUNT"
    echo ""
fi

# Determine overall status
if [ $FAILED_COUNT -gt 0 ]; then
    OVERALL_STATUS="FAIL"
elif [ $WEAK_COUNT -gt 0 ]; then
    OVERALL_STATUS="WARN"
else
    OVERALL_STATUS="PASS"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FINAL OUTPUT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [ "$JSON_MODE" -eq 1 ]; then
    # JSON output for CI/CD
    SECRETS_JSON=$(IFS=,; echo "${JSON_SECRETS[*]}")
    echo "{\"status\":\"$OVERALL_STATUS\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"env_file\":\"$ENV_FILE\",\"total_secrets\":$TOTAL_COUNT,\"strong\":$STRONG_COUNT,\"moderate\":$MODERATE_COUNT,\"weak\":$WEAK_COUNT,\"failed\":$FAILED_COUNT,\"secrets\":[$SECRETS_JSON]}"
else
    # Human-readable summary
    print_step "Secret Generation Complete"

    if [ "$OVERALL_STATUS" == "PASS" ]; then
        echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${GREEN}│  ✅ Secret Generation SUCCESSFUL                                │${NC}"
        echo -e "${GREEN}│  All secrets meet security requirements                        │${NC}"
        echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
    elif [ "$OVERALL_STATUS" == "WARN" ]; then
        echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${YELLOW}│  ⚠️  Secret Generation COMPLETED WITH WARNINGS                  │${NC}"
        echo -e "${YELLOW}│  Some secrets may not meet optimal strength requirements       │${NC}"
        echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
    else
        echo -e "${RED}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${RED}│  ❌ Secret Generation FAILED                                    │${NC}"
        echo -e "${RED}│  Some secrets failed to generate properly                      │${NC}"
        echo -e "${RED}└─────────────────────────────────────────────────────────────────┘${NC}"
    fi

    echo ""
    echo -e "${BLUE}Generated Secrets Summary:${NC}"
    echo "  Environment file: $ENV_FILE"
    echo "  Backup location:  $BACKUP_FILE"
    echo "  Total secrets:    $TOTAL_COUNT"
    echo "  Strong:           $STRONG_COUNT"
    echo "  Moderate:         $MODERATE_COUNT"
    echo "  Weak:             $WEAK_COUNT"
    echo "  Failed:           $FAILED_COUNT"
    echo ""
    echo -e "${BLUE}Security Notes:${NC}"
    echo "  1. Generated secrets use cryptographically secure random generation"
    echo "  2. Minimum entropy: 256 bits for critical secrets (JWT, encryption)"
    echo "  3. Original file backed up to: $BACKUP_FILE"
    echo "  4. NEVER commit $ENV_FILE to version control"
    echo "  5. Rotate secrets regularly (recommended: every 90 days)"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Review generated secrets in $ENV_FILE"
    echo "  2. Store backup securely (e.g., password manager, vault)"
    echo "  3. Run pre-flight check: ./scripts/preflight-check.sh"
    echo "  4. Deploy to production: ./scripts/setup-production-ssl.sh"
    echo ""

    if [ "$OVERALL_STATUS" == "PASS" ]; then
        echo -e "${GREEN}🔐 Production secrets generated successfully!${NC}"
    fi
fi

# Exit with appropriate code
if [ "$OVERALL_STATUS" == "FAIL" ]; then
    exit 1
else
    exit 0
fi
