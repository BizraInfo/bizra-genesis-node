// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - KNOWLEDGE MODULE                                    ║
// ║  HyperGraph RAG for knowledge synthesis and retrieval                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Knowledge Module
//!
//! Implements HyperGraph-based Retrieval Augmented Generation (RAG) for
//! knowledge synthesis. This module provides:
//!
//! - **HyperGraph**: Knowledge graph with hyperedges connecting multiple nodes
//! - **Embeddings**: Vector embedding layer for semantic similarity
//! - **Retrieval**: RAG engine for context-aware knowledge retrieval
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    Knowledge Pipeline                        │
//! ├─────────────────────────────────────────────────────────────┤
//! │  Query → Embedding → HyperGraph Traversal → Retrieval       │
//! │                           ↓                                  │
//! │                   Context Augmentation                       │
//! │                           ↓                                  │
//! │                   MOE Synthesis                              │
//! └─────────────────────────────────────────────────────────────┘
//! ```

pub mod embeddings;
pub mod hypergraph;
pub mod retrieval;

// Re-export public types
pub use embeddings::{EmbeddingConfig, EmbeddingProvider, EmbeddingResult, VectorStore};
pub use hypergraph::{
    HyperEdge, HyperGraph, HyperGraphConfig, KnowledgeNode, NodeId, NodeType, RelationType,
};
pub use retrieval::{
    RagConfig, RagContext, RagEngine, RagError, RagResult, RetrievalResult, RetrievedChunk,
};

/// Knowledge module version
pub const VERSION: &str = "0.1.0";

/// Knowledge module error types
#[derive(Debug, thiserror::Error)]
pub enum KnowledgeError {
    #[error("Embedding error: {0}")]
    Embedding(String),

    #[error("Graph error: {0}")]
    Graph(String),

    #[error("Retrieval error: {0}")]
    Retrieval(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Storage error: {0}")]
    Storage(String),
}

/// Knowledge module result type
pub type KnowledgeResult<T> = Result<T, KnowledgeError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        // Verify all public types are accessible
        let _ = HyperGraphConfig::default();
        let _ = EmbeddingConfig::default();
        let _ = RagConfig::default();
    }
}
