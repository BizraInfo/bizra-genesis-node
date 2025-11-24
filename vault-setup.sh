#!/bin/bash

# BIZRA Vault Setup Script
# SEC-01.1: Vault/KMS Integration - Phase 1
# Enterprise Secrets Management Setup

set -e

echo "🔐 BIZRA Genesis Node - Vault/KMS Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Starting Vault development server...${NC}"

# Start Vault using docker-compose
docker-compose -f docker-compose.vault.yml up -d vault

echo -e "${YELLOW}⏳ Waiting for Vault to be healthy...${NC}"
sleep 10

# Check if Vault is healthy
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:8200/v1/sys/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Vault is healthy${NC}"
        break
    else
        echo "Attempt $attempt/$max_attempts: Vault not ready yet..."
        sleep 5
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}❌ Vault failed to start after $max_attempts attempts${NC}"
    docker-compose -f docker-compose.vault.yml logs vault
    exit 1
fi

# Run the setup container to configure policies and roles
echo -e "${BLUE}🔧 Configuring Vault policies and roles...${NC}"
docker-compose -f docker-compose.vault.yml up vault-setup

# Verify setup
echo -e "${BLUE}🔍 Verifying Vault configuration...${NC}"

# Check if KV v2 secrets engine is enabled
if vault kv list -format=json secret/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ KV v2 secrets engine configured${NC}"
else
    echo -e "${RED}❌ KV v2 secrets engine not configured${NC}"
fi

# Store some test secrets
echo -e "${BLUE}💾 Storing test secrets...${NC}"
export VAULT_TOKEN="dev-root-token-bizra"

# Database URL
vault kv put secret/bizra/database/url value="postgresql://bizra_user@localhost:5432/bizra_db"

# Redis URL
vault kv put secret/bizra/redis/url value="redis://localhost:6379"

# JWT Secret
vault kv put secret/bizra/auth/jwt_secret value="$(openssl rand -base64 32)"

# API Keys (placeholders)
vault kv put secret/bizra/api_keys/openai value="sk-placeholder-openai-key"
vault kv put secret/bizra/api_keys/anthropic value="sk-ant-placeholder-anthropic-key"

echo -e "${GREEN}✅ Test secrets stored${NC}"

# List stored secrets
echo -e "${BLUE}📋 Available secrets:${NC}"
vault kv list secret/bizra/

echo ""
echo -e "${GREEN}🚀 Vault/KMS Integration Complete!${NC}"
echo "==================================="
echo ""
echo "Vault UI: http://localhost:8200"
echo "Token: dev-root-token-bizra"
echo ""
echo "To start the BIZRA application with vault secrets:"
echo "cargo run --bin api_server"
echo ""
echo "To stop vault:"
echo "docker-compose -f docker-compose.vault.yml down"
echo ""

# Create a test script
cat > test-vault-integration.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Vault Integration..."

export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-bizra"

# Test basic connectivity
echo "Testing vault connectivity..."
vault status

# Test secrets retrieval
echo "Testing secrets retrieval..."
vault kv get secret/bizra/database/url
vault kv get secret/bizra/auth/jwt_secret

echo "✅ Vault integration tests completed"
EOF

chmod +x test-vault-integration.sh

echo -e "${GREEN}📋 Next Steps:${NC}"
echo "1. Run 'cargo run --bin api_server' to test the application"
echo "2. Use './test-vault-integration.sh' to verify secrets access"
echo "3. Check the application logs for vault integration success"
echo ""
echo -e "${YELLOW}💡 Pro tip: This secures the enterprise foundation for production deployment!${NC}"
