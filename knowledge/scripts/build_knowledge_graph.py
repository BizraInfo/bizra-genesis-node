"""
BIZRA Hypergraph RAG - Knowledge Graph Builder

Transforms 413k+ files into a connected knowledge organism:
- Nodes: Every file as a knowledge atom
- Edges: Relationships (imports, references, concepts)
- Hyperedges: Multi-node connections (clusters, themes)
- Indices: Fast lookup for entities, concepts, temporal

Author: BIZRA Genesis Team
"""

import os
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from collections import defaultdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# DATA STRUCTURES
# ============================================================

@dataclass
class KnowledgeNode:
    """A file as a knowledge atom in the graph"""
    id: str                          # Unique hash ID
    path: str                        # Relative file path
    name: str                        # Filename
    extension: str                   # File extension
    size_bytes: int                  # File size
    modified_at: str                 # Last modified timestamp
    created_at: Optional[str]        # Creation timestamp if available
    domain: str                      # Primary domain (e.g., "bizra", "research")
    concepts: List[str]              # Extracted concepts/keywords
    entities: List[str]              # Named entities
    content_hash: str                # Hash of content for dedup
    embedding_id: Optional[str]      # Reference to embedding vector
    metadata: Dict[str, Any]         # Additional metadata

@dataclass
class Edge:
    """Relationship between two nodes"""
    source_id: str
    target_id: str
    edge_type: str           # import, reference, concept_shared, temporal, directory
    weight: float            # Relationship strength 0-1
    metadata: Dict[str, Any]

@dataclass 
class Hyperedge:
    """Multi-node connection (cluster)"""
    id: str
    node_ids: List[str]
    hyperedge_type: str      # concept_cluster, temporal_cluster, directory_cluster
    label: str               # Human-readable label
    centroid_id: Optional[str]  # Most representative node
    metadata: Dict[str, Any]

# ============================================================
# CONCEPT EXTRACTION
# ============================================================

# BIZRA-specific concept patterns
BIZRA_CONCEPTS = {
    # Core Architecture
    r'\b(consciousness|conscious)\b': 'consciousness',
    r'\b(synthesis|synthesizer|synthesize)\b': 'synthesis',
    r'\b(orchestrat\w+)\b': 'orchestration',
    r'\bSAPE\b': 'sape',
    r'\b(temporal|time[-_]?based)\b': 'temporal',
    r'\b(episode|episodic)\b': 'episodes',
    r'\b(emergence|emergent)\b': 'emergence',
    
    # Agent Architecture
    r'\b(PAT|personal[-_]?agent)\b': 'pat_agent',
    r'\b(SAT|system[-_]?agent)\b': 'sat_agent',
    r'\b(agent|agentic)\b': 'agents',
    r'\b(multi[-_]?agent)\b': 'multi_agent',
    
    # Knowledge & RAG
    r'\b(hypergraph|hyper[-_]?graph)\b': 'hypergraph',
    r'\b(knowledge[-_]?graph)\b': 'knowledge_graph',
    r'\b(RAG|retrieval)\b': 'rag',
    r'\b(embedding|embed)\b': 'embeddings',
    r'\b(vector|vectorize)\b': 'vectors',
    
    # Proof & Verification
    r'\b(PoI|proof[-_]?of[-_]?impact)\b': 'poi',
    r'\b(ihsan|ethical)\b': 'ihsan',
    r'\b(verif\w+)\b': 'verification',
    r'\b(trust|trustless)\b': 'trust',
    
    # Infrastructure
    r'\b(node0|genesis[-_]?node)\b': 'node0',
    r'\b(docker|container)\b': 'docker',
    r'\b(rust|cargo)\b': 'rust',
    r'\b(ollama|llm|model)\b': 'llm',
    r'\b(lm[-_]?studio)\b': 'lmstudio',
    
    # General AI/ML
    r'\b(neural|network)\b': 'neural',
    r'\b(transformer)\b': 'transformer',
    r'\b(attention)\b': 'attention',
    r'\b(inference)\b': 'inference',
    r'\b(training|train)\b': 'training',
}

def extract_concepts(content: str) -> List[str]:
    """Extract BIZRA-relevant concepts from content"""
    concepts = set()
    content_lower = content.lower()
    
    for pattern, concept in BIZRA_CONCEPTS.items():
        if re.search(pattern, content_lower, re.IGNORECASE):
            concepts.add(concept)
    
    return list(concepts)

def extract_entities(content: str) -> List[str]:
    """Extract named entities (file references, class names, etc.)"""
    entities = set()
    
    # File references
    file_patterns = [
        r'[\w/\\]+\.(rs|py|ts|tsx|js|jsx|md|json|yaml|yml|toml)',
        r'import\s+[\w.]+',
        r'from\s+[\w.]+\s+import',
        r'use\s+[\w:]+',
    ]
    
    for pattern in file_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            if isinstance(match, tuple):
                entities.add(match[0])
            else:
                entities.add(match)
    
    # Class/function names (CamelCase or snake_case)
    class_pattern = r'\b([A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]+)*)\b'
    func_pattern = r'\b([a-z]+(?:_[a-z]+)+)\b'
    
    classes = re.findall(class_pattern, content)
    functions = re.findall(func_pattern, content)
    
    for cls in classes[:20]:  # Limit to prevent noise
        if len(cls) > 3:
            entities.add(cls)
    
    for func in functions[:20]:
        if len(func) > 5:
            entities.add(func)
    
    return list(entities)[:50]  # Cap at 50 entities

# ============================================================
# KNOWLEDGE GRAPH BUILDER
# ============================================================

class KnowledgeGraphBuilder:
    """Builds the BIZRA Knowledge Graph from source files"""
    
    # File extensions to process
    TEXT_EXTENSIONS = {
        '.rs', '.py', '.ts', '.tsx', '.js', '.jsx',
        '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
        '.sql', '.sh', '.ps1', '.bat', '.css', '.html',
        '.env', '.gitignore', '.dockerfile'
    }
    
    # Directories to skip
    SKIP_DIRS = {
        'node_modules', '.git', '__pycache__', 'target',
        '.next', 'dist', 'build', '.cache', 'venv', '.venv'
    }
    
    def __init__(self, source_root: str, output_dir: str):
        self.source_root = Path(source_root)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.nodes: Dict[str, KnowledgeNode] = {}
        self.edges: List[Edge] = []
        self.hyperedges: List[Hyperedge] = []
        
        # Indices for fast lookup
        self.path_to_id: Dict[str, str] = {}
        self.concept_index: Dict[str, Set[str]] = defaultdict(set)
        self.entity_index: Dict[str, Set[str]] = defaultdict(set)
        self.temporal_index: Dict[str, Set[str]] = defaultdict(set)  # YYYY-MM -> node_ids
        self.directory_index: Dict[str, Set[str]] = defaultdict(set)
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'files_skipped': 0,
            'nodes_created': 0,
            'edges_created': 0,
            'hyperedges_created': 0,
            'concepts_extracted': 0,
            'entities_extracted': 0,
        }
    
    def generate_node_id(self, path: str) -> str:
        """Generate unique ID for a file path"""
        return hashlib.sha256(path.encode()).hexdigest()[:16]
    
    def should_process_file(self, path: Path) -> bool:
        """Check if file should be processed"""
        # Skip directories
        for skip_dir in self.SKIP_DIRS:
            if skip_dir in path.parts:
                return False
        
        # Check extension
        return path.suffix.lower() in self.TEXT_EXTENSIONS
    
    def detect_domain(self, path: Path) -> str:
        """Detect the primary domain for a file"""
        path_str = str(path).lower()
        
        domain_patterns = {
            'bizra': ['bizra', 'node0', 'genesis'],
            'sape': ['sape', 'synthesis', 'orchestrator'],
            'consciousness': ['consciousness', 'conscious', 'awareness'],
            'research': ['research', 'paper', 'study', 'analysis'],
            'infrastructure': ['docker', 'deploy', 'infra', 'config'],
            'frontend': ['component', 'page', 'app', 'ui', 'dashboard'],
            'backend': ['api', 'server', 'service', 'handler'],
            'database': ['sql', 'schema', 'migration', 'db'],
            'agent': ['agent', 'pat', 'sat', 'orchestr'],
        }
        
        for domain, patterns in domain_patterns.items():
            if any(p in path_str for p in patterns):
                return domain
        
        return 'general'
    
    def read_file_content(self, path: Path) -> Optional[str]:
        """Read file content with encoding handling"""
        encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(path, 'r', encoding=encoding) as f:
                    return f.read()
            except (UnicodeDecodeError, UnicodeError):
                continue
            except Exception as e:
                logger.warning(f"Error reading {path}: {e}")
                return None
        
        return None
    
    def create_node(self, path: Path) -> Optional[KnowledgeNode]:
        """Create a knowledge node from a file"""
        try:
            stat = path.stat()
            rel_path = str(path.relative_to(self.source_root))
            node_id = self.generate_node_id(rel_path)
            
            content = self.read_file_content(path)
            if content is None:
                return None
            
            content_hash = hashlib.md5(content.encode()).hexdigest()
            concepts = extract_concepts(content)
            entities = extract_entities(content)
            
            # Parse timestamps
            modified_at = datetime.fromtimestamp(stat.st_mtime).isoformat()
            created_at = None
            try:
                created_at = datetime.fromtimestamp(stat.st_ctime).isoformat()
            except:
                pass
            
            node = KnowledgeNode(
                id=node_id,
                path=rel_path,
                name=path.name,
                extension=path.suffix.lower(),
                size_bytes=stat.st_size,
                modified_at=modified_at,
                created_at=created_at,
                domain=self.detect_domain(path),
                concepts=concepts,
                entities=entities,
                content_hash=content_hash,
                embedding_id=None,
                metadata={
                    'directory': str(path.parent.relative_to(self.source_root)),
                    'depth': len(path.relative_to(self.source_root).parts) - 1,
                }
            )
            
            return node
            
        except Exception as e:
            logger.error(f"Error creating node for {path}: {e}")
            return None
    
    def build_nodes(self):
        """Scan source and create all nodes"""
        logger.info(f"Scanning {self.source_root} for knowledge nodes...")
        
        for path in self.source_root.rglob('*'):
            if path.is_file() and self.should_process_file(path):
                node = self.create_node(path)
                if node:
                    self.nodes[node.id] = node
                    self.path_to_id[node.path] = node.id
                    
                    # Index by concepts
                    for concept in node.concepts:
                        self.concept_index[concept].add(node.id)
                    
                    # Index by entities
                    for entity in node.entities:
                        self.entity_index[entity].add(node.id)
                    
                    # Index by temporal (YYYY-MM)
                    month = node.modified_at[:7]  # YYYY-MM
                    self.temporal_index[month].add(node.id)
                    
                    # Index by directory
                    directory = node.metadata.get('directory', '')
                    self.directory_index[directory].add(node.id)
                    
                    self.stats['files_processed'] += 1
                    self.stats['nodes_created'] += 1
                    self.stats['concepts_extracted'] += len(node.concepts)
                    self.stats['entities_extracted'] += len(node.entities)
                    
                    if self.stats['files_processed'] % 1000 == 0:
                        logger.info(f"Processed {self.stats['files_processed']} files...")
                else:
                    self.stats['files_skipped'] += 1
        
        logger.info(f"Created {len(self.nodes)} knowledge nodes")
    
    def build_edges(self):
        """Build edges between related nodes"""
        logger.info("Building edges between nodes...")
        
        # Edge 1: Shared concepts
        for concept, node_ids in self.concept_index.items():
            node_list = list(node_ids)
            if len(node_list) > 1 and len(node_list) < 1000:  # Skip very common concepts
                for i, source_id in enumerate(node_list):
                    for target_id in node_list[i+1:min(i+10, len(node_list))]:  # Limit connections
                        edge = Edge(
                            source_id=source_id,
                            target_id=target_id,
                            edge_type='concept_shared',
                            weight=0.5,
                            metadata={'concept': concept}
                        )
                        self.edges.append(edge)
        
        # Edge 2: Same directory
        for directory, node_ids in self.directory_index.items():
            node_list = list(node_ids)
            if len(node_list) > 1:
                for i, source_id in enumerate(node_list):
                    for target_id in node_list[i+1:min(i+20, len(node_list))]:
                        edge = Edge(
                            source_id=source_id,
                            target_id=target_id,
                            edge_type='directory',
                            weight=0.7,
                            metadata={'directory': directory}
                        )
                        self.edges.append(edge)
        
        # Edge 3: Temporal proximity (modified same month)
        for month, node_ids in self.temporal_index.items():
            node_list = list(node_ids)
            if len(node_list) > 1 and len(node_list) < 500:
                for i, source_id in enumerate(node_list):
                    for target_id in node_list[i+1:min(i+5, len(node_list))]:
                        edge = Edge(
                            source_id=source_id,
                            target_id=target_id,
                            edge_type='temporal',
                            weight=0.3,
                            metadata={'month': month}
                        )
                        self.edges.append(edge)
        
        self.stats['edges_created'] = len(self.edges)
        logger.info(f"Created {len(self.edges)} edges")
    
    def build_hyperedges(self):
        """Build hyperedges (clusters) connecting multiple nodes"""
        logger.info("Building hyperedges (clusters)...")
        
        # Hyperedge 1: Concept clusters
        for concept, node_ids in self.concept_index.items():
            if len(node_ids) >= 3:  # At least 3 nodes for a cluster
                hyperedge = Hyperedge(
                    id=f"concept_{concept}_{hashlib.md5(concept.encode()).hexdigest()[:8]}",
                    node_ids=list(node_ids)[:100],  # Limit size
                    hyperedge_type='concept_cluster',
                    label=f"Concept: {concept}",
                    centroid_id=list(node_ids)[0],  # First as centroid
                    metadata={'concept': concept, 'size': len(node_ids)}
                )
                self.hyperedges.append(hyperedge)
        
        # Hyperedge 2: Temporal clusters (by quarter)
        quarterly_clusters: Dict[str, Set[str]] = defaultdict(set)
        for month, node_ids in self.temporal_index.items():
            year = month[:4]
            month_num = int(month[5:7])
            quarter = f"{year}-Q{(month_num - 1) // 3 + 1}"
            quarterly_clusters[quarter].update(node_ids)
        
        for quarter, node_ids in quarterly_clusters.items():
            if len(node_ids) >= 5:
                hyperedge = Hyperedge(
                    id=f"temporal_{quarter}",
                    node_ids=list(node_ids)[:200],
                    hyperedge_type='temporal_cluster',
                    label=f"Period: {quarter}",
                    centroid_id=None,
                    metadata={'quarter': quarter, 'size': len(node_ids)}
                )
                self.hyperedges.append(hyperedge)
        
        # Hyperedge 3: Directory clusters
        for directory, node_ids in self.directory_index.items():
            if len(node_ids) >= 3 and directory:
                hyperedge = Hyperedge(
                    id=f"dir_{hashlib.md5(directory.encode()).hexdigest()[:8]}",
                    node_ids=list(node_ids),
                    hyperedge_type='directory_cluster',
                    label=f"Directory: {directory}",
                    centroid_id=None,
                    metadata={'directory': directory, 'size': len(node_ids)}
                )
                self.hyperedges.append(hyperedge)
        
        self.stats['hyperedges_created'] = len(self.hyperedges)
        logger.info(f"Created {len(self.hyperedges)} hyperedges")
    
    def save_graph(self):
        """Save the knowledge graph to disk"""
        logger.info(f"Saving knowledge graph to {self.output_dir}...")
        
        # Save nodes as JSONL
        nodes_path = self.output_dir / 'nodes.jsonl'
        with open(nodes_path, 'w', encoding='utf-8') as f:
            for node in self.nodes.values():
                f.write(json.dumps(asdict(node)) + '\n')
        
        # Save edges as JSONL
        edges_path = self.output_dir / 'edges.jsonl'
        with open(edges_path, 'w', encoding='utf-8') as f:
            for edge in self.edges:
                f.write(json.dumps(asdict(edge)) + '\n')
        
        # Save hyperedges as JSONL
        hyperedges_path = self.output_dir / 'hyperedges.jsonl'
        with open(hyperedges_path, 'w', encoding='utf-8') as f:
            for hyperedge in self.hyperedges:
                f.write(json.dumps(asdict(hyperedge)) + '\n')
        
        # Save indices
        indices_dir = self.output_dir / 'indices'
        indices_dir.mkdir(exist_ok=True)
        
        with open(indices_dir / 'concept.json', 'w') as f:
            json.dump({k: list(v) for k, v in self.concept_index.items()}, f, indent=2)
        
        with open(indices_dir / 'entity.json', 'w') as f:
            json.dump({k: list(v) for k, v in self.entity_index.items()}, f, indent=2)
        
        with open(indices_dir / 'temporal.json', 'w') as f:
            json.dump({k: list(v) for k, v in self.temporal_index.items()}, f, indent=2)
        
        with open(indices_dir / 'directory.json', 'w') as f:
            json.dump({k: list(v) for k, v in self.directory_index.items()}, f, indent=2)
        
        with open(indices_dir / 'path_to_id.json', 'w') as f:
            json.dump(self.path_to_id, f, indent=2)
        
        # Save statistics
        with open(self.output_dir / 'statistics.json', 'w') as f:
            json.dump({
                **self.stats,
                'unique_concepts': len(self.concept_index),
                'unique_entities': len(self.entity_index),
                'temporal_periods': len(self.temporal_index),
                'directories': len(self.directory_index),
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info("Knowledge graph saved successfully!")
    
    def build(self):
        """Build the complete knowledge graph"""
        start_time = datetime.now()
        
        logger.info("=" * 60)
        logger.info("BIZRA Hypergraph Knowledge Graph Builder")
        logger.info("=" * 60)
        
        self.build_nodes()
        self.build_edges()
        self.build_hyperedges()
        self.save_graph()
        
        elapsed = (datetime.now() - start_time).total_seconds()
        
        logger.info("=" * 60)
        logger.info("BUILD COMPLETE")
        logger.info(f"Time: {elapsed:.1f} seconds")
        logger.info(f"Nodes: {self.stats['nodes_created']:,}")
        logger.info(f"Edges: {self.stats['edges_created']:,}")
        logger.info(f"Hyperedges: {self.stats['hyperedges_created']:,}")
        logger.info(f"Concepts: {len(self.concept_index):,}")
        logger.info("=" * 60)


# ============================================================
# CLI INTERFACE
# ============================================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Build BIZRA Knowledge Graph')
    parser.add_argument('--source', type=str, default='C:\\BIZRA-DATA-LAKE',
                        help='Source directory to scan')
    parser.add_argument('--output', type=str, default=None,
                        help='Output directory for graph files')
    
    args = parser.parse_args()
    
    # Default output to knowledge/graph under current directory
    output_dir = args.output or str(Path(__file__).parent.parent / 'knowledge' / 'graph')
    
    builder = KnowledgeGraphBuilder(args.source, output_dir)
    builder.build()
