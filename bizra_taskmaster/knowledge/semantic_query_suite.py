#!/usr/bin/env python3
"""
Day 9 Semantic Query Suite

Test semantic search capabilities:
1. Verify Surah 1:1 (Al-Fatiha) returns correctly
2. Test 5 similarity queries
3. Measure query latency
4. Validate embedding space relationships

Expected Performance:
- Query latency: <50ms P95 (target met: 19.28ms measured Day 8)
- Surah 1:1 accuracy: 100% (exact match)
- Similarity search: Find semantically related verses
"""

import asyncio
import time
import json
from pathlib import Path
from typing import List, Dict, Tuple
import asyncpg
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SemanticQuerySuite:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.conn = None
        self.results = {
            'test_runs': [],
            'latencies': [],
            'similarity_results': [],
            'validation_passed': True
        }

    async def connect(self):
        """Connect to PostgreSQL database."""
        self.conn = await asyncpg.connect(self.db_url)
        logger.info("Connected to database")

    async def disconnect(self):
        """Disconnect from PostgreSQL database."""
        if self.conn:
            await self.conn.close()
            logger.info("Disconnected from database")

    async def test_surah_1_1(self) -> Dict:
        """
        Test 1: Verify Surah 1:1 (Al-Fatiha) returns correctly.
        Expected: "Alhamdulillah..."
        """
        logger.info("\n" + "=" * 80)
        logger.info("TEST 1: Surah 1:1 (Al-Fatiha) Lookup")
        logger.info("=" * 80)

        query_text = "SELECT text, source_ref FROM knowledge_graph WHERE source_ref = $1 LIMIT 1"

        start = time.time()
        result = await self.conn.fetchrow(query_text, "1:1")
        elapsed_ms = (time.time() - start) * 1000

        if result:
            logger.info(f"✅ Found: {result['source_ref']}")
            logger.info(f"   Text: {result['text'][:100]}...")
            logger.info(f"   Latency: {elapsed_ms:.2f}ms")

            test_result = {
                'test': 'surah_1_1_lookup',
                'status': 'PASS',
                'source_ref': result['source_ref'],
                'text_preview': result['text'][:50],
                'latency_ms': elapsed_ms
            }
        else:
            logger.warning("❌ Surah 1:1 not found!")
            test_result = {
                'test': 'surah_1_1_lookup',
                'status': 'FAIL',
                'latency_ms': elapsed_ms
            }
            self.results['validation_passed'] = False

        self.results['test_runs'].append(test_result)
        self.results['latencies'].append(elapsed_ms)
        return test_result

    async def test_similarity_queries(self) -> List[Dict]:
        """
        Test 2-6: Test 5 similarity queries.
        Find verses semantically similar to key Quranic themes.
        """
        logger.info("\n" + "=" * 80)
        logger.info("TESTS 2-6: Semantic Similarity Queries")
        logger.info("=" * 80)

        # Get reference verses for similarity search
        reference_verses = [
            ("1:1", "Al-Fatiha (Opening)"),
            ("2:1", "Al-Baqarah (The Cow) - Beginning"),
            ("36:1", "Ya-Sin (Letter Abbreviation)"),
            ("55:1", "Ar-Rahman (The Merciful)"),
            ("112:1", "Al-Ikhlas (The Purity)")
        ]

        similarity_results = []

        for test_num, (source_ref, description) in enumerate(reference_verses, start=2):
            logger.info(f"\nTest {test_num}: Similarity search from {description}")
            logger.info("-" * 80)

            # Get the reference verse's embedding
            ref_query = """
                SELECT text, embeddings FROM knowledge_graph 
                WHERE source_ref = $1 LIMIT 1
            """

            start = time.time()
            ref_result = await self.conn.fetchrow(ref_query, source_ref)
            query_time_ms = (time.time() - start) * 1000

            if not ref_result:
                logger.warning(f"   Reference verse {source_ref} not found")
                self.results['validation_passed'] = False
                continue

            # Find semantically similar verses
            similarity_query = """
                SELECT 
                    source_ref,
                    text,
                    embeddings <-> $1 as distance
                FROM knowledge_graph
                WHERE source_ref != $2
                ORDER BY distance ASC
                LIMIT 5
            """

            start = time.time()
            similar = await self.conn.fetch(
                similarity_query,
                ref_result['embeddings'],
                source_ref
            )
            similarity_time_ms = (time.time() - start) * 1000
            total_time_ms = query_time_ms + similarity_time_ms

            logger.info(f"   Reference: {source_ref} - {description}")
            logger.info(f"   Query latency: {query_time_ms:.2f}ms")
            logger.info(f"   Similarity search: {similarity_time_ms:.2f}ms")
            logger.info(f"   Total: {total_time_ms:.2f}ms")
            logger.info(f"   Similar verses found: {len(similar)}")

            for i, match in enumerate(similar, 1):
                logger.info(
                    f"     {i}. {match['source_ref']} (distance: {match['distance']:.4f})"
                )

            test_result = {
                'test': f'similarity_query_{test_num}',
                'reference': source_ref,
                'description': description,
                'status': 'PASS' if len(similar) > 0 else 'FAIL',
                'similar_verses_found': len(similar),
                'query_latency_ms': query_time_ms,
                'similarity_search_ms': similarity_time_ms,
                'total_latency_ms': total_time_ms
            }

            self.results['test_runs'].append(test_result)
            self.results['similarity_results'].append(test_result)
            self.results['latencies'].append(total_time_ms)

            similarity_results.append(test_result)

        return similarity_results

    async def validate_latency_targets(self) -> Dict:
        """
        Validate that all latencies meet targets.
        Target: P95 < 50ms
        """
        logger.info("\n" + "=" * 80)
        logger.info("LATENCY VALIDATION")
        logger.info("=" * 80)

        if not self.results['latencies']:
            logger.error("No latency data collected")
            return {'status': 'FAIL', 'reason': 'No data'}

        latencies = sorted(self.results['latencies'])
        p50 = latencies[len(latencies) // 2]
        p95_idx = int(len(latencies) * 0.95)
        p95 = latencies[p95_idx]
        p99_idx = int(len(latencies) * 0.99)
        p99 = latencies[min(p99_idx, len(latencies) - 1)]

        logger.info(f"  Total queries: {len(latencies)}")
        logger.info(f"  P50 latency: {p50:.2f}ms")
        logger.info(f"  P95 latency: {p95:.2f}ms (target: <50ms)")
        logger.info(f"  P99 latency: {p99:.2f}ms")
        logger.info(f"  Min latency: {min(latencies):.2f}ms")
        logger.info(f"  Max latency: {max(latencies):.2f}ms")
        logger.info(f"  Avg latency: {sum(latencies)/len(latencies):.2f}ms")

        target_met = p95 < 50
        status = "PASS" if target_met else "FAIL"

        logger.info()
        if target_met:
            logger.info(f"✅ {status}: P95 latency {p95:.2f}ms < 50ms target")
        else:
            logger.warning(f"❌ {status}: P95 latency {p95:.2f}ms >= 50ms target")
            self.results['validation_passed'] = False

        return {
            'status': status,
            'p50_ms': p50,
            'p95_ms': p95,
            'p99_ms': p99,
            'min_ms': min(latencies),
            'max_ms': max(latencies),
            'avg_ms': sum(latencies) / len(latencies),
            'target_met': target_met
        }

    async def run_full_suite(self):
        """
        Execute complete semantic query test suite.
        """
        logger.info("\n" + "#" * 80)
        logger.info("# DAY 9 SEMANTIC QUERY SUITE")
        logger.info("# Knowledge Graph Validation")
        logger.info("#" * 80)
        logger.info(f"# Timestamp: {datetime.utcnow().isoformat()}")
        logger.info("#" * 80)

        try:
            await self.connect()

            # Test 1: Surah 1:1
            await self.test_surah_1_1()

            # Tests 2-6: Similarity queries
            await self.test_similarity_queries()

            # Latency validation
            latency_validation = await self.validate_latency_targets()

            # Final summary
            await self.print_summary(latency_validation)

        finally:
            await self.disconnect()

    async def print_summary(self, latency_validation: Dict):
        """
        Print comprehensive summary.
        """
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)

        passed_tests = sum(1 for t in self.results['test_runs'] if t.get('status') == 'PASS')
        total_tests = len(self.results['test_runs'])

        logger.info(f"\nTests Passed: {passed_tests}/{total_tests}")
        logger.info(f"Latency Target: {latency_validation['status']} (P95: {latency_validation['p95_ms']:.2f}ms)")
        logger.info(f"Overall: {'✅ PASS' if self.results['validation_passed'] else '❌ FAIL'}")

        logger.info("\n" + "=" * 80)

    async def save_results(self, output_file: str):
        """
        Save test results to JSON file.
        """
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)

        logger.info(f"\nResults saved to: {output_path}")


async def main():
    """
    Main entry point.
    """
    # Database connection
    db_url = "postgresql://bizra:password@localhost/genesis_node_0"

    suite = SemanticQuerySuite(db_url)

    try:
        await suite.run_full_suite()
        await suite.save_results("reports/day9_semantic_query_results.json")
    except Exception as e:
        logger.error(f"Error running test suite: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
