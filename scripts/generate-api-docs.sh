#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - API DOCUMENTATION GENERATOR
# Generates OpenAPI specification and optionally serves documentation
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "📄 BIZRA Genesis Node - API Documentation Generator"
echo "════════════════════════════════════════════════════════"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate OpenAPI spec
echo -e "\n${YELLOW}Step 1: Generating OpenAPI specification...${NC}"
cargo run --bin generate-openapi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ OpenAPI spec generated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to generate OpenAPI spec${NC}"
    exit 1
fi

# Check if spec was created
if [ ! -f "docs/api/openapi.yaml" ]; then
    echo -e "${RED}❌ OpenAPI spec file not found!${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ API documentation generated:${NC}"
echo "   📁 docs/api/openapi.yaml"

# Validate the spec (if npx is available)
if command -v npx &> /dev/null; then
    echo -e "\n${YELLOW}Step 2: Validating OpenAPI specification...${NC}"

    if npx --yes @apidevtools/swagger-cli validate docs/api/openapi.yaml; then
        echo -e "${GREEN}✅ OpenAPI spec is valid!${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAPI spec validation warnings (non-blocking)${NC}"
    fi
fi

# Offer to serve docs
echo -e "\n${YELLOW}Options:${NC}"
echo "  1. View in Swagger Editor: https://editor.swagger.io/"
echo "  2. Serve locally with Swagger UI (requires Docker)"
echo "  3. Generate static HTML (requires npx)"
echo ""

read -p "Would you like to serve the docs locally? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v docker &> /dev/null; then
        echo -e "\n${YELLOW}Starting Swagger UI on http://localhost:8080...${NC}"

        # Copy spec to a temporary location accessible by Docker
        mkdir -p /tmp/bizra-api-docs
        cp docs/api/openapi.yaml /tmp/bizra-api-docs/

        docker run -d --rm \
            --name bizra-swagger-ui \
            -p 8080:8080 \
            -e SWAGGER_JSON=/api/openapi.yaml \
            -v /tmp/bizra-api-docs:/api \
            swaggerapi/swagger-ui

        echo -e "${GREEN}✅ Swagger UI is now running!${NC}"
        echo -e "   🌐 Open: ${YELLOW}http://localhost:8080${NC}"
        echo -e "   🛑 Stop with: ${YELLOW}docker stop bizra-swagger-ui${NC}"

        # Open browser (optional)
        if command -v open &> /dev/null; then
            open http://localhost:8080
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:8080
        elif command -v start &> /dev/null; then
            start http://localhost:8080
        fi
    else
        echo -e "${RED}❌ Docker not found. Please install Docker to serve docs locally.${NC}"
        echo -e "   Alternative: Copy docs/api/openapi.yaml to https://editor.swagger.io/"
    fi
fi

echo -e "\n${GREEN}Done!${NC}"
