# Development Environment Setup Guide

**Project**: BIZRA Genesis Node v3.0.0-GENESIS
**Last Updated**: 2025-11-06
**Phase**: Phase 0 - Foundation Validation Complete

---

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/bizra-genesis-node.git
cd bizra-genesis-node

# 2. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 3. Build the project
cargo build --release

# 4. Run tests
cargo test --workspace

# 5. Run the synthesis orchestrator
cargo run --release
```

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Toolchain Installation](#toolchain-installation)
3. [Project Setup](#project-setup)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [IDE Setup](#ide-setup)
8. [Contributing](#contributing)

---

## System Requirements

### Minimum Requirements (Development)
- **CPU**: 8 cores (Intel i5/AMD Ryzen 5 or better)
- **RAM**: 16GB
- **Storage**: 50GB free space (SSD recommended)
- **OS**: Windows 10+, Ubuntu 20.04+, or macOS 11+

### Recommended Requirements (Production)
- **CPU**: 32 cores (Intel i9-14900 or AMD Ryzen 9 equivalent)
- **RAM**: 128GB DDR5
- **GPU**: NVIDIA RTX 4090 24GB VRAM (required for Phase 1+)
- **Storage**: 2TB NVMe SSD
- **Network**: Gigabit Ethernet + WiFi 6

### Software Dependencies
- **Rust**: 1.70+ (recommended: 1.90+)
- **Git**: 2.30+
- **Docker**: 24+ (optional, for containerization)
- **Node.js**: 18+ (required for Phase 3+ frontend work)
- **Python**: 3.11+ (required for Phase 1+ AI integration)

---

## Toolchain Installation

### 1. Install Rust

#### Linux / macOS
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # Verify installation
```

#### Windows
Download and run: https://rustup.rs/

Or use PowerShell:
```powershell
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe
```

Verify installation:
```powershell
rustc --version
cargo --version
```

### 2. Install Additional Rust Components

```bash
# Code formatting
rustup component add rustfmt

# Linting
rustup component add clippy

# For cross-compilation (optional)
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-pc-windows-gnu
```

### 3. Install Development Tools

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev git
```

#### macOS
```bash
xcode-select --install
brew install openssl
```

#### Windows
- Install Visual Studio 2022 Build Tools
- Or install Visual Studio Community 2022 with "Desktop development with C++" workload

### 4. Install Cargo Tools (Optional but Recommended)

```bash
# Fast incremental compilation
cargo install cargo-watch

# Code coverage
cargo install cargo-tarpaulin

# Security auditing
cargo install cargo-audit

# Dependency tree visualization
cargo install cargo-tree

# Benchmark comparison
cargo install cargo-benchcmp

# Unused dependency detection
cargo install cargo-udeps

# Auto-fix warnings
cargo install cargo-fix
```

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/bizra-genesis-node.git
cd bizra-genesis-node
```

### 2. Verify Project Structure

```
bizra-genesis-node/
├── src/                    # Rust source files
│   ├── lib.rs             # Main library
│   ├── main.rs            # Binary entry point
│   ├── types.rs           # Type definitions
│   ├── parser.rs          # JSON parsing
│   ├── scoring.rs         # Scoring logic
│   ├── routing.rs         # Thompson Sampling
│   ├── consensus.rs       # Weighted-Score Consensus
│   ├── performance.rs     # Performance optimization
│   └── trust.rs           # Cryptographic trust
├── Cargo.toml             # Rust manifest
├── Cargo.lock             # Dependency lock file
├── .github/
│   └── workflows/
│       └── ci.yml         # CI/CD pipeline
├── PHASE_0_BASELINE_REPORT.md
├── DEV_ENVIRONMENT_SETUP.md (this file)
└── README.md
```

### 3. Initial Build

```bash
# Build in debug mode (faster, with debug symbols)
cargo build

# Build in release mode (optimized, slower compile)
cargo build --release

# Clean build (if needed)
cargo clean && cargo build --release
```

**Expected output:**
```
   Compiling synthesis_orchestrator v0.1.0
    Finished `release` profile [optimized] target(s) in 2.21s
```

### 4. Run Tests

```bash
# Run all tests
cargo test --workspace

# Run tests with output
cargo test --workspace -- --nocapture

# Run specific test
cargo test test_name

# Run tests with coverage (requires cargo-tarpaulin)
cargo tarpaulin --workspace --timeout 300
```

**Expected output:**
```
running 3 tests
test parser::tests::test_parse_simple_json ... ok
test integration_tests::test_end_to_end_synthesis ... ok
test integration_tests::test_thompson_sampling_adaptation ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured
```

---

## Development Workflow

### Daily Development Cycle

```bash
# 1. Update your local repository
git pull origin main

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and watch for errors
cargo watch -x check -x test

# 4. Format code
cargo fmt

# 5. Lint code
cargo clippy -- -D warnings

# 6. Run tests
cargo test --workspace

# 7. Commit changes
git add .
git commit -m "feat: your feature description"

# 8. Push to remote
git push origin feature/your-feature-name

# 9. Create pull request on GitHub
```

### Code Quality Checks

```bash
# Format check (don't modify files)
cargo fmt --all -- --check

# Clippy (strict mode)
cargo clippy --workspace --all-targets --all-features -- -D warnings

# Check documentation
cargo doc --workspace --no-deps

# Security audit
cargo audit

# Check for unused dependencies
cargo udeps --workspace
```

### Auto-fix Warnings

```bash
# Auto-fix compiler suggestions
cargo fix --lib -p synthesis_orchestrator

# Auto-fix clippy suggestions
cargo clippy --fix --workspace
```

---

## Testing

### Test Organization

```
Tests are organized in three categories:
1. Unit tests: In the same file as the code (src/*.rs)
2. Integration tests: In tests/ directory
3. Doc tests: In documentation comments
```

### Running Tests

```bash
# All tests
cargo test --workspace

# Only unit tests
cargo test --lib

# Only integration tests
cargo test --test '*'

# Only doc tests
cargo test --doc

# Specific test file
cargo test --test integration_tests

# Tests matching pattern
cargo test thompson

# Show test output
cargo test -- --show-output

# Run tests in parallel (default)
cargo test

# Run tests serially
cargo test -- --test-threads=1
```

### Writing Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_example() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }

    #[test]
    #[should_panic(expected = "overflow")]
    fn test_panic() {
        panic!("overflow");
    }

    #[tokio::test]
    async fn test_async() {
        let result = async_function().await;
        assert!(result.is_ok());
    }
}
```

### Benchmarking (Phase 4+)

```bash
# Run benchmarks
cargo bench --workspace

# Compare benchmarks
cargo benchcmp baseline current

# Profile with flamegraph (requires cargo-flamegraph)
cargo flamegraph --bench benchmark_name
```

---

## Troubleshooting

### Common Issues

#### 1. Compilation Errors: "path not found"

**Problem**: Source files not in `src/` directory

**Solution**:
```bash
mkdir -p src
mv *.rs src/
cargo build
```

#### 2. Linker Errors on Windows

**Problem**: Missing Visual Studio Build Tools

**Solution**:
- Install Visual Studio 2022 Build Tools
- Or add MSVC toolchain: `rustup toolchain install stable-x86_64-pc-windows-msvc`

#### 3. OpenSSL Errors on Linux

**Problem**: Missing OpenSSL development headers

**Solution**:
```bash
# Ubuntu/Debian
sudo apt install libssl-dev pkg-config

# Fedora
sudo dnf install openssl-devel

# Arch
sudo pacman -S openssl
```

#### 4. Slow Compilation

**Solutions**:
```bash
# Use cargo-watch for incremental compilation
cargo install cargo-watch
cargo watch -x check -x test

# Use sccache for distributed compilation caching
cargo install sccache
export RUSTC_WRAPPER=sccache

# Increase parallel jobs (e.g., for 8 cores)
cargo build -j 8
```

#### 5. Out of Memory During Compilation

**Solutions**:
```bash
# Reduce codegen units (in Cargo.toml)
[profile.release]
codegen-units = 1

# Limit parallel jobs
cargo build -j 2

# Use debug mode (less memory intensive)
cargo build
```

#### 6. Test Failures

**Debug steps**:
```bash
# Run with backtrace
RUST_BACKTRACE=1 cargo test

# Run with full backtrace
RUST_BACKTRACE=full cargo test

# Run specific failing test
cargo test failing_test_name -- --nocapture

# Run with logging
RUST_LOG=debug cargo test
```

---

## IDE Setup

### Visual Studio Code (Recommended)

#### Extensions
1. **rust-analyzer** (rust-lang.rust-analyzer)
2. **CodeLLDB** (vadimcn.vscode-lldb) - For debugging
3. **Even Better TOML** (tamasfe.even-better-toml)
4. **crates** (serayuzgur.crates) - Dependency management
5. **Error Lens** (usernamehw.errorlens) - Inline errors

#### Settings (`.vscode/settings.json`)
```json
{
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.check.command": "clippy",
  "rust-analyzer.checkOnSave": true,
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.tabSize": 4
  },
  "rust-analyzer.inlayHints.enable": true,
  "rust-analyzer.lens.enable": true
}
```

#### Tasks (`.vscode/tasks.json`)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "cargo build",
      "type": "shell",
      "command": "cargo build",
      "group": "build"
    },
    {
      "label": "cargo test",
      "type": "shell",
      "command": "cargo test --workspace",
      "group": "test"
    },
    {
      "label": "cargo clippy",
      "type": "shell",
      "command": "cargo clippy -- -D warnings",
      "group": "build"
    }
  ]
}
```

### CLion / IntelliJ IDEA

1. Install **Rust plugin**
2. Import project as Cargo project
3. Enable Clippy: Settings → Rust → External Linters → Clippy
4. Enable rustfmt: Settings → Rust → Rustfmt → Run rustfmt on Save

### Vim / Neovim

```vim
" Install rust.vim
Plug 'rust-lang/rust.vim'

" Install coc.nvim with rust-analyzer
Plug 'neoclide/coc.nvim', {'branch': 'release'}
:CocInstall coc-rust-analyzer

" Enable format on save
let g:rustfmt_autosave = 1
```

---

## Contributing

### Before Submitting a PR

```bash
# 1. Ensure code compiles
cargo build --release

# 2. Run all tests
cargo test --workspace

# 3. Format code
cargo fmt --all

# 4. Fix lints
cargo clippy --workspace --all-targets --fix

# 5. Check for warnings
cargo clippy --workspace --all-targets -- -D warnings

# 6. Run security audit
cargo audit

# 7. Update documentation
cargo doc --workspace --no-deps

# 8. Create meaningful commits
git commit -m "type: description"
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add or update tests
refactor: Code refactoring
perf: Performance improvement
chore: Build/tooling changes
style: Code style changes
```

### Pull Request Checklist

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Code formatted with `cargo fmt`
- [ ] No clippy warnings
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description explains changes

---

## Phase-Specific Setup

### Phase 1: AI Integration (Week 2+)

**Additional requirements:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download required models (25GB total)
ollama pull llama3.2
ollama pull mistral-nemo
ollama pull gemma2
ollama pull qwen2.5
ollama pull deepseek-coder

# Verify models
ollama list
```

### Phase 2: Blockchain Development (Week 5+)

**No additional requirements yet** - BlockGraph DAG is pure Rust

### Phase 3: UI Development (Week 8+)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install frontend dependencies
cd ui
npm install

# Run development server
npm run dev
```

### Phase 4: Production Deployment (Week 10+)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Build Docker image
docker build -t bizra-genesis-node:latest .

# Run container
docker run -p 8080:8080 bizra-genesis-node:latest
```

---

## Performance Optimization

### Compile-Time Optimization

Add to `Cargo.toml`:
```toml
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"

# For faster compile times (dev)
[profile.dev]
opt-level = 1
```

### Build-Time Optimization

```bash
# Use mold linker (Linux, 2-3x faster linking)
cargo install mold
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"

# Use lld linker (cross-platform)
export RUSTFLAGS="-C link-arg=-fuse-ld=lld"
```

---

## Useful Commands Reference

```bash
# Build
cargo build                    # Debug build
cargo build --release          # Release build
cargo build --all-features     # With all features

# Test
cargo test                     # All tests
cargo test --workspace         # Workspace tests
cargo test -- --ignored        # Run ignored tests

# Run
cargo run                      # Run binary
cargo run --release            # Run optimized
cargo run --bin name           # Run specific binary

# Clean
cargo clean                    # Remove build artifacts
cargo clean -p package         # Clean specific package

# Doc
cargo doc                      # Build docs
cargo doc --open               # Build and open docs

# Maintenance
cargo update                   # Update dependencies
cargo tree                     # Show dependency tree
cargo outdated                 # Check outdated deps

# Quality
cargo fmt                      # Format code
cargo clippy                   # Lint code
cargo audit                    # Security audit
cargo fix                      # Auto-fix issues
```

---

## Getting Help

- **Project Documentation**: `cargo doc --open`
- **Rust Documentation**: https://doc.rust-lang.org/
- **Rust Book**: https://doc.rust-lang.org/book/
- **Rust by Example**: https://doc.rust-lang.org/rust-by-example/
- **Project Issues**: https://github.com/your-org/bizra-genesis-node/issues
- **Team Chat**: [Discord/Slack link]

---

## Next Steps

After setting up your environment:

1. ✅ **Read**: [PHASE_0_BASELINE_REPORT.md](PHASE_0_BASELINE_REPORT.md) for project status
2. ✅ **Review**: [BIZRA-Genesis-Blueprint.md](BIZRA-Genesis-Blueprint.md) for architecture
3. ✅ **Check**: [STATUS.md](New folder (2)/STATUS.md) for current Ihsan score
4. ✅ **Plan**: Review Phase 1 tasks in implementation blueprint
5. ✅ **Contribute**: Pick a task from the GitHub project board

---

**Last Updated**: 2025-11-06
**Maintainer**: BIZRA Core Team
**License**: GPL-3.0
