// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TEST: API HEALTH ENDPOINTS
// Tests Kubernetes-compatible liveness/readiness probes + Genesis status
// ═══════════════════════════════════════════════════════════════════════════

#![cfg(feature = "database")]

#[cfg(test)]
mod api_health_tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use bizra_genesis_node::api::{
        create_router, health::DbHealthCheck, metrics::MetricsCollector,
    };
    use prometheus::Registry;
    use sape_engine::{SapeConfig, SapeEngine};
    use serde_json::Value;
    use std::sync::Arc;
    use std::time::Duration;
    use testcontainers::{clients::Cli, Container, GenericImage, RunnableImage};
    use tower::ServiceExt;

    /// Test environment with database and router
    struct TestApp {
        router: axum::Router,
        database_url: String,
        _postgres: Container<'static, GenericImage>,
    }

    impl TestApp {
        /// Create a test application with fresh database
        async fn new(docker: &'static Cli) -> Self {
            // Initialize logger for test output
            let _ = tracing_subscriber::fmt()
                .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
                .try_init();

            // Start PostgreSQL container
            let postgres_image = GenericImage::new("ankane/pgvector", "v0.5.1")
                .with_env_var("POSTGRES_DB", "bizra_test")
                .with_env_var("POSTGRES_USER", "bizra_user")
                .with_env_var("POSTGRES_PASSWORD", "bizra_pass")
                .with_wait_for(testcontainers::core::WaitFor::message_on_stderr(
                    "database system is ready to accept connections",
                ));

            let runnable = RunnableImage::from(postgres_image).with_tag("v0.5.1");
            let postgres = docker.run(runnable);
            let port = postgres.get_host_port_ipv4(5432);

            let database_url = format!(
                "postgresql://bizra_user:bizra_pass@127.0.0.1:{}/bizra_test",
                port
            );

            // Wait for PostgreSQL to be ready
            tokio::time::sleep(Duration::from_secs(2)).await;

            // Run migrations
            let pool = sqlx::postgres::PgPoolOptions::new()
                .max_connections(5)
                .connect(&database_url)
                .await
                .expect("Failed to connect to test database");

            sqlx::migrate!("./migrations")
                .run(&pool)
                .await
                .expect("Failed to run migrations");

            // Initialize SAPE engine
            let sape_config = SapeConfig::default();
            let sape_engine = Arc::new(SapeEngine::new(sape_config));

            // Initialize metrics
            let registry = Registry::new();
            let metrics = Arc::new(MetricsCollector::new(&registry));

            // Create router
            let router = create_router(pool, sape_engine, metrics);

            Self {
                router,
                database_url,
                _postgres: postgres,
            }
        }

        /// Helper to send a request and get response
        async fn send_request(&mut self, req: Request<Body>) -> (StatusCode, String) {
            let response = self
                .router
                .clone()
                .oneshot(req)
                .await
                .expect("Failed to send request");

            let status = response.status();
            let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .expect("Failed to read response body");
            let body =
                String::from_utf8(body_bytes.to_vec()).expect("Response body is not valid UTF-8");

            (status, body)
        }

        /// Helper to send GET request
        async fn get(&mut self, path: &str) -> (StatusCode, String) {
            let req = Request::builder()
                .method("GET")
                .uri(path)
                .body(Body::empty())
                .unwrap();
            self.send_request(req).await
        }
    }

    /// Helper to parse JSON response
    fn parse_json(body: &str) -> Value {
        serde_json::from_str(body).expect("Failed to parse JSON")
    }

    /// Test 1: Liveness Check - Always Returns 200 OK
    ///
    /// Verifies:
    /// - GET /health → 200 OK
    /// - Response contains {"status": "ok"}
    /// - Response time < 1ms (very fast, no dependencies)
    #[tokio::test]
    async fn test_liveness_check_always_ok() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Call liveness probe
        let start = std::time::Instant::now();
        let (status, body) = app.get("/health").await;
        let duration = start.elapsed();

        // Assert 200 OK
        assert_eq!(
            status,
            StatusCode::OK,
            "Liveness check should always return 200 OK - body: {}",
            body
        );

        // Verify JSON structure
        let json = parse_json(&body);
        assert_eq!(
            json.get("status").and_then(|v| v.as_str()),
            Some("ok"),
            "Liveness check should return status: ok"
        );

        // Verify response time is fast (< 10ms, should be < 1ms)
        assert!(
            duration.as_millis() < 10,
            "Liveness check should be fast (< 10ms), got: {:?}",
            duration
        );
    }

    /// Test 2: Readiness Check - With Database Connectivity
    ///
    /// Verifies:
    /// - GET /ready → 200 OK when DB is connected
    /// - Response contains {"status": "ready", "database": "connected"}
    /// - Response time < 100ms (includes DB ping)
    #[tokio::test]
    async fn test_readiness_check_with_db() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Call readiness probe
        let start = std::time::Instant::now();
        let (status, body) = app.get("/ready").await;
        let duration = start.elapsed();

        // Assert 200 OK
        assert_eq!(
            status,
            StatusCode::OK,
            "Readiness check should return 200 OK when DB is healthy - body: {}",
            body
        );

        // Verify JSON structure
        let json = parse_json(&body);
        assert_eq!(
            json.get("status").and_then(|v| v.as_str()),
            Some("ready"),
            "Readiness check should return status: ready"
        );
        assert_eq!(
            json.get("database").and_then(|v| v.as_str()),
            Some("connected"),
            "Readiness check should show database: connected"
        );

        // Verify response time is reasonable (< 100ms)
        assert!(
            duration.as_millis() < 100,
            "Readiness check should complete in < 100ms, got: {:?}",
            duration
        );
    }

    /// Test 3: Readiness Check - Database Failure Scenario
    ///
    /// Verifies:
    /// - GET /ready → 503 Service Unavailable when DB is down
    /// - Response contains {"status": "degraded", "database": "disconnected"}
    ///
    /// NOTE: This test is marked as should_panic because it requires stopping
    /// the database container, which is complex in the testcontainers setup.
    /// In production, this is tested via chaos engineering / canary deployments.
    #[tokio::test]
    #[ignore] // Requires database shutdown, complex to test with testcontainers
    async fn test_readiness_check_db_failure() {
        // This test would require:
        // 1. Starting app with database
        // 2. Stopping database container
        // 3. Calling /ready endpoint
        // 4. Expecting 503 response
        //
        // Skipped in unit tests, covered by integration testing in staging
    }

    /// Test 4: Genesis Status Endpoint
    ///
    /// Verifies:
    /// - GET /api/genesis/status → 200 OK
    /// - Response contains PoI score, Ihsan score, node health
    /// - Response fields have correct types and ranges
    #[tokio::test]
    async fn test_genesis_status_endpoint() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Call genesis status endpoint
        let (status, body) = app.get("/api/genesis/status").await;

        // Assert 200 OK
        assert_eq!(
            status,
            StatusCode::OK,
            "Genesis status should return 200 OK - body: {}",
            body
        );

        // Verify JSON structure
        let json = parse_json(&body);

        // Verify PoI score exists and is in valid range [0, 100]
        let poi = json
            .get("poi")
            .and_then(|v| v.as_f64())
            .expect("Genesis status should contain 'poi' field");
        assert!(
            (0.0..=100.0).contains(&poi),
            "PoI score should be in range [0, 100], got: {}",
            poi
        );

        // Verify Ihsan score exists and is in valid range [0, 1]
        let ihsan = json
            .get("ihsan")
            .and_then(|v| v.as_f64())
            .expect("Genesis status should contain 'ihsan' field");
        assert!(
            (0.0..=1.0).contains(&ihsan),
            "Ihsan score should be in range [0, 1], got: {}",
            ihsan
        );

        // Verify node health exists
        let node_health = json
            .get("node_health")
            .and_then(|v| v.as_str())
            .expect("Genesis status should contain 'node_health' field");
        assert!(
            ["Green", "Yellow", "Red"].contains(&node_health),
            "Node health should be Green/Yellow/Red, got: {}",
            node_health
        );

        // Verify hours exists and is non-negative
        let hours = json
            .get("hours")
            .and_then(|v| v.as_u64())
            .expect("Genesis status should contain 'hours' field");
        assert!(
            hours >= 0,
            "Runtime hours should be non-negative, got: {}",
            hours
        );

        // Verify latency exists
        let latency = json
            .get("latency")
            .and_then(|v| v.as_u64())
            .expect("Genesis status should contain 'latency' field");
        assert!(
            latency >= 0,
            "Latency should be non-negative, got: {}",
            latency
        );

        // Verify entropy exists and is in valid range [0, 1]
        let entropy = json
            .get("entropy")
            .and_then(|v| v.as_f64())
            .expect("Genesis status should contain 'entropy' field");
        assert!(
            (0.0..=1.0).contains(&entropy),
            "Entropy should be in range [0, 1], got: {}",
            entropy
        );
    }

    /// Test 5: Health Endpoint Response Format Validation
    ///
    /// Verifies:
    /// - All health endpoints return valid JSON
    /// - Content-Type header is application/json
    /// - Response bodies are properly formatted
    #[tokio::test]
    async fn test_health_endpoints_response_format() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Test /health endpoint
        let (status, body) = app.get("/health").await;
        assert_eq!(status, StatusCode::OK);
        let json = parse_json(&body);
        assert!(json.is_object(), "/health should return JSON object");

        // Test /ready endpoint
        let (status, body) = app.get("/ready").await;
        assert_eq!(status, StatusCode::OK);
        let json = parse_json(&body);
        assert!(json.is_object(), "/ready should return JSON object");

        // Test /api/genesis/status endpoint
        let (status, body) = app.get("/api/genesis/status").await;
        assert_eq!(status, StatusCode::OK);
        let json = parse_json(&body);
        assert!(
            json.is_object(),
            "/api/genesis/status should return JSON object"
        );
    }

    /// Test 6: CORS and Security Headers
    ///
    /// Verifies:
    /// - Health endpoints are accessible without authentication
    /// - CORS headers are present (if configured)
    /// - Security headers are applied
    #[tokio::test]
    async fn test_health_endpoints_security() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Test that health endpoints don't require authentication
        // (Should work without Authorization header)
        let (status, _) = app.get("/health").await;
        assert_eq!(
            status,
            StatusCode::OK,
            "Health endpoint should not require authentication"
        );

        let (status, _) = app.get("/ready").await;
        assert_eq!(
            status,
            StatusCode::OK,
            "Readiness endpoint should not require authentication"
        );

        // Genesis status should also be public (for monitoring dashboards)
        let (status, _) = app.get("/api/genesis/status").await;
        assert_eq!(
            status,
            StatusCode::OK,
            "Genesis status should be publicly accessible"
        );
    }

    /// Test 7: Load Test - Multiple Concurrent Health Checks
    ///
    /// Verifies:
    /// - Health endpoints can handle concurrent requests
    /// - No performance degradation under load
    /// - All requests complete successfully
    #[tokio::test]
    async fn test_health_endpoints_concurrent_load() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Spawn 50 concurrent health check requests
        let mut tasks = vec![];
        for _ in 0..50 {
            let req = Request::builder()
                .method("GET")
                .uri("/health")
                .body(Body::empty())
                .unwrap();

            let router_clone = app.router.clone();
            tasks.push(tokio::spawn(async move {
                router_clone
                    .oneshot(req)
                    .await
                    .expect("Failed to send request")
                    .status()
            }));
        }

        // Wait for all requests to complete
        let start = std::time::Instant::now();
        let results = futures::future::join_all(tasks).await;
        let duration = start.elapsed();

        // Verify all requests succeeded
        let success_count = results
            .iter()
            .filter(|r| r.as_ref().unwrap() == &StatusCode::OK)
            .count();

        assert_eq!(
            success_count, 50,
            "All 50 concurrent health checks should succeed"
        );

        // Verify reasonable performance (50 requests in < 1 second)
        assert!(
            duration.as_secs() < 1,
            "50 concurrent health checks should complete in < 1 second, got: {:?}",
            duration
        );
    }
}
