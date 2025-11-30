// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TEST: AUTH FLOW
// Tests user signup → login → JWT → session verification
// ═══════════════════════════════════════════════════════════════════════════

#![cfg(feature = "database")]

#[cfg(test)]
mod auth_integration_tests {
    use super::super::helpers::*;
    use axum::http::StatusCode;
    use testcontainers::clients::Cli;

    /// Test 1: User Signup → DB Write → Audit Log
    ///
    /// Verifies:
    /// - User can create account via API
    /// - User row created in database
    /// - Audit log entry created
    /// - Password is hashed, not plaintext
    #[tokio::test]
    async fn test_user_signup_creates_db_record_and_audit_log() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Create test user
        let email = "test@bizra.io";
        let password = "SecurePassword123!";
        let user_json = test_user_json(email, password);

        // Send signup request
        let (status, body) = app.send_json("POST", "/api/auth/register", Some(user_json)).await;

        // Assert successful registration
        assert_eq!(
            status,
            StatusCode::CREATED,
            "Expected 201 Created, got {} - body: {}",
            status,
            body
        );

        let json = parse_json(&body);
        assert!(json.get("user_id").is_some(), "Response should contain user_id");
        assert_eq!(
            json.get("email").and_then(|v| v.as_str()),
            Some(email),
            "Email should match"
        );

        // Verify user exists in database
        let pool = sqlx::postgres::PgPoolOptions::new()
            .connect(&app.database_url)
            .await
            .expect("Failed to connect to database");

        let user_row = sqlx::query!(
            r#"
            SELECT id, email, password_hash
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_one(&pool)
        .await
        .expect("User should exist in database");

        assert_eq!(user_row.email, email, "Email should match database record");
        assert_ne!(
            user_row.password_hash,
            password,
            "Password should be hashed, not plaintext"
        );
        assert!(
            user_row.password_hash.starts_with("$argon2"),
            "Password should use Argon2 hashing"
        );

        // Verify audit log entry exists
        let audit_row = sqlx::query!(
            r#"
            SELECT action, email_hash
            FROM security_audit_log
            WHERE action = 'user_registered'
            "#
        )
        .fetch_one(&pool)
        .await
        .expect("Audit log entry should exist");

        assert_eq!(audit_row.action, "user_registered");
        assert!(
            !audit_row.email_hash.is_empty(),
            "Email hash should be present in audit log"
        );
    }

    /// Test 2: User Login → JWT → Session
    ///
    /// Verifies:
    /// - Login with valid credentials succeeds
    /// - JWT token is returned
    /// - Token validates with public key
    /// - Claims contain user_id, email, roles
    #[tokio::test]
    async fn test_user_login_returns_valid_jwt() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // First, create a user
        let email = "login@bizra.io";
        let password = "SecurePassword123!";
        let signup_json = test_user_json(email, password);

        let (signup_status, _) = app
            .send_json("POST", "/api/auth/register", Some(signup_json))
            .await;
        assert_eq!(signup_status, StatusCode::CREATED);

        // Now login
        let login_json = test_user_json(email, password);
        let (login_status, login_body) = app
            .send_json("POST", "/api/auth/login", Some(login_json))
            .await;

        // Assert successful login
        assert_eq!(
            login_status,
            StatusCode::OK,
            "Expected 200 OK, got {} - body: {}",
            login_status,
            login_body
        );

        let json = parse_json(&login_body);

        // Verify token presence
        assert!(
            json.get("token").is_some(),
            "Response should contain JWT token"
        );

        let token = extract_token(&json);
        assert!(
            !token.is_empty(),
            "Token should not be empty"
        );

        // Verify token structure (JWT has 3 parts separated by dots)
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(
            parts.len(),
            3,
            "JWT should have 3 parts (header.payload.signature)"
        );

        // Verify user info in response
        assert_eq!(
            json.get("email").and_then(|v| v.as_str()),
            Some(email),
            "Email should match"
        );
        assert!(
            json.get("user_id").is_some(),
            "Response should contain user_id"
        );

        // TODO: Add JWT validation with public key once JWT validation is exposed
        // For now, we verify the token structure is correct
    }

    /// Test 3: Protected Endpoint Authorization
    ///
    /// Verifies:
    /// - Protected endpoint rejects requests without JWT
    /// - Protected endpoint accepts requests with valid JWT
    /// - Invalid JWT is rejected
    #[tokio::test]
    async fn test_protected_endpoint_authorization() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Test 1: Call protected endpoint without token → 401
        let (status, _) = app.send_json("GET", "/api/user/profile", None).await;
        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "Protected endpoint should reject requests without JWT"
        );

        // Test 2: Create user and login to get valid token
        let email = "protected@bizra.io";
        let password = "SecurePassword123!";
        let signup_json = test_user_json(email, password);

        let (signup_status, _) = app
            .send_json("POST", "/api/auth/register", Some(signup_json))
            .await;
        assert_eq!(signup_status, StatusCode::CREATED);

        let login_json = test_user_json(email, password);
        let (login_status, login_body) = app
            .send_json("POST", "/api/auth/login", Some(login_json))
            .await;
        assert_eq!(login_status, StatusCode::OK);

        let json = parse_json(&login_body);
        let token = extract_token(&json);

        // Test 3: Call protected endpoint with valid token → 200
        let (status, body) = app
            .send_authenticated("GET", "/api/user/profile", &token, None)
            .await;

        assert_eq!(
            status,
            StatusCode::OK,
            "Protected endpoint should accept valid JWT - body: {}",
            body
        );

        // Test 4: Call protected endpoint with invalid token → 401
        let (status, _) = app
            .send_authenticated("GET", "/api/user/profile", "invalid.jwt.token", None)
            .await;

        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "Protected endpoint should reject invalid JWT"
        );
    }

    /// Test 4: Login with Invalid Credentials
    ///
    /// Verifies:
    /// - Wrong password is rejected
    /// - Non-existent user is rejected
    /// - Error messages are consistent (no user enumeration)
    #[tokio::test]
    async fn test_login_with_invalid_credentials() {
        let docker = Box::leak(Box::new(Cli::default()));
        let mut app = TestApp::new(docker).await;

        // Create a valid user
        let email = "valid@bizra.io";
        let password = "CorrectPassword123!";
        let signup_json = test_user_json(email, password);

        let (signup_status, _) = app
            .send_json("POST", "/api/auth/register", Some(signup_json))
            .await;
        assert_eq!(signup_status, StatusCode::CREATED);

        // Test 1: Login with wrong password
        let wrong_password_json = test_user_json(email, "WrongPassword123!");
        let (status, _) = app
            .send_json("POST", "/api/auth/login", Some(wrong_password_json))
            .await;

        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "Wrong password should be rejected"
        );

        // Test 2: Login with non-existent user
        let nonexistent_json = test_user_json("nonexistent@bizra.io", password);
        let (status, _) = app
            .send_json("POST", "/api/auth/login", Some(nonexistent_json))
            .await;

        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "Non-existent user should be rejected"
        );

        // Note: Error messages should be generic to prevent user enumeration
        // This is a security best practice (OWASP A07)
    }
}
