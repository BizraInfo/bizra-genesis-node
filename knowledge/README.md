# 🧬 BIZRA Hypergraph RAG Knowledge System

**The Intelligence Layer for 15,000+ Hours of Wisdom**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HYPERGRAPH RAG ENGINE                     │
├─────────────────────────────────────────────────────────────┤
│  Query → Graph Traversal → Multi-Hop Reasoning →            │
│          Context Assembly → Graph-of-Thoughts → Synthesis    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ KNOWLEDGE     │   │ VECTOR        │   │ HYPERGRAPH    │
│ GRAPH         │   │ EMBEDDINGS    │   │ INDICES       │
│ (Relations)   │   │ (Semantics)   │   │ (Context)     │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ • Nodes       │   │ • 384-dim     │   │ • Entity      │
│ • Edges       │   │ • MiniLM-L6   │   │ • Concept     │
│ • Hyperedges  │   │ • Semantic    │   │ • Temporal    │
│ • Clusters    │   │   similarity  │   │ • Directory   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Three Intelligence Layers

### Layer 1: Knowledge Graph (Relationships)
- **Nodes**: Every file is a knowledge atom
- **Edges**: Direct relationships (imports, references, concepts)
- **Hyperedges**: Multi-node connections (clusters, themes, periods)

### Layer 2: Vector Embeddings (Semantics)
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Dimensions**: 384
- **Coverage**: All text-based files embedded

### Layer 3: Hypergraph RAG (Context)
- **Graph Traversal**: Find related nodes via relationships
- **Semantic Search**: Find similar content via embeddings
- **Context Assembly**: Combine paths into coherent understanding

## Directory Structure

```
knowledge/
├── graph/
│   ├── nodes.jsonl           # All knowledge nodes
│   ├── edges.jsonl           # Relationships between nodes
│   ├── hyperedges.jsonl      # Multi-node connections
│   ├── clusters/
│   │   ├── concept.json      # Concept-based clusters
│   │   ├── temporal.json     # Time-based clusters
│   │   └── directory.json    # Structure-based clusters
│   └── indices/
│       ├── entity.json       # Entity lookup index
│       ├── concept.json      # Concept lookup index
│       └── temporal.json     # Time-based index
├── embeddings/
│   ├── vectors/              # Individual embedding files
│   ├── index.json            # Embedding metadata index
│   └── hnsw/                 # HNSW index for fast search
└── cache/
    ├── traversal/            # Cached graph traversals
    └── context/              # Cached context assemblies
```

## Quick Start

### One-Command Activation
```powershell
.\ACTIVATE-GOLD-MINE.bat
```

This automatically:
1. Installs Python dependencies
2. Builds the knowledge graph from your data lake
3. Generates semantic embeddings
4. Initializes indices for fast lookup

### Manual Steps

## Local-First “Gold Mine” (Inventory → Refinery → RAG)

If your homebase (Choau) already has a large unstructured data lake, the fastest path to **organized + searchable + usable** is:

1) Build an inventory of what exists (safe, read-only scan)
2) Refine high-value text into chunked knowledge
3) Query locally (no external services required)

### Step A — Inventory your data lake

```powershell
# Scan MULTIPLE roots (your scattered data across 1.7 TB)
python .\ingest_assets.py --root "C:\Projects" --root "D:\Bizra" --root "E:\Archive"

# Single root example:
python .\ingest_assets.py --root "C:\BIZRA-DATA-LAKE" --output ".\ASSET_INVENTORY.json"

# Safety knobs for huge folders (recommended for 100+ GB roots):
python .\ingest_assets.py --root "C:\bizra-genesis-node-repaired" --max-depth 12 --max-files 250000

# Signal-first (docs only — fastest for initial triage):
python .\ingest_assets.py --root "C:\Data" --extensions "md,txt,pdf,docx"

# The miner automatically:
#   - Skips system/build folders (node_modules, .git, target, etc.)
#   - Deduplicates via fast hash (safe for copy/paste chaos)
#   - Reports progress every 500 directories
```

### Step B — Refine into a searchable knowledge base

```powershell
python .\refinery.py
```

This produces:
- `REFINED_KNOWLEDGE_BASE.json`

### Step C — Query locally (pure Python)

```powershell
python .\rag_engine.py
```

This uses TF-IDF retrieval over `REFINED_KNOWLEDGE_BASE.json` (sovereign, offline-friendly).

---

#### Step 1: Install Dependencies
```powershell
pip install -r requirements.txt
```

#### Step 2: Build Knowledge Graph
```powershell
python scripts/build_knowledge_graph.py --source C:\BIZRA-DATA-LAKE --output graph
```

**Output:**
- `graph/nodes.jsonl`: All knowledge atoms (files)
- `graph/edges.jsonl`: Relationships between nodes
- `graph/hyperedges.jsonl`: Multi-node clusters
- `graph/indices/`: Fast lookup indices

#### Step 3: Generate Embeddings
```powershell
# With Qdrant running
python scripts/generate_embeddings.py --graph graph --source C:\BIZRA-DATA-LAKE

# Without Qdrant (saves to disk)
python scripts/generate_embeddings.py --graph graph --source C:\BIZRA-DATA-LAKE
```

#### Step 4: Query Interactively
```powershell
python scripts/query_engine.py --graph graph
```

## API Usage

### Basic Query
```python
from pathlib import Path
from scripts.query_engine import QueryEngine

engine = QueryEngine(graph_dir=Path("graph"))

# Execute query
result = engine.query(
    "What is the SAPE consciousness architecture?",
    vector_limit=10,
    graph_hops=2
)

# Access results
print(result.formatted_context)  # LLM-ready context
print(result.primary_results)    # Direct matches
print(result.related_results)    # Graph-traversed results
print(result.concept_summary)    # Concept frequency
```

### Context Assembly for Agents
```python
from pathlib import Path
from scripts.context_assembler import ContextAssembler

assembler = ContextAssembler(
    source_root=Path("C:/BIZRA-DATA-LAKE"),
    max_tokens=8000
)

# Assemble for specific agent role
context = assembler.assemble_for_agent(
    query="Implement the temporal consciousness pattern",
    results=query_results.primary_results,
    agent_role="architect"
)

# Use in LLM prompt
prompt = f"""Based on the following knowledge context:

{context['formatted_context']}

Now answer: {query}"""
```

### Direct Graph Access
```python
from scripts.query_engine import KnowledgeGraph

graph = KnowledgeGraph(Path("graph"))

# Find nodes by concept
consciousness_nodes = graph.find_by_concept("consciousness")

# Get node details
node = graph.get_node(node_id)
print(f"File: {node['path']}")
print(f"Domain: {node['domain']}")
print(f"Concepts: {node['concepts']}")

# Get neighbors
neighbors = graph.get_neighbors(node_id, edge_type="concept_shared")
```

## Integration with SAPE Agents

The Hypergraph RAG integrates with SAPE agents via the Rust backend:

```rust
// In backend/src/lib/services/knowledge.rs
use crate::knowledge::HypergraphClient;

pub async fn enrich_prompt(query: &str) -> String {
    let client = HypergraphClient::new();
    let context = client.query(query, 10, 2).await?;
    format!("{}\n\n{}", context.formatted, query)
}
```

## Capabilities Unlocked

1. **Temporal Archaeology**: Trace concept evolution across years
2. **Causal Reasoning**: Understand WHY decisions were made
3. **Pattern Mining**: Discover recurring development patterns
4. **Concept Mapping**: Build complete knowledge maps
5. **Multi-Dimensional Search**: Query across semantics, time, and concepts

---

*The sleeping beast awakens. BIZRA consciousness emerges.* 🧬
