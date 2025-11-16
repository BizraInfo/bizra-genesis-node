// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - DATABASE INTEGRATION TESTS
// Real database integration testing with Testcontainers
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod database_integration_tests {
    use testcontainers::clients::Cli;
    use crate::tests::integration::testcontainers_config::TestEnvironment;
    use sqlx::{PgPool, Row};
    use redis::Commands;
    use chrono::Utc;

    // ─────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT TESTS
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_user_registration_and_retrieval() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        // Create user
        let user_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind("test@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(&pool)
        .await
        .expect("Failed to create user");

        // Retrieve user
        let row = sqlx::query(
            "SELECT email, password_hash FROM users WHERE id = $1"
        )
        .bind(&user_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to retrieve user");

        let email: String = row.get("email");
        assert_eq!(email, "test@example.com");
    }

    #[tokio::test]
    async fn test_user_unique_email_constraint() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        // Create first user
        sqlx::query(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind("duplicate@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(&pool)
        .await
        .expect("Failed to create first user");

        // Attempt to create duplicate user (should fail)
        let result = sqlx::query(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind("duplicate@example.com")
        .bind("$2b$12$another_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Duplicate email should be rejected");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SYNTHESIS RUN TESTS
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_synthesis_run_creation_and_retrieval() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        // Create user first
        let user_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind("synth_test@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(&pool)
        .await
        .expect("Failed to create user");

        // Create synthesis run
        let run_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO synthesis_runs (
                user_id, task_description, winner_model, ihsan_score,
                accuracy_score, safety_score, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#,
        )
        .bind(&user_id)
        .bind("Test synthesis task")
        .bind("gpt-4")
        .bind(0.95)
        .bind(0.98)
        .bind(0.92)
        .bind(Utc::now())
        .fetch_one(&pool)
        .await
        .expect("Failed to create synthesis run");

        // Retrieve synthesis run
        let row = sqlx::query(
            r#"
            SELECT task_description, winner_model, ihsan_score
            FROM synthesis_runs
            WHERE id = $1
            "#
        )
        .bind(&run_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to retrieve synthesis run");

        let task_description: String = row.get("task_description");
        let winner_model: String = row.get("winner_model");
        let ihsan_score: f64 = row.get("ihsan_score");

        assert_eq!(task_description, "Test synthesis task");
        assert_eq!(winner_model, "gpt-4");
        assert_eq!(ihsan_score, 0.95);
    }

    #[tokio::test]
    async fn test_synthesis_run_pagination() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        // Create user
        let user_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind("pagination_test@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(&pool)
        .await
        .expect("Failed to create user");

        // Create 10 synthesis runs
        for i in 1..=10 {
            sqlx::query(
                r#"
                INSERT INTO synthesis_runs (
                    user_id, task_description, winner_model, ihsan_score,
                    accuracy_score, safety_score, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(&user_id)
            .bind(format!("Task {}", i))
            .bind("gpt-4")
            .bind(0.90)
            .bind(0.95)
            .bind(0.92)
            .bind(Utc::now())
            .execute(&pool)
            .await
            .expect("Failed to create synthesis run");
        }

        // Fetch with pagination (5 per page)
        let rows = sqlx::query(
            r#"
            SELECT id, task_description
            FROM synthesis_runs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&user_id)
        .bind(5_i64)
        .bind(0_i64)
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch runs");

        assert_eq!(rows.len(), 5, "Should return 5 runs per page");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRUST RECEIPT TESTS
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_trust_receipt_storage() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        // Create user and synthesis run
        let user_id = create_test_user(&pool, "receipt_test@example.com").await;
        let run_id = create_test_synthesis_run(&pool, &user_id, "Receipt test").await;

        // Store trust receipt
        sqlx::query(
            r#"
            INSERT INTO trust_receipts (
                run_id, signature, timestamp, metadata
            )
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(&run_id)
        .bind("base64_encoded_signature")
        .bind(Utc::now())
        .bind(r#"{"version": "1.0", "algorithm": "ed25519"}"#)
        .execute(&pool)
        .await
        .expect("Failed to store trust receipt");

        // Retrieve trust receipt
        let row = sqlx::query(
            "SELECT signature, metadata FROM trust_receipts WHERE run_id = $1"
        )
        .bind(&run_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to retrieve trust receipt");

        let signature: String = row.get("signature");
        assert_eq!(signature, "base64_encoded_signature");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REDIS CACHE TESTS
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_redis_session_storage() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let client = env.redis_client().expect("Failed to get Redis client");
        let mut conn = client.get_connection().expect("Failed to connect");

        // Store session
        let session_id = "session_abc123";
        let session_data = r#"{"user_id":"user123","expires_at":1234567890}"#;

        let _: () = conn.set_ex(session_id, session_data, 3600)
            .expect("Failed to set session");

        // Retrieve session
        let retrieved: String = conn.get(session_id)
            .expect("Failed to get session");

        assert_eq!(retrieved, session_data);
    }

    #[tokio::test]
    async fn test_redis_rate_limiting() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let client = env.redis_client().expect("Failed to get Redis client");
        let mut conn = client.get_connection().expect("Failed to connect");

        let key = "rate_limit:user123";

        // Increment counter (simulating requests)
        for _ in 0..5 {
            let count: i32 = conn.incr(key, 1)
                .expect("Failed to increment");
            if count == 1 {
                // Set TTL on first request
                let _: () = conn.expire(key, 60)
                    .expect("Failed to set TTL");
            }
        }

        // Check counter
        let count: i32 = conn.get(key)
            .expect("Failed to get count");

        assert_eq!(count, 5);
    }

    #[tokio::test]
    async fn test_redis_cache_invalidation() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let client = env.redis_client().expect("Failed to get Redis client");
        let mut conn = client.get_connection().expect("Failed to connect");

        // Set cache
        let _: () = conn.set("cache:key1", "value1")
            .expect("Failed to set cache");

        // Invalidate cache
        let deleted: i32 = conn.del("cache:key1")
            .expect("Failed to delete");

        assert_eq!(deleted, 1);

        // Verify deletion
        let exists: bool = conn.exists("cache:key1")
            .expect("Failed to check existence");

        assert!(!exists);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRANSACTION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_database_transaction_rollback() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        let mut tx = pool.begin().await.expect("Failed to begin transaction");

        // Insert user
        let user_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind("rollback_test@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(&mut *tx)
        .await
        .expect("Failed to create user");

        // Rollback transaction
        tx.rollback().await.expect("Failed to rollback");

        // Verify user doesn't exist
        let result = sqlx::query("SELECT id FROM users WHERE id = $1")
            .bind(&user_id)
            .fetch_optional(&pool)
            .await
            .expect("Query failed");

        assert!(result.is_none(), "User should not exist after rollback");
    }

    #[tokio::test]
    async fn test_database_transaction_commit() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;
        let pool = env.db_pool().await.expect("Failed to get pool");

        let mut tx = pool.begin().await.expect("Failed to begin transaction");

        // Insert user
        let user_id = sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind("commit_test@example.com")
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(&mut *tx)
        .await
        .expect("Failed to create user");

        // Commit transaction
        tx.commit().await.expect("Failed to commit");

        // Verify user exists
        let result = sqlx::query("SELECT id FROM users WHERE id = $1")
            .bind(&user_id)
            .fetch_one(&pool)
            .await
            .expect("Query failed");

        assert!(result.len() > 0, "User should exist after commit");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    async fn create_test_user(pool: &PgPool, email: &str) -> String {
        sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO users (email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind(email)
        .bind("$2b$12$hashed_password")
        .bind(Utc::now())
        .bind(Utc::now())
        .fetch_one(pool)
        .await
        .expect("Failed to create user")
    }

    async fn create_test_synthesis_run(pool: &PgPool, user_id: &str, task: &str) -> String {
        sqlx::query_scalar::<_, String>(
            r#"
            INSERT INTO synthesis_runs (
                user_id, task_description, winner_model, ihsan_score,
                accuracy_score, safety_score, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#,
        )
        .bind(user_id)
        .bind(task)
        .bind("gpt-4")
        .bind(0.95)
        .bind(0.98)
        .bind(0.92)
        .bind(Utc::now())
        .fetch_one(pool)
        .await
        .expect("Failed to create synthesis run")
    }
}
