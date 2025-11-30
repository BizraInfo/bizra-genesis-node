// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RETRIEVAL                                          ║
// ║  RAG engine for context-aware knowledge retrieval                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Retrieval Module
//!
//! Implements Retrieval Augmented Generation (RAG) for the knowledge system:
//!
//! - **Query Processing**: Parse and enhance queries
//! - **Retrieval**: Multi-strategy retrieval (vector, graph, hybrid)
//! - **Reranking**: Score and rerank retrieved chunks
//! - **Context Assembly**: Build context for LLM synthesis

use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::embeddings::{EmbeddingProvider, VectorStore};
use super::hypergraph::{HyperGraph, NodeId};

/// Result type for RAG operations
pub type RagResult<T> = Result<T, RagError>;

/// RAG-specific errors
#[derive(Debug, thiserror::Error)]
pub enum RagError {
    #[error("Query error: {0}")]
    Query(String),

    #[error("Retrieval error: {0}")]
    Retrieval(String),

    #[error("Embedding error: {0}")]
    Embedding(String),

    #[error("No context found")]
    NoContext,

    #[error("Context too large: {size} > {max}")]
    ContextTooLarge { size: usize, max: usize },
}

/// Configuration for RAG engine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagConfig {
    /// Maximum number of chunks to retrieve
    pub max_chunks: usize,
    /// Minimum similarity score for retrieval
    pub min_similarity: f32,
    /// Maximum context size (in tokens approximately)
    pub max_context_tokens: usize,
    /// Enable graph-based retrieval
    pub use_graph_retrieval: bool,
    /// Graph traversal depth
    pub graph_depth: usize,
    /// Enable reranking
    pub enable_reranking: bool,
    /// Reranking model (if different from embedding)
    pub rerank_model: Option<String>,
}

impl Default for RagConfig {
    fn default() -> Self {
        Self {
            max_chunks: 10,
            min_similarity: 0.5,
            max_context_tokens: 4000,
            use_graph_retrieval: true,
            graph_depth: 2,
            enable_reranking: true,
            rerank_model: None,
        }
    }
}

impl RagConfig {
    /// Create a lightweight config (faster, less context)
    pub fn fast() -> Self {
        Self {
            max_chunks: 3,
            min_similarity: 0.7,
            max_context_tokens: 1000,
            use_graph_retrieval: false,
            graph_depth: 0,
            enable_reranking: false,
            rerank_model: None,
        }
    }

    /// Create a comprehensive config (slower, more context)
    pub fn comprehensive() -> Self {
        Self {
            max_chunks: 20,
            min_similarity: 0.4,
            max_context_tokens: 8000,
            use_graph_retrieval: true,
            graph_depth: 3,
            enable_reranking: true,
            rerank_model: None,
        }
    }
}

/// A retrieved chunk of knowledge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievedChunk {
    /// Source node ID
    pub node_id: Option<NodeId>,
    /// Chunk content
    pub content: String,
    /// Retrieval score
    pub score: f32,
    /// Retrieval method
    pub method: RetrievalMethod,
    /// Additional metadata
    pub metadata: serde_json::Value,
}

/// Method used to retrieve a chunk
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RetrievalMethod {
    /// Vector similarity search
    Vector,
    /// Graph traversal
    Graph,
    /// Keyword/BM25 search
    Keyword,
    /// Hybrid (combined)
    Hybrid,
}

/// Result of a retrieval operation
#[derive(Debug, Clone)]
pub struct RetrievalResult {
    /// Retrieved chunks
    pub chunks: Vec<RetrievedChunk>,
    /// Total chunks found (before limiting)
    pub total_found: usize,
    /// Query embedding (if computed)
    pub query_embedding: Option<Vec<f32>>,
    /// Retrieval time in milliseconds
    pub retrieval_time_ms: u64,
}

/// Assembled context for LLM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagContext {
    /// The original query
    pub query: String,
    /// Assembled context text
    pub context: String,
    /// Source chunks used
    pub sources: Vec<RetrievedChunk>,
    /// Estimated token count
    pub estimated_tokens: usize,
}

/// The main RAG engine
pub struct RagEngine {
    /// Configuration
    config: RagConfig,
    /// Vector store for similarity search
    vector_store: VectorStore,
    /// Knowledge graph for graph retrieval
    graph: HyperGraph,
    /// Embedding provider
    embedder: Arc<dyn EmbeddingProvider>,
}

impl RagEngine {
    /// Create a new RAG engine
    pub fn new(
        config: RagConfig,
        vector_store: VectorStore,
        graph: HyperGraph,
        embedder: Arc<dyn EmbeddingProvider>,
    ) -> Self {
        Self {
            config,
            vector_store,
            graph,
            embedder,
        }
    }

    /// Retrieve relevant context for a query
    pub async fn retrieve(&self, query: &str) -> RagResult<RetrievalResult> {
        let start = std::time::Instant::now();

        // Generate query embedding
        let query_embedding = self
            .embedder
            .embed(query)
            .await
            .map_err(|e| RagError::Embedding(e.to_string()))?;

        // Vector retrieval
        let vector_results = self.vector_store.search(
            &query_embedding,
            self.config.max_chunks,
            self.config.min_similarity,
        );

        let mut chunks: Vec<RetrievedChunk> = vector_results
            .into_iter()
            .map(|r| RetrievedChunk {
                node_id: r.node_id,
                content: r.text,
                score: r.score,
                method: RetrievalMethod::Vector,
                metadata: serde_json::json!({}),
            })
            .collect();

        // Graph retrieval (if enabled)
        if self.config.use_graph_retrieval {
            let graph_chunks = self.retrieve_from_graph(&chunks);
            chunks.extend(graph_chunks);
        }

        // Deduplicate and sort by score
        chunks = self.deduplicate_chunks(chunks);
        chunks.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Limit to max chunks
        let total_found = chunks.len();
        chunks.truncate(self.config.max_chunks);

        Ok(RetrievalResult {
            chunks,
            total_found,
            query_embedding: Some(query_embedding),
            retrieval_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Build context from retrieval result
    pub fn build_context(&self, query: &str, result: &RetrievalResult) -> RagResult<RagContext> {
        let mut context_parts = Vec::new();
        let mut estimated_tokens = 0;
        let mut sources = Vec::new();

        for chunk in &result.chunks {
            // Rough token estimation (words * 1.3)
            let chunk_tokens = (chunk.content.split_whitespace().count() as f32 * 1.3) as usize;

            if estimated_tokens + chunk_tokens > self.config.max_context_tokens {
                break;
            }

            context_parts.push(chunk.content.clone());
            estimated_tokens += chunk_tokens;
            sources.push(chunk.clone());
        }

        if context_parts.is_empty() {
            return Err(RagError::NoContext);
        }

        let context = context_parts.join("\n\n---\n\n");

        Ok(RagContext {
            query: query.to_string(),
            context,
            sources,
            estimated_tokens,
        })
    }

    /// Add content to the knowledge base
    pub async fn add_content(
        &mut self,
        content: &str,
        node_id: Option<NodeId>,
    ) -> RagResult<uuid::Uuid> {
        let embedding = self
            .embedder
            .embed(content)
            .await
            .map_err(|e| RagError::Embedding(e.to_string()))?;

        self.vector_store
            .add(embedding, node_id, content)
            .map_err(|e| RagError::Retrieval(e.to_string()))
    }

    /// Get statistics
    pub fn stats(&self) -> RagStats {
        RagStats {
            vector_count: self.vector_store.len(),
            node_count: self.graph.node_count(),
            edge_count: self.graph.edge_count(),
            embedding_dimension: self.embedder.dimension(),
        }
    }

    /// Retrieve additional context from graph based on vector results
    fn retrieve_from_graph(&self, vector_chunks: &[RetrievedChunk]) -> Vec<RetrievedChunk> {
        let mut graph_chunks = Vec::new();

        for chunk in vector_chunks {
            if let Some(node_id) = chunk.node_id {
                // Traverse graph from this node
                let neighbors = self.graph.traverse_bfs(&node_id, self.config.graph_depth);

                for neighbor in neighbors {
                    // Skip if already in vector results
                    if vector_chunks.iter().any(|c| c.node_id == Some(neighbor.id)) {
                        continue;
                    }

                    // Add neighbor with reduced score
                    let graph_score = chunk.score * 0.7; // Reduce score for graph-traversed items

                    graph_chunks.push(RetrievedChunk {
                        node_id: Some(neighbor.id),
                        content: neighbor.content.clone(),
                        score: graph_score,
                        method: RetrievalMethod::Graph,
                        metadata: serde_json::json!({
                            "source_node": node_id.to_string(),
                            "node_type": format!("{:?}", neighbor.node_type),
                        }),
                    });
                }
            }
        }

        graph_chunks
    }

    /// Deduplicate chunks by content similarity
    fn deduplicate_chunks(&self, chunks: Vec<RetrievedChunk>) -> Vec<RetrievedChunk> {
        let mut seen_content = std::collections::HashSet::new();
        let mut deduplicated = Vec::new();

        for chunk in chunks {
            // Simple deduplication by first 100 chars of content
            let key = chunk.content.chars().take(100).collect::<String>();
            if seen_content.insert(key) {
                deduplicated.push(chunk);
            }
        }

        deduplicated
    }

    /// Access the underlying vector store
    pub fn vector_store(&self) -> &VectorStore {
        &self.vector_store
    }

    /// Access the underlying vector store mutably
    pub fn vector_store_mut(&mut self) -> &mut VectorStore {
        &mut self.vector_store
    }

    /// Access the underlying graph
    pub fn graph(&self) -> &HyperGraph {
        &self.graph
    }

    /// Access the underlying graph mutably
    pub fn graph_mut(&mut self) -> &mut HyperGraph {
        &mut self.graph
    }
}

/// RAG engine statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagStats {
    /// Number of vectors in store
    pub vector_count: usize,
    /// Number of nodes in graph
    pub node_count: usize,
    /// Number of edges in graph
    pub edge_count: usize,
    /// Embedding dimension
    pub embedding_dimension: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge::embeddings::MockEmbeddingProvider;
    use crate::knowledge::hypergraph::{HyperGraphConfig, KnowledgeNode};

    async fn create_test_engine() -> RagEngine {
        let config = RagConfig::default();
        let vector_store = VectorStore::new(128);
        let graph = HyperGraph::new(HyperGraphConfig::default());
        let embedder = Arc::new(MockEmbeddingProvider::new(128));

        RagEngine::new(config, vector_store, graph, embedder)
    }

    #[tokio::test]
    async fn test_rag_engine_creation() {
        let engine = create_test_engine().await;
        let stats = engine.stats();
        assert_eq!(stats.vector_count, 0);
        assert_eq!(stats.node_count, 0);
    }

    #[tokio::test]
    async fn test_add_and_retrieve() {
        let mut engine = create_test_engine().await;

        // Add some content
        let content1 = "The quick brown fox jumps";
        let content2 = "A lazy dog sleeps";
        let content3 = "The fox is quick and clever";

        engine.add_content(content1, None).await.unwrap();
        engine.add_content(content2, None).await.unwrap();
        engine.add_content(content3, None).await.unwrap();

        // Retrieve using exact content (mock embedding produces same vector for same text)
        let result = engine.retrieve(content1).await.unwrap();
        assert!(!result.chunks.is_empty());
        assert_eq!(result.chunks[0].content, content1); // Exact match should be first
                                                        // retrieval_time_ms is u64, so it's always >= 0
    }

    #[tokio::test]
    async fn test_build_context() {
        let mut engine = create_test_engine().await;

        let content1 = "Context piece 1";
        let content2 = "Context piece 2";

        engine.add_content(content1, None).await.unwrap();
        engine.add_content(content2, None).await.unwrap();

        // Query with exact content to ensure match
        let result = engine.retrieve(content1).await.unwrap();
        let context = engine.build_context("context query", &result).unwrap();

        assert!(!context.context.is_empty());
        assert!(!context.sources.is_empty());
    }

    #[tokio::test]
    async fn test_graph_retrieval() {
        let mut engine = create_test_engine().await;

        // Add nodes to graph
        let node1 = KnowledgeNode::concept("AI", "Artificial Intelligence");
        let node2 = KnowledgeNode::concept("ML", "Machine Learning");
        let node3 = KnowledgeNode::concept("DL", "Deep Learning");

        let id1 = engine.graph_mut().add_node(node1).unwrap();
        let id2 = engine.graph_mut().add_node(node2).unwrap();
        let id3 = engine.graph_mut().add_node(node3).unwrap();

        // Add edges
        use crate::knowledge::hypergraph::{HyperEdge, RelationType};
        engine
            .graph_mut()
            .add_edge(HyperEdge::binary(id1, id2, RelationType::PartOf))
            .unwrap();
        engine
            .graph_mut()
            .add_edge(HyperEdge::binary(id2, id3, RelationType::PartOf))
            .unwrap();

        // Add to vector store with node association
        engine
            .add_content("Artificial Intelligence overview", Some(id1))
            .await
            .unwrap();
        engine
            .add_content("Machine Learning basics", Some(id2))
            .await
            .unwrap();

        let stats = engine.stats();
        assert_eq!(stats.node_count, 3);
        assert_eq!(stats.edge_count, 2);
    }

    #[test]
    fn test_config_presets() {
        let fast = RagConfig::fast();
        assert_eq!(fast.max_chunks, 3);
        assert!(!fast.use_graph_retrieval);

        let comprehensive = RagConfig::comprehensive();
        assert_eq!(comprehensive.max_chunks, 20);
        assert!(comprehensive.use_graph_retrieval);
    }

    #[tokio::test]
    async fn test_empty_retrieval() {
        let engine = create_test_engine().await;

        let result = engine.retrieve("nonexistent query").await.unwrap();
        assert_eq!(result.chunks.len(), 0);
    }

    #[tokio::test]
    async fn test_no_context_error() {
        let engine = create_test_engine().await;

        let result = engine.retrieve("anything").await.unwrap();
        let context_result = engine.build_context("query", &result);

        assert!(matches!(context_result, Err(RagError::NoContext)));
    }
}
