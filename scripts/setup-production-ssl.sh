#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - PRODUCTION SSL SETUP SCRIPT                        ║
# ║  Automated SSL/TLS configuration for production deployment               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-console.bizra.ai}"
EMAIL="${SSL_EMAIL:-admin@bizra.ai}"
STAGING="${STAGING:-0}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BIZRA Genesis Node - Production SSL Setup                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRE-FLIGHT CHECK: Validate deployment environment before proceeding
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Pre-flight Check...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run pre-flight check
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=".env.production" "$SCRIPT_DIR/preflight-check.sh"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  Pre-flight Check FAILED                                      ║${NC}"
    echo -e "${RED}║  Deployment aborted - please fix issues above                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Pre-flight check passed - proceeding with deployment${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print step
print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Prerequisites check
print_step "Step 1: Checking Prerequisites"

if ! command_exists docker; then
    print_error "Docker is not installed"
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker is installed"

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed"
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is installed"

# Step 2: DNS verification
print_step "Step 2: Verifying DNS Configuration"

echo "Checking DNS records for $DOMAIN..."
CURRENT_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ -z "$CURRENT_IP" ]; then
    print_error "No DNS record found for $DOMAIN"
    echo ""
    echo "Please configure DNS before continuing:"
    echo "  1. Add an A record for $DOMAIN pointing to your server IP"
    echo "  2. Wait for DNS propagation (can take up to 48 hours)"
    echo "  3. Verify with: dig +short $DOMAIN"
    exit 1
fi

print_success "DNS record found: $DOMAIN → $CURRENT_IP"

# Get server public IP
SERVER_IP=$(curl -s https://api.ipify.org)
print_success "Server public IP: $SERVER_IP"

if [ "$CURRENT_IP" != "$SERVER_IP" ]; then
    print_warning "DNS IP ($CURRENT_IP) doesn't match server IP ($SERVER_IP)"
    echo ""
    echo "This might cause SSL certificate generation to fail."
    echo "Please verify your DNS configuration."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Port check
print_step "Step 3: Checking Port Availability"

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

if ! check_port 80; then
    print_error "Port 80 is already in use"
    echo "Please stop the service using port 80 before continuing."
    lsof -Pi :80 -sTCP:LISTEN
    exit 1
fi
print_success "Port 80 is available"

if ! check_port 443; then
    print_error "Port 443 is already in use"
    echo "Please stop the service using port 443 before continuing."
    lsof -Pi :443 -sTCP:LISTEN
    exit 1
fi
print_success "Port 443 is available"

# Step 4: Environment configuration
print_step "Step 4: Configuring Environment Variables"

if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found"
    echo "Creating .env.production from template..."

    if [ -f ".env.example" ]; then
        cp .env.example .env.production
        print_success "Created .env.production from .env.example"
    else
        print_error ".env.example not found"
        exit 1
    fi
fi

# Check if JWT_SECRET is set
if ! grep -q "^JWT_SECRET=" .env.production || grep -q "^JWT_SECRET=CHANGE_THIS" .env.production; then
    print_warning "JWT_SECRET not configured"
    echo "Generating JWT_SECRET..."
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.production
    print_success "Generated JWT_SECRET"
fi

# Set domain and email
sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env.production
sed -i "s|^SSL_EMAIL=.*|SSL_EMAIL=$EMAIL|" .env.production
sed -i "s|^STAGING=.*|STAGING=$STAGING|" .env.production

print_success "Environment configuration complete"

# Step 5: Build Docker images
print_step "Step 5: Building Docker Images"

echo "Building nginx image..."
docker-compose -f docker-compose.production.yml build nginx

echo "Building api_server image..."
docker-compose -f docker-compose.production.yml build api_server

print_success "Docker images built successfully"

# Step 6: Start services
print_step "Step 6: Starting Services"

echo "Starting PostgreSQL and Redis..."
docker-compose -f docker-compose.production.yml up -d postgres redis

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm api_server sqlx migrate run

echo "Starting API server..."
docker-compose -f docker-compose.production.yml up -d api_server

echo "Waiting for API server to be ready..."
sleep 5

echo "Starting nginx..."
docker-compose -f docker-compose.production.yml up -d nginx

print_success "Services started successfully"

# Step 7: SSL certificate generation
print_step "Step 7: Generating SSL Certificates"

if [ "$STAGING" -eq 1 ]; then
    print_warning "Running in STAGING mode (test certificates)"
else
    echo "Running in PRODUCTION mode (real certificates)"
fi

echo "Requesting SSL certificate for $DOMAIN..."
docker-compose -f docker-compose.production.yml exec nginx /usr/local/bin/ssl-setup.sh

if [ $? -eq 0 ]; then
    print_success "SSL certificate generated successfully"
else
    print_error "SSL certificate generation failed"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify DNS is correctly configured: dig +short $DOMAIN"
    echo "  2. Check nginx logs: docker-compose -f docker-compose.production.yml logs nginx"
    echo "  3. Try staging mode first: STAGING=1 $0"
    exit 1
fi

# Step 8: Verify deployment
print_step "Step 8: Verifying Deployment"

echo "Testing HTTP redirect..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/health")
if [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 302 ]; then
    print_success "HTTP redirect working (HTTP $HTTP_CODE)"
else
    print_warning "HTTP redirect returned $HTTP_CODE (expected 301 or 302)"
fi

echo "Testing HTTPS endpoint..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health")
if [ "$HTTPS_CODE" -eq 200 ]; then
    print_success "HTTPS endpoint working (HTTP $HTTPS_CODE)"
else
    print_error "HTTPS endpoint returned $HTTPS_CODE (expected 200)"
fi

echo "Testing SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    print_success "SSL certificate valid until: $SSL_EXPIRY"
else
    print_warning "Could not retrieve SSL certificate expiration"
fi

# Step 9: Setup auto-renewal
print_step "Step 9: Setting Up Auto-Renewal"

echo "Adding cron job for certificate renewal..."
CRON_JOB="0 3 * * * docker-compose -f $(pwd)/docker-compose.production.yml exec -T nginx /usr/local/bin/renew-certs.sh >> /var/log/cert-renewal.log 2>&1"

(crontab -l 2>/dev/null | grep -v "renew-certs.sh"; echo "$CRON_JOB") | crontab -

print_success "Auto-renewal configured (runs daily at 3 AM)"

# Step 10: Final summary
print_step "Deployment Complete!"

echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│  BIZRA Genesis Node Successfully Deployed                      │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}Deployment Information:${NC}"
echo "  Domain: https://$DOMAIN"
echo "  SSL Certificate: Valid until $SSL_EXPIRY"
echo "  Auto-renewal: Enabled (daily at 3 AM)"
echo ""
echo -e "${BLUE}Available Endpoints:${NC}"
echo "  Health Check:    https://$DOMAIN/health"
echo "  User Registration: https://$DOMAIN/auth/register"
echo "  User Login:       https://$DOMAIN/auth/login"
echo "  Token Refresh:    https://$DOMAIN/auth/refresh"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Test endpoints: curl https://$DOMAIN/health"
echo "  2. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "  3. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  4. Generate Alpha-100 invite codes"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo "  View logs:    docker-compose -f docker-compose.production.yml logs -f [service]"
echo "  Restart:      docker-compose -f docker-compose.production.yml restart [service]"
echo "  Stop:         docker-compose -f docker-compose.production.yml down"
echo "  Status:       docker-compose -f docker-compose.production.yml ps"
echo ""
echo -e "${GREEN}🚀 Production deployment complete!${NC}"
