#!/usr/bin/env python3
"""
BIZRA RAG ENGINE v1.0
=====================
A lightweight Retrieval-Augmented Generation engine that connects
the Refined Knowledge Base to the local Ollama instance.

This provides semantic search over Bizra's documentation without
requiring external embedding services.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter
import math

KNOWLEDGE_DIR = Path(__file__).parent
KNOWLEDGE_BASE = KNOWLEDGE_DIR / "REFINED_KNOWLEDGE_BASE.json"

class BizraRAGEngine:
    """
    A simple but effective RAG engine using TF-IDF for retrieval.
    No external dependencies required - pure Python sovereignty.
    """
    
    def __init__(self):
        self.chunks: List[Dict] = []
        self.term_index: Dict[str, List[int]] = {}
        self.idf_scores: Dict[str, float] = {}
        self.loaded = False
    
    def load_knowledge_base(self) -> bool:
        """Load the refined knowledge base into memory."""
        if not KNOWLEDGE_BASE.exists():
            print(f"ERROR: Knowledge base not found at {KNOWLEDGE_BASE}")
            return False
        
        with open(KNOWLEDGE_BASE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.chunks = data.get('chunks', [])
        print(f"✅ Loaded {len(self.chunks)} knowledge chunks.")
        
        # Build the index
        self._build_index()
        self.loaded = True
        return True
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization - split on non-word characters, lowercase."""
        text = text.lower()
        tokens = re.findall(r'\b[a-z0-9]+\b', text)
        # Remove very common words
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                     'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                     'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                     'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                     'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
                     'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down',
                     'out', 'off', 'over', 'under', 'again', 'further', 'once', 'it',
                     'its', 'this', 'that', 'these', 'those', 'am', 'than', 'so'}
        return [t for t in tokens if t not in stopwords and len(t) > 2]
    
    def _build_index(self):
        """Build an inverted index for fast retrieval."""
        print("🔨 Building search index...")
        
        # Count document frequency for IDF
        doc_freq = Counter()
        
        for i, chunk in enumerate(self.chunks):
            content = chunk.get('content', '') + ' ' + chunk.get('section', '')
            tokens = set(self._tokenize(content))
            
            for token in tokens:
                doc_freq[token] += 1
                if token not in self.term_index:
                    self.term_index[token] = []
                self.term_index[token].append(i)
        
        # Calculate IDF scores
        n_docs = len(self.chunks)
        for term, freq in doc_freq.items():
            self.idf_scores[term] = math.log(n_docs / (1 + freq))
        
        print(f"✅ Index built with {len(self.term_index)} unique terms.")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search the knowledge base for relevant chunks.
        Returns top_k most relevant chunks.
        """
        if not self.loaded:
            self.load_knowledge_base()
        
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
        
        # Score each document
        scores: Dict[int, float] = {}
        
        for token in query_tokens:
            if token in self.term_index:
                idf = self.idf_scores.get(token, 1.0)
                for chunk_idx in self.term_index[token]:
                    scores[chunk_idx] = scores.get(chunk_idx, 0) + idf
        
        # Boost scores for priority files
        priority_terms = ['architecture', 'roadmap', 'sovereignty', 'agent', 'protocol']
        for token in query_tokens:
            if token in priority_terms:
                for chunk_idx in scores:
                    if priority_terms[0] in self.chunks[chunk_idx].get('source', '').lower():
                        scores[chunk_idx] *= 1.5
        
        # Sort by score
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        # Return top_k results
        results = []
        for chunk_idx, score in ranked[:top_k]:
            chunk = self.chunks[chunk_idx].copy()
            chunk['relevance_score'] = round(score, 3)
            results.append(chunk)
        
        return results
    
    def get_context_for_prompt(self, query: str, max_tokens: int = 2000) -> str:
        """
        Generate a context string suitable for injection into an LLM prompt.
        """
        results = self.search(query, top_k=10)
        
        context_parts = []
        current_tokens = 0
        
        for result in results:
            content = result.get('content', '')
            source = Path(result.get('source', '')).name
            section = result.get('section', 'General')
            
            # Rough token estimate (4 chars per token)
            chunk_tokens = len(content) // 4
            
            if current_tokens + chunk_tokens > max_tokens:
                break
            
            context_parts.append(f"[Source: {source} | Section: {section}]\n{content}")
            current_tokens += chunk_tokens
        
        return "\n\n---\n\n".join(context_parts)


def interactive_demo():
    """Run an interactive demo of the RAG engine."""
    print("=" * 60)
    print("  BIZRA RAG ENGINE v1.0")
    print("  Sovereign Knowledge Retrieval")
    print("=" * 60)
    
    engine = BizraRAGEngine()
    if not engine.load_knowledge_base():
        return
    
    print("\n📝 Enter your questions about Bizra (type 'quit' to exit):\n")
    
    while True:
        query = input("🔍 Query: ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if not query:
            continue
        
        results = engine.search(query, top_k=3)
        
        if not results:
            print("❌ No relevant results found.\n")
            continue
        
        print(f"\n📚 Found {len(results)} relevant chunks:\n")
        
        for i, result in enumerate(results, 1):
            source = Path(result.get('source', '')).name
            section = result.get('section', 'N/A')
            score = result.get('relevance_score', 0)
            content = result.get('content', '')[:300]
            
            print(f"  [{i}] {source} → {section}")
            print(f"      Score: {score}")
            print(f"      Preview: {content}...")
            print()
        
        print("-" * 60 + "\n")


if __name__ == "__main__":
    interactive_demo()
