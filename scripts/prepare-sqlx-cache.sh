#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - SQLx Cache Preparation Script                       ║
# ║  Generates offline query metadata for compile-time checked SQL queries    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BIZRA Genesis Node - SQLx Cache Preparation                              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Checking for .env file...${NC}"

    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        echo -e "${GREEN}✅ Loaded DATABASE_URL from .env${NC}"
    else
        echo -e "${RED}❌ No .env file found and DATABASE_URL not set.${NC}"
        echo ""
        echo "Please set DATABASE_URL environment variable or create .env file:"
        echo "  export DATABASE_URL='postgres://user:pass@localhost:5432/bizra_genesis'"
        echo ""
        echo "Or create .env file with:"
        echo "  DATABASE_URL=postgres://user:pass@localhost:5432/bizra_genesis"
        exit 1
    fi
fi

echo -e "${BLUE}📊 Database URL: ${DATABASE_URL%%@*}@***${NC}"
echo ""

# Check if sqlx-cli is installed
if ! command -v sqlx &> /dev/null; then
    echo -e "${YELLOW}⚠️  sqlx-cli not found. Installing...${NC}"
    cargo install sqlx-cli --no-default-features --features postgres
fi

# Run migrations first
echo -e "${BLUE}🔄 Running database migrations...${NC}"
if sqlx migrate run; then
    echo -e "${GREEN}✅ Migrations complete${NC}"
else
    echo -e "${YELLOW}⚠️  Migrations may have already been applied${NC}"
fi

echo ""

# Generate SQLx prepare data
echo -e "${BLUE}📦 Generating SQLx offline cache...${NC}"
echo ""

# Remove old cache to force regeneration
if [ -d ".sqlx" ]; then
    echo -e "${YELLOW}🗑️  Removing old .sqlx cache...${NC}"
    rm -rf .sqlx
fi

# Prepare with database feature
echo -e "${BLUE}🔨 Running cargo sqlx prepare --features database...${NC}"
cargo sqlx prepare --features database

echo ""

# Verify the cache was created
QUERY_COUNT=$(find .sqlx -name "query-*.json" 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Generated ${QUERY_COUNT} query cache files${NC}"

# List the generated files
echo ""
echo -e "${BLUE}📁 Generated cache files:${NC}"
ls -la .sqlx/

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ SQLx cache preparation complete!                                      ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║  The .sqlx directory now contains all query metadata needed for           ║${NC}"
echo -e "${GREEN}║  offline compilation with SQLX_OFFLINE=true                               ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║  Next steps:                                                              ║${NC}"
echo -e "${GREEN}║    1. Commit .sqlx/*.json files to version control                        ║${NC}"
echo -e "${GREEN}║    2. Run: cargo build --all-features                                     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
