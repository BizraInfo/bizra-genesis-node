#!/bin/bash
# BIZRA Node0 - AI Sovereignty Verification Script
# Elite Professional Standard: Zero Cloud AI Dependencies
# This script enforces the fundamental principle of local-first AI

set -e

echo "🛡️ BIZRA AI Sovereignty Check"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0

# Forbidden cloud AI service patterns
FORBIDDEN_PATTERNS=(
    "openai"
    "anthropic"
    "@anthropic-ai/sdk"
    "claude-ai"
    "@google/generative-ai"
    "cohere"
    "@azure/openai"
    "huggingface/inference"
    "replicate"
    "together-ai"
    "fireworks-ai"
    "perplexity"
    "mistral-ai"
)

# Allowed patterns (local-first alternatives)
ALLOWED_PATTERNS=(
    "ollama"
    "llama.cpp"
    "vllm"
    "text-generation-webui"
    "LocalAI"
    "privateGPT"
)

echo ""
echo "Scanning for cloud AI dependencies..."
echo ""

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    # Search in source files
    if grep -rn "$pattern" --include="*.rs" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" . 2>/dev/null | grep -v "node_modules" | grep -v "target" | grep -v ".git"; then
        echo -e "${RED}❌ SOVEREIGNTY VIOLATION: Found '$pattern'${NC}"
        ((VIOLATIONS++))
    fi
    
    # Search in package files
    if grep -l "$pattern" package.json Cargo.toml requirements.txt 2>/dev/null; then
        echo -e "${RED}❌ SOVEREIGNTY VIOLATION: '$pattern' in dependencies${NC}"
        ((VIOLATIONS++))
    fi
done

echo ""

if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════${NC}"
    echo -e "${RED}  🚨 SOVEREIGNTY BREACH DETECTED: $VIOLATIONS violations${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "BIZRA requires all AI to run locally on sovereign hardware."
    echo "Remove cloud AI dependencies and use local alternatives:"
    echo ""
    for alt in "${ALLOWED_PATTERNS[@]}"; do
        echo -e "  ${GREEN}✓ $alt${NC}"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ AI SOVEREIGNTY MAINTAINED${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "All AI dependencies are local-first compliant."
    echo "No cloud AI services detected."
    exit 0
fi
