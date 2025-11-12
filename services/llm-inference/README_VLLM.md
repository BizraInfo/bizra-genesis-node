# BIZRA vLLM Peak Pack (Production-Ready)

This pack provides a **high-performance vLLM inference server** with FastAPI, Prometheus metrics, Docker GPU image, and GPU K8s manifests.

## Quickstart
1. **Local (WSL)**: follow `WSL-UBUNTU-VLLM-SETUP.md`.
2. **Run server**:
   ```bash
   export MODEL_NAME="microsoft/Phi-3-mini-4k-instruct"
   make run
   ```
3. **Benchmark**:
   ```bash
   make perf
   ```
4. **Docker (GPU)**:
   ```bash
   make docker-build
   make docker-run
   ```
5. **K8s (GPU node)**:
   ```bash
   make k8s-apply
   ```

## Endpoints
- `GET /healthz` – health
- `GET /metrics` – Prometheus metrics
- `POST /generate` – JSON: `{prompt, max_tokens, temperature, top_p, stop[]}`

## Metrics
- `inference_latency_seconds` (Histogram)
- `inference_tokens_generated_total` (Counter)
- `inference_tokens_per_second` (Gauge)
- `inference_requests_total` (Counter)
