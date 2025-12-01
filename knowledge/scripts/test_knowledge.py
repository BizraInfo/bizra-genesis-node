"""
BIZRA Hypergraph RAG - Test Suite

Quick tests to verify knowledge system functionality.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))

from build_knowledge_graph import KnowledgeGraphBuilder, extract_concepts, extract_entities
from generate_embeddings import EmbeddingGenerator, EmbeddingConfig, chunk_text
from query_engine import QueryEngine, KnowledgeGraph


def test_concept_extraction():
    """Test concept extraction from text"""
    print("\n[TEST] Concept Extraction")
    print("-" * 40)
    
    test_texts = [
        "The SAPE consciousness architecture enables multi-agent orchestration",
        "We use Ollama for local LLM inference with DeepSeek R1",
        "Hypergraph RAG provides temporal reasoning over knowledge",
    ]
    
    for text in test_texts:
        concepts = extract_concepts(text)
        print(f"Text: {text[:50]}...")
        print(f"Concepts: {concepts}")
        print()
    
    return len(concepts) > 0


def test_entity_extraction():
    """Test entity extraction from code"""
    print("\n[TEST] Entity Extraction")
    print("-" * 40)
    
    test_code = """
    use crate::lib::services::knowledge::HypergraphClient;
    from scripts.query_engine import QueryEngine
    
    class SapeOrchestrator:
        def __init__(self):
            self.config = config/app.json
    """
    
    entities = extract_entities(test_code)
    print(f"Entities found: {entities[:10]}")
    
    return len(entities) > 0


def test_text_chunking():
    """Test text chunking for embeddings"""
    print("\n[TEST] Text Chunking")
    print("-" * 40)
    
    long_text = " ".join(["word"] * 1000)
    chunks = chunk_text(long_text, chunk_size=100, overlap=10)
    
    print(f"Input words: 1000")
    print(f"Chunk size: 100")
    print(f"Chunks created: {len(chunks)}")
    
    return len(chunks) > 5


def test_graph_creation():
    """Test knowledge graph builder on test data"""
    print("\n[TEST] Graph Creation")
    print("-" * 40)
    
    # Create temp test directory
    test_dir = Path(__file__).parent / "test_data"
    test_dir.mkdir(exist_ok=True)
    
    # Create test files
    (test_dir / "test.py").write_text("# Test Python file\nclass TestClass:\n    pass")
    (test_dir / "test.rs").write_text("// Test Rust file\nfn main() {}")
    (test_dir / "test.md").write_text("# Test Markdown\nConsciousness architecture")
    
    # Build graph
    output_dir = Path(__file__).parent / "test_graph"
    builder = KnowledgeGraphBuilder(str(test_dir), str(output_dir))
    builder.build()
    
    # Verify outputs
    nodes_exist = (output_dir / "nodes.jsonl").exists()
    edges_exist = (output_dir / "edges.jsonl").exists()
    
    print(f"Nodes file created: {nodes_exist}")
    print(f"Edges file created: {edges_exist}")
    print(f"Nodes count: {builder.stats['nodes_created']}")
    
    # Cleanup
    import shutil
    shutil.rmtree(test_dir)
    shutil.rmtree(output_dir)
    
    return nodes_exist and builder.stats['nodes_created'] > 0


def test_knowledge_graph_loading():
    """Test loading an existing graph"""
    print("\n[TEST] Graph Loading")
    print("-" * 40)
    
    graph_dir = Path(__file__).parent.parent / "graph"
    
    if not graph_dir.exists():
        print("Graph directory not found - skipping")
        print("Run ACTIVATE-GOLD-MINE.bat first")
        return True  # Skip test
    
    graph = KnowledgeGraph(graph_dir)
    
    print(f"Nodes loaded: {len(graph.nodes)}")
    print(f"Hyperedges loaded: {len(graph.hyperedges)}")
    print(f"Concepts indexed: {len(graph.concept_index)}")
    
    return len(graph.nodes) > 0


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("BIZRA Hypergraph RAG - Test Suite")
    print("=" * 60)
    
    tests = [
        ("Concept Extraction", test_concept_extraction),
        ("Entity Extraction", test_entity_extraction),
        ("Text Chunking", test_text_chunking),
        ("Graph Creation", test_graph_creation),
        ("Graph Loading", test_knowledge_graph_loading),
    ]
    
    results = []
    
    for name, test_fn in tests:
        try:
            result = test_fn()
            results.append((name, result))
        except Exception as e:
            print(f"ERROR: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {name}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    return passed == len(results)


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
