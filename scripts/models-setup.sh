#!/bin/bash
# BIZRA Node0 - Ollama Models Setup Script
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS
# This script downloads all required LLM models for Node0

set -e

echo "================================================"
echo "BIZRA Node0 - Ollama Models Setup"
echo "================================================"
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "ERROR: Ollama is not running!"
    echo "Please start Ollama first:"
    echo "  docker-compose -f docker/docker-compose.node0.yml up -d ollama"
    exit 1
fi

echo "Ollama is running. Starting model downloads..."
echo ""

# Model download function with progress
download_model() {
    local model=$1
    local description=$2
    echo "----------------------------------------"
    echo "Downloading: $model"
    echo "Purpose: $description"
    echo "----------------------------------------"
    ollama pull "$model"
    echo "✓ $model downloaded successfully"
    echo ""
}

# Required Models for PAT (Personal Agent Team)

echo "=== PAT AGENT MODELS ==="
echo ""

# 1. Master Reasoner - DeepSeek R1 7B
download_model "deepseek-r1:7b" "Master Reasoner - Strategic thinking, complex analysis, planning"

# 2. Creative Synthesizer & Memory Architect - Qwen 2.5 7B
download_model "qwen2.5:7b" "Creative/Memory - Content creation, knowledge organization"

# 3. Vision Specialist - LLaMA Vision 11B
download_model "llama3.2-vision:11b" "Vision Specialist - Image analysis, document understanding"

# 4. Communicator & Data Analyzer - Mistral 7B
download_model "mistral:7b" "Communicator/Analyzer - Messaging, data insights"

# 5. Code Assistant - CodeLLaMA 13B
download_model "codellama:13b" "Code Assistant - Programming help, debugging"

echo "=== EMBEDDING MODEL ==="
echo ""

# 6. Embedding model for Knowledge Base
download_model "nomic-embed-text" "Embeddings - Vector search for Knowledge Base"

echo "=== OPTIONAL MODELS (Comment out if not needed) ==="
echo ""

# Optional: Smaller/faster models for quick responses
# download_model "phi3:mini" "Quick responses - Low-latency chat"

# Optional: Larger reasoning model (requires more VRAM)
# download_model "deepseek-r1:14b" "Advanced Reasoner - Complex tasks"

echo "================================================"
echo "All models downloaded successfully!"
echo "================================================"
echo ""

# List installed models
echo "Installed models:"
ollama list

echo ""
echo "Total disk space used by Ollama models:"
du -sh ~/.ollama/models 2>/dev/null || echo "Unable to calculate (Docker volume)"

echo ""
echo "Next steps:"
echo "  1. Start all services: ./scripts/start-all.sh"
echo "  2. Access dashboard: http://localhost:3000"
echo "================================================"
