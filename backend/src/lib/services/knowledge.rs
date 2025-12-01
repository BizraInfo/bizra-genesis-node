//! BIZRA Hypergraph RAG - Rust Integration
//!
//! Provides knowledge retrieval from the Hypergraph RAG system
//! for SAPE agents and other backend services.

use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tokio::sync::OnceCell;

/// Global knowledge client instance
static KNOWLEDGE_CLIENT: OnceCell<HypergraphClient> = OnceCell::const_new();

/// Get the global knowledge client
pub async fn knowledge_client() -> &'static HypergraphClient {
    KNOWLEDGE_CLIENT.get_or_init(|| async {
        HypergraphClient::new()
    }).await
}

/// Knowledge query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeResult {
    pub query: String,
    pub formatted_context: String,
    pub source_count: usize,
    pub concepts: Vec<String>,
    pub sources: Vec<KnowledgeSource>,
}

/// A knowledge source (file reference)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeSource {
    pub path: String,
    pub domain: String,
    pub score: f32,
    pub concepts: Vec<String>,
}

/// Configuration for the Hypergraph client
#[derive(Debug, Clone)]
pub struct HypergraphConfig {
    pub graph_dir: PathBuf,
    pub source_root: PathBuf,
    pub python_path: String,
    pub query_script: PathBuf,
    pub max_results: usize,
    pub max_hops: usize,
}

impl Default for HypergraphConfig {
    fn default() -> Self {
        let base = std::env::current_dir().unwrap_or_default();
        Self {
            graph_dir: base.join("knowledge/graph"),
            source_root: PathBuf::from(r"C:\BIZRA-DATA-LAKE"),
            python_path: "python".to_string(),
            query_script: base.join("knowledge/scripts/query_engine.py"),
            max_results: 20,
            max_hops: 2,
        }
    }
}

/// Client for querying the Hypergraph RAG system
#[derive(Debug)]
pub struct HypergraphClient {
    config: HypergraphConfig,
}

impl HypergraphClient {
    /// Create a new Hypergraph client with default config
    pub fn new() -> Self {
        Self {
            config: HypergraphConfig::default(),
        }
    }

    /// Create a new Hypergraph client with custom config
    pub fn with_config(config: HypergraphConfig) -> Self {
        Self { config }
    }

    /// Query the knowledge graph
    ///
    /// Returns formatted context suitable for LLM prompts
    pub async fn query(&self, query: &str) -> Result<KnowledgeResult, KnowledgeError> {
        // For now, we call the Python script directly
        // In production, this would use a FastAPI server
        self.query_via_python(query).await
    }

    /// Query by spawning Python process
    async fn query_via_python(&self, query: &str) -> Result<KnowledgeResult, KnowledgeError> {
        let output = Command::new(&self.config.python_path)
            .arg(&self.config.query_script)
            .arg("--graph")
            .arg(&self.config.graph_dir)
            .arg("--query")
            .arg(query)
            .output()
            .map_err(|e| KnowledgeError::PythonExecution(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(KnowledgeError::QueryFailed(stderr.to_string()));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Parse the formatted context output
        Ok(KnowledgeResult {
            query: query.to_string(),
            formatted_context: stdout.to_string(),
            source_count: 0, // Would be parsed from JSON in production
            concepts: Vec::new(),
            sources: Vec::new(),
        })
    }

    /// Enrich a prompt with relevant knowledge context
    pub async fn enrich_prompt(&self, prompt: &str, max_tokens: usize) -> String {
        match self.query(prompt).await {
            Ok(result) => {
                let context = truncate_context(&result.formatted_context, max_tokens);
                format!(
                    "# Relevant Knowledge Context\n\n{}\n\n---\n\n# User Query\n\n{}",
                    context, prompt
                )
            }
            Err(e) => {
                tracing::warn!("Knowledge query failed: {:?}", e);
                prompt.to_string()
            }
        }
    }

    /// Find files related to a concept
    pub async fn find_by_concept(&self, concept: &str) -> Result<Vec<KnowledgeSource>, KnowledgeError> {
        // Simplified implementation - would query indices directly
        let result = self.query(&format!("Files related to {}", concept)).await?;
        Ok(result.sources)
    }

    /// Check if the knowledge graph is available
    pub fn is_available(&self) -> bool {
        self.config.graph_dir.join("nodes.jsonl").exists()
    }
}

/// Truncate context to fit token budget
fn truncate_context(context: &str, max_tokens: usize) -> String {
    // Rough estimate: 1 token ≈ 4 characters
    let max_chars = max_tokens * 4;
    
    if context.len() <= max_chars {
        context.to_string()
    } else {
        format!("{}...\n\n[Context truncated]", &context[..max_chars])
    }
}

/// Knowledge system errors
#[derive(Debug, thiserror::Error)]
pub enum KnowledgeError {
    #[error("Python execution failed: {0}")]
    PythonExecution(String),
    
    #[error("Query failed: {0}")]
    QueryFailed(String),
    
    #[error("Graph not found")]
    GraphNotFound,
    
    #[error("Index not available")]
    IndexNotAvailable,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client_creation() {
        let client = HypergraphClient::new();
        assert!(!client.config.graph_dir.as_os_str().is_empty());
    }

    #[test]
    fn test_truncate_context() {
        let long_text = "a".repeat(10000);
        let truncated = truncate_context(&long_text, 500);
        assert!(truncated.len() < 10000);
        assert!(truncated.contains("[Context truncated]"));
    }
}
