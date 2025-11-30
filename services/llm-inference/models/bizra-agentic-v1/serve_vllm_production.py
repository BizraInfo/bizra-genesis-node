import os, time, asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Body
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

# Lazy import vLLM to allow CPU-only environments (for CI sanity)
VLLM_AVAILABLE = True
try:
    from vllm import LLM, SamplingParams
except Exception as e:
    VLLM_AVAILABLE = False
    LLM = None
    SamplingParams = None

app = FastAPI(title="BIZRA vLLM Inference", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REQS = Counter("inference_requests_total", "Total inference requests")
TOKENS = Counter("inference_tokens_generated_total", "Generated tokens total")
LAT = Histogram("inference_latency_seconds", "End-to-end generation latency (seconds)",
                buckets=(0.1,0.2,0.3,0.5,0.75,1,1.5,2,3,5))
TPR = Gauge("inference_tokens_per_second", "Last request tokens/sec")

class GenRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    max_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.95
    stop: Optional[List[str]] = None

class GenResponse(BaseModel):
    text: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    tokens_per_second: float
    model: str

_model = None
_sampling_defaults = dict(temperature=0.7, top_p=0.95)

@app.on_event("startup")
async def _startup():
    global _model
    if not VLLM_AVAILABLE:
        return
    model_name = os.getenv("MODEL_NAME") or os.getenv("MODEL_PATH") or "microsoft/Phi-3-mini-4k-instruct"
    tensor_parallel_size = int(os.getenv("TENSOR_PARALLEL_SIZE", "1"))
    trust_remote_code = os.getenv("TRUST_REMOTE_CODE", "0") == "1"
    _model = LLM(
        model=model_name,
        tensor_parallel_size=tensor_parallel_size,
        trust_remote_code=trust_remote_code,
        max_model_len=int(os.getenv("MAX_MODEL_LEN", "4096")),
        gpu_memory_utilization=float(os.getenv("VLLM_WORKER_GPU_MEMORY_UTILIZATION","0.9")),
    )

@app.get("/healthz")
async def healthz():
    ready = bool(_model) if VLLM_AVAILABLE else True
    return {"status": "ok", "vllm": VLLM_AVAILABLE, "ready": ready}

@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/generate", response_model=GenResponse)
async def generate(req: GenRequest = Body(...)):
    REQS.inc()
    t0 = time.perf_counter()
    if not VLLM_AVAILABLE or _model is None:
        # CPU-only fallback for CI; returns echo text
        text = f"[CPU-FALLBACK] {req.prompt[:64]}"
        latency = (time.perf_counter() - t0)
        out = GenResponse(
            text=text,
            prompt_tokens=len(req.prompt.split()),
            completion_tokens=len(text.split()),
            total_tokens=len(req.prompt.split()) + len(text.split()),
            latency_ms=int(latency*1000),
            tokens_per_second=(len(text.split())/max(latency,1e-6)),
            model=os.getenv("MODEL_NAME","cpu-fallback"),
        )
        TPR.set(out.tokens_per_second)
        LAT.observe(latency)
        TOKENS.inc(out.completion_tokens)
        return out

    sp = SamplingParams(
        max_tokens=req.max_tokens,
        temperature=req.temperature if req.temperature is not None else _sampling_defaults["temperature"],
        top_p=req.top_p if req.top_p is not None else _sampling_defaults["top_p"],
        stop=req.stop,
    )
    outputs = _model.generate([req.prompt], sp)
    out_text = outputs[0].outputs[0].text
    prompt_tok = len(outputs[0].prompt_token_ids)
    completion_tok = len(outputs[0].outputs[0].token_ids)
    latency = (time.perf_counter() - t0)
    tps = completion_tok / max(latency, 1e-6)

    TPR.set(tps)
    LAT.observe(latency)
    TOKENS.inc(completion_tok)

    return GenResponse(
        text=out_text,
        prompt_tokens=prompt_tok,
        completion_tokens=completion_tok,
        total_tokens=prompt_tok + completion_tok,
        latency_ms=int(latency*1000),
        tokens_per_second=tps,
        model=os.getenv("MODEL_NAME","unknown")
    )
