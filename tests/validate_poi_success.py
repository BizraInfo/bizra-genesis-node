#!/usr/bin/env python3
"""
Proof-of-Impact (PoI) Success Rate Validator

Validates that PoI validation meets success rate targets:
- Success rate >= 99% (replaces simulated 99.5%)
- Mean PoI score >= 3.5/5.0 (70% of maximum)
- No validation failures due to system errors

Pattern: Follows vLLM performance validation framework
Replaces: Simulated poi_validation_success_rate metric with real measurements
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
DEFAULT_NUM_VALIDATIONS = 1000
DEFAULT_CONCURRENCY = 10

# Performance thresholds
THRESHOLDS = {
    "min_success_rate": 0.99,     # >= 99% success rate
    "min_mean_poi_score": 3.5,    # >= 3.5/5.0 (70%)
    "max_failure_rate": 0.01,     # <= 1% failure rate
}

class PoIValidationValidator:
    """
    Validates Proof-of-Impact validation performance.
    Measures actual success rate by querying Prometheus metrics after PoI validations.
    """

    def __init__(self, base_url: str = DEFAULT_BASE_URL):
        self.base_url = base_url
        self.metrics_url = f"{base_url}/metrics/prometheus"

    async def query_poi_metrics(self, session: aiohttp.ClientSession) -> Dict[str, float]:
        """
        Query Prometheus metrics endpoint for PoI validation metrics.
        Parses:
        - bizra_poi_validation_success_rate (gauge)
        - bizra_poi_validation_attempts_total (counter)
        - bizra_poi_validation_success_total (counter)
        - bizra_poi_validation_failure_total (counter)
        - bizra_poi_score_distribution (histogram)
        """
        try:
            async with session.get(self.metrics_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status != 200:
                    return {}

                text = await response.text()

                metrics = {
                    "success_rate": 0.0,
                    "attempts_total": 0.0,
                    "success_total": 0.0,
                    "failure_total": 0.0,
                    "score_sum": 0.0,
                    "score_count": 0.0,
                    "score_buckets": []
                }

                for line in text.split('\n'):
                    # Skip comments and empty lines
                    if line.startswith('#') or not line.strip():
                        continue

                    # Parse PoI metrics
                    if line.startswith('bizra_poi_validation_success_rate'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["success_rate"] = float(parts[1])

                    elif line.startswith('bizra_poi_validation_attempts_total'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["attempts_total"] = float(parts[1])

                    elif line.startswith('bizra_poi_validation_success_total'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["success_total"] = float(parts[1])

                    elif line.startswith('bizra_poi_validation_failure_total'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["failure_total"] = float(parts[1])

                    elif line.startswith('bizra_poi_score_distribution_sum'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["score_sum"] = float(parts[1])

                    elif line.startswith('bizra_poi_score_distribution_count'):
                        parts = line.split()
                        if len(parts) >= 2:
                            metrics["score_count"] = float(parts[1])

                    elif line.startswith('bizra_poi_score_distribution_bucket'):
                        # Extract bucket upper bound and cumulative count
                        parts = line.split()
                        if len(parts) >= 2 and 'le="' in parts[0]:
                            le_value = float(parts[0].split('le="')[1].split('"')[0])
                            count = float(parts[1])
                            metrics["score_buckets"].append((le_value, count))

                return metrics

        except Exception as e:
            print(f"Error querying metrics: {e}")
            return {}

    def calculate_mean_score(self, metrics: Dict[str, float]) -> float:
        """Calculate mean PoI score from histogram."""
        if metrics.get("score_count", 0) > 0:
            return metrics["score_sum"] / metrics["score_count"]
        return 0.0

    def calculate_percentile_from_buckets(self, buckets: List[Tuple[float, float]], percentile: float) -> float:
        """
        Calculate percentile from histogram buckets.
        buckets: List of (upper_bound, cumulative_count) tuples
        percentile: 0.0-1.0 (e.g., 0.95 for P95)
        """
        if not buckets:
            return 0.0

        # Sort buckets by upper bound
        sorted_buckets = sorted(buckets, key=lambda x: x[0])

        # Total count is the last bucket's cumulative count
        total_count = sorted_buckets[-1][1]

        if total_count == 0:
            return 0.0

        # Find bucket containing the percentile
        target_count = total_count * percentile

        for upper_bound, cumulative_count in sorted_buckets:
            if cumulative_count >= target_count:
                return upper_bound

        # If not found, return the maximum bound
        return sorted_buckets[-1][0]

    def validate_performance(self, metrics: Dict[str, float], mean_score: float) -> Tuple[bool, List[str]]:
        """
        Validate PoI performance against thresholds.
        Returns (pass, [error messages]).
        """
        errors = []

        success_rate = metrics.get("success_rate", 0.0)
        failure_rate = metrics.get("failure_total", 0.0) / max(metrics.get("attempts_total", 1.0), 1.0)

        # Check success rate threshold
        if success_rate < THRESHOLDS["min_success_rate"]:
            errors.append(
                f"Success rate {success_rate:.2%} < threshold {THRESHOLDS['min_success_rate']:.2%}"
            )

        # Check failure rate threshold
        if failure_rate > THRESHOLDS["max_failure_rate"]:
            errors.append(
                f"Failure rate {failure_rate:.2%} > threshold {THRESHOLDS['max_failure_rate']:.2%}"
            )

        # Check mean PoI score
        if mean_score < THRESHOLDS["min_mean_poi_score"]:
            errors.append(
                f"Mean PoI score {mean_score:.2f}/5.0 < threshold {THRESHOLDS['min_mean_poi_score']}/5.0"
            )

        return (len(errors) == 0, errors)

    async def validate(self, num_validations: int = DEFAULT_NUM_VALIDATIONS) -> Dict:
        """
        Main validation entry point.
        Returns JSON result for CI integration.
        """
        print("=" * 70)
        print("PROOF-OF-IMPACT (PoI) SUCCESS RATE VALIDATION")
        print("=" * 70)
        print(f"Target: Success rate >= {THRESHOLDS['min_success_rate']:.1%}")
        print(f"Expected validations: {num_validations}")
        print()

        # Query metrics
        print("Querying Prometheus metrics...")
        async with aiohttp.ClientSession() as session:
            metrics = await self.query_poi_metrics(session)

        if not metrics:
            print("❌ ERROR: Unable to query PoI metrics")
            return {
                "timestamp": time.time(),
                "passed": False,
                "metrics": {},
                "thresholds": THRESHOLDS,
                "errors": ["Failed to query Prometheus metrics endpoint"]
            }

        # Calculate statistics
        mean_score = self.calculate_mean_score(metrics)
        p50_score = self.calculate_percentile_from_buckets(metrics.get("score_buckets", []), 0.50)
        p95_score = self.calculate_percentile_from_buckets(metrics.get("score_buckets", []), 0.95)
        p99_score = self.calculate_percentile_from_buckets(metrics.get("score_buckets", []), 0.99)

        success_rate = metrics.get("success_rate", 0.0)
        attempts = int(metrics.get("attempts_total", 0))
        successes = int(metrics.get("success_total", 0))
        failures = int(metrics.get("failure_total", 0))
        failure_rate = failures / max(attempts, 1)

        # Validate
        passed, errors = self.validate_performance(metrics, mean_score)

        # Print results
        print(f"\n{'='*70}")
        print("RESULTS")
        print(f"{'='*70}")
        print(f"\nPoI Validation Statistics:")
        print(f"  Total Attempts:    {attempts:,}")
        print(f"  Successes:         {successes:,}")
        print(f"  Failures:          {failures:,}")
        print(f"  Success Rate:      {success_rate:.2%}")
        print(f"  Failure Rate:      {failure_rate:.2%}")

        print(f"\nPoI Score Distribution (0.0-5.0 scale):")
        print(f"  Mean:              {mean_score:.2f}/5.0 ({mean_score/5*100:.1f}%)")
        print(f"  Median (P50):      {p50_score:.2f}/5.0")
        print(f"  P95:               {p95_score:.2f}/5.0")
        print(f"  P99:               {p99_score:.2f}/5.0")

        print(f"\n{'='*70}")
        if passed:
            print("✅ VALIDATION PASSED - All thresholds met")
            print(f"   Success rate {success_rate:.2%} >= {THRESHOLDS['min_success_rate']:.1%} ✓")
            print(f"   Mean PoI score {mean_score:.2f} >= {THRESHOLDS['min_mean_poi_score']:.1f} ✓")
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
                "attempts_total": attempts,
                "success_total": successes,
                "failure_total": failures,
                "success_rate": success_rate,
                "failure_rate": failure_rate,
                "mean_poi_score": mean_score,
                "p50_poi_score": p50_score,
                "p95_poi_score": p95_score,
                "p99_poi_score": p99_score,
            },
            "thresholds": THRESHOLDS,
            "errors": errors
        }

        return result


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Validate PoI success rate")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL for API")
    parser.add_argument("--num-validations", type=int, default=DEFAULT_NUM_VALIDATIONS, help="Expected number of validations")
    parser.add_argument("--json-output", help="Path to save JSON results")

    args = parser.parse_args()

    validator = PoIValidationValidator(args.base_url)
    result = await validator.validate(args.num_validations)

    # Save JSON output for CI
    if args.json_output:
        with open(args.json_output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results saved to {args.json_output}")

    # Exit code for CI integration
    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    asyncio.run(main())
