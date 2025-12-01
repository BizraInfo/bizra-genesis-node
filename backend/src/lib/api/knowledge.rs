//! BIZRA Hypergraph RAG - API Endpoints
//!
//! REST API for knowledge queries from the Hypergraph RAG system.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::lib::services::knowledge::{HypergraphClient, KnowledgeResult, KnowledgeError};

/// Application state containing knowledge client
pub struct KnowledgeState {
    pub client: Arc<HypergraphClient>,
}

/// Create the knowledge router
pub fn knowledge_router(client: Arc<HypergraphClient>) -> Router {
    let state = Arc::new(KnowledgeState { client });
    
    Router::new()
        .route("/query", post(query_knowledge))
        .route("/enrich", post(enrich_prompt))
        .route("/concepts/:concept", get(find_by_concept))
        .route("/status", get(knowledge_status))
        .with_state(state)
}

// ============================================================
// Request/Response Types
// ============================================================

#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub query: String,
    #[serde(default = "default_max_results")]
    pub max_results: usize,
    #[serde(default = "default_max_hops")]
    pub max_hops: usize,
}

fn default_max_results() -> usize { 20 }
fn default_max_hops() -> usize { 2 }

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    pub success: bool,
    pub query: String,
    pub context: String,
    pub source_count: usize,
    pub concepts: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct EnrichRequest {
    pub prompt: String,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: usize,
}

fn default_max_tokens() -> usize { 4000 }

#[derive(Debug, Serialize)]
pub struct EnrichResponse {
    pub enriched_prompt: String,
    pub context_added: bool,
}

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub available: bool,
    pub graph_path: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ConceptResponse {
    pub concept: String,
    pub files: Vec<SourceInfo>,
}

#[derive(Debug, Serialize)]
pub struct SourceInfo {
    pub path: String,
    pub domain: String,
    pub score: f32,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
}

// ============================================================
// Handlers
// ============================================================

/// Query the knowledge graph
async fn query_knowledge(
    State(state): State<Arc<KnowledgeState>>,
    Json(request): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, (StatusCode, Json<ErrorResponse>)> {
    let result = state.client.query(&request.query).await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                    code: "QUERY_FAILED".to_string(),
                }),
            )
        })?;
    
    Ok(Json(QueryResponse {
        success: true,
        query: result.query,
        context: result.formatted_context,
        source_count: result.source_count,
        concepts: result.concepts,
    }))
}

/// Enrich a prompt with knowledge context
async fn enrich_prompt(
    State(state): State<Arc<KnowledgeState>>,
    Json(request): Json<EnrichRequest>,
) -> Json<EnrichResponse> {
    let enriched = state.client
        .enrich_prompt(&request.prompt, request.max_tokens)
        .await;
    
    let context_added = enriched.len() > request.prompt.len();
    
    Json(EnrichResponse {
        enriched_prompt: enriched,
        context_added,
    })
}

/// Find files by concept
async fn find_by_concept(
    State(state): State<Arc<KnowledgeState>>,
    Path(concept): Path<String>,
) -> Result<Json<ConceptResponse>, (StatusCode, Json<ErrorResponse>)> {
    let sources = state.client.find_by_concept(&concept).await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                    code: "CONCEPT_LOOKUP_FAILED".to_string(),
                }),
            )
        })?;
    
    Ok(Json(ConceptResponse {
        concept,
        files: sources.into_iter().map(|s| SourceInfo {
            path: s.path,
            domain: s.domain,
            score: s.score,
        }).collect(),
    }))
}

/// Check knowledge system status
async fn knowledge_status(
    State(state): State<Arc<KnowledgeState>>,
) -> Json<StatusResponse> {
    let available = state.client.is_available();
    
    Json(StatusResponse {
        available,
        graph_path: "knowledge/graph".to_string(),
        message: if available {
            "Hypergraph RAG is operational".to_string()
        } else {
            "Knowledge graph not found. Run ACTIVATE-GOLD-MINE.bat to build.".to_string()
        },
    })
}
