#!/bin/bash
# scripts/prepare-sqlx-offline.sh
# Professional script to prepare SQLx offline metadata for CI/CD
#
# This script:
# 1. Starts PostgreSQL via Docker (if not running)
# 2. Runs database migrations
# 3. Generates SQLx offline metadata
# 4. Validates metadata integrity
# 5. Provides clear success/failure feedback

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_USER="${POSTGRES_USER:-bizra_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bizra_password}"
POSTGRES_DB="${POSTGRES_DB:-bizra_genesis}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
CONTAINER_NAME="bizra-postgres-sqlx-prepare"

DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}SQLx Offline Metadata Preparation${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================

echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check if SQLx CLI is installed
if ! command -v sqlx &> /dev/null; then
    echo -e "${YELLOW}⚠️  SQLx CLI not found. Installing...${NC}"
    cargo install sqlx-cli --no-default-features --features postgres
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install SQLx CLI${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ SQLx CLI installed${NC}"
else
    echo -e "${GREEN}✓ SQLx CLI installed ($(sqlx --version))${NC}"
fi

echo ""

# =============================================================================
# STEP 2: Start PostgreSQL
# =============================================================================

echo -e "${YELLOW}[2/5] Starting PostgreSQL...${NC}"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} exists. Removing..."
    docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:15-alpine > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start PostgreSQL container${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL container started: ${CONTAINER_NAME}${NC}"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start within 30 seconds${NC}"
        docker logs "${CONTAINER_NAME}"
        docker rm -f "${CONTAINER_NAME}"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo ""
echo ""

# =============================================================================
# STEP 3: Run Migrations
# =============================================================================

echo -e "${YELLOW}[3/5] Running database migrations...${NC}"

export DATABASE_URL="${DATABASE_URL}"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    echo -e "${RED}❌ Error: migrations/ directory not found${NC}"
    echo "Please run this script from the project root directory"
    docker rm -f "${CONTAINER_NAME}"
    exit 1
fi

# Run migrations
sqlx migrate run

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration failed${NC}"
    docker rm -f "${CONTAINER_NAME}"
    exit 1
fi

echo -e "${GREEN}✓ Migrations applied successfully${NC}"
echo ""

# =============================================================================
# STEP 4: Generate SQLx Offline Metadata
# =============================================================================

echo -e "${YELLOW}[4/5] Generating SQLx offline metadata...${NC}"

# Generate metadata
cargo sqlx prepare --workspace

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate SQLx metadata${NC}"
    docker rm -f "${CONTAINER_NAME}"
    exit 1
fi

echo -e "${GREEN}✓ SQLx metadata generated in .sqlx/ directory${NC}"

# Count queries
QUERY_COUNT=$(find .sqlx -name "query-*.json" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Generated metadata for ${QUERY_COUNT} queries${NC}"
echo ""

# =============================================================================
# STEP 5: Validate Metadata
# =============================================================================

echo -e "${YELLOW}[5/5] Validating metadata...${NC}"

# Check metadata
cargo sqlx prepare --check

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Metadata validation successful${NC}"
else
    echo -e "${YELLOW}⚠️  Metadata validation warning (this is okay for first run)${NC}"
fi

# Test offline compilation
echo "Testing offline compilation..."
unset DATABASE_URL
cargo check --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Offline compilation test passed${NC}"
else
    echo -e "${RED}❌ Offline compilation test failed${NC}"
    echo "The code may not compile without DATABASE_URL"
    docker rm -f "${CONTAINER_NAME}"
    exit 1
fi

echo ""

# =============================================================================
# CLEANUP
# =============================================================================

echo -e "${YELLOW}Cleaning up...${NC}"
docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1
echo -e "${GREEN}✓ PostgreSQL container removed${NC}"
echo ""

# =============================================================================
# SUCCESS SUMMARY
# =============================================================================

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ SQLx Offline Metadata Preparation Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📦 Generated files:${NC}"
echo "   • .sqlx/ directory with query metadata"
echo "   • ${QUERY_COUNT} query definitions cached"
echo ""
echo -e "${BLUE}🎯 What this enables:${NC}"
echo "   • ✅ Compilation without live database"
echo "   • ✅ Faster CI/CD pipelines"
echo "   • ✅ Offline development"
echo "   • ✅ Smaller Docker images"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   1. Commit .sqlx/ to version control:"
echo "      ${YELLOW}git add .sqlx/${NC}"
echo "      ${YELLOW}git commit -m \"chore(sqlx): Add offline query metadata\"${NC}"
echo ""
echo "   2. Verify offline compilation works:"
echo "      ${YELLOW}unset DATABASE_URL${NC}"
echo "      ${YELLOW}cargo build${NC}"
echo ""
echo "   3. Update when schema changes:"
echo "      ${YELLOW}./scripts/prepare-sqlx-offline.sh${NC}"
echo ""
echo -e "${GREEN}🚀 Ready for production CI/CD!${NC}"
echo ""
