#!/bin/bash
# BIZRA Node0 - Stop All Services
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "BIZRA Node0 - Stopping All Services"
echo "================================================"
echo ""

cd "$PROJECT_ROOT"

# Stop application processes
echo "Stopping application processes..."
echo "----------------------------------------"

# Kill Node.js processes (bridge and dashboard)
pkill -f "node.*telemetry-bridge" 2>/dev/null && echo "✓ Telemetry Bridge stopped" || echo "! Telemetry Bridge not running"
pkill -f "next dev" 2>/dev/null && echo "✓ React Dashboard stopped" || echo "! React Dashboard not running"
pkill -f "npm.*dev" 2>/dev/null && echo "✓ NPM dev processes stopped" || true

# Kill Rust API server
pkill -f "apiserver" 2>/dev/null && echo "✓ Rust API Server stopped" || echo "! Rust API Server not running"

# Stop Docker services
echo ""
echo "Stopping Docker services..."
echo "----------------------------------------"
docker-compose -f docker/docker-compose.node0.yml down

echo ""
echo "================================================"
echo "All BIZRA Node0 services stopped"
echo "================================================"
echo ""
echo "To start again:"
echo "  ./scripts/start-all.sh"
echo ""
echo "To remove all data (DESTRUCTIVE):"
echo "  docker-compose -f docker/docker-compose.node0.yml down -v"
echo "================================================"
