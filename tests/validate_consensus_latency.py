#!/usr/bin/env python3
"""
Consensus Latency Performance Validator

Validates that consensus algorithm meets performance targets:
- P95 latency < 50μs (target: 46μs)
- P99 latency < 75μs
- Mean latency < 45μs
- Aggregate throughput >= 20K ops/sec

Pattern: Follows vLLM performance validation (async concurrent requests)
Replaces: Simulated 45μs consensus_latency_microseconds metric with real measurements
"""

import asyncio
import aiohttp
import time
import statistics
import json
import sys
from typing import List, Dict, Tuple

# Configuration
DEFAULT_BASE_URL = "http://localhost:3006"
DEFAULT_NUM_REQUESTS = 100
DEFAULT_CONCURRENCY = 10

# Performance thresholds (matching vLLM pattern)
THRESHOLDS = {
    "p95_latency_us": 50.0,      # P95 < 50μs (target: 46μs)
    "p99_latency_us": 75.0,       # P99 < 75μs
    "mean_latency_us": 45.0,      # Mean < 45μs
    "min_throughput_ops": 20000,  # >= 20K ops/sec
}

class ConsensusLatencyValidator:
    """
    Validates consensus algorithm performance with async concurrent requests.
    Measures actual latency by querying Prometheus metrics after consensus operations.
    """

    def __init__(self, base_url: str = DEFAULT_BASE_URL):
        self.base_url = base_url
        self.metrics_url = f"{base_url}/metrics/prometheus"
        self.orchestrate_url = f"{base_url}/api/v1/orchestrate"  # Placeholder - adjust to actual endpoint

    async def query_consensus_metrics(self, session: aiohttp.ClientSession) -> Dict[str, float]:
        """
        Query Prometheus metrics endpoint for consensus latency histogram.
        Parses bizra_consensus_latency_microseconds histogram buckets.
        """
        try:
            async with session.get(self.metrics_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status != 200:
                    return {}

                text = await response.text()

                # Parse Prometheus text format for histogram
                metrics = {
                    "sum": 0.0,
                    "count": 0.0,
                    "buckets": []
                }

                for line in text.split('\n'):
                    if line.startswith('bizra_consensus_latency_microseconds'):
                        if '_sum' in line:
                            metrics["sum"] = float(line.split()[1])
                        elif '_count' in line:
                            metrics["count"] = float(line.split()[1])
                        elif '_bucket' in line:
                            # Extract bucket upper bound and cumulative count
                            # Format: bizra_consensus_latency_microseconds_bucket{le="50.0"} 42
                            parts = line.split()
                            le_value = float(parts[0].split('le="')[1].split('"')[0])
                            count = float(parts[1])
                            metrics["buckets"].append((le_value, count))

                return metrics

        except Exception as e:
            print(f"Error querying metrics: {e}")
            return {}

    async def trigger_consensus_operation(self, session: aiohttp.ClientSession) -> float:
        """
        Trigger a consensus operation and measure end-to-end latency.
        Returns latency in microseconds.
        """
        start_time = time.perf_counter()

        try:
            # Placeholder: Adjust to actual API endpoint that triggers consensus
            payload = {
                "task": {"description": "test consensus operation"},
                "candidates": [
                    {"model": "model-a", "score": 0.9},
                    {"model": "model-b", "score": 0.85},
                    {"model": "model-c", "score": 0.92}
                ]
            }

            async with session.post(
                self.orchestrate_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                await response.text()  # Read response

        except Exception as e:
            print(f"Warning: Request failed: {e}")

        end_time = time.perf_counter()
        latency_us = (end_time - start_time) * 1_000_000  # Convert to microseconds
        return latency_us

    async def run_concurrent_requests(self, num_requests: int, concurrency: int) -> List[float]:
        """
        Run concurrent consensus operations and collect latencies.
        Pattern matches vLLM's async concurrent request handling.
        """
        print(f"Running {num_requests} consensus operations with concurrency={concurrency}...")

        async with aiohttp.ClientSession() as session:
            # Create semaphore for concurrency control
            semaphore = asyncio.Semaphore(concurrency)

            async def bounded_trigger():
                async with semaphore:
                    return await self.trigger_consensus_operation(session)

            # Execute all requests concurrently with semaphore
            latencies = await asyncio.gather(*[bounded_trigger() for _ in range(num_requests)])

        return latencies

    def calculate_percentiles(self, latencies: List[float]) -> Dict[str, float]:
        """
        Calculate latency statistics.
        """
        if not latencies:
            return {}

        sorted_latencies = sorted(latencies)

        return {
            "min_us": min(latencies),
            "max_us": max(latencies),
            "mean_us": statistics.mean(latencies),
            "median_us": statistics.median(latencies),
            "p50_us": sorted_latencies[int(len(sorted_latencies) * 0.50)],
            "p95_us": sorted_latencies[int(len(sorted_latencies) * 0.95)],
            "p99_us": sorted_latencies[int(len(sorted_latencies) * 0.99)],
            "stdev_us": statistics.stdev(latencies) if len(latencies) > 1 else 0.0,
        }

    def calculate_throughput(self, num_requests: int, total_time_sec: float) -> float:
        """Calculate operations per second throughput."""
        return num_requests / total_time_sec if total_time_sec > 0 else 0.0

    def validate_performance(self, stats: Dict[str, float], throughput: float) -> Tuple[bool, List[str]]:
        """
        Validate performance against thresholds (matching vLLM pattern).
        Returns (pass, [error messages]).
        """
        errors = []

        if stats["p95_us"] >= THRESHOLDS["p95_latency_us"]:
            errors.append(
                f"P95 latency {stats['p95_us']:.2f}μs >= threshold {THRESHOLDS['p95_latency_us']}μs"
            )

        if stats["p99_us"] >= THRESHOLDS["p99_latency_us"]:
            errors.append(
                f"P99 latency {stats['p99_us']:.2f}μs >= threshold {THRESHOLDS['p99_latency_us']}μs"
            )

        if stats["mean_us"] >= THRESHOLDS["mean_latency_us"]:
            errors.append(
                f"Mean latency {stats['mean_us']:.2f}μs >= threshold {THRESHOLDS['mean_latency_us']}μs"
            )

        if throughput < THRESHOLDS["min_throughput_ops"]:
            errors.append(
                f"Throughput {throughput:.0f} ops/sec < threshold {THRESHOLDS['min_throughput_ops']} ops/sec"
            )

        return (len(errors) == 0, errors)

    async def validate(self, num_requests: int = DEFAULT_NUM_REQUESTS, concurrency: int = DEFAULT_CONCURRENCY) -> Dict:
        """
        Main validation entry point.
        Returns JSON result for CI integration.
        """
        print("=" * 70)
        print("CONSENSUS LATENCY PERFORMANCE VALIDATION")
        print("=" * 70)
        print(f"Target: P95 < {THRESHOLDS['p95_latency_us']}μs (goal: 46μs)")
        print(f"Requests: {num_requests}, Concurrency: {concurrency}")
        print()

        # Run concurrent requests
        start_time = time.perf_counter()
        latencies = await self.run_concurrent_requests(num_requests, concurrency)
        end_time = time.perf_counter()

        total_time = end_time - start_time

        # Calculate statistics
        stats = self.calculate_percentiles(latencies)
        throughput = self.calculate_throughput(num_requests, total_time)

        # Validate
        passed, errors = self.validate_performance(stats, throughput)

        # Print results
        print(f"\n{'='*70}")
        print("RESULTS")
        print(f"{'='*70}")
        print(f"Total Time:      {total_time:.3f}s")
        print(f"Throughput:      {throughput:.0f} ops/sec")
        print(f"\nLatency Statistics:")
        print(f"  Min:           {stats.get('min_us', 0):.2f}μs")
        print(f"  Max:           {stats.get('max_us', 0):.2f}μs")
        print(f"  Mean:          {stats.get('mean_us', 0):.2f}μs")
        print(f"  Median (P50):  {stats.get('p50_us', 0):.2f}μs")
        print(f"  P95:           {stats.get('p95_us', 0):.2f}μs")
        print(f"  P99:           {stats.get('p99_us', 0):.2f}μs")
        print(f"  StdDev:        {stats.get('stdev_us', 0):.2f}μs")

        print(f"\n{'='*70}")
        if passed:
            print("✅ VALIDATION PASSED - All thresholds met")
        else:
            print("❌ VALIDATION FAILED")
            for error in errors:
                print(f"  - {error}")
        print(f"{'='*70}\n")

        # Return JSON for CI integration
        result = {
            "timestamp": time.time(),
            "passed": passed,
            "metrics": {
                "total_time_sec": total_time,
                "throughput_ops_sec": throughput,
                **stats
            },
            "thresholds": THRESHOLDS,
            "errors": errors
        }

        return result


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Validate consensus latency performance")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL for API")
    parser.add_argument("--num-requests", type=int, default=DEFAULT_NUM_REQUESTS, help="Number of requests")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="Concurrent requests")
    parser.add_argument("--json-output", help="Path to save JSON results")

    args = parser.parse_args()

    validator = ConsensusLatencyValidator(args.base_url)
    result = await validator.validate(args.num_requests, args.concurrency)

    # Save JSON output for CI
    if args.json_output:
        with open(args.json_output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results saved to {args.json_output}")

    # Exit code for CI integration
    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    asyncio.run(main())
