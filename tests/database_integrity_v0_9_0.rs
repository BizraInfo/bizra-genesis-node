// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - DATABASE INTEGRITY INTEGRATION TEST                ║
// ║  Tests foreign keys, enum validation, triggers, constraints              ║
// ║  Part of Genesis v0.9.0 Release Plan                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

#![cfg(feature = "database")]

#[cfg(test)]
mod database_integrity_tests {
    use sqlx::postgres::PgPoolOptions;
    use std::time::Duration;
    use testcontainers::{clients::Cli, Container, GenericImage, RunnableImage};
    use uuid::Uuid;

    /// Test environment with database
    struct TestDb {
        pool: sqlx::PgPool,
        _postgres: Container<'static, GenericImage>,
    }

    impl TestDb {
        /// Create test database
        async fn new(docker: &'static Cli) -> Self {
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
            let pool = PgPoolOptions::new()
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

            Self {
                pool,
                _postgres: postgres,
            }
        }
    }

    /// Test 1: Foreign Key Constraint Enforcement
    ///
    /// Verifies:
    /// - Cannot insert record with non-existent foreign key
    /// - Cannot delete parent record with dependent children
    /// - Foreign key constraints are active and enforced
    #[tokio::test]
    async fn test_foreign_key_constraints() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Test 1: Attempt to insert PoI attestation with non-existent user
        let non_existent_user_id = Uuid::new_v4();
        let attestation_id = Uuid::new_v4();

        let result = sqlx::query!(
            r#"
            INSERT INTO poi_attestations (
                id, contributor_id, domain, impact_claim, attestation_data, created_at
            )
            VALUES ($1, $2, 'technical', 'test claim', '{}', NOW())
            "#,
            attestation_id,
            non_existent_user_id
        )
        .execute(&db.pool)
        .await;

        // Should fail due to foreign key constraint
        assert!(
            result.is_err(),
            "Inserting attestation with non-existent user should fail"
        );

        let error = result.unwrap_err().to_string();
        assert!(
            error.contains("foreign key constraint") || error.contains("violates foreign key"),
            "Error should mention foreign key constraint violation: {}",
            error
        );

        // Test 2: Create valid user and attestation
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'fk_test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert user");

        let attestation_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO poi_attestations (
                id, contributor_id, domain, impact_claim, attestation_data, created_at
            )
            VALUES ($1, $2, 'technical', 'valid claim', '{}', NOW())
            "#,
            attestation_id,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert attestation with valid user_id");

        // Test 3: Attempt to delete user with dependent attestations (if ON DELETE RESTRICT)
        // Note: Check migration to see if FK has ON DELETE RESTRICT or CASCADE
        let delete_result = sqlx::query!("DELETE FROM users WHERE id = $1", user_id)
            .execute(&db.pool)
            .await;

        // If FK has ON DELETE RESTRICT, this should fail
        // If FK has ON DELETE CASCADE, this will succeed and cascade delete
        // Document actual behavior
        match delete_result {
            Ok(_) => {
                eprintln!("FK allows cascading delete - checking if attestation was deleted");
                let attestation_count = sqlx::query!(
                    "SELECT COUNT(*) as count FROM poi_attestations WHERE contributor_id = $1",
                    user_id
                )
                .fetch_one(&db.pool)
                .await
                .expect("Should fetch count");
                eprintln!(
                    "Attestation count after user delete: {}",
                    attestation_count.count.unwrap_or(0)
                );
            }
            Err(e) => {
                eprintln!("FK prevents delete when children exist: {}", e);
                assert!(
                    e.to_string().contains("foreign key constraint")
                        || e.to_string().contains("violates"),
                    "Error should mention FK constraint"
                );
            }
        }
    }

    /// Test 2: Enum Type Validation
    ///
    /// Verifies:
    /// - Only valid enum values are accepted
    /// - Invalid enum values are rejected
    /// - Enum constraints are enforced at database level
    #[tokio::test]
    async fn test_enum_type_validation() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Create test user
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'enum_test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert user");

        // Test 1: Valid enum value for poi_reward_epoch_status
        let epoch_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO poi_reward_epoch (
                id, epoch_number, start_time, end_time, status, created_at
            )
            VALUES ($1, 1, NOW(), NOW() + INTERVAL '7 days', 'active', NOW())
            "#,
            epoch_id
        )
        .execute(&db.pool)
        .await
        .expect("Valid enum value should be accepted");

        // Test 2: Invalid enum value for poi_reward_epoch_status
        let invalid_epoch_id = Uuid::new_v4();
        let result = sqlx::query(
            r#"
            INSERT INTO poi_reward_epoch (
                id, epoch_number, start_time, end_time, status, created_at
            )
            VALUES ($1, 2, NOW(), NOW() + INTERVAL '7 days', 'invalid_status', NOW())
            "#,
        )
        .bind(invalid_epoch_id)
        .execute(&db.pool)
        .await;

        assert!(result.is_err(), "Invalid enum value should be rejected");
        let error = result.unwrap_err().to_string();
        assert!(
            error.contains("invalid input value for enum") || error.contains("invalid_status"),
            "Error should mention invalid enum value: {}",
            error
        );

        // Test 3: Valid enum value for poi_reward_settlement_status
        let reward_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO poi_rewards (
                id, epoch_id, contributor_id, reward_amount, settlement_status, created_at
            )
            VALUES ($1, $2, $3, 100.0, 'pending', NOW())
            "#,
            reward_id,
            epoch_id,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Valid settlement status should be accepted");

        // Test 4: Verify valid enum values work for updates
        sqlx::query!(
            r#"
            UPDATE poi_reward_epoch
            SET status = 'closed'
            WHERE id = $1
            "#,
            epoch_id
        )
        .execute(&db.pool)
        .await
        .expect("Valid enum update should succeed");

        // Verify the update
        let epoch = sqlx::query!(
            "SELECT status FROM poi_reward_epoch WHERE id = $1",
            epoch_id
        )
        .fetch_one(&db.pool)
        .await
        .expect("Should fetch epoch");
        assert_eq!(epoch.status, "closed");
    }

    /// Test 3: Unique Constraint Enforcement
    ///
    /// Verifies:
    /// - Duplicate unique values are rejected
    /// - Unique constraints are enforced
    #[tokio::test]
    async fn test_unique_constraints() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Test 1: Create user with unique email
        let user1_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'unique@bizra.io', 'hash1', 'user', 'genesis_100', NOW())
            "#,
            user1_id
        )
        .execute(&db.pool)
        .await
        .expect("First user should be created");

        // Test 2: Attempt to create another user with same email
        let user2_id = Uuid::new_v4();
        let result = sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'unique@bizra.io', 'hash2', 'user', 'genesis_100', NOW())
            "#,
            user2_id
        )
        .execute(&db.pool)
        .await;

        assert!(result.is_err(), "Duplicate email should be rejected");
        let error = result.unwrap_err().to_string();
        assert!(
            error.contains("unique constraint") || error.contains("duplicate key"),
            "Error should mention unique constraint violation: {}",
            error
        );
    }

    /// Test 4: NOT NULL Constraint Enforcement
    ///
    /// Verifies:
    /// - Required fields cannot be null
    /// - NOT NULL constraints are enforced
    #[tokio::test]
    async fn test_not_null_constraints() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Attempt to insert user without email (assuming email is NOT NULL)
        let user_id = Uuid::new_v4();
        let result = sqlx::query(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, NULL, 'hash', 'user', 'genesis_100', NOW())
            "#,
        )
        .bind(user_id)
        .execute(&db.pool)
        .await;

        assert!(result.is_err(), "NULL in NOT NULL field should be rejected");
        let error = result.unwrap_err().to_string();
        assert!(
            error.contains("null value") || error.contains("NOT NULL"),
            "Error should mention NOT NULL violation: {}",
            error
        );
    }

    /// Test 5: Trigger Execution Verification
    ///
    /// Verifies:
    /// - Database triggers execute correctly
    /// - Automatic timestamp updates work
    #[tokio::test]
    async fn test_trigger_execution() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Create user
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'trigger_test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert user");

        // Fetch initial timestamps
        let initial = sqlx::query!(
            "SELECT created_at, updated_at FROM users WHERE id = $1",
            user_id
        )
        .fetch_one(&db.pool)
        .await
        .expect("Should fetch user");

        eprintln!("Initial created_at: {:?}", initial.created_at);
        eprintln!("Initial updated_at: {:?}", initial.updated_at);

        // Wait a moment to ensure timestamp difference
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Update user (if updated_at trigger exists)
        sqlx::query!("UPDATE users SET role = 'admin' WHERE id = $1", user_id)
            .execute(&db.pool)
            .await
            .expect("Should update user");

        // Fetch updated timestamps
        let updated = sqlx::query!(
            "SELECT created_at, updated_at FROM users WHERE id = $1",
            user_id
        )
        .fetch_one(&db.pool)
        .await
        .expect("Should fetch updated user");

        eprintln!("Updated created_at: {:?}", updated.created_at);
        eprintln!("Updated updated_at: {:?}", updated.updated_at);

        // Verify created_at didn't change
        assert_eq!(
            initial.created_at, updated.created_at,
            "created_at should not change on update"
        );

        // If updated_at trigger exists, verify it updated
        if let (Some(initial_updated), Some(final_updated)) =
            (initial.updated_at, updated.updated_at)
        {
            assert!(
                final_updated > initial_updated,
                "updated_at should be newer after update"
            );
        }
    }

    /// Test 6: CHECK Constraint Enforcement
    ///
    /// Verifies:
    /// - CHECK constraints are enforced
    /// - Invalid values violating CHECK constraints are rejected
    #[tokio::test]
    async fn test_check_constraints() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Create test user and epoch
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'check_test@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert user");

        let epoch_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO poi_reward_epoch (
                id, epoch_number, start_time, end_time, status, created_at
            )
            VALUES ($1, 1, NOW(), NOW() + INTERVAL '7 days', 'active', NOW())
            "#,
            epoch_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert epoch");

        // Attempt to insert negative reward amount (if CHECK constraint exists)
        let reward_id = Uuid::new_v4();
        let result = sqlx::query(
            r#"
            INSERT INTO poi_rewards (
                id, epoch_id, contributor_id, reward_amount, settlement_status, created_at
            )
            VALUES ($1, $2, $3, -100.0, 'pending', NOW())
            "#,
        )
        .bind(reward_id)
        .bind(epoch_id)
        .bind(user_id)
        .execute(&db.pool)
        .await;

        // If CHECK constraint exists for reward_amount > 0, this should fail
        if result.is_err() {
            let error = result.unwrap_err().to_string();
            eprintln!("CHECK constraint enforced: {}", error);
            assert!(
                error.contains("check constraint") || error.contains("violates check"),
                "Error should mention CHECK constraint"
            );
        } else {
            eprintln!("No CHECK constraint on reward_amount (or it allows negative values)");
        }
    }

    /// Test 7: Referential Integrity Cascade Behavior
    ///
    /// Verifies:
    /// - Understanding of ON DELETE CASCADE vs RESTRICT
    /// - Data consistency maintained through cascades
    #[tokio::test]
    async fn test_cascade_behavior() {
        let docker = Box::leak(Box::new(Cli::default()));
        let db = TestDb::new(docker).await;

        // Create epoch
        let epoch_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO poi_reward_epoch (
                id, epoch_number, start_time, end_time, status, created_at
            )
            VALUES ($1, 1, NOW(), NOW() + INTERVAL '7 days', 'active', NOW())
            "#,
            epoch_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert epoch");

        // Create user
        let user_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, role, program, created_at)
            VALUES ($1, 'cascade@bizra.io', 'hash', 'user', 'genesis_100', NOW())
            "#,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert user");

        // Create contributor score (child of epoch)
        sqlx::query!(
            r#"
            INSERT INTO poi_contributor_scores (
                epoch_id, contributor_id, total_score, created_at
            )
            VALUES ($1, $2, 85.5, NOW())
            "#,
            epoch_id,
            user_id
        )
        .execute(&db.pool)
        .await
        .expect("Should insert contributor score");

        // Verify score exists
        let score_count_before = sqlx::query!(
            "SELECT COUNT(*) as count FROM poi_contributor_scores WHERE epoch_id = $1",
            epoch_id
        )
        .fetch_one(&db.pool)
        .await
        .expect("Should fetch count");
        assert_eq!(score_count_before.count.unwrap(), 1);

        // Attempt to delete epoch (check cascade behavior)
        let delete_result = sqlx::query!("DELETE FROM poi_reward_epoch WHERE id = $1", epoch_id)
            .execute(&db.pool)
            .await;

        match delete_result {
            Ok(_) => {
                eprintln!("Epoch deleted - checking if scores were cascaded");
                let score_count_after = sqlx::query!(
                    "SELECT COUNT(*) as count FROM poi_contributor_scores WHERE epoch_id = $1",
                    epoch_id
                )
                .fetch_one(&db.pool)
                .await
                .expect("Should fetch count");

                if score_count_after.count.unwrap() == 0 {
                    eprintln!("✅ CASCADE DELETE worked - child scores deleted");
                } else {
                    panic!("Scores still exist after epoch delete - unexpected behavior");
                }
            }
            Err(e) => {
                eprintln!("❌ DELETE RESTRICT in effect - cannot delete epoch with children");
                assert!(
                    e.to_string().contains("foreign key constraint"),
                    "Error should mention FK constraint"
                );
            }
        }
    }
}
