#!/bin/bash
# BIZRA Node0 - Start All Services
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "BIZRA Node0 - Starting All Services"
echo "Node: NODE0-TITAN"
echo "================================================"
echo ""

cd "$PROJECT_ROOT"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✓ Environment variables loaded from .env"
else
    echo "WARNING: .env file not found. Using defaults."
fi

# Start Docker services
echo ""
echo "Starting Docker infrastructure..."
echo "----------------------------------------"
docker-compose -f docker/docker-compose.node0.yml up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
check_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✓ $name is healthy"
            return 0
        fi
        echo "  Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "✗ $name failed to start"
    return 1
}

echo ""
echo "Checking service health..."
echo "----------------------------------------"
check_service "PostgreSQL" "localhost:5432" || true
check_service "Redis" "localhost:6379" || true
check_service "Ollama" "http://localhost:11434/api/tags" || true
check_service "Neo4j" "http://localhost:7474" || true
check_service "Qdrant" "http://localhost:6333/collections" || true

# Start Rust Backend (in background)
echo ""
echo "Starting Rust API Server..."
echo "----------------------------------------"
if [ -d "backend" ] && [ -f "backend/Cargo.toml" ]; then
    cd backend
    cargo run --release --bin apiserver &
    RUST_PID=$!
    echo "✓ Rust API Server starting (PID: $RUST_PID)"
    cd "$PROJECT_ROOT"
else
    echo "! Rust backend not found, skipping..."
fi

# Start Node.js Bridge (in background)
echo ""
echo "Starting Node.js Telemetry Bridge..."
echo "----------------------------------------"
if [ -d "bridge" ] && [ -f "bridge/package.json" ]; then
    cd bridge
    npm start &
    NODE_PID=$!
    echo "✓ Telemetry Bridge starting (PID: $NODE_PID)"
    cd "$PROJECT_ROOT"
else
    echo "! Node.js bridge not found, skipping..."
fi

# Start React Frontend
echo ""
echo "Starting React Dashboard..."
echo "----------------------------------------"
if [ -d "apps/dashboard" ] && [ -f "apps/dashboard/package.json" ]; then
    cd apps/dashboard
    npm run dev &
    REACT_PID=$!
    echo "✓ React Dashboard starting (PID: $REACT_PID)"
    cd "$PROJECT_ROOT"
else
    echo "! React dashboard not found, skipping..."
fi

# Final status
echo ""
echo "================================================"
echo "BIZRA Node0 Services Started"
echo "================================================"
echo ""
echo "Services:"
echo "  • PostgreSQL:    localhost:5432"
echo "  • Redis:         localhost:6379"
echo "  • Ollama:        localhost:11434"
echo "  • Neo4j:         localhost:7474 (browser)"
echo "  • Neo4j Bolt:    localhost:7687"
echo "  • Qdrant:        localhost:6333"
echo ""
echo "Applications:"
echo "  • API Server:    http://localhost:8080"
echo "  • Telemetry WS:  ws://localhost:3002/telemetry"
echo "  • Dashboard:     http://localhost:3000"
echo ""
echo "Health Check:"
echo "  curl http://localhost:8080/health"
echo ""
echo "To stop all services:"
echo "  ./scripts/stop-all.sh"
echo "================================================"
