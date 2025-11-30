// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - INTEGRATION TEST MODULE
// End-to-end tests for Genesis Node v0.9.0 release
// ═══════════════════════════════════════════════════════════════════════════

#![cfg(feature = "database")]

pub mod auth;
pub mod poi;
pub mod agents;
pub mod database;
pub mod api;

/// Common test helpers and fixtures
pub mod helpers {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use bizra_genesis_node::api::{create_router, metrics::MetricsCollector};
    use prometheus::Registry;
    use sape_engine::{SapeConfig, SapeEngine};
    use serde_json::Value;
    use std::sync::Arc;
    use std::time::Duration;
    use testcontainers::{clients::Cli, Container, GenericImage, RunnableImage};
    use tower::ServiceExt;

    /// Test environment with database and router
    pub struct TestApp {
        pub router: axum::Router,
        pub database_url: String,
        _postgres: Container<'static, GenericImage>,
    }

    impl TestApp {
        /// Create a test application with fresh database
        pub async fn new(docker: &'static Cli) -> Self {
            // Set JWT secret for testing
            std::env::set_var(
                "JWT_SECRET",
                "test_jwt_secret_for_testing_only_do_not_use_in_production",
            );

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
        pub async fn send_request(&mut self, req: Request<Body>) -> (StatusCode, String) {
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
            let body = String::from_utf8(body_bytes.to_vec())
                .expect("Response body is not valid UTF-8");

            (status, body)
        }

        /// Helper to send JSON request
        pub async fn send_json(
            &mut self,
            method: &str,
            path: &str,
            json: Option<Value>,
        ) -> (StatusCode, String) {
            let mut req = Request::builder().method(method).uri(path);

            if let Some(body) = json {
                req = req.header("content-type", "application/json");
                let req = req
                    .body(Body::from(serde_json::to_vec(&body).unwrap()))
                    .unwrap();
                self.send_request(req).await
            } else {
                let req = req.body(Body::empty()).unwrap();
                self.send_request(req).await
            }
        }

        /// Helper to send authenticated request
        pub async fn send_authenticated(
            &mut self,
            method: &str,
            path: &str,
            token: &str,
            json: Option<Value>,
        ) -> (StatusCode, String) {
            let mut req = Request::builder()
                .method(method)
                .uri(path)
                .header("authorization", format!("Bearer {}", token));

            if let Some(body) = json {
                req = req.header("content-type", "application/json");
                let req = req
                    .body(Body::from(serde_json::to_vec(&body).unwrap()))
                    .unwrap();
                self.send_request(req).await
            } else {
                let req = req.body(Body::empty()).unwrap();
                self.send_request(req).await
            }
        }
    }

    /// Helper to parse JSON response
    pub fn parse_json(body: &str) -> Value {
        serde_json::from_str(body).expect("Failed to parse JSON")
    }

    /// Helper to create test user JSON
    pub fn test_user_json(email: &str, password: &str) -> Value {
        serde_json::json!({
            "email": email,
            "password": password
        })
    }

    /// Helper to extract JWT from response
    pub fn extract_token(json: &Value) -> String {
        json.get("token")
            .expect("No token in response")
            .as_str()
            .expect("Token is not a string")
            .to_string()
    }
}
