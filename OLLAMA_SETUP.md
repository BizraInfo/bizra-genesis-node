# Ollama Setup Guide for BIZRA Genesis Node

**Project**: BIZRA Genesis Node v3.0.0-GENESIS
**Phase**: Phase 2 - Week 3 - Day 2
**Purpose**: Install and configure Ollama for Multi-Model Ensemble
**Date**: 2025-11-06

---

## Overview

This guide walks you through installing Ollama and downloading the required AI models for the BIZRA Genesis Node Multi-Model Ensemble (MOE). The MOE requires **at least 3 models** to function, with **5 models recommended** for optimal performance.

### Required Models (Minimum 3)
1. **llama3.2** (8GB) - Meta's latest LLaMA model
2. **mistral-nemo** (6GB) - Mistral AI's efficient model
3. **gemma2** (4GB) - Google's Gemma v2

### Recommended Additional Models (5 total)
4. **qwen2.5** (7GB) - Alibaba's Qwen model
5. **deepseek-coder** (6GB) - DeepSeek's code-focused model

**Total Storage Required**: 31GB (all 5 models)

---

## System Requirements

### Minimum Requirements
- **RAM**: 16GB (for 3 models)
- **Storage**: 20GB free space (for 3 models)
- **GPU**: Not required (CPU inference available)
- **OS**: Windows 10+, Ubuntu 20.04+, or macOS 11+

### Recommended Requirements
- **RAM**: 32GB+ (for 5 models with headroom)
- **Storage**: 50GB free space (SSD preferred)
- **GPU**: NVIDIA RTX 4070+ with 12GB+ VRAM (10-50x faster inference)
- **CPU**: 8+ cores for CPU inference

### Performance Expectations

**With GPU (RTX 4090 24GB VRAM)**:
- Response time: 300-800ms per model (P50)
- Concurrent models: All 5 in parallel
- Throughput: ~50 requests/sec

**With CPU Only (16 cores)**:
- Response time: 2-5s per model (P50)
- Concurrent models: 3-5 (depending on RAM)
- Throughput: ~5-10 requests/sec

---

## Installation Instructions

### Windows

#### Method 1: Official Installer (Recommended)

1. **Download Ollama**:
   ```powershell
   # Visit https://ollama.ai/download/windows
   # Or download directly:
   Invoke-WebRequest -Uri https://ollama.ai/download/OllamaSetup.exe -OutFile OllamaSetup.exe
   ```

2. **Run Installer**:
   ```powershell
   .\OllamaSetup.exe
   ```

3. **Verify Installation**:
   ```powershell
   ollama --version
   # Expected: ollama version is 0.1.x or higher
   ```

4. **Start Ollama Service**:
   ```powershell
   # Ollama runs as a Windows service automatically
   # Check if running:
   Get-Service -Name "Ollama"
   ```

#### Method 2: Windows Package Manager

```powershell
winget install Ollama.Ollama
```

### Linux (Ubuntu/Debian)

#### One-Line Install (Recommended)

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Manual Installation

```bash
# Download binary
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama

# Move to system path
sudo mv ollama /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

# Create ollama user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Start service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

#### Verify Installation

```bash
ollama --version
curl http://localhost:11434/api/tags
# Expected: {"models":[]}
```

### macOS

#### Method 1: Official Installer

```bash
# Download and install from https://ollama.ai/download/mac
# Or use curl:
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Method 2: Homebrew

```bash
brew install ollama
ollama serve  # Start server
```

---

## Downloading Models

### Quick Start (3 Models - 18GB)

Download the minimum required models:

```bash
# Model 1: LLaMA 3.2 (8GB) - ~5-10 minutes on fast connection
ollama pull llama3.2

# Model 2: Mistral Nemo (6GB) - ~3-7 minutes
ollama pull mistral-nemo

# Model 3: Gemma 2 (4GB) - ~2-5 minutes
ollama pull gemma2
```

**Total download time**: ~10-20 minutes on 100 Mbps connection

### Full Setup (5 Models - 31GB)

Download all recommended models:

```bash
# Download all 5 models
ollama pull llama3.2
ollama pull mistral-nemo
ollama pull gemma2
ollama pull qwen2.5
ollama pull deepseek-coder
```

**Total download time**: ~20-40 minutes on 100 Mbps connection

### Overnight Download Script

For slower connections, use this script to download all models:

**Windows (PowerShell)**:
```powershell
# Save as download-models.ps1
$models = @("llama3.2", "mistral-nemo", "gemma2", "qwen2.5", "deepseek-coder")

foreach ($model in $models) {
    Write-Host "Downloading $model..."
    ollama pull $model
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $model downloaded successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ $model download failed" -ForegroundColor Red
    }
}

Write-Host "`nAll models downloaded. Verifying..."
ollama list
```

**Linux/macOS (Bash)**:
```bash
#!/bin/bash
# Save as download-models.sh
# chmod +x download-models.sh

models=("llama3.2" "mistral-nemo" "gemma2" "qwen2.5" "deepseek-coder")

for model in "${models[@]}"; do
    echo "Downloading $model..."
    if ollama pull "$model"; then
        echo "✓ $model downloaded successfully"
    else
        echo "✗ $model download failed"
    fi
done

echo -e "\nAll models downloaded. Verifying..."
ollama list
```

---

## Verification

### Check Installed Models

```bash
ollama list
```

**Expected output**:
```
NAME                ID              SIZE      MODIFIED
llama3.2:latest     abc123def456    8.0 GB    2 minutes ago
mistral-nemo:latest def456abc789    6.0 GB    5 minutes ago
gemma2:latest       ghi789jkl012    4.0 GB    8 minutes ago
qwen2.5:latest      mno345pqr678    7.0 GB    12 minutes ago
deepseek-coder:latest stu901vwx234  6.0 GB    15 minutes ago
```

### Test Single Model

```bash
ollama run llama3.2 "What is the capital of France?"
```

**Expected output**:
```
The capital of France is Paris.
```

### Test API Endpoint

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

**Expected output** (JSON):
```json
{
  "model": "llama3.2",
  "response": "2+2 equals 4.",
  "done": true
}
```

---

## Configuration for BIZRA MOE

### Default Configuration (config.toml)

Create `bizra-moe/config.toml`:

```toml
[ollama]
base_url = "http://localhost:11434"
timeout_seconds = 10
health_check_interval_seconds = 30

# Minimum 3 models required
models = [
    "llama3.2",
    "mistral-nemo",
    "gemma2",
    # Optional: Uncomment when downloaded
    # "qwen2.5",
    # "deepseek-coder",
]

[ensemble]
min_healthy_models = 2
ihsan_threshold = 0.85  # 85% quality gate

[performance]
max_concurrent_models = 5
request_timeout_ms = 5000
retry_attempts = 2
```

### Environment Variables

```bash
# .env file
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=10
OLLAMA_MODELS=llama3.2,mistral-nemo,gemma2
MIN_HEALTHY_MODELS=2
IHSAN_THRESHOLD=0.85
```

### Remote Ollama Configuration

If running Ollama on a different machine:

```toml
[ollama]
base_url = "http://192.168.1.100:11434"  # Replace with your server IP
```

Or with authentication (if configured):

```toml
[ollama]
base_url = "http://192.168.1.100:11434"
api_key = "your-api-key-here"  # If auth enabled
```

---

## GPU Configuration (Optional but Recommended)

### NVIDIA GPU Setup (Linux)

1. **Install NVIDIA Driver**:
   ```bash
   sudo apt update
   sudo apt install nvidia-driver-535  # Or latest version
   sudo reboot
   ```

2. **Verify GPU**:
   ```bash
   nvidia-smi
   # Should show your GPU (e.g., RTX 4090)
   ```

3. **Ollama automatically uses GPU** - no additional configuration needed!

### Verify GPU Usage

```bash
# Run a model and check GPU usage in another terminal
ollama run llama3.2 "Write a short story" &
nvidia-smi

# You should see ollama process using GPU memory
```

### CPU-Only Mode (Force)

If you want to force CPU-only mode:

```bash
OLLAMA_FORCE_CPU=1 ollama serve
```

---

## Performance Testing

### Latency Test

```bash
# Test single model response time
time ollama run llama3.2 "What is 2+2?" --verbose
```

### Throughput Test

```bash
# Test multiple concurrent requests
for i in {1..10}; do
    (ollama run llama3.2 "Count to 5" &)
done
wait
```

### MOE Integration Test

```bash
# Run BIZRA MOE integration tests (after setup complete)
cd bizra-genesis-node
cargo test --package bizra-moe --test integration_tests -- --nocapture
```

---

## Troubleshooting

### Issue: Ollama service not starting

**Windows**:
```powershell
# Check service status
Get-Service -Name "Ollama"

# Restart service
Restart-Service -Name "Ollama"
```

**Linux**:
```bash
sudo systemctl status ollama
sudo systemctl restart ollama
sudo journalctl -u ollama -f  # View logs
```

### Issue: Port 11434 already in use

```bash
# Find process using port
netstat -ano | findstr :11434  # Windows
lsof -i :11434                 # Linux/macOS

# Kill process or change Ollama port
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

### Issue: Model download fails

```bash
# Check disk space
df -h  # Linux/macOS
Get-PSDrive  # Windows

# Retry download
ollama pull llama3.2 --insecure-skip-verify  # If SSL issues
```

### Issue: Out of memory during inference

```bash
# Reduce concurrent models
# Edit bizra-moe/config.toml:
max_concurrent_models = 3  # Instead of 5

# Or use smaller models
ollama pull llama3.2:8b-instruct-q4_K_M  # Quantized version (4GB instead of 8GB)
```

### Issue: Slow inference on CPU

**Solution 1**: Reduce model size
```bash
# Use quantized models (smaller, faster)
ollama pull llama3.2:8b-q4_K_M
ollama pull mistral-nemo:12b-q4_K_M
```

**Solution 2**: Reduce concurrent execution
```toml
# In config.toml
max_concurrent_models = 2  # Run 2 models in parallel instead of 5
```

**Solution 3**: Upgrade to GPU (recommended)
- NVIDIA RTX 4070+ provides 10-50x speedup
- See GPU Configuration section above

---

## Next Steps

After completing Ollama setup:

1. ✅ **Verify all models installed**: `ollama list`
2. ✅ **Test API endpoint**: `curl http://localhost:11434/api/tags`
3. ✅ **Run MOE integration tests**: `cargo test -p bizra-moe --test integration_tests`
4. ✅ **Run performance benchmarks**: `cargo bench -p bizra-moe`
5. ✅ **Check Day 2 completion criteria**: See [PHASE_2_WEEK_3_DAY_2_REPORT.md]

---

## Quick Reference

```bash
# Essential Commands
ollama list                    # List installed models
ollama pull <model>            # Download model
ollama run <model> "<prompt>"  # Interactive mode
ollama serve                   # Start server (if not running)
ollama rm <model>              # Remove model

# API Endpoints
GET  http://localhost:11434/api/tags        # List models
POST http://localhost:11434/api/generate    # Generate response
POST http://localhost:11434/api/pull        # Download model

# Logs
# Linux: sudo journalctl -u ollama -f
# Windows: Event Viewer → Application → Ollama
# macOS: ~/Library/Logs/Ollama/
```

---

## Resources

- **Official Website**: https://ollama.ai
- **Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Model Library**: https://ollama.ai/library
- **Discord Community**: https://discord.gg/ollama
- **GitHub Issues**: https://github.com/ollama/ollama/issues

---

**Setup Complete**: Ollama is ready for BIZRA Genesis Node MOE integration!

**Next**: Run `cargo test -p bizra-moe --test integration_tests` to validate integration.

---

**Document Version**: 1.0
**Date**: 2025-11-06
**Phase**: Phase 2 - Week 3 - Day 2
**Status**: ✅ Setup Guide Complete
