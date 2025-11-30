// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - EMBEDDINGS                                         ║
// ║  Vector embedding layer for semantic similarity                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Embeddings Module
//!
//! Provides vector embedding capabilities for knowledge nodes:
//!
//! - **EmbeddingProvider**: Interface for embedding generation (Ollama, OpenAI, etc.)
//! - **VectorStore**: In-memory vector storage with similarity search
//! - **Similarity**: Cosine similarity and distance metrics

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use super::NodeId;

/// Result type for embedding operations
pub type EmbeddingResult<T> = Result<T, EmbeddingError>;

/// Embedding-specific errors
#[derive(Debug, thiserror::Error)]
pub enum EmbeddingError {
    #[error("Embedding provider error: {0}")]
    Provider(String),

    #[error("Vector dimension mismatch: expected {expected}, got {got}")]
    DimensionMismatch { expected: usize, got: usize },

    #[error("Vector not found: {0}")]
    NotFound(String),

    #[error("Storage error: {0}")]
    Storage(String),
}

/// Configuration for embedding provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    /// Embedding model name
    pub model: String,
    /// Embedding dimension
    pub dimension: usize,
    /// Provider endpoint (for remote providers)
    pub endpoint: Option<String>,
    /// Maximum batch size
    pub batch_size: usize,
    /// Enable caching
    pub enable_cache: bool,
    /// Cache TTL in seconds
    pub cache_ttl_secs: u64,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            model: "nomic-embed-text".to_string(), // Ollama default
            dimension: 768,
            endpoint: Some("http://localhost:11434".to_string()),
            batch_size: 32,
            enable_cache: true,
            cache_ttl_secs: 3600,
        }
    }
}

impl EmbeddingConfig {
    /// Create config for OpenAI embeddings
    pub fn openai() -> Self {
        Self {
            model: "text-embedding-3-small".to_string(),
            dimension: 1536,
            endpoint: Some("https://api.openai.com/v1".to_string()),
            batch_size: 100,
            enable_cache: true,
            cache_ttl_secs: 3600,
        }
    }

    /// Create config for local Ollama embeddings
    pub fn ollama() -> Self {
        Self::default()
    }

    /// Create config for mock/testing embeddings
    pub fn mock(dimension: usize) -> Self {
        Self {
            model: "mock".to_string(),
            dimension,
            endpoint: None,
            batch_size: 100,
            enable_cache: false,
            cache_ttl_secs: 0,
        }
    }
}

/// Trait for embedding providers
#[async_trait::async_trait]
pub trait EmbeddingProvider: Send + Sync {
    /// Generate embedding for a single text
    async fn embed(&self, text: &str) -> EmbeddingResult<Vec<f32>>;

    /// Generate embeddings for multiple texts (batch)
    async fn embed_batch(&self, texts: &[String]) -> EmbeddingResult<Vec<Vec<f32>>>;

    /// Get the embedding dimension
    fn dimension(&self) -> usize;

    /// Get the model name
    fn model(&self) -> &str;
}

/// Mock embedding provider for testing
pub struct MockEmbeddingProvider {
    dimension: usize,
}

impl MockEmbeddingProvider {
    /// Create a new mock provider
    pub fn new(dimension: usize) -> Self {
        Self { dimension }
    }
}

#[async_trait::async_trait]
impl EmbeddingProvider for MockEmbeddingProvider {
    async fn embed(&self, text: &str) -> EmbeddingResult<Vec<f32>> {
        // Generate deterministic mock embedding based on text hash
        let mut embedding = vec![0.0f32; self.dimension];
        let hash = text.bytes().fold(0u64, |acc, b| acc.wrapping_add(b as u64));

        for (i, val) in embedding.iter_mut().enumerate() {
            *val = ((hash.wrapping_mul(i as u64 + 1) % 1000) as f32 / 1000.0) - 0.5;
        }

        // Normalize
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if magnitude > 0.0 {
            for val in &mut embedding {
                *val /= magnitude;
            }
        }

        Ok(embedding)
    }

    async fn embed_batch(&self, texts: &[String]) -> EmbeddingResult<Vec<Vec<f32>>> {
        let mut results = Vec::with_capacity(texts.len());
        for text in texts {
            results.push(self.embed(text).await?);
        }
        Ok(results)
    }

    fn dimension(&self) -> usize {
        self.dimension
    }

    fn model(&self) -> &str {
        "mock"
    }
}

/// A stored vector with metadata
#[derive(Debug, Clone)]
pub struct StoredVector {
    /// The vector
    pub vector: Vec<f32>,
    /// Associated node ID
    pub node_id: Option<NodeId>,
    /// Text that was embedded
    pub text: String,
    /// Creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Result of a similarity search
#[derive(Debug, Clone)]
pub struct SimilarityResult {
    /// Vector ID
    pub id: Uuid,
    /// Associated node ID
    pub node_id: Option<NodeId>,
    /// Original text
    pub text: String,
    /// Similarity score (0.0 - 1.0)
    pub score: f32,
}

/// In-memory vector store with similarity search
pub struct VectorStore {
    /// Store dimension
    dimension: usize,
    /// Stored vectors
    vectors: HashMap<Uuid, StoredVector>,
    /// Node ID to vector ID mapping
    node_vectors: HashMap<NodeId, Vec<Uuid>>,
}

impl VectorStore {
    /// Create a new vector store
    pub fn new(dimension: usize) -> Self {
        Self {
            dimension,
            vectors: HashMap::new(),
            node_vectors: HashMap::new(),
        }
    }

    /// Add a vector to the store
    pub fn add(
        &mut self,
        vector: Vec<f32>,
        node_id: Option<NodeId>,
        text: impl Into<String>,
    ) -> EmbeddingResult<Uuid> {
        if vector.len() != self.dimension {
            return Err(EmbeddingError::DimensionMismatch {
                expected: self.dimension,
                got: vector.len(),
            });
        }

        let id = Uuid::new_v4();
        let text = text.into();

        let stored = StoredVector {
            vector,
            node_id,
            text,
            created_at: chrono::Utc::now(),
        };

        // Index by node if provided
        if let Some(nid) = node_id {
            self.node_vectors.entry(nid).or_default().push(id);
        }

        self.vectors.insert(id, stored);
        Ok(id)
    }

    /// Get a vector by ID
    pub fn get(&self, id: &Uuid) -> Option<&StoredVector> {
        self.vectors.get(id)
    }

    /// Remove a vector by ID
    pub fn remove(&mut self, id: &Uuid) -> Option<StoredVector> {
        if let Some(stored) = self.vectors.remove(id) {
            // Remove from node index
            if let Some(node_id) = stored.node_id {
                if let Some(vector_ids) = self.node_vectors.get_mut(&node_id) {
                    vector_ids.retain(|vid| vid != id);
                }
            }
            Some(stored)
        } else {
            None
        }
    }

    /// Search for similar vectors
    pub fn search(&self, query: &[f32], top_k: usize, min_score: f32) -> Vec<SimilarityResult> {
        if query.len() != self.dimension {
            return Vec::new();
        }

        let mut results: Vec<_> = self
            .vectors
            .iter()
            .filter_map(|(id, stored)| {
                let score = cosine_similarity(query, &stored.vector);
                if score >= min_score {
                    Some(SimilarityResult {
                        id: *id,
                        node_id: stored.node_id,
                        text: stored.text.clone(),
                        score,
                    })
                } else {
                    None
                }
            })
            .collect();

        // Sort by score descending
        results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results.truncate(top_k);
        results
    }

    /// Get vectors for a node
    pub fn get_node_vectors(&self, node_id: &NodeId) -> Vec<&StoredVector> {
        self.node_vectors
            .get(node_id)
            .map(|ids| ids.iter().filter_map(|id| self.vectors.get(id)).collect())
            .unwrap_or_default()
    }

    /// Number of stored vectors
    pub fn len(&self) -> usize {
        self.vectors.len()
    }

    /// Check if store is empty
    pub fn is_empty(&self) -> bool {
        self.vectors.is_empty()
    }

    /// Clear all vectors
    pub fn clear(&mut self) {
        self.vectors.clear();
        self.node_vectors.clear();
    }
}

/// Calculate cosine similarity between two vectors
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if mag_a == 0.0 || mag_b == 0.0 {
        return 0.0;
    }

    dot / (mag_a * mag_b)
}

/// Calculate euclidean distance between two vectors
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return f32::MAX;
    }

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f32>()
        .sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 0.001);

        let c = vec![0.0, 1.0, 0.0];
        assert!(cosine_similarity(&a, &c).abs() < 0.001); // Orthogonal

        let d = vec![-1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &d) + 1.0).abs() < 0.001); // Opposite
    }

    #[test]
    fn test_euclidean_distance() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![3.0, 4.0, 0.0];
        assert!((euclidean_distance(&a, &b) - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_vector_store_add_search() {
        let mut store = VectorStore::new(3);

        store.add(vec![1.0, 0.0, 0.0], None, "vector 1").unwrap();
        store.add(vec![0.9, 0.1, 0.0], None, "vector 2").unwrap();
        store.add(vec![0.0, 1.0, 0.0], None, "vector 3").unwrap();

        let results = store.search(&[1.0, 0.0, 0.0], 2, 0.5);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].text, "vector 1");
        assert_eq!(results[1].text, "vector 2");
    }

    #[test]
    fn test_vector_store_dimension_check() {
        let mut store = VectorStore::new(3);

        let result = store.add(vec![1.0, 0.0], None, "wrong dimension");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_mock_embedding_provider() {
        let provider = MockEmbeddingProvider::new(128);

        let embedding = provider.embed("hello world").await.unwrap();
        assert_eq!(embedding.len(), 128);

        // Check normalization
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((magnitude - 1.0).abs() < 0.01);

        // Same text should produce same embedding
        let embedding2 = provider.embed("hello world").await.unwrap();
        assert!((cosine_similarity(&embedding, &embedding2) - 1.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_mock_embedding_batch() {
        let provider = MockEmbeddingProvider::new(64);

        let texts = vec!["hello".to_string(), "world".to_string(), "test".to_string()];
        let embeddings = provider.embed_batch(&texts).await.unwrap();

        assert_eq!(embeddings.len(), 3);
        for emb in embeddings {
            assert_eq!(emb.len(), 64);
        }
    }

    #[test]
    fn test_vector_store_node_association() {
        let mut store = VectorStore::new(3);
        let node_id = Uuid::new_v4();

        store
            .add(vec![1.0, 0.0, 0.0], Some(node_id), "node vector 1")
            .unwrap();
        store
            .add(vec![0.0, 1.0, 0.0], Some(node_id), "node vector 2")
            .unwrap();

        let node_vectors = store.get_node_vectors(&node_id);
        assert_eq!(node_vectors.len(), 2);
    }
}
