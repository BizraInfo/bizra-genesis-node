// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ALPHA INVITES INTEGRATION TESTS                   ║
// ║  Comprehensive integration testing for alpha invite system              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bizra_genesis_node::api::alpha_invites::{
    accept_alpha_invite, generate_invite_code, generate_jwt_token, list_alpha_requests,
    request_alpha_access, AlphaInvite, AlphaRequest, InviteStatus,
};
use chrono::{DateTime, Duration, Utc};
use sqlx::{Connection, PgConnection, PgPool};
use std::env;
use uuid::Uuid;

/// Get test database URL from environment
fn test_database_url() -> String {
    env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://bizra:bizra_test@localhost:5432/bizra_test".to_string())
}

/// Set up test database with required tables
async fn setup_test_database() -> Result<PgPool, sqlx::Error> {
    let database_url = test_database_url();
    let pool = PgPool::connect(&database_url).await?;

    // Create tables if they don't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alpha_requests (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            organization TEXT,
            use_case TEXT NOT NULL,
            experience VARCHAR(100) NOT NULL,
            position INTEGER NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alpha_invites (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            invite_code VARCHAR(20) UNIQUE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            position INTEGER,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            accepted_at TIMESTAMP WITH TIME ZONE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_alpha_user BOOLEAN DEFAULT FALSE,
            alpha_position INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

/// Clean up test data
async fn cleanup_test_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM users WHERE email LIKE 'test+%'")
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM alpha_invites WHERE email LIKE 'test+%'")
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM alpha_requests WHERE email LIKE 'test+%'")
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(feature = "database")]
mod tests {
    use super::*;
    use axum::{extract::State, http::StatusCode, Json};
    use serde_json::json;

    #[tokio::test]
    async fn test_request_alpha_access_success() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        let request = AlphaRequest {
            name: "Test User".to_string(),
            email: "test+success@bizra.ai".to_string(),
            organization: Some("Test Corp".to_string()),
            use_case: "Testing the alpha invite system".to_string(),
            experience: "Beginner".to_string(),
        };

        let result = request_alpha_access(State(pool.clone()), Json(request)).await;

        assert!(result.is_ok());
        let (status, Json(response)) = result.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(response.position, 1);
        assert!(response.message.contains("Welcome to the alpha program"));

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_request_alpha_access_duplicate_email() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        let request1 = AlphaRequest {
            name: "Test User 1".to_string(),
            email: "test+duplicate@bizra.ai".to_string(),
            organization: Some("Test Corp".to_string()),
            use_case: "Testing duplicate email".to_string(),
            experience: "Beginner".to_string(),
        };

        let request2 = AlphaRequest {
            name: "Test User 2".to_string(),
            email: "test+duplicate@bizra.ai".to_string(), // Same email
            organization: Some("Test Corp 2".to_string()),
            use_case: "Testing duplicate email again".to_string(),
            experience: "Advanced".to_string(),
        };

        // First request should succeed
        let result1 = request_alpha_access(State(pool.clone()), Json(request1)).await;
        assert!(result1.is_ok());

        // Second request should fail
        let result2 = request_alpha_access(State(pool.clone()), Json(request2)).await;
        assert!(result2.is_err());
        let (status, _) = result2.unwrap_err();
        assert_eq!(status, StatusCode::CONFLICT);

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_request_alpha_access_validation_error() {
        let pool = setup_test_database().await.unwrap();

        let request = AlphaRequest {
            name: "".to_string(),               // Invalid: too short
            email: "invalid-email".to_string(), // Invalid: not an email
            organization: Some("Test Corp".to_string()),
            use_case: "Short".to_string(), // Invalid: too short
            experience: "Beginner".to_string(),
        };

        let result = request_alpha_access(State(pool.clone()), Json(request)).await;
        assert!(result.is_err());
        let (status, _) = result.unwrap_err();
        assert_eq!(status, StatusCode::BAD_REQUEST);

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_request_alpha_access_waitlist() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        // Create 100 requests to fill the alpha program
        for i in 1..=100 {
            let request = AlphaRequest {
                name: format!("User {}", i),
                email: format!("test+user{}@bizra.ai", i),
                organization: Some(format!("Corp {}", i)),
                use_case: format!("Use case for user {}", i),
                experience: "Beginner".to_string(),
            };

            let result = request_alpha_access(State(pool.clone()), Json(request)).await;
            assert!(result.is_ok());
        }

        // 101st request should be waitlisted
        let request = AlphaRequest {
            name: "Waitlist User".to_string(),
            email: "test+waitlist@bizra.ai".to_string(),
            organization: Some("Waitlist Corp".to_string()),
            use_case: "Testing waitlist functionality".to_string(),
            experience: "Advanced".to_string(),
        };

        let result = request_alpha_access(State(pool.clone()), Json(request)).await;
        assert!(result.is_ok());
        let (status, Json(response)) = result.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(response.position, 101);
        assert!(response.message.contains("waitlist"));

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_accept_alpha_invite_success() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        // First create an invite
        let invite_code = generate_invite_code();
        let email = "test+accept@bizra.ai";
        let expires_at = Utc::now() + Duration::days(7);

        sqlx::query(
            r#"
            INSERT INTO alpha_invites (id, email, invite_code, status, position, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(Uuid::new_v4().to_string())
        .bind(email)
        .bind(&invite_code)
        .bind(InviteStatus::Sent)
        .bind(1)
        .bind(expires_at)
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();

        // Now accept the invite
        let payload = json!({
            "password": "Str0ngP@ssw0rd123!"
        });

        let result = accept_alpha_invite(
            State(pool.clone()),
            axum::extract::Path(invite_code),
            Json(payload),
        )
        .await;

        assert!(result.is_ok());
        let (status, Json(response)) = result.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert!(response.success);
        assert!(!response.user_id.is_empty());
        assert!(!response.access_token.is_empty());

        // Verify user was created
        let user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE email = $1")
            .bind(email)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(user_count.0, 1);

        // Verify invite was marked as accepted
        let invite_status: (String,) =
            sqlx::query_as("SELECT status FROM alpha_invites WHERE email = $1")
                .bind(email)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(invite_status.0, "accepted");

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_accept_alpha_invite_invalid_code() {
        let pool = setup_test_database().await.unwrap();

        let payload = json!({
            "password": "Str0ngP@ssw0rd123!"
        });

        let result = accept_alpha_invite(
            State(pool.clone()),
            axum::extract::Path("INVALID-CODE".to_string()),
            Json(payload),
        )
        .await;

        assert!(result.is_err());
        let (status, _) = result.unwrap_err();
        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_accept_alpha_invite_already_accepted() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        // Create an already accepted invite
        let invite_code = generate_invite_code();
        let email = "test+already@bizra.ai";

        sqlx::query(
            r#"
            INSERT INTO alpha_invites (id, email, invite_code, status, position, expires_at, created_at, accepted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#
        )
        .bind(Uuid::new_v4().to_string())
        .bind(email)
        .bind(&invite_code)
        .bind(InviteStatus::Accepted)
        .bind(1)
        .bind(Utc::now() + Duration::days(7))
        .bind(Utc::now())
        .bind(Some(Utc::now()))
        .execute(&pool)
        .await
        .unwrap();

        let payload = json!({
            "password": "Str0ngP@ssw0rd123!"
        });

        let result = accept_alpha_invite(
            State(pool.clone()),
            axum::extract::Path(invite_code),
            Json(payload),
        )
        .await;

        assert!(result.is_err());
        let (status, _) = result.unwrap_err();
        assert_eq!(status, StatusCode::CONFLICT);

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_accept_alpha_invite_expired() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        // Create an expired invite
        let invite_code = generate_invite_code();
        let email = "test+expired@bizra.ai";

        sqlx::query(
            r#"
            INSERT INTO alpha_invites (id, email, invite_code, status, position, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(Uuid::new_v4().to_string())
        .bind(email)
        .bind(&invite_code)
        .bind(InviteStatus::Sent)
        .bind(1)
        .bind(Utc::now() - Duration::days(1)) // Already expired
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();

        let payload = json!({
            "password": "Str0ngP@ssw0rd123!"
        });

        let result = accept_alpha_invite(
            State(pool.clone()),
            axum::extract::Path(invite_code),
            Json(payload),
        )
        .await;

        assert!(result.is_err());
        let (status, _) = result.unwrap_err();
        assert_eq!(status, StatusCode::GONE);

        // Verify invite was marked as expired
        let invite_status: (String,) =
            sqlx::query_as("SELECT status FROM alpha_invites WHERE email = $1")
                .bind(email)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(invite_status.0, "expired");

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_accept_alpha_invite_missing_password() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_database(&pool).await.unwrap();

        // Create a valid invite
        let invite_code = generate_invite_code();
        let email = "test+nopass@bizra.ai";

        sqlx::query(
            r#"
            INSERT INTO alpha_invites (id, email, invite_code, status, position, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(Uuid::new_v4().to_string())
        .bind(email)
        .bind(&invite_code)
        .bind(InviteStatus::Sent)
        .bind(1)
        .bind(Utc::now() + Duration::days(7))
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();

        let payload = json!({}); // Missing password

        let result = accept_alpha_invite(
            State(pool.clone()),
            axum::extract::Path(invite_code),
            Json(payload),
        )
        .await;

        assert!(result.is_err());
        let (status, _) = result.unwrap_err();
        assert_eq!(status, StatusCode::BAD_REQUEST);

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_list_alpha_requests() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        // Create some test requests
        for i in 1..=5 {
            let request = AlphaRequest {
                name: format!("Test User {}", i),
                email: format!("test+list{}@bizra.ai", i),
                organization: Some(format!("Test Corp {}", i)),
                use_case: format!("Use case {}", i),
                experience: "Beginner".to_string(),
            };

            let result = request_alpha_access(State(pool.clone()), Json(request)).await;
            assert!(result.is_ok());
        }

        // List pending requests
        let result = list_alpha_requests(State(pool.clone())).await;

        assert!(result.is_ok());
        let Json(requests) = result.unwrap();
        assert_eq!(requests.len(), 5);

        // Verify structure
        for request in requests {
            assert!(!request.name.is_empty());
            assert!(!request.email.is_empty());
            assert!(!request.use_case.is_empty());
        }

        cleanup_test_data(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_generate_invite_code() {
        let code1 = generate_invite_code();
        let code2 = generate_invite_code();

        // Codes should be different
        assert_ne!(code1, code2);

        // Code should be 14 characters with dashes (XXXX-XXXX-XXXX format)
        assert_eq!(code1.len(), 14);
        assert!(code1.contains('-'));

        // Should only contain valid characters
        let valid_chars: std::collections::HashSet<char> =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789-".chars().collect();
        for c in code1.chars() {
            assert!(
                valid_chars.contains(&c),
                "Invalid character in invite code: {}",
                c
            );
        }
    }

    #[tokio::test]
    async fn test_generate_jwt_token() {
        let user_id = "test-user-123";

        let token = generate_jwt_token(user_id);
        assert!(token.is_ok());

        let token = token.unwrap();
        assert!(!token.is_empty());

        // Token should be a valid JWT (3 parts separated by dots)
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    #[tokio::test]
    async fn test_generate_jwt_token_with_env_secret() {
        // Set a custom JWT secret
        env::set_var("JWT_SECRET", "test-secret-key-for-testing-purposes-only");

        let user_id = "test-user-456";
        let token = generate_jwt_token(user_id);
        assert!(token.is_ok());

        // Clean up
        env::remove_var("JWT_SECRET");
    }

    #[tokio::test]
    async fn test_invite_status_enum() {
        // Test enum variants
        assert_eq!(InviteStatus::Pending.to_string(), "pending");
        assert_eq!(InviteStatus::Sent.to_string(), "sent");
        assert_eq!(InviteStatus::Accepted.to_string(), "accepted");
        assert_eq!(InviteStatus::Expired.to_string(), "expired");
        assert_eq!(InviteStatus::Revoked.to_string(), "revoked");
    }

    #[tokio::test]
    async fn test_alpha_request_validation() {
        // Test valid request
        let valid_request = AlphaRequest {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            organization: Some("Example Corp".to_string()),
            use_case: "Building AI applications for healthcare".to_string(),
            experience: "Intermediate".to_string(),
        };
        assert!(valid_request.validate().is_ok());

        // Test invalid requests
        let invalid_name = AlphaRequest {
            name: "A".to_string(), // Too short
            email: "john@example.com".to_string(),
            organization: Some("Example Corp".to_string()),
            use_case: "Building AI applications for healthcare".to_string(),
            experience: "Intermediate".to_string(),
        };
        assert!(invalid_name.validate().is_err());

        let invalid_email = AlphaRequest {
            name: "John Doe".to_string(),
            email: "not-an-email".to_string(), // Invalid email
            organization: Some("Example Corp".to_string()),
            use_case: "Building AI applications for healthcare".to_string(),
            experience: "Intermediate".to_string(),
        };
        assert!(invalid_email.validate().is_err());

        let invalid_use_case = AlphaRequest {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            organization: Some("Example Corp".to_string()),
            use_case: "Short".to_string(), // Too short
            experience: "Intermediate".to_string(),
        };
        assert!(invalid_use_case.validate().is_err());
    }

    #[tokio::test]
    async fn test_alpha_invite_serialization() {
        let invite = AlphaInvite {
            id: "test-id".to_string(),
            email: "test@example.com".to_string(),
            invite_code: "ABCD-EFGH-IJKL".to_string(),
            status: InviteStatus::Sent,
            position: 42,
            expires_at: Utc::now() + Duration::days(7),
            created_at: Utc::now(),
            accepted_at: None,
        };

        // Test JSON serialization
        let json = serde_json::to_string(&invite).unwrap();
        assert!(json.contains("test@example.com"));
        assert!(json.contains("ABCD-EFGH-IJKL"));

        // Test JSON deserialization
        let deserialized: AlphaInvite = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.email, invite.email);
        assert_eq!(deserialized.invite_code, invite.invite_code);
        assert_eq!(deserialized.position, invite.position);
    }

    #[tokio::test]
    async fn test_concurrent_alpha_requests() {
        let pool = setup_test_database().await.unwrap();
        cleanup_test_data(&pool).await.unwrap();

        let mut handles = vec![];

        // Spawn multiple concurrent requests
        for i in 0..10 {
            let pool_clone = pool.clone();
            let handle = tokio::spawn(async move {
                let request = AlphaRequest {
                    name: format!("Concurrent User {}", i),
                    email: format!("test+concurrent{}@bizra.ai", i),
                    organization: Some(format!("Concurrent Corp {}", i)),
                    use_case: format!("Concurrent use case {}", i),
                    experience: "Beginner".to_string(),
                };

                request_alpha_access(State(pool_clone), Json(request)).await
            });
            handles.push(handle);
        }

        // Wait for all requests to complete
        let mut success_count = 0;
        for handle in handles {
            let result = handle.await.unwrap();
            if result.is_ok() {
                success_count += 1;
            }
        }

        assert_eq!(success_count, 10);

        // Verify all requests were recorded
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM alpha_requests WHERE email LIKE 'test+concurrent%'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count.0, 10);

        cleanup_test_data(&pool).await.unwrap();
    }
}
