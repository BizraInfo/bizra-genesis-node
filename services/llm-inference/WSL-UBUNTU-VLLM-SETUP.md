# WSL Ubuntu + vLLM Setup Guide
**Purpose**: Enable state‑of‑the‑art LLM inference on a Windows laptop/server via WSL2 + CUDA + vLLM  
**Targets**: Throughput ≥ 30 tok/s (good), ≥ 50 tok/s (optimal) · p95 latency < 1000 ms for short prompts

---
## 0) Prereqs (Windows)
1. Enable WSL2 & install Ubuntu 22.04:
   ```powershell
   wsl --install -d Ubuntu-22.04
   ```
2. Install NVIDIA GPU driver for Windows **with WSL support** (latest Studio/Game Ready).
3. Reboot, then confirm:
   ```powershell
   wsl -l -v
   ```

## 1) Ubuntu bootstrap (inside WSL)
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y build-essential git curl wget python3-pip python3-venv python3-dev
# NVIDIA container toolkit not necessary for WSL local run; required for Docker GPU later.
```

## 2) CUDA & GPU visibility (WSL)
- With recent drivers, CUDA is exposed in WSL automatically. Verify:
```bash
nvidia-smi
```
If `nvidia-smi` is not found, install CUDA toolkit meta:
```bash
sudo apt-get install -y nvidia-cuda-toolkit
```

## 3) Python env and PyTorch (CUDA-enabled)
```bash
python3 -m venv ~/.venvs/vllm
source ~/.venvs/vllm/bin/activate
pip install --upgrade pip wheel setuptools
# Install an official PyTorch build with CUDA for your GPU/driver.
# Example (CUDA 12.x wheels):
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

## 4) Install vLLM and production deps
```bash
pip install "vllm==0.6.1"  # Adjust if your CUDA/toolchain requires a different version
pip install fastapi==0.115.0 uvicorn[standard]==0.30.6 pydantic==2.8.2 prometheus-client==0.20.0 httpx==0.27.2
```

## 5) Fetch the server & run
```bash
git clone <your-repo> bizra-vllm && cd bizra-vllm
# Place files from vllm-peak-pack/ into repo root.
source ~/.venvs/vllm/bin/activate
export MODEL_NAME="microsoft/Phi-3-mini-4k-instruct"   # Example; choose a model you have access to
export VLLM_WORKER_GPU_MEMORY_UTILIZATION=0.90
python models/bizra-agentic-v1/serve_vllm_production.py
# Server on http://127.0.0.1:8000
```

## 6) Quick validation
```bash
curl -s http://127.0.0.1:8000/healthz
curl -s http://127.0.0.1:8000/generate -H 'content-type: application/json'   -d '{"prompt":"Explain self-attention in 2 lines.", "max_tokens":64}'
python tests/validate_vllm_performance.py --url http://127.0.0.1:8000 --concurrency 8 --requests 64
```

## 7) Docker (GPU) and K8s
- Build:
  ```bash
  docker build -f models/bizra-agentic-v1/Dockerfile.vllm -t bizra/vllm:local .
  ```
- Run with GPU:
  ```bash
  docker run --rm --gpus all -e MODEL_NAME="microsoft/Phi-3-mini-4k-instruct" -p 8000:8000 bizra/vllm:local
  ```
- Deploy to K8s using manifests in `k8s/` (requires GPU nodes with `nvidia.com/gpu`).

> **Tip**: For higher throughput: raise `max_num_seqs`, `gpu_memory_utilization`, enable tensor parallel if multiple GPUs.
