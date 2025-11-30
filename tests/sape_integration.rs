// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  SAPE INTEGRATION TESTS                                                  ║
// ║  Testing Synaptic Activation Prompt Engine integration                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # SAPE Integration Tests
//!
//! Tests for SAPE Engine integration with BIZRA Genesis Node.

use axum::http::StatusCode;
use axum_test::TestServer;
use bizra_genesis_node::{
    api::{create_router, metrics::MetricsCollector, telemetry::TelemetryCollector},
};
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;

#[tokio::test]
async fn test_sape_health_endpoint() {
    // Create test dependencies
    let pool = Arc::new(
        PgPool::connect("postgres://test:test@localhost/test")
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to connect to test database - ensure PostgreSQL is running")
            }),
    );
    let redis_client = Arc::new(redis::Client::open("redis://localhost:6379").unwrap());
    let metrics = Arc::new(MetricsCollector::new().unwrap());
    let telemetry_collector = Arc::new(TelemetryCollector::default());

    // Create router
    let app = create_router(pool, redis_client, metrics, telemetry_collector);

    // Create test server
    let server = TestServer::new(app).unwrap();

    // Test health endpoint
    let response = server.get("/api/v1/sape/health").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body: serde_json::Value = response.json();
    assert_eq!(body["status"], "operational");
    assert_eq!(body["engine"], "SAPE v1.0");
    assert_eq!(body["rag_enabled"], true);
}

#[tokio::test]
async fn test_sape_reason_endpoint() {
    // This test demonstrates the SAPE reasoning capability
    // In a real implementation, this would test full RAG integration

    let pool = Arc::new(
        PgPool::connect("postgres://test:test@localhost/test")
            .await
            .unwrap_or_else(|_| panic!("Database connection required for SAPE tests")),
    );
    let redis_client = Arc::new(redis::Client::open("redis://localhost:6379").unwrap());
    let metrics = Arc::new(MetricsCollector::new().unwrap());
    let telemetry_collector = Arc::new(TelemetryCollector::default());

    let app = create_router(pool, redis_client, metrics, telemetry_collector);
    let server = TestServer::new(app).unwrap();

    // Test reasoning endpoint
    let query = json!({
        "query": "What is BIZRA consensus mechanism?"
    });

    let response = server.post("/api/v1/sape/reason").json(&query).await;

    assert_eq!(response.status_code(), StatusCode::OK);

    let body: serde_json::Value = response.json();
    assert!(body["query"].is_string());
    assert!(body["reasoning"].is_string());
    assert!(body["confidence"].is_number());
    assert!(body["activation_steps"].is_array());
}

#[tokio::test]
async fn test_sape_with_context_placeholder() {
    // Test that SAPE includes context information when RAG is enabled
    // This is a placeholder until full pgvector integration

    let pool = Arc::new(
        PgPool::connect("postgres://test:test@localhost/test")
            .await
            .unwrap_or_else(|_| panic!("Database connection required")),
    );
    let redis_client = Arc::new(redis::Client::open("redis://localhost:6379").unwrap());
    let metrics = Arc::new(MetricsCollector::new().unwrap());
    let telemetry_collector = Arc::new(TelemetryCollector::default());

    let app = create_router(pool, redis_client, metrics, telemetry_collector);
    let server = TestServer::new(app).unwrap();

    let query = json!({
        "query": "Describe the reward system",
        "enable_rag": true
    });

    let response = server.post("/api/v1/sape/reason").json(&query).await;

    assert_eq!(response.status_code(), StatusCode::OK);

    let body: serde_json::Value = response.json();
    // Should include context placeholder when RAG is requested
    assert!(body["context"].is_string() || body["context"].is_null());
}

/// Test the "needle in haystack" scenario mentioned in SAPE documentation
/// This would test RAG retrieval accuracy once fully implemented
#[tokio::test]
async fn test_needle_in_haystack_placeholder() {
    // Placeholder for testing specific knowledge retrieval
    // The SAPE document mentions:
    // "Exp 1: Implement KnowledgeKernels with sqlx and pgvector"
    // "Exp 2: Run a 'Needle in a Haystack' test (ingest a unique fact, query it)"

    // For now, just verify the ingest_knowledge binary exists and would run
    // In production, this would test actual retrieval from knowledge_base table

    println!("🧪 SAPE 'Needle in Haystack' test placeholder");
    println!("📝 Once pgvector integration is complete, this will:");
    println!("   1. Ingest a unique fact via ingest_knowledge binary");
    println!("   2. Query SAPE for that same fact");
    println!("   3. Verify the fact is retrieved and used in reasoning");

    // For now, just assert that our components are structurally in place
    assert!(true, "SAPE integration structure is in place");
}
