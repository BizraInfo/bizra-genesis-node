#!/usr/bin/env python3
import argparse, asyncio, time, statistics, json
import httpx

PROMPT = "Write a two-sentence overview of self-attention for engineers."

async def one_req(client, url, payload):
    t0 = time.perf_counter()
    r = await client.post(f"{url}/generate", json=payload, timeout=120.0)
    r.raise_for_status()
    data = r.json()
    t1 = time.perf_counter()
    return {
        "latency_s": t1-t0,
        "tokens": int(data.get("completion_tokens", 0)),
        "tps": float(data.get("tokens_per_second", 0.0)),
    }

async def run(url, concurrency, requests, max_tokens):
    payload = {"prompt": PROMPT, "max_tokens": max_tokens}
    results = []
    async with httpx.AsyncClient() as client:
        sem = asyncio.Semaphore(concurrency)
        async def worker(i):
            async with sem:
                return await one_req(client, url, payload)
        tasks = [asyncio.create_task(worker(i)) for i in range(requests)]
        for t in asyncio.as_completed(tasks):
            results.append(await t)
    return results

def summarize(records):
    lat = [r["latency_s"] for r in records]
    tps = [r["tps"] for r in records if r["tps"] > 0]
    total_tokens = sum(r["tokens"] for r in records)
    total_time = sum(lat)
    agg_tps = total_tokens / total_time if total_time>0 else 0.0
    return {
        "count": len(records),
        "p50_ms": int(statistics.median(lat)*1000),
        "p95_ms": int(statistics.quantiles(lat, n=20)[18]*1000) if len(lat)>=20 else int(max(lat)*1000),
        "mean_ms": int(statistics.mean(lat)*1000),
        "agg_tokens": total_tokens,
        "mean_tps": round(statistics.mean(tps), 2) if tps else 0.0,
        "agg_tps": round(agg_tps, 2),
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--requests", type=int, default=64)
    ap.add_argument("--max_tokens", type=int, default=128)
    args = ap.parse_args()

    recs = asyncio.run(run(args.url, args.concurrency, args.requests, args.max_tokens))
    summary = summarize(recs)

    spec = {
        "thresholds": {"p95_ms": 1000, "agg_tps_min": 30},
        "results": summary,
        "pass": (summary["p95_ms"] < 1000) and (summary["agg_tps"] >= 30),
        "ts": int(time.time()),
    }
    print(json.dumps(spec, indent=2))
    exit(0 if spec["pass"] else 1)

if __name__ == "__main__":
    main()
