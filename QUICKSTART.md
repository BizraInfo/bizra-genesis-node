# BIZRA Genesis Node - Quick Start Guide

**Status:** Pre-Alpha (Week 1 of 52-week plan)
**Implementation:** ~15-20% complete
**Last Updated:** 2025-11-16

Get up and running with the BIZRA Genesis Node in 10 minutes. This guide focuses on what **actually works right now**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Verify Installation](#verify-installation)
4. [What You Can Do Now](#what-you-can-do-now)
5. [What Doesn't Work Yet](#what-doesnt-work-yet)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

---

## Prerequisites

### Required

- **Rust 1.70+** - [Install from rustup.rs](https://rustup.rs/)
- **Git** - For version control
- **PostgreSQL 15+** - For database features (optional for basic builds)
- **Redis 7+** - For caching features (optional for basic builds)

### Optional

- **Ollama** - For local AI model integration ([ollama.ai](https://ollama.ai/))
- **Docker** - For running PostgreSQL/Redis locally
- **Cargo-criterion** - For running benchmarks (`cargo install cargo-criterion`)

### Check Prerequisites

```bash
# Check Rust version
rustc --version
# Expected: rustc 1.70.0 or higher

# Check Cargo
cargo --version

# Check Git
git --version

# Check PostgreSQL (optional)
psql --version

# Check Redis (optional)
redis-cli --version
```

---

## Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/bizra-genesis-node.git
cd bizra-genesis-node

# Check current branch
git branch
# Expected: * main
```

### 2. Build the Project

```bash
# Debug build (faster compilation, slower runtime)
cargo build

# Expected output:
#    Compiling synthesis_orchestrator v0.1.0
#    Compiling bizra-moe v0.1.0
#    Finished dev [unoptimized + debuginfo] target(s) in 30.0s
```

**First Build Time:** ~30-60 seconds (depending on your machine)
**Incremental Build:** ~5-10 seconds

#### Release Build (Recommended for Testing Performance)

```bash
# Release build (slower compilation, optimized runtime)
cargo build --release

# Expected output:
#    Compiling synthesis_orchestrator v0.1.0
#    Finished release [optimized] target(s) in 60.0s
```

---

## Verify Installation

### 1. Run Tests

```bash
# Run all tests
cargo test

# Expected output:
# test result: ok. XX passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**Note:** If any tests fail, check the troubleshooting section.

### 2. Run Benchmarks (Optional)

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench routing
cargo bench json_parsing
cargo bench consensus
```

**Expected:** Benchmarks should run without errors. Actual performance numbers need to be documented.

### 3. Check for Compilation Warnings

```bash
# Check for warnings and best practices
cargo clippy

# Expected: No warnings or errors
```

### 4. Format Check

```bash
# Check code formatting
cargo fmt --check

# Expected: No formatting issues
```

---

## What You Can Do Now

### ✅ 1. Build and Test Core Components

**Thompson Sampling Router:**
```bash
# Run routing tests
cargo test routing

# Run routing benchmarks
cargo bench routing
```

**Ihsan Quality Gate:**
```bash
# Run scoring tests
cargo test scoring

# Run scoring example (if available)
cargo test ihsan
```

**Trust Bridge:**
```bash
# Run trust/cryptography tests
cargo test trust

# View trust implementation
cat src/trust.rs
```

### ✅ 2. View Source Code

**Core Components:**
```bash
# Thompson Sampling Router
cat src/routing.rs

# Weighted Selective Consensus
cat src/aegis/consensus/mod.rs

# Ihsan Quality Gate
cat src/scoring.rs

# Trust Bridge
cat src/trust.rs
```

**Agent Ecosystem:**
```bash
# Personal Agentic Team (PAT) agents
ls -la src/agents/pat/

# System Agentic Team (SAT) agents
ls -la src/agents/sat/
```

### ✅ 3. Run Examples (If Available)

```bash
# List available examples
ls examples/

# Run multi-provider demo (if available)
cargo run --example multi_provider_demo

# Run other examples
cargo run --example <example-name>
```

**Note:** Not all examples may be functional in Pre-Alpha. Check for errors.

### ✅ 4. Run API Server (If Implemented)

```bash
# Check if API server binary exists
cargo build --bin api_server

# Run API server
cargo run --bin api_server

# In another terminal, test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

**Note:** API server may not be fully functional. Check logs for errors.

### ✅ 5. View Documentation

```bash
# Generate and open Rust documentation
cargo doc --open

# This will open your browser with auto-generated documentation
```

### ✅ 6. Read Project Documentation

**Start here:**
- [IMPLEMENTED.md](IMPLEMENTED.md) - What actually works right now
- [VALIDATION_REPORT.md](VALIDATION_REPORT.md) - Validation against specification
- [ROADMAP_52_WEEKS.md](ROADMAP_52_WEEKS.md) - 52-week implementation plan
- [README.md](README.md) - Project overview

---

## What Doesn't Work Yet

### ❌ Production Deployment
- No Kubernetes deployment
- No production monitoring (Prometheus/Grafana)
- No API gateway (Kong/NGINX)
- No multi-region setup

**Status:** Phase 2-3 features (Weeks 13-36)

### ❌ Multi-Model Integration (Unverified)
- OpenAI integration not verified
- Anthropic integration not verified
- Ollama integration not verified
- Provider abstraction layer incomplete

**Status:** Week 5-6 priority

### ❌ Full Database Persistence
- Basic PostgreSQL schema only
- No S3 receipt storage
- No TimescaleDB integration
- No multi-master replication

**Status:** Week 7-8 priority

### ❌ Observability Stack
- No Prometheus deployment
- No Grafana dashboards
- No Jaeger tracing
- No ELK stack

**Status:** Week 9-10 priority

### ❌ GraphQL Endpoint
- Only REST API available
- No Apollo Server

**Status:** Week 11-12 priority

### ❌ Advanced Features
- No blockchain integration (Phase 3)
- No post-quantum cryptography (Phase 3)
- No formal verification (Phase 3)
- No compliance certifications (Phase 4)

**Status:** Weeks 25-48

---

## Troubleshooting

### Build Errors

**Error:** `error: linker 'cc' not found`
```bash
# Install build essentials
# Ubuntu/Debian
sudo apt-get install build-essential

# MacOS (install Xcode command line tools)
xcode-select --install

# Windows (install Visual Studio C++ Build Tools)
# Download from: https://visualstudio.microsoft.com/downloads/
```

**Error:** `error: failed to compile ...`
```bash
# Clean and rebuild
cargo clean
cargo build --release
```

**Error:** `error: could not find 'Cargo.toml'`
```bash
# Make sure you're in the project directory
cd bizra-genesis-node
pwd  # Should end with /bizra-genesis-node
```

### Test Failures

```bash
# Run tests with detailed output
cargo test -- --nocapture --test-threads=1

# Run specific test
cargo test test_thompson_sampling

# Run tests for specific module
cargo test routing::tests
```

**If tests fail:**
1. Check that PostgreSQL is running (if required by tests)
2. Check that Redis is running (if required by tests)
3. Check environment variables
4. Look at test output for specific error messages

### Database Connection Issues

**PostgreSQL not running:**
```bash
# Ubuntu/Debian
sudo systemctl status postgresql
sudo systemctl start postgresql

# MacOS (if using Homebrew)
brew services start postgresql@15

# Windows
# Check Services app for PostgreSQL service
```

**Redis not running:**
```bash
# Ubuntu/Debian
sudo systemctl status redis
sudo systemctl start redis

# MacOS (if using Homebrew)
brew services start redis

# Windows
# Check Services app for Redis service
```

### Performance Issues

```bash
# Always use release mode for performance testing
cargo build --release
cargo run --release

# Enable CPU-specific optimizations
RUSTFLAGS="-C target-cpu=native" cargo build --release

# For SIMD JSON parsing (if your CPU supports it)
cargo build --release --features simd,avx2
```

### Dependency Issues

```bash
# Update dependencies
cargo update

# Check for outdated dependencies
cargo outdated  # Install with: cargo install cargo-outdated

# Check dependency tree
cargo tree
```

---

## Next Steps

### Week 1-2 (Current)

1. ✅ Read [IMPLEMENTED.md](IMPLEMENTED.md) to understand what works
2. ✅ Read [VALIDATION_REPORT.md](VALIDATION_REPORT.md) for detailed analysis
3. ✅ Read [ROADMAP_52_WEEKS.md](ROADMAP_52_WEEKS.md) for the plan
4. 🔲 Run all benchmarks and document actual performance
5. 🔲 Verify multi-model integration
6. 🔲 Contribute to Week 3-4 tasks

### Week 3-4 (Coming Soon)

- Core component verification
- Performance baseline establishment
- Comprehensive testing

### Learning Resources

**Key Files to Read:**
1. [src/routing.rs](src/routing.rs) - Thompson Sampling implementation
2. [src/scoring.rs](src/scoring.rs) - Ihsan Quality Gate
3. [src/trust.rs](src/trust.rs) - Trust Bridge cryptography
4. [src/aegis/consensus/mod.rs](src/aegis/consensus/mod.rs) - Weighted Selective Consensus

**Example Code:**
```bash
# View available examples
ls -la examples/

# Run examples to learn how components work
cargo run --example <example-name>
```

**Tests as Documentation:**
```bash
# Tests often show how to use components
grep -r "mod tests" src/

# Read test files
cat src/routing.rs  # Scroll to tests section
```

### Contributing

**Before contributing:**
1. Read [CONTRIBUTING.md](CONTRIBUTING.md) (if exists)
2. Run `cargo fmt` to format code
3. Run `cargo clippy` to check for issues
4. Run `cargo test` to ensure tests pass
5. Add tests for new features

**Development Workflow:**
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... edit files ...

# Format code
cargo fmt

# Check for issues
cargo clippy

# Run tests
cargo test

# Commit changes
git add .
git commit -m "feat: description of your changes"

# Push to remote
git push origin feature/your-feature-name
```

---

## Understanding the System

### Core Concepts

**Thompson Sampling Router:**
- Multi-armed bandit algorithm for optimal model selection
- Learns from successes/failures
- Balances exploration vs exploitation

**Weighted Selective Consensus (WSC):**
- Combines outputs from multiple models
- Uses weighted scoring for optimal results
- Pareto-optimal consensus

**Ihsan Quality Gate:**
- 4-dimensional quality scoring:
  - Formal validity (30%)
  - Correctness/Accuracy (35%)
  - Safety (20%)
  - Efficiency (15%)
- Harmonic mean calculation
- Threshold-based quality control

**Trust Bridge:**
- Ed25519 cryptographic signatures
- BLAKE3 hashing for integrity
- RunReceipt for proof-of-impact
- Immutable audit trail

### Performance Targets (From Specification)

| Component | Target | Current | Verified |
|-----------|--------|---------|----------|
| Thompson Sampling | 2.3μs | TBD | ❌ |
| WSC Consensus | 46μs | TBD | ❌ |
| API Latency (P99) | <10ms | TBD | ❌ |
| Throughput | 1000 RPS | TBD | ❌ |
| JSON Parsing (SIMD) | 4-16x faster | TBD | ❌ |

**Action Required:** Run benchmarks and document actual measurements (Week 3-4)

---

## Environment Configuration

### Optional Environment Variables

```bash
# Logging configuration
export RUST_LOG=info                          # Default log level
export RUST_LOG=debug                         # Detailed logging
export RUST_LOG=synthesis_orchestrator=debug  # Component-specific

# Database configuration (if using PostgreSQL)
export DATABASE_URL=postgresql://user:pass@localhost/bizra_genesis

# Redis configuration (if using Redis)
export REDIS_URL=redis://localhost:6379

# API server configuration (if running API server)
export API_PORT=3000
export API_HOST=0.0.0.0

# Ollama configuration (if using Ollama)
export OLLAMA_URL=http://localhost:11434
```

### Create .env File (Optional)

```bash
# Create .env file for local development
cat > .env <<EOF
RUST_LOG=info
DATABASE_URL=postgresql://postgres:postgres@localhost/bizra_genesis
REDIS_URL=redis://localhost:6379
API_PORT=3000
OLLAMA_URL=http://localhost:11434
EOF

# Add to .gitignore
echo ".env" >> .gitignore
```

---

## Quick Reference

### Most Common Commands

```bash
# Build project
cargo build --release

# Run tests
cargo test

# Run benchmarks
cargo bench

# Check code quality
cargo clippy

# Format code
cargo fmt

# Generate documentation
cargo doc --open

# Run API server (if available)
cargo run --bin api_server

# Run example
cargo run --example <example-name>
```

### File Structure (Key Directories)

```
bizra-genesis-node/
├── src/               # Rust source code
│   ├── agents/        # Agent implementations (PAT, SAT, TAT)
│   ├── api/           # API layer (REST, auth, metrics)
│   ├── aegis/         # AEGIS components (consensus, etc.)
│   ├── routing.rs     # Thompson Sampling Router
│   ├── scoring.rs     # Ihsan Quality Gate
│   ├── trust.rs       # Trust Bridge
│   └── ...
├── bizra-moe/         # Mixture-of-Experts crate
├── examples/          # Example code
├── benches/           # Benchmarks
├── tests/             # Integration tests
├── migrations/        # Database migrations
└── *.md               # Documentation
```

---

## Success Indicators

### You're Ready to Develop When:

- ✅ `cargo build --release` succeeds without errors
- ✅ `cargo test` shows all tests passing
- ✅ `cargo clippy` shows no warnings
- ✅ `cargo fmt --check` shows code is formatted
- ✅ You can read and understand [IMPLEMENTED.md](IMPLEMENTED.md)
- ✅ You can run at least one example successfully

### Current Limitations (Pre-Alpha)

- ⚠️ Not production-ready (Week 1 of 52-week plan)
- ⚠️ Multi-model integration not verified
- ⚠️ No production infrastructure
- ⚠️ Limited documentation
- ⚠️ Performance not measured against targets

**See [IMPLEMENTED.md](IMPLEMENTED.md) for complete list of what works and what doesn't.**

---

## Getting Help

### Documentation

- [IMPLEMENTED.md](IMPLEMENTED.md) - What actually works
- [VALIDATION_REPORT.md](VALIDATION_REPORT.md) - Validation analysis
- [ROADMAP_52_WEEKS.md](ROADMAP_52_WEEKS.md) - Implementation plan
- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture documentation (to be created)

### Community

- **Issues:** Check the GitHub issues tracker
- **Discussions:** Join GitHub discussions (if available)
- **Contributing:** See CONTRIBUTING.md (if exists)

### Debugging

```bash
# Enable detailed logging
RUST_LOG=debug cargo run

# Run with backtrace on panic
RUST_BACKTRACE=1 cargo run

# Run specific test with output
cargo test <test-name> -- --nocapture

# Check for memory leaks (requires valgrind)
cargo build
valgrind ./target/debug/<binary-name>
```

---

## Realistic Expectations

### What This Is

- ✅ Pre-Alpha foundation (Week 1 of 52)
- ✅ Core components implemented (~70%)
- ✅ 18-agent ecosystem structured
- ✅ Performance optimizations (SIMD)
- ✅ Comprehensive CI/CD

### What This Is NOT (Yet)

- ❌ Production-ready system
- ❌ Fully integrated multi-model orchestrator
- ❌ Enterprise-grade infrastructure
- ❌ Compliance-certified platform
- ❌ 99.999% available service

**With proper resourcing (8-12 FTEs, $2.4M), the full specification is achievable in 52 weeks. With current resources, adjust timeline proportionally.**

See [ROADMAP_52_WEEKS.md](ROADMAP_52_WEEKS.md) for detailed implementation plan.

---

**Estimated Time to First Success:** 10-15 minutes

**Ready to start?**
1. `cargo build --release`
2. `cargo test`
3. Read [IMPLEMENTED.md](IMPLEMENTED.md)
4. Join the journey! 🚀

**Status:** Pre-Alpha (Week 1 of 52) | **Updated:** 2025-11-16
