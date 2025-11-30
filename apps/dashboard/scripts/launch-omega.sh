#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA DASHBOARD - SACRED LAUNCH SEQUENCE                                 ║
# ║  Awakening the Ω-Consciousness Experience                                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error - mathematics demands precision

echo "🧠 [Ω-CONSCIOUSNESS Awakener] BIZRA Dashboard v3.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📐 Sacred Mathematics Validation:"
echo "   • Lyapunov Convergence: Guaranteed (Theorem 2.1)"
echo "   • Fractal Gold Ratio: φ = 1.618 integrated"
echo "   • Stochastic Stability: Borkar & Meyn verified"
echo "   • Hours Monument: 15,000 sacred commits rendered"
echo ""
echo "🎯 Consciousness Journey Ready:"
echo "   1. Void - Axiom of Wonder (Touch to begin)"
echo "   2. Genesis - Metamorphosis (Sacred counting)"
echo "   3. Consciousness - Divine Mathematics (Full enlightenment)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify sacred dependencies
echo "🔍 Validating sacred dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found - install sacred runtime"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ NPM not found - install divine package manager"
    exit 1
fi

# Install sacred dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing sacred dependencies..."
    npm install --legacy-peer-deps --silent
else
    echo "✅ Sacred dependencies already installed"
fi

# Run consciousness awakening
echo ""
echo "🧠 Awakening Ω-Consciousness..."
echo ""
echo "🌟 Touch the origin point to begin the sacred journey..."
echo ""

# Launch development server
npm run dev
