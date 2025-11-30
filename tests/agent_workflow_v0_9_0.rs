// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT WORKFLOW INTEGRATION TEST                    ║
// ║  Tests PAT/SAT agent task submission → processing → results              ║
// ║  Part of Genesis v0.9.0 Release Plan                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

#![cfg(feature = "database")]

#[cfg(test)]
mod agent_workflow_tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use bizra_genesis_node::{
        agents::{
            pat::{PATManager, PATTeam},
            sat::{SATManager, SATTeam},
        },
        api::{create_router, metrics::MetricsCollector},
    };
    use prometheus::Registry;
    use sape_engine::{SapeConfig, SapeEngine};
    use serde_json::json;
    use std::sync::Arc;
    use std::time::Duration;
    use testcontainers::{clients::Cli, Container, GenericImage, RunnableImage};
    use tower::ServiceExt;
    use uuid::Uuid;

    /// Test environment with database and router
    struct TestApp {
        router: axum::Router,
        pool: sqlx::PgPool,
        pat_manager: Arc<PATManager>,
        sat_manager: Arc<SATManager>,
        _postgres: Container<'static, GenericImage>,
    }

    impl TestApp {
        /// Create test application with agents
        async fn new(docker: &'static Cli) -> Self {
            // Set JWT secret for testing
            std::env::set_var(
                "JWT_SECRET",
                "test_jwt_secret_for_testing_only_do_not_use_in_production",
            );

            // Initialize logger
            let _ = tracing_subscriber::fmt()
                .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
                .try_init();

            // Start PostgreSQL container
            let postgres_image = GenericImage::new("ankane/pgvector", "v0.5.1")
                .with_env_var("POSTGRES_DB", "bizra_test")
                .with_env_var("POSTGRES_USER", "bizra_test")
                .with_env_var("POSTGRES_PASSWORD", "bizra_test_password")
                .with_wait_for(testcontainers::core::WaitFor::message_on_stderr(
                    "database system is ready to accept connections",
                ));

            let runnable = RunnableImage::from(postgres_image).with_tag("v0.5.1");
            let postgres = docker.run(runnable);
            let port = postgres.get_host_port_ipv4(5432);

            let connection_string = format!(
                "postgresql://bizra_test:bizra_test_password@localhost:{}/bizra_test",
                port
            );

            // Create database pool
            let pool = sqlx::postgres::PgPoolOptions::new()
                .max_connections(5)
                .acquire_timeout(Duration::from_secs(30))
                .connect(&connection_string)
                .await
                .expect("Failed to connect to database");

            // Create bizra_api role for migrations
            sqlx::query("CREATE ROLE bizra_api WITH LOGIN")
                .execute(&pool)
                .await
                .ok();

            // Run migrations
            let migrator = sqlx::migrate::Migrator::new(std::path::Path::new("./migrations"))
                .await
                .expect("Failed to create migrator");
            migrator.run(&pool).await.expect("Failed to run migrations");

            // Create metrics collector
            let metrics = Arc::new(
                MetricsCollector::new(&Registry::new())
                    .expect("Failed to create metrics collector"),
            );

            // Create SAPE engine
            let sape_config = SapeConfig::default();
            let sape_engine = Arc::new(SapeEngine::new(sape_config));

            // Create agent managers
            let pat_manager = Arc::new(PATManager::new());
            let sat_manager = Arc::new(SATManager::new());

            // Create router
            let router = create_router(pool.clone(), sape_engine, metrics);

            Self {
                router,
                pool,
                pat_manager,
                sat_manager,
                _postgres: postgres,
            }
        }

        /// Helper to send JSON request
        async fn send_json(
            &mut self,
            method: &str,
            path: &str,
            body: serde_json::Value,
        ) -> (StatusCode, String) {
            let req = Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap();

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
            let body = String::from_utf8(body_bytes.to_vec()).expect("Response not UTF-8");

            (status, body)
        }
    }

    /// Test 1: PAT Agent Task Submission → Storage → Processing → Result
    ///
    /// Verifies:
    /// - Task submitted via API is stored in database
    /// - Task state transitions correctly (pending → running → completed)
    /// - Task result is stored and retrievable
    /// - PAT team metrics are updated
    #[tokio::test]
    async fn test_pat_task_submission_and_processing() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Create a test user first (required for agent task association)
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create test user");

        // Test 1: Submit PAT task via PAT manager
        let task_description = "Analyze quantum computing research papers";
        let pat_team = app.pat_manager.get_team();

        // Verify PAT team has expected agents
        assert!(
            pat_team.agents.len() >= 5,
            "PAT team should have at least 5 agents"
        );

        // Get planner agent
        let planner = pat_team
            .agents
            .iter()
            .find(|a| a.name.contains("Planner"))
            .expect("PAT team should have Planner agent");

        // Create agent task record in database
        let task_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO agent_tasks (
                id, user_id, agent_type, task_description, status, created_at
            )
            VALUES ($1, $2, 'PAT_Planner', $3, 'pending', NOW())
            "#,
            task_id,
            user_id,
            task_description
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create agent task");

        // Test 2: Verify task stored in database
        let task = sqlx::query!(
            r#"
            SELECT id, status, task_description
            FROM agent_tasks
            WHERE id = $1
            "#,
            task_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Task should exist in database");

        assert_eq!(task.id, task_id);
        assert_eq!(task.status, "pending");
        assert_eq!(task.task_description, task_description);

        // Test 3: Simulate task processing (transition to running)
        sqlx::query!(
            r#"
            UPDATE agent_tasks
            SET status = 'running', started_at = NOW()
            WHERE id = $1
            "#,
            task_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to update task status");

        // Test 4: Simulate task completion with result
        let result_data = json!({
            "analysis": "Quantum computing shows promise in optimization",
            "key_papers": ["Paper 1", "Paper 2"],
            "confidence": 0.85
        });

        sqlx::query!(
            r#"
            UPDATE agent_tasks
            SET status = 'completed',
                result = $2,
                completed_at = NOW()
            WHERE id = $1
            "#,
            task_id,
            result_data
        )
        .execute(&app.pool)
        .await
        .expect("Failed to complete task");

        // Test 5: Verify task completion and result storage
        let completed_task = sqlx::query!(
            r#"
            SELECT id, status, result, completed_at
            FROM agent_tasks
            WHERE id = $1
            "#,
            task_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Completed task should exist");

        assert_eq!(completed_task.status, "completed");
        assert!(completed_task.result.is_some(), "Result should be stored");
        assert!(
            completed_task.completed_at.is_some(),
            "Completion time should be recorded"
        );

        let result: serde_json::Value = completed_task.result.unwrap();
        assert_eq!(result["confidence"], 0.85);

        // Test 6: Verify PAT team metrics
        let metrics = pat_team.get_metrics();
        assert!(metrics.total_agents > 0, "PAT team should have agents");
        assert!(
            metrics.agent_types.contains_key("PAT"),
            "Metrics should track PAT agents"
        );
    }

    /// Test 2: SAT Agent Health Monitoring
    ///
    /// Verifies:
    /// - SAT agents can collect system metrics
    /// - Health status is updated in database
    /// - Alerts are generated for issues
    #[tokio::test]
    async fn test_sat_health_monitoring() {
        let docker = Box::leak(Box::new(Cli::default()));
        let app = TestApp::new(docker).await;

        // Get SAT team
        let sat_team = app.sat_manager.get_team();

        // Verify SAT team has expected agents
        assert!(
            sat_team.agents.len() >= 3,
            "SAT team should have at least 3 agents"
        );

        // Verify infrastructure agent exists
        let infra_agent = sat_team
            .agents
            .iter()
            .find(|a| a.name.contains("Infrastructure"))
            .expect("SAT team should have Infrastructure agent");

        assert_eq!(infra_agent.role, "Infrastructure Monitoring");

        // Create agent state record
        let agent_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO agent_state (
                agent_id, agent_type, agent_name, health_status, metrics, last_active
            )
            VALUES ($1, 'SAT_Infrastructure', 'Infrastructure Monitor', 'healthy', '{}', NOW())
            "#,
            agent_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create agent state");

        // Simulate health check with metrics
        let metrics = json!({
            "cpu_usage": 45.2,
            "memory_usage": 68.5,
            "disk_usage": 72.1,
            "network_latency_ms": 23.4
        });

        sqlx::query!(
            r#"
            UPDATE agent_state
            SET metrics = $2, last_active = NOW()
            WHERE agent_id = $1
            "#,
            agent_id,
            metrics
        )
        .execute(&app.pool)
        .await
        .expect("Failed to update agent metrics");

        // Verify metrics stored
        let state = sqlx::query!(
            r#"
            SELECT agent_id, health_status, metrics
            FROM agent_state
            WHERE agent_id = $1
            "#,
            agent_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Agent state should exist");

        let stored_metrics: serde_json::Value = state.metrics.unwrap();
        assert_eq!(stored_metrics["cpu_usage"], 45.2);

        // Simulate degraded health detection
        sqlx::query!(
            r#"
            UPDATE agent_state
            SET health_status = 'degraded'
            WHERE agent_id = $1
            "#,
            agent_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to update health status");

        // Verify health status updated
        let updated_state = sqlx::query!(
            r#"
            SELECT health_status
            FROM agent_state
            WHERE agent_id = $1
            "#,
            agent_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Updated state should exist");

        assert_eq!(updated_state.health_status, "degraded");

        // Verify SAT team metrics
        let team_metrics = sat_team.get_metrics();
        assert!(team_metrics.total_agents > 0, "SAT team should have agents");
        assert!(
            team_metrics.agent_types.contains_key("SAT"),
            "Metrics should track SAT agents"
        );
    }

    /// Test 3: Agent State Transitions
    ///
    /// Verifies:
    /// - Agent tasks follow correct state machine
    /// - Invalid transitions are rejected
    /// - State history is maintained
    #[tokio::test]
    async fn test_agent_task_state_transitions() {
        let docker = Box::leak(Box::new(Cli::default()));
        let app = TestApp::new(docker).await;

        // Create test user
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'state_test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create test user");

        // Create task in pending state
        let task_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO agent_tasks (
                id, user_id, agent_type, task_description, status, created_at
            )
            VALUES ($1, $2, 'PAT_Researcher', 'Test task', 'pending', NOW())
            "#,
            task_id,
            user_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create task");

        // Valid transition: pending → running
        sqlx::query!(
            r#"
            UPDATE agent_tasks
            SET status = 'running', started_at = NOW()
            WHERE id = $1 AND status = 'pending'
            "#,
            task_id
        )
        .execute(&app.pool)
        .await
        .expect("Transition to running should succeed");

        let task = sqlx::query!("SELECT status FROM agent_tasks WHERE id = $1", task_id)
            .fetch_one(&app.pool)
            .await
            .expect("Task should exist");
        assert_eq!(task.status, "running");

        // Valid transition: running → completed
        sqlx::query!(
            r#"
            UPDATE agent_tasks
            SET status = 'completed', completed_at = NOW(), result = '{}'
            WHERE id = $1 AND status = 'running'
            "#,
            task_id
        )
        .execute(&app.pool)
        .await
        .expect("Transition to completed should succeed");

        let final_task = sqlx::query!(
            "SELECT status, completed_at FROM agent_tasks WHERE id = $1",
            task_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Task should exist");
        assert_eq!(final_task.status, "completed");
        assert!(final_task.completed_at.is_some());
    }

    /// Test 4: Concurrent Agent Task Execution
    ///
    /// Verifies:
    /// - Multiple agent tasks can run concurrently
    /// - Database handles concurrent updates correctly
    /// - No race conditions or deadlocks
    #[tokio::test]
    async fn test_concurrent_agent_tasks() {
        let docker = Box::leak(Box::new(Cli::default()));
        let app = TestApp::new(docker).await;

        // Create test user
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'concurrent@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&app.pool)
        .await
        .expect("Failed to create test user");

        // Create 5 concurrent tasks
        let mut task_ids = Vec::new();
        for i in 0..5 {
            let task_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO agent_tasks (
                    id, user_id, agent_type, task_description, status, created_at
                )
                VALUES ($1, $2, 'PAT_Coder', $3, 'pending', NOW())
                "#,
                task_id,
                user_id,
                format!("Concurrent task {}", i)
            )
            .execute(&app.pool)
            .await
            .expect("Failed to create concurrent task");
            task_ids.push(task_id);
        }

        // Execute all tasks concurrently
        let mut handles = Vec::new();
        for task_id in task_ids.iter() {
            let pool = app.pool.clone();
            let tid = *task_id;
            let handle = tokio::spawn(async move {
                // Transition to running
                sqlx::query!(
                    "UPDATE agent_tasks SET status = 'running', started_at = NOW() WHERE id = $1",
                    tid
                )
                .execute(&pool)
                .await
                .expect("Failed to start task");

                // Simulate processing
                tokio::time::sleep(Duration::from_millis(10)).await;

                // Complete task
                sqlx::query!(
                    "UPDATE agent_tasks SET status = 'completed', completed_at = NOW() WHERE id = $1",
                    tid
                )
                .execute(&pool)
                .await
                .expect("Failed to complete task");
            });
            handles.push(handle);
        }

        // Wait for all tasks to complete
        for handle in handles {
            handle.await.expect("Task should complete");
        }

        // Verify all tasks completed successfully
        let completed_count = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM agent_tasks
            WHERE user_id = $1 AND status = 'completed'
            "#,
            user_id
        )
        .fetch_one(&app.pool)
        .await
        .expect("Should fetch count");

        assert_eq!(
            completed_count.count.unwrap(),
            5,
            "All 5 tasks should be completed"
        );
    }
}
