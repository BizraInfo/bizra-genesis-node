# BIZRA Genesis Node - Quick Start Guide

**Get up and running with the BIZRA Genesis Node in 5 minutes**

## 🚀 Prerequisites

- **Rust** 1.70+ ([install](https://rustup.rs/))
- **Git** (for version control)
- **(Optional)** [Ollama](https://ollama.ai/) for real AI model integration

## ⚡ Quick Installation

### 1. Clone or Download

```bash
# If using git
git clone <your-repo-url>
cd bizra-genesis-node

# Or download and extract the ZIP
cd bizra-genesis-node
```

### 2. Build the Project

```bash
# Debug build (faster compilation)
cargo build

# Or release build (optimized performance)
cargo build --release
```

**Build time:** ~30 seconds (first time), ~5 seconds (incremental)

### 3. Run Tests (Optional but Recommended)

```bash
cargo test
```

**Expected:** 24/24 tests passing ✅

## 🎯 Your First Synthesis

### Option 1: Interactive CLI Mode (Recommended for Beginners)

```bash
cargo run --release

# Then in the interactive prompt:
> help              # See available commands
> pat               # Run Personal Agentic Team
> sat               # Run System Agentic Team
> full              # Run full 12-agent ecosystem
> health            # Check system health
> exit              # Quit
```

### Option 2: Direct Command Mode

```bash
# Run PAT workflow
cargo run --release -- pat

# Run SAT workflow
cargo run --release -- sat

# Run full ecosystem
cargo run --release -- full

# Check system health
cargo run --release -- health
```

### Option 3: Legacy Mode (Advanced)

```bash
cargo run --release -- legacy
```

## 📚 Run Examples

### Basic MOE Example (Simulated Backend)

```bash
cargo run --example moe_basic
```

**Output:**
- Task execution details
- Model selection via Thompson Sampling
- Weighted consensus scores
- Ihsān quality metrics
- Cost and latency statistics

### Full Ecosystem Demo

```bash
cargo run --example full_ecosystem_demo
```

**Output:**
- All 12 agents coordinating
- Real-time progress updates
- Agent-to-agent communication
- Comprehensive telemetry

### CLI Demo

```bash
cargo run --example cli_demo
```

**Output:**
- Interactive CLI demonstration
- Command examples
- Display formatting showcase

## 🔧 Configuration

### Environment Variables

```bash
# Set Ollama URL (optional, defaults to localhost:11434)
export OLLAMA_URL=http://localhost:11434

# Set log level (optional, defaults to info)
export RUST_LOG=synthesis_orchestrator=debug,bizra_moe=debug
```

### Using Real AI Models

1. **Install Ollama:**
   ```bash
   # See OLLAMA_SETUP.md for detailed instructions
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull Models:**
   ```bash
   ollama pull llama3.2
   ollama pull mistral-nemo
   ollama pull phi-3.5
   ```

3. **Run with Real Backend:**
   ```bash
   cargo run --example moe_real
   ```

## 📊 Understanding the Output

### Ihsān Score (إحسان)
The **Ihsān score** represents overall excellence and quality:
- **95-100%**: Excellent - Production ready
- **85-94%**: Good - Minor improvements needed
- **75-84%**: Acceptable - Some refinements required
- **< 75%**: Needs improvement

### Quality Metrics

```
📊 Quality Scores:
   Accuracy:   92.5%     # Correctness of output
   Safety:     98.2%     # Security and compliance
   Efficiency: 89.1%     # Performance optimization
   Ihsān:      95.3% ✅  # Overall excellence
```

### Cost & Performance

```
💰 Economics:
   Cost: $0.000123      # Per synthesis
   Latency: 245ms       # End-to-end time
   Cost/s: $0.000502    # Efficiency metric
```

## 🎓 Common Use Cases

### 1. Software Development Orchestration

```rust
// Create a coding task
let task = Task {
    examples: Some(vec![
        json!({
            "objective": "Build REST API with authentication",
            "constraints": ["Rust", "Axum", "JWT"],
            "requirements": ["OpenAPI docs", "Unit tests"]
        })
    ])
};

// Let PAT agents handle it
orchestrator.synthesize(&task, &contract, vec!["pat-workflow".to_string()]).await?;
```

### 2. System Administration & DevOps

```rust
// Infrastructure task
let task = Task {
    examples: Some(vec![
        json!({
            "objective": "Deploy microservices to Kubernetes",
            "constraints": ["High availability", "Auto-scaling"],
            "monitoring": ["Prometheus", "Grafana"]
        })
    ])
};

// Let SAT agents coordinate
orchestrator.synthesize(&task, &contract, vec!["sat-workflow".to_string()]).await?;
```

### 3. Full Multi-Agent Coordination

```rust
// Complex project requiring both teams
orchestrator.synthesize(&task, &contract, vec!["full-ecosystem".to_string()]).await?;
```

## 🐛 Troubleshooting

### Build Errors

```bash
# Clean and rebuild
cargo clean
cargo build --release
```

### Test Failures

```bash
# Run tests with detailed output
cargo test -- --nocapture --test-threads=1

# Run specific test
cargo test test_ihsan_gate_threshold
```

### Ollama Connection Issues

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check available models
ollama list

# Restart Ollama service
# MacOS/Linux: ollama serve
# Windows: See Task Manager for Ollama.exe
```

### Performance Issues

```bash
# Use release mode (10x faster)
cargo run --release

# Enable SIMD optimizations (if supported)
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

## 📖 Next Steps

1. **Read the Architecture:** [BIZRA-Genesis-Blueprint.md](BIZRA-Genesis-Blueprint.md)
2. **Setup Ollama:** [OLLAMA_SETUP.md](OLLAMA_SETUP.md)
3. **Deploy to Production:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
4. **Development Setup:** [DEV_ENVIRONMENT_SETUP.md](DEV_ENVIRONMENT_SETUP.md)
5. **View Phase Reports:** [Phase 2 Week 3 Day 6](PHASE_2_WEEK_3_DAY_6_REPORT.md)

## 🔥 Advanced Features

### Thompson Sampling Routing

Automatically learns optimal model selection:
```
🎯 Thompson Sampling: Adapting to model performance
   Route A: 73% selection rate (highest reward)
   Route B: 27% selection rate
```

### Weighted-Score Consensus

Multi-model ensemble for enhanced quality:
```
🤝 Consensus: Combining 3 model outputs
   Weights: [0.45, 0.35, 0.20]
   Agreement: 94.2%
```

### Cryptographic Trust

Ed25519 signatures for agent verification:
```
🔐 Trust Receipt Generated
   Agent: planner-001
   Signature: Valid ✅
   Hash: blake3:a7f3c8...
```

## 💡 Pro Tips

1. **Start with Simulated Backend** - Test your workflows without Ollama
2. **Use Interactive Mode** - Great for exploration and learning
3. **Check Health First** - Run `cargo run -- health` to verify setup
4. **Enable Detailed Logs** - Set `RUST_LOG=debug` for troubleshooting
5. **Use Release Mode** - Always use `--release` for production workloads

## 🆘 Getting Help

- **Documentation:** See `*.md` files in project root
- **Examples:** Check `examples/` directory for code samples
- **Tests:** Review `src/**/*test*.rs` for usage patterns
- **Issues:** Check project repository issues tracker

## ⚡ Performance Expectations

**Development Machine (Debug):**
- Build time: ~5s (incremental)
- Test time: ~2s
- Synthesis: ~500ms per task

**Production Server (Release + SIMD):**
- Build time: ~30s (full), ~0.5s (incremental)
- Test time: ~1s
- Synthesis: <100ms per task

## 🎉 Success Indicators

You're ready for production when:

- ✅ All 24 tests passing
- ✅ Zero compilation warnings
- ✅ `cargo clippy` shows no issues
- ✅ Ihsān score ≥ 95%
- ✅ Health check returns all green
- ✅ Examples run successfully

---

**Estimated Time to First Success:** 5-10 minutes

Ready to orchestrate? Run: `cargo run --release` 🚀
