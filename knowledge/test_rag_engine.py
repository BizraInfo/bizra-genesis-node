#!/usr/bin/env python3
"""
Unit Tests for BIZRA RAG Engine
================================
Tests the knowledge retrieval system for correctness and performance.
"""

import unittest
import json
import tempfile
import os
from pathlib import Path

# Import the RAG engine (adjust path as needed)
import sys
sys.path.insert(0, str(Path(__file__).parent))
from rag_engine import BizraRAGEngine


class TestBizraRAGEngine(unittest.TestCase):
    """Test suite for the RAG Engine."""
    
    @classmethod
    def setUpClass(cls):
        """Create a test knowledge base."""
        cls.test_dir = tempfile.mkdtemp()
        cls.test_kb_path = Path(cls.test_dir) / "test_kb.json"
        
        # Create test knowledge base
        test_data = {
            "version": "1.0",
            "total_chunks": 5,
            "total_files": 2,
            "total_characters": 500,
            "chunks": [
                {
                    "id": "chunk1",
                    "source": "/test/architecture.md",
                    "section": "Overview",
                    "content": "The BIZRA architecture is built on sovereign AI principles.",
                    "char_count": 50
                },
                {
                    "id": "chunk2",
                    "source": "/test/architecture.md",
                    "section": "Security",
                    "content": "Security is paramount. All data is encrypted at rest and in transit.",
                    "char_count": 60
                },
                {
                    "id": "chunk3",
                    "source": "/test/roadmap.md",
                    "section": "Monetization",
                    "content": "The monetization strategy focuses on three tracks: refinery, DePIN, and productization.",
                    "char_count": 80
                },
                {
                    "id": "chunk4",
                    "source": "/test/roadmap.md",
                    "section": "Vision",
                    "content": "Bizra Vision model will process images and documents locally.",
                    "char_count": 55
                },
                {
                    "id": "chunk5",
                    "source": "/test/agents.md",
                    "section": "PAT Architecture",
                    "content": "The Personal Agent Team consists of seven specialized agents.",
                    "char_count": 55
                }
            ]
        }
        
        with open(cls.test_kb_path, 'w', encoding='utf-8') as f:
            json.dump(test_data, f)
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test files."""
        os.remove(cls.test_kb_path)
        os.rmdir(cls.test_dir)
    
    def setUp(self):
        """Initialize engine for each test."""
        self.engine = BizraRAGEngine()
        # Override knowledge base path
        import rag_engine
        rag_engine.KNOWLEDGE_BASE = self.test_kb_path
    
    def test_load_knowledge_base(self):
        """Test that knowledge base loads correctly."""
        result = self.engine.load_knowledge_base()
        self.assertTrue(result)
        self.assertEqual(len(self.engine.chunks), 5)
        self.assertTrue(self.engine.loaded)
    
    def test_tokenization(self):
        """Test tokenization removes stopwords and short tokens."""
        tokens = self.engine._tokenize("The BIZRA architecture is built on sovereign AI principles.")
        self.assertNotIn("the", tokens)
        self.assertNotIn("is", tokens)
        self.assertNotIn("on", tokens)
        self.assertIn("bizra", tokens)
        self.assertIn("architecture", tokens)
        self.assertIn("sovereign", tokens)
    
    def test_search_returns_relevant_results(self):
        """Test search returns semantically relevant chunks."""
        self.engine.load_knowledge_base()
        results = self.engine.search("monetization strategy", top_k=3)
        
        self.assertGreater(len(results), 0)
        # The monetization chunk should be in results
        sections = [r.get('section', '') for r in results]
        self.assertIn('Monetization', sections)
    
    def test_search_with_no_matches(self):
        """Test search returns empty list for unrelated queries."""
        self.engine.load_knowledge_base()
        results = self.engine.search("quantum entanglement blockchain", top_k=3)
        
        # Should return empty or very low scoring results
        self.assertEqual(len(results), 0)
    
    def test_search_respects_top_k(self):
        """Test that top_k parameter is respected."""
        self.engine.load_knowledge_base()
        results = self.engine.search("bizra architecture security", top_k=2)
        
        self.assertLessEqual(len(results), 2)
    
    def test_context_generation(self):
        """Test context string generation for prompts."""
        self.engine.load_knowledge_base()
        context = self.engine.get_context_for_prompt("security encryption", max_tokens=500)
        
        self.assertIsInstance(context, str)
        self.assertIn("Security", context)
    
    def test_index_building(self):
        """Test that index is built correctly."""
        self.engine.load_knowledge_base()
        
        # Check index contains expected terms
        self.assertIn("bizra", self.engine.term_index)
        self.assertIn("architecture", self.engine.term_index)
        self.assertIn("security", self.engine.term_index)
        
        # Check IDF scores exist
        self.assertGreater(len(self.engine.idf_scores), 0)
    
    def test_empty_query_handling(self):
        """Test that empty queries are handled gracefully."""
        self.engine.load_knowledge_base()
        results = self.engine.search("")
        self.assertEqual(results, [])
        
        results = self.engine.search("   ")
        self.assertEqual(results, [])
    
    def test_relevance_scoring(self):
        """Test that relevance scores are calculated correctly."""
        self.engine.load_knowledge_base()
        results = self.engine.search("architecture sovereign", top_k=5)
        
        # Results should be sorted by score (descending)
        if len(results) > 1:
            scores = [r.get('relevance_score', 0) for r in results]
            self.assertEqual(scores, sorted(scores, reverse=True))


class TestInputValidation(unittest.TestCase):
    """Test input validation and security."""
    
    def setUp(self):
        self.engine = BizraRAGEngine()
    
    def test_very_long_query(self):
        """Test handling of extremely long queries."""
        # Should not crash with a very long query
        long_query = "bizra " * 10000
        tokens = self.engine._tokenize(long_query)
        self.assertIsInstance(tokens, list)
    
    def test_special_characters_in_query(self):
        """Test handling of special characters."""
        special_query = "What's the architecture? (v2.0) [test] {json}"
        tokens = self.engine._tokenize(special_query)
        # Should extract valid tokens without crashing
        self.assertIsInstance(tokens, list)


if __name__ == "__main__":
    # Run with verbose output
    unittest.main(verbosity=2)
