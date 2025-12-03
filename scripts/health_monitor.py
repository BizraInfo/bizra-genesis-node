#!/usr/bin/env python3
"""
BIZRA CONTINUOUS HEALTH MONITOR
================================
Real-time system health monitoring and alerting.
Elite DevOps: Proactive monitoring for sovereign AI infrastructure.
"""

import asyncio
import aiohttp
import json
import time
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "🟢 HEALTHY"
    DEGRADED = "🟡 DEGRADED"
    CRITICAL = "🔴 CRITICAL"
    UNKNOWN = "⚪ UNKNOWN"

@dataclass
class HealthCheck:
    name: str
    endpoint: str
    expected_status: int = 200
    timeout: float = 5.0
    critical: bool = True

@dataclass
class HealthResult:
    check: HealthCheck
    status: HealthStatus
    latency_ms: float
    message: str
    timestamp: datetime = field(default_factory=datetime.now)

class BizraHealthMonitor:
    """Continuous health monitoring for BIZRA Genesis Node."""
    
    def __init__(self, node_url: str = "http://localhost:3001", dashboard_url: str = "http://localhost:3000"):
        self.node_url = node_url
        self.dashboard_url = dashboard_url
        self.results: List[HealthResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Define health checks
        self.checks = [
            HealthCheck(
                name="Node Health",
                endpoint=f"{node_url}/health",
                critical=True
            ),
            HealthCheck(
                name="RAG Knowledge Search",
                endpoint=f"{node_url}/api/knowledge/search",
                timeout=10.0,
                critical=True
            ),
            HealthCheck(
                name="Chat Endpoint",
                endpoint=f"{node_url}/api/pat/chat",
                timeout=30.0,  # LLM can be slow
                critical=False
            ),
        ]
        
        # Thresholds (Elite Standards)
        self.thresholds = {
            "latency_warn_ms": 500,
            "latency_critical_ms": 2000,
            "error_rate_warn": 0.05,
            "error_rate_critical": 0.10,
        }
        
        # Metrics tracking
        self.metrics = {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "latency_sum": 0,
            "start_time": time.time(),
        }
    
    async def _create_session(self):
        """Create aiohttp session with proper configuration."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
    
    async def _close_session(self):
        """Close aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def check_endpoint(self, check: HealthCheck) -> HealthResult:
        """Execute a single health check."""
        await self._create_session()
        
        start_time = time.time()
        
        try:
            # Determine method and payload
            if "search" in check.endpoint:
                async with self.session.post(
                    check.endpoint,
                    json={"query": "health check", "top_k": 1},
                    timeout=aiohttp.ClientTimeout(total=check.timeout)
                ) as response:
                    latency = (time.time() - start_time) * 1000
                    
                    if response.status == check.expected_status:
                        return HealthResult(
                            check=check,
                            status=self._determine_status(latency),
                            latency_ms=latency,
                            message=f"OK ({response.status})"
                        )
                    else:
                        return HealthResult(
                            check=check,
                            status=HealthStatus.DEGRADED,
                            latency_ms=latency,
                            message=f"Unexpected status: {response.status}"
                        )
            
            elif "chat" in check.endpoint:
                async with self.session.post(
                    check.endpoint,
                    json={"message": "ping", "useRAG": False},
                    timeout=aiohttp.ClientTimeout(total=check.timeout)
                ) as response:
                    latency = (time.time() - start_time) * 1000
                    
                    # Chat can return 503 if Cortex not ready
                    if response.status in [200, 503]:
                        return HealthResult(
                            check=check,
                            status=self._determine_status(latency) if response.status == 200 else HealthStatus.DEGRADED,
                            latency_ms=latency,
                            message=f"Cortex {'Ready' if response.status == 200 else 'Warming Up'}"
                        )
                    else:
                        return HealthResult(
                            check=check,
                            status=HealthStatus.CRITICAL if check.critical else HealthStatus.DEGRADED,
                            latency_ms=latency,
                            message=f"Error: {response.status}"
                        )
            
            else:
                async with self.session.get(
                    check.endpoint,
                    timeout=aiohttp.ClientTimeout(total=check.timeout)
                ) as response:
                    latency = (time.time() - start_time) * 1000
                    
                    if response.status == check.expected_status:
                        data = await response.json()
                        cortex_status = data.get("cortex", {}).get("status", "unknown")
                        
                        return HealthResult(
                            check=check,
                            status=self._determine_status(latency),
                            latency_ms=latency,
                            message=f"OK | Cortex: {cortex_status}"
                        )
                    else:
                        return HealthResult(
                            check=check,
                            status=HealthStatus.CRITICAL if check.critical else HealthStatus.DEGRADED,
                            latency_ms=latency,
                            message=f"Unexpected status: {response.status}"
                        )
        
        except asyncio.TimeoutError:
            latency = (time.time() - start_time) * 1000
            return HealthResult(
                check=check,
                status=HealthStatus.CRITICAL if check.critical else HealthStatus.DEGRADED,
                latency_ms=latency,
                message=f"Timeout after {check.timeout}s"
            )
        
        except aiohttp.ClientError as e:
            latency = (time.time() - start_time) * 1000
            return HealthResult(
                check=check,
                status=HealthStatus.CRITICAL if check.critical else HealthStatus.DEGRADED,
                latency_ms=latency,
                message=f"Connection error: {str(e)[:50]}"
            )
        
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthResult(
                check=check,
                status=HealthStatus.UNKNOWN,
                latency_ms=latency,
                message=f"Error: {str(e)[:50]}"
            )
    
    def _determine_status(self, latency_ms: float) -> HealthStatus:
        """Determine health status based on latency."""
        if latency_ms > self.thresholds["latency_critical_ms"]:
            return HealthStatus.CRITICAL
        elif latency_ms > self.thresholds["latency_warn_ms"]:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    async def run_all_checks(self) -> List[HealthResult]:
        """Run all health checks concurrently."""
        tasks = [self.check_endpoint(check) for check in self.checks]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append(HealthResult(
                    check=HealthCheck(name="Unknown", endpoint=""),
                    status=HealthStatus.UNKNOWN,
                    latency_ms=0,
                    message=str(result)
                ))
            else:
                processed_results.append(result)
                
                # Update metrics
                self.metrics["total_checks"] += 1
                self.metrics["latency_sum"] += result.latency_ms
                if result.status == HealthStatus.HEALTHY:
                    self.metrics["successful_checks"] += 1
                else:
                    self.metrics["failed_checks"] += 1
        
        self.results = processed_results
        return processed_results
    
    def get_overall_status(self) -> HealthStatus:
        """Calculate overall system health status."""
        if not self.results:
            return HealthStatus.UNKNOWN
        
        critical_failed = any(
            r.status == HealthStatus.CRITICAL and r.check.critical 
            for r in self.results
        )
        
        any_degraded = any(
            r.status in [HealthStatus.DEGRADED, HealthStatus.CRITICAL]
            for r in self.results
        )
        
        if critical_failed:
            return HealthStatus.CRITICAL
        elif any_degraded:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    def print_report(self):
        """Print formatted health report."""
        overall = self.get_overall_status()
        
        print("\n" + "=" * 60)
        print("  BIZRA GENESIS NODE - HEALTH REPORT")
        print(f"  Time: {datetime.now().isoformat()}")
        print(f"  Overall Status: {overall.value}")
        print("=" * 60)
        
        for result in self.results:
            status_icon = result.status.value.split()[0]
            print(f"\n  {status_icon} {result.check.name}")
            print(f"     Endpoint: {result.check.endpoint}")
            print(f"     Latency:  {result.latency_ms:.1f}ms")
            print(f"     Message:  {result.message}")
        
        # Metrics summary
        print("\n" + "-" * 60)
        print("  METRICS SUMMARY")
        print("-" * 60)
        
        uptime = time.time() - self.metrics["start_time"]
        avg_latency = (
            self.metrics["latency_sum"] / self.metrics["total_checks"]
            if self.metrics["total_checks"] > 0 else 0
        )
        success_rate = (
            self.metrics["successful_checks"] / self.metrics["total_checks"] * 100
            if self.metrics["total_checks"] > 0 else 0
        )
        
        print(f"  Total Checks:   {self.metrics['total_checks']}")
        print(f"  Success Rate:   {success_rate:.1f}%")
        print(f"  Avg Latency:    {avg_latency:.1f}ms")
        print(f"  Monitor Uptime: {uptime:.0f}s")
        print("=" * 60 + "\n")
    
    async def continuous_monitor(self, interval: int = 10, iterations: int = -1):
        """Run continuous monitoring loop."""
        print("🚀 Starting BIZRA Continuous Health Monitor")
        print(f"📍 Node URL: {self.node_url}")
        print(f"⏱️ Check Interval: {interval}s")
        print("-" * 60)
        
        count = 0
        try:
            while iterations == -1 or count < iterations:
                await self.run_all_checks()
                self.print_report()
                
                count += 1
                if iterations != -1 and count >= iterations:
                    break
                
                await asyncio.sleep(interval)
        
        except KeyboardInterrupt:
            print("\n\n⏹️ Monitor stopped by user")
        
        finally:
            await self._close_session()
            print("✅ Health monitor shutdown complete")


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="BIZRA Health Monitor")
    parser.add_argument("--node-url", default="http://localhost:3001", help="Node API URL")
    parser.add_argument("--interval", type=int, default=10, help="Check interval in seconds")
    parser.add_argument("--iterations", type=int, default=-1, help="Number of iterations (-1 for infinite)")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    
    args = parser.parse_args()
    
    monitor = BizraHealthMonitor(node_url=args.node_url)
    
    if args.once:
        await monitor.run_all_checks()
        monitor.print_report()
        await monitor._close_session()
        
        # Exit with appropriate code
        overall = monitor.get_overall_status()
        sys.exit(0 if overall == HealthStatus.HEALTHY else 1)
    else:
        await monitor.continuous_monitor(interval=args.interval, iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
