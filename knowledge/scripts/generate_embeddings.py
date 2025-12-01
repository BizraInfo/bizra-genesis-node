"""
BIZRA Hypergraph RAG - Embedding Generator

Generates semantic embeddings for all knowledge nodes:
- Uses sentence-transformers for local embedding
- Stores vectors in Qdrant for fast similarity search
- Creates hierarchical embeddings (chunk, doc, cluster)

Author: BIZRA Genesis Team
"""

import json
import logging
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Generator
from dataclasses import dataclass
from datetime import datetime
import numpy as np

# Lazy imports for heavy dependencies
sentence_transformers = None
qdrant_client = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation"""
    model_name: str = "all-MiniLM-L6-v2"  # Fast, good quality
    # model_name: str = "all-mpnet-base-v2"  # Higher quality, slower
    chunk_size: int = 512            # Tokens per chunk
    chunk_overlap: int = 50          # Overlap between chunks
    batch_size: int = 64             # Batch size for embedding
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    collection_name: str = "bizra_knowledge"
    vector_dimension: int = 384       # Depends on model


# ============================================================
# KNOWLEDGE NODE LOADER
# ============================================================

def load_knowledge_nodes(graph_dir: Path) -> Generator[Dict, None, None]:
    """Stream nodes from JSONL file"""
    nodes_path = graph_dir / 'nodes.jsonl'
    
    if not nodes_path.exists():
        raise FileNotFoundError(f"Nodes file not found: {nodes_path}")
    
    with open(nodes_path, 'r', encoding='utf-8') as f:
        for line in f:
            yield json.loads(line.strip())


def count_nodes(graph_dir: Path) -> int:
    """Count total nodes in graph"""
    nodes_path = graph_dir / 'nodes.jsonl'
    with open(nodes_path, 'r', encoding='utf-8') as f:
        return sum(1 for _ in f)


# ============================================================
# TEXT CHUNKING
# ============================================================

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    # Simple word-based chunking
    words = text.split()
    
    if len(words) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(words):
        end = start + chunk_size
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)
        start = end - overlap
    
    return chunks


def read_file_for_embedding(file_path: Path) -> Optional[str]:
    """Read file content for embedding"""
    encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception:
            return None
    
    return None


# ============================================================
# EMBEDDING GENERATOR
# ============================================================

class EmbeddingGenerator:
    """Generates and stores embeddings for knowledge nodes"""
    
    def __init__(self, graph_dir: Path, source_root: Path, config: EmbeddingConfig = None):
        self.graph_dir = graph_dir
        self.source_root = source_root
        self.config = config or EmbeddingConfig()
        self.model = None
        self.qdrant = None
        
        # Statistics
        self.stats = {
            'nodes_processed': 0,
            'chunks_created': 0,
            'embeddings_generated': 0,
            'errors': 0
        }
    
    def _load_model(self):
        """Lazy load the embedding model"""
        global sentence_transformers
        
        if self.model is None:
            logger.info(f"Loading embedding model: {self.config.model_name}")
            
            try:
                from sentence_transformers import SentenceTransformer
                sentence_transformers = SentenceTransformer
                self.model = SentenceTransformer(self.config.model_name)
                logger.info("Model loaded successfully")
            except ImportError:
                logger.error("sentence-transformers not installed. Run: pip install sentence-transformers")
                raise
    
    def _init_qdrant(self):
        """Initialize Qdrant client and collection"""
        global qdrant_client
        
        if self.qdrant is None:
            logger.info(f"Connecting to Qdrant at {self.config.qdrant_host}:{self.config.qdrant_port}")
            
            try:
                from qdrant_client import QdrantClient
                from qdrant_client.models import Distance, VectorParams, PointStruct
                
                qdrant_client = {
                    'QdrantClient': QdrantClient,
                    'Distance': Distance,
                    'VectorParams': VectorParams,
                    'PointStruct': PointStruct
                }
                
                self.qdrant = QdrantClient(
                    host=self.config.qdrant_host,
                    port=self.config.qdrant_port
                )
                
                # Create collection if not exists
                collections = self.qdrant.get_collections().collections
                collection_names = [c.name for c in collections]
                
                if self.config.collection_name not in collection_names:
                    logger.info(f"Creating collection: {self.config.collection_name}")
                    self.qdrant.create_collection(
                        collection_name=self.config.collection_name,
                        vectors_config=VectorParams(
                            size=self.config.vector_dimension,
                            distance=Distance.COSINE
                        )
                    )
                
                logger.info("Qdrant initialized successfully")
                
            except ImportError:
                logger.warning("qdrant-client not installed. Run: pip install qdrant-client")
                logger.warning("Embeddings will be saved to disk instead")
                self.qdrant = "disk"
            except Exception as e:
                logger.warning(f"Could not connect to Qdrant: {e}")
                logger.warning("Embeddings will be saved to disk instead")
                self.qdrant = "disk"
    
    def generate_embedding(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a batch of texts"""
        self._load_model()
        return self.model.encode(texts, show_progress_bar=False)
    
    def process_node(self, node: Dict) -> List[Dict]:
        """Process a single node and return embedding records"""
        records = []
        
        try:
            # Read file content
            file_path = self.source_root / node['path']
            
            if not file_path.exists():
                logger.debug(f"File not found: {file_path}")
                return records
            
            content = read_file_for_embedding(file_path)
            if not content:
                return records
            
            # Create chunks
            chunks = chunk_text(content, self.config.chunk_size, self.config.chunk_overlap)
            
            for i, chunk in enumerate(chunks):
                # Generate unique ID for chunk
                chunk_id = hashlib.sha256(f"{node['id']}_{i}".encode()).hexdigest()[:16]
                
                record = {
                    'chunk_id': chunk_id,
                    'node_id': node['id'],
                    'node_path': node['path'],
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                    'text': chunk[:1000],  # Store preview
                    'domain': node.get('domain', 'general'),
                    'concepts': node.get('concepts', []),
                    'extension': node.get('extension', ''),
                }
                records.append(record)
            
            self.stats['chunks_created'] += len(chunks)
            
        except Exception as e:
            logger.error(f"Error processing node {node['id']}: {e}")
            self.stats['errors'] += 1
        
        return records
    
    def store_embeddings_disk(self, embeddings_dir: Path, records: List[Dict], vectors: np.ndarray):
        """Store embeddings to disk as fallback"""
        embeddings_dir.mkdir(parents=True, exist_ok=True)
        
        # Save vectors
        vectors_path = embeddings_dir / f"vectors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.npy"
        np.save(vectors_path, vectors)
        
        # Save metadata
        metadata_path = embeddings_dir / f"metadata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            for record in records:
                f.write(json.dumps(record) + '\n')
        
        logger.info(f"Saved {len(records)} embeddings to {embeddings_dir}")
    
    def store_embeddings_qdrant(self, records: List[Dict], vectors: np.ndarray):
        """Store embeddings in Qdrant"""
        from qdrant_client.models import PointStruct
        
        points = []
        for i, (record, vector) in enumerate(zip(records, vectors)):
            point = PointStruct(
                id=hash(record['chunk_id']) % (2**63),  # Convert to int
                vector=vector.tolist(),
                payload={
                    'chunk_id': record['chunk_id'],
                    'node_id': record['node_id'],
                    'node_path': record['node_path'],
                    'chunk_index': record['chunk_index'],
                    'domain': record['domain'],
                    'concepts': record['concepts'],
                    'extension': record['extension'],
                    'text_preview': record['text'][:500],
                }
            )
            points.append(point)
        
        self.qdrant.upsert(
            collection_name=self.config.collection_name,
            points=points
        )
        
        logger.info(f"Stored {len(points)} embeddings in Qdrant")
    
    def generate(self, batch_size: int = None):
        """Generate embeddings for all knowledge nodes"""
        batch_size = batch_size or self.config.batch_size
        
        logger.info("=" * 60)
        logger.info("BIZRA Embedding Generator")
        logger.info("=" * 60)
        
        self._load_model()
        self._init_qdrant()
        
        total_nodes = count_nodes(self.graph_dir)
        logger.info(f"Processing {total_nodes} nodes...")
        
        batch_records = []
        batch_texts = []
        
        embeddings_dir = self.graph_dir / 'embeddings'
        
        for node in load_knowledge_nodes(self.graph_dir):
            records = self.process_node(node)
            
            for record in records:
                batch_records.append(record)
                batch_texts.append(record['text'])
            
            self.stats['nodes_processed'] += 1
            
            # Process batch
            if len(batch_texts) >= batch_size:
                vectors = self.generate_embedding(batch_texts)
                
                if self.qdrant == "disk":
                    self.store_embeddings_disk(embeddings_dir, batch_records, vectors)
                else:
                    self.store_embeddings_qdrant(batch_records, vectors)
                
                self.stats['embeddings_generated'] += len(vectors)
                
                batch_records = []
                batch_texts = []
                
                if self.stats['nodes_processed'] % 100 == 0:
                    logger.info(f"Processed {self.stats['nodes_processed']}/{total_nodes} nodes...")
        
        # Process remaining
        if batch_texts:
            vectors = self.generate_embedding(batch_texts)
            
            if self.qdrant == "disk":
                self.store_embeddings_disk(embeddings_dir, batch_records, vectors)
            else:
                self.store_embeddings_qdrant(batch_records, vectors)
            
            self.stats['embeddings_generated'] += len(vectors)
        
        # Save statistics
        with open(self.graph_dir / 'embedding_stats.json', 'w') as f:
            json.dump({
                **self.stats,
                'model': self.config.model_name,
                'chunk_size': self.config.chunk_size,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info("=" * 60)
        logger.info("EMBEDDING GENERATION COMPLETE")
        logger.info(f"Nodes: {self.stats['nodes_processed']:,}")
        logger.info(f"Chunks: {self.stats['chunks_created']:,}")
        logger.info(f"Embeddings: {self.stats['embeddings_generated']:,}")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info("=" * 60)


# ============================================================
# CLI INTERFACE
# ============================================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate embeddings for BIZRA Knowledge Graph')
    parser.add_argument('--graph', type=str, required=True,
                        help='Directory containing knowledge graph files')
    parser.add_argument('--source', type=str, default='C:\\BIZRA-DATA-LAKE',
                        help='Source root directory for reading files')
    parser.add_argument('--model', type=str, default='all-MiniLM-L6-v2',
                        help='Sentence transformer model name')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Batch size for embedding generation')
    parser.add_argument('--qdrant-host', type=str, default='localhost',
                        help='Qdrant host')
    parser.add_argument('--qdrant-port', type=int, default=6333,
                        help='Qdrant port')
    
    args = parser.parse_args()
    
    config = EmbeddingConfig(
        model_name=args.model,
        batch_size=args.batch_size,
        qdrant_host=args.qdrant_host,
        qdrant_port=args.qdrant_port,
    )
    
    generator = EmbeddingGenerator(
        graph_dir=Path(args.graph),
        source_root=Path(args.source),
        config=config
    )
    generator.generate()
