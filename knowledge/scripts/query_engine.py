"""
BIZRA Hypergraph RAG - Query Engine

Multi-hop graph traversal for knowledge retrieval:
- Semantic search in vector space (Qdrant)
- Graph traversal for related nodes
- Context assembly for LLM consumption

Author: BIZRA Genesis Team
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from collections import defaultdict
import heapq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================
# DATA STRUCTURES
# ============================================================

@dataclass
class QueryResult:
    """Result from knowledge query"""
    node_id: str
    path: str
    score: float
    hop_distance: int
    concepts: List[str]
    entities: List[str]
    domain: str
    content_preview: str = ""
    traversal_path: List[str] = field(default_factory=list)


@dataclass
class AssembledContext:
    """Assembled context for LLM consumption"""
    query: str
    primary_results: List[QueryResult]
    related_results: List[QueryResult]
    concept_summary: Dict[str, int]
    temporal_context: Dict[str, List[str]]
    formatted_context: str
    metadata: Dict[str, Any]


# ============================================================
# KNOWLEDGE GRAPH LOADER
# ============================================================

class KnowledgeGraph:
    """In-memory knowledge graph for traversal"""
    
    def __init__(self, graph_dir: Path):
        self.graph_dir = graph_dir
        self.nodes: Dict[str, Dict] = {}
        self.adjacency: Dict[str, List[Tuple[str, str, float]]] = defaultdict(list)  # node_id -> [(target, type, weight)]
        self.hyperedges: Dict[str, Dict] = {}
        self.concept_index: Dict[str, Set[str]] = defaultdict(set)
        self.entity_index: Dict[str, Set[str]] = defaultdict(set)
        self.path_to_id: Dict[str, str] = {}
        
        self._load()
    
    def _load(self):
        """Load graph from disk"""
        logger.info(f"Loading knowledge graph from {self.graph_dir}")
        
        # Load nodes
        nodes_path = self.graph_dir / 'nodes.jsonl'
        if nodes_path.exists():
            with open(nodes_path, 'r', encoding='utf-8') as f:
                for line in f:
                    node = json.loads(line.strip())
                    self.nodes[node['id']] = node
                    self.path_to_id[node['path']] = node['id']
        
        # Load edges
        edges_path = self.graph_dir / 'edges.jsonl'
        if edges_path.exists():
            with open(edges_path, 'r', encoding='utf-8') as f:
                for line in f:
                    edge = json.loads(line.strip())
                    self.adjacency[edge['source_id']].append(
                        (edge['target_id'], edge['edge_type'], edge['weight'])
                    )
                    # Bidirectional
                    self.adjacency[edge['target_id']].append(
                        (edge['source_id'], edge['edge_type'], edge['weight'])
                    )
        
        # Load hyperedges
        hyperedges_path = self.graph_dir / 'hyperedges.jsonl'
        if hyperedges_path.exists():
            with open(hyperedges_path, 'r', encoding='utf-8') as f:
                for line in f:
                    hyperedge = json.loads(line.strip())
                    self.hyperedges[hyperedge['id']] = hyperedge
        
        # Load indices
        indices_dir = self.graph_dir / 'indices'
        
        if (indices_dir / 'concept.json').exists():
            with open(indices_dir / 'concept.json', 'r') as f:
                data = json.load(f)
                for concept, ids in data.items():
                    self.concept_index[concept] = set(ids)
        
        if (indices_dir / 'entity.json').exists():
            with open(indices_dir / 'entity.json', 'r') as f:
                data = json.load(f)
                for entity, ids in data.items():
                    self.entity_index[entity] = set(ids)
        
        logger.info(f"Loaded {len(self.nodes)} nodes, {len(self.hyperedges)} hyperedges")
    
    def get_node(self, node_id: str) -> Optional[Dict]:
        """Get node by ID"""
        return self.nodes.get(node_id)
    
    def get_neighbors(self, node_id: str, edge_type: str = None) -> List[Tuple[str, str, float]]:
        """Get neighboring nodes"""
        neighbors = self.adjacency.get(node_id, [])
        if edge_type:
            return [(n, t, w) for n, t, w in neighbors if t == edge_type]
        return neighbors
    
    def find_by_concept(self, concept: str) -> Set[str]:
        """Find nodes by concept"""
        return self.concept_index.get(concept.lower(), set())
    
    def find_by_entity(self, entity: str) -> Set[str]:
        """Find nodes by entity"""
        return self.entity_index.get(entity, set())


# ============================================================
# VECTOR SEARCH
# ============================================================

class VectorSearch:
    """Vector similarity search using Qdrant"""
    
    def __init__(self, host: str = "localhost", port: int = 6333, collection: str = "bizra_knowledge"):
        self.host = host
        self.port = port
        self.collection = collection
        self.client = None
        self.model = None
    
    def _init_client(self):
        """Initialize Qdrant client"""
        if self.client is None:
            try:
                from qdrant_client import QdrantClient
                self.client = QdrantClient(host=self.host, port=self.port)
            except Exception as e:
                logger.warning(f"Could not connect to Qdrant: {e}")
                self.client = "unavailable"
    
    def _init_model(self):
        """Initialize embedding model"""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            except ImportError:
                logger.warning("sentence-transformers not installed")
                self.model = "unavailable"
    
    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for similar documents"""
        self._init_client()
        self._init_model()
        
        if self.client == "unavailable" or self.model == "unavailable":
            logger.warning("Vector search unavailable")
            return []
        
        try:
            # Generate query embedding
            query_vector = self.model.encode([query])[0].tolist()
            
            # Search Qdrant
            results = self.client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                limit=limit
            )
            
            return [
                {
                    'node_id': hit.payload.get('node_id'),
                    'node_path': hit.payload.get('node_path'),
                    'score': hit.score,
                    'concepts': hit.payload.get('concepts', []),
                    'domain': hit.payload.get('domain', 'general'),
                    'text_preview': hit.payload.get('text_preview', ''),
                }
                for hit in results
            ]
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []


# ============================================================
# GRAPH TRAVERSAL ENGINE
# ============================================================

class GraphTraversal:
    """Multi-hop graph traversal for knowledge discovery"""
    
    def __init__(self, graph: KnowledgeGraph):
        self.graph = graph
    
    def bfs_traverse(self, start_ids: List[str], max_hops: int = 2, max_nodes: int = 50) -> List[Tuple[str, int, List[str]]]:
        """Breadth-first traversal from starting nodes
        
        Returns: List of (node_id, hop_distance, path)
        """
        visited = set()
        results = []
        queue = [(nid, 0, [nid]) for nid in start_ids]  # (node_id, distance, path)
        
        while queue and len(results) < max_nodes:
            node_id, distance, path = queue.pop(0)
            
            if node_id in visited:
                continue
            
            visited.add(node_id)
            results.append((node_id, distance, path))
            
            if distance < max_hops:
                for neighbor_id, edge_type, weight in self.graph.get_neighbors(node_id):
                    if neighbor_id not in visited:
                        queue.append((neighbor_id, distance + 1, path + [neighbor_id]))
        
        return results
    
    def weighted_traverse(self, start_ids: List[str], max_hops: int = 2, max_nodes: int = 50) -> List[Tuple[str, float, int, List[str]]]:
        """Priority-based traversal using edge weights
        
        Returns: List of (node_id, score, hop_distance, path)
        """
        visited = set()
        results = []
        # Priority queue: (-score, hop_distance, node_id, path)
        heap = [(-1.0, 0, nid, [nid]) for nid in start_ids]
        heapq.heapify(heap)
        
        while heap and len(results) < max_nodes:
            neg_score, distance, node_id, path = heapq.heappop(heap)
            
            if node_id in visited:
                continue
            
            visited.add(node_id)
            results.append((node_id, -neg_score, distance, path))
            
            if distance < max_hops:
                for neighbor_id, edge_type, weight in self.graph.get_neighbors(node_id):
                    if neighbor_id not in visited:
                        new_score = -neg_score * weight * 0.9  # Decay with distance
                        heapq.heappush(heap, (-new_score, distance + 1, neighbor_id, path + [neighbor_id]))
        
        return results
    
    def concept_expand(self, concepts: List[str], max_per_concept: int = 10) -> Dict[str, List[str]]:
        """Expand query by finding nodes for each concept"""
        expansion = {}
        
        for concept in concepts:
            node_ids = list(self.graph.find_by_concept(concept))[:max_per_concept]
            if node_ids:
                expansion[concept] = node_ids
        
        return expansion


# ============================================================
# QUERY ENGINE
# ============================================================

class QueryEngine:
    """Main query engine for Hypergraph RAG"""
    
    def __init__(self, graph_dir: Path, qdrant_host: str = "localhost", qdrant_port: int = 6333):
        self.graph = KnowledgeGraph(graph_dir)
        self.vector_search = VectorSearch(qdrant_host, qdrant_port)
        self.traversal = GraphTraversal(self.graph)
    
    def extract_query_concepts(self, query: str) -> List[str]:
        """Extract concepts from query"""
        query_lower = query.lower()
        found_concepts = []
        
        for concept in self.graph.concept_index.keys():
            if concept in query_lower:
                found_concepts.append(concept)
        
        return found_concepts
    
    def query(
        self,
        query: str,
        vector_limit: int = 10,
        graph_hops: int = 2,
        max_total: int = 50
    ) -> AssembledContext:
        """Execute full query pipeline
        
        1. Vector search for semantic matches
        2. Extract concepts from query
        3. Graph traversal from initial results
        4. Assemble context for LLM
        """
        logger.info(f"Querying: {query}")
        
        # Step 1: Vector search
        vector_results = self.vector_search.search(query, limit=vector_limit)
        
        # Step 2: Extract concepts
        query_concepts = self.extract_query_concepts(query)
        
        # Step 3: Get starting nodes
        start_ids = set()
        
        # From vector search
        for result in vector_results:
            if result['node_id']:
                start_ids.add(result['node_id'])
        
        # From concept expansion
        concept_expansion = self.traversal.concept_expand(query_concepts, max_per_concept=5)
        for concept, node_ids in concept_expansion.items():
            start_ids.update(node_ids)
        
        # Step 4: Graph traversal
        primary_results = []
        related_results = []
        
        if start_ids:
            traversal_results = self.traversal.weighted_traverse(
                list(start_ids),
                max_hops=graph_hops,
                max_nodes=max_total
            )
            
            for node_id, score, hop_distance, path in traversal_results:
                node = self.graph.get_node(node_id)
                if node:
                    result = QueryResult(
                        node_id=node_id,
                        path=node['path'],
                        score=score,
                        hop_distance=hop_distance,
                        concepts=node.get('concepts', []),
                        entities=node.get('entities', []),
                        domain=node.get('domain', 'general'),
                        content_preview="",
                        traversal_path=path
                    )
                    
                    if hop_distance == 0:
                        primary_results.append(result)
                    else:
                        related_results.append(result)
        
        # Step 5: Aggregate concept summary
        concept_summary = defaultdict(int)
        for result in primary_results + related_results:
            for concept in result.concepts:
                concept_summary[concept] += 1
        
        # Step 6: Temporal context
        temporal_context = defaultdict(list)
        for result in primary_results:
            node = self.graph.get_node(result.node_id)
            if node:
                month = node.get('modified_at', '')[:7]
                if month:
                    temporal_context[month].append(result.path)
        
        # Step 7: Format context for LLM
        formatted = self._format_context(query, primary_results, related_results, concept_summary)
        
        return AssembledContext(
            query=query,
            primary_results=primary_results,
            related_results=related_results,
            concept_summary=dict(concept_summary),
            temporal_context=dict(temporal_context),
            formatted_context=formatted,
            metadata={
                'vector_results': len(vector_results),
                'query_concepts': query_concepts,
                'concept_expansion': {k: len(v) for k, v in concept_expansion.items()},
                'total_results': len(primary_results) + len(related_results)
            }
        )
    
    def _format_context(
        self,
        query: str,
        primary: List[QueryResult],
        related: List[QueryResult],
        concepts: Dict[str, int]
    ) -> str:
        """Format context for LLM consumption"""
        lines = []
        lines.append(f"# Knowledge Context for: {query}\n")
        
        # Concept summary
        if concepts:
            top_concepts = sorted(concepts.items(), key=lambda x: -x[1])[:10]
            lines.append("## Key Concepts")
            for concept, count in top_concepts:
                lines.append(f"- {concept}: {count} files")
            lines.append("")
        
        # Primary sources
        lines.append("## Primary Sources")
        for result in primary[:10]:
            lines.append(f"- `{result.path}` (domain: {result.domain})")
            if result.concepts:
                lines.append(f"  Concepts: {', '.join(result.concepts[:5])}")
        lines.append("")
        
        # Related sources
        if related:
            lines.append("## Related Sources (via graph traversal)")
            for result in related[:10]:
                lines.append(f"- `{result.path}` (hop: {result.hop_distance}, score: {result.score:.2f})")
            lines.append("")
        
        return '\n'.join(lines)


# ============================================================
# CLI INTERFACE
# ============================================================

def interactive_mode(engine: QueryEngine):
    """Interactive query mode"""
    print("\n" + "=" * 60)
    print("BIZRA Hypergraph RAG - Interactive Query")
    print("Type 'quit' to exit")
    print("=" * 60 + "\n")
    
    while True:
        query = input("Query> ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            break
        
        if not query:
            continue
        
        result = engine.query(query)
        print("\n" + result.formatted_context)
        print(f"\n[Found {result.metadata['total_results']} results]\n")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='BIZRA Knowledge Query Engine')
    parser.add_argument('--graph', type=str, required=True,
                        help='Directory containing knowledge graph')
    parser.add_argument('--query', type=str, default=None,
                        help='Query to execute (interactive mode if not provided)')
    parser.add_argument('--qdrant-host', type=str, default='localhost')
    parser.add_argument('--qdrant-port', type=int, default=6333)
    
    args = parser.parse_args()
    
    engine = QueryEngine(
        graph_dir=Path(args.graph),
        qdrant_host=args.qdrant_host,
        qdrant_port=args.qdrant_port
    )
    
    if args.query:
        result = engine.query(args.query)
        print(result.formatted_context)
    else:
        interactive_mode(engine)
