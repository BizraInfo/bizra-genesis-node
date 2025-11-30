// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PoI INTEGRATION TESTS                                ║
// ║  End-to-end testing of PoI verification API integration                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

#![cfg(feature = "database")]

use axum::Router;
use bizra_genesis_node::api;
use bizra_genesis_node::api::poi::verifier::MockPoiVerifier;
use bizra_genesis_node::middleware::rate_limiter::{RateLimiter, RateLimiterConfig};
use http::{Request, StatusCode};
use redis::Client as RedisClient;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::sync::OnceCell;
use tower::ServiceExt;

// Test database and Redis setup
static TEST_POOL: OnceCell<sqlx::PgPool> = OnceCell::const_new();
static REDIS_CLIENT: OnceCell<RedisClient> = OnceCell::const_new();

async fn setup_test_infrastructure() -> (Arc<sqlx::PgPool>, Arc<RedisClient>) {
    // Setup test database
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://test:test@localhost/bizra_test".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    // Clean database between tests
    sqlx::query!("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        .execute(&pool)
        .await
        .expect("Failed to reset database");

    // Run migrations on test database
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations on test database");

    // Setup Redis client
    let redis_url =
        std::env::var("TEST_REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/1".to_string()); // Use DB 1 for tests

    let redis_client = RedisClient::open(redis_url).expect("Failed to create Redis client");

    (Arc::new(pool), Arc::new(redis_client))
}

async fn setup_test_router() -> Router {
    let (pool, redis_client) = setup_test_infrastructure().await;

    // Create mock verifier for testing
    let poi_verifier = Arc::new(MockPoiVerifier)
        as Arc<dyn bizra_genesis_node::api::poi::verifier::PoiSignatureVerifier + Send + Sync>;

    // Create rate limiter for tests
    let rate_limiter_config = RateLimiterConfig {
        requests_per_minute: 100, // Allow many requests for testing
        requests_per_hour: 1000,
        burst_capacity: 50,
        enabled: false, // Disable for easier testing
        ip_whitelist: vec![],
    };
    let poi_rate_limiter = Arc::new(RateLimiter::new(
        (*redis_client).clone(),
        rate_limiter_config,
    ));

    // Create mock metrics and sape engine
    let metrics_collector = Arc::new(
        bizra_genesis_node::api::metrics::MetricsCollector::new(
            &bizra_genesis_node::metrics::METRICS_REGISTRY,
        )
        .expect("Failed to create metrics collector"),
    );

    let sape_engine = Arc::new(
        sape_engine::SapeEngine::new(sape_engine::SapeConfig::default(), pool.clone())
            .await
            .expect("Failed to create SAPE engine"),
    );

    api::create_router(
        pool,
        metrics_collector,
        sape_engine,
        poi_verifier,
        poi_rate_limiter,
    )
}

#[tokio::test]
async fn test_poi_verify_happy_path() {
    let app = setup_test_router().await;

    let body = json!({
        "contributorId": "550e8400-e29b-41d4-a716-446655440000",
        "impactDomain": "education",
        "rawScore": 85.7,
        "weight": 1.2,
        "payloadHash": "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa",
        "signature": "valid_test_signature_string_that_is_long_enough"
    });

    let request = Request::post("/api/poi/verify")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(body.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json_resp["verified"], true);
    assert!(json_resp["normalizedScore"].as_f64().unwrap() > 0.0);
    assert_eq!(json_resp["status"], "verified");
    assert!(json_resp["id"].as_str().is_some());
}

#[tokio::test]
async fn test_poi_verify_validation_error() {
    let app = setup_test_router().await;

    // Invalid score (above 100)
    let body = json!({
        "contributorId": "550e8400-e29b-41d4-a716-446655440000",
        "impactDomain": "education",
        "rawScore": 150.0,  // Invalid: > 100
        "weight": 1.2,
        "payloadHash": "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa",
        "signature": "valid_signature"
    });

    let request = Request::post("/api/poi/verify")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(body.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json_resp["error"], "Validation failed");
    assert!(json_resp["details"].as_str().unwrap().contains("range"));
}

#[tokio::test]
async fn test_poi_verify_invalid_signature() {
    let app = setup_test_router().await;

    // Short signature that fails MockPoiVerifier
    let body = json!({
        "contributorId": "550e8400-e29b-41d4-a716-446655440000",
        "impactDomain": "education",
        "rawScore": 85.0,
        "weight": 1.2,
        "payloadHash": "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa",
        "signature": "short"
    });

    let request = Request::post("/api/poi/verify")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(body.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json_resp["error"], "Cryptographic verification failed");
}

#[tokio::test]
async fn test_poi_summary_empty_database() {
    let app = setup_test_router().await;

    let request = Request::get("/api/poi/summary")
        .body(axum::body::Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json_resp["totalAttestations"], 0);
    assert_eq!(json_resp["verifiedAttestations"], 0);
    assert_eq!(json_resp["avgScore"], 0.0);
    assert!(json_resp["byDomain"].as_array().unwrap().is_empty());
    assert!(json_resp["recentActivity"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_poi_attestations_not_found() {
    let app = setup_test_router().await;

    let request = Request::get("/api/poi/attestations/550e8400-e29b-41d4-a716-446655440000")
        .body(axum::body::Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json_resp["error"], "Attestation not found");
}

#[tokio::test]
async fn test_poi_attestations_list_empty() {
    let app = setup_test_router().await;

    let request = Request::get("/api/poi/attestations")
        .body(axum::body::Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json_resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert!(json_resp.as_array().unwrap().is_empty());
}
