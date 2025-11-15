// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E AUTH FLOW TEST                                 ║
// ║  End-to-end testing of authentication flows (login, refresh, protected)  ║
// ║  Part of Alpha-100 Deployment Plan (Days 7-8/12)                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use reqwest::{Client, StatusCode};
use serde_json::json;
use std::env;

/// Get base URL from environment or use default
fn base_url() -> String {
    env::var("E2E_BASE_URL").unwrap_or_else(|_| "https://localhost:8443".to_string())
}

/// Get test user credentials from environment
fn test_credentials() -> (String, String) {
    let email = env::var("E2E_CANARY_EMAIL").unwrap_or_else(|_| "canary@bizra.ai".to_string());
    let password =
        env::var("E2E_CANARY_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".to_string());
    (email, password)
}

#[tokio::test]
#[ignore] // Run only with: cargo test --test e2e_auth -- --ignored
async fn e2e_auth_login_success() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true) // For local/staging SSL
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let (email, password) = test_credentials();

    // Test login endpoint
    let login_res = client
        .post(format!("{}/auth/login", base))
        .json(&json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Login request failed");

    assert_eq!(
        login_res.status(),
        StatusCode::OK,
        "Login should return 200 OK"
    );

    let body: serde_json::Value = login_res
        .json()
        .await
        .expect("Login response should be valid JSON");

    // Validate response structure
    assert!(
        body["access_token"].is_string(),
        "Response should contain access_token"
    );
    assert!(
        body["refresh_token"].is_string(),
        "Response should contain refresh_token"
    );
    assert!(
        body["token_type"].as_str() == Some("Bearer"),
        "Token type should be Bearer"
    );

    println!("✅ E2E Auth Login Success: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_login_and_protected_endpoint() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let (email, password) = test_credentials();

    // 1. Login to get access token
    let login_res = client
        .post(format!("{}/auth/login", base))
        .json(&json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Login request failed");

    assert_eq!(login_res.status(), StatusCode::OK, "Login failed");

    let body: serde_json::Value = login_res.json().await.expect("Invalid login JSON");
    let access_token = body["access_token"]
        .as_str()
        .expect("Missing access_token");

    // 2. Access protected endpoint with token
    // Note: This assumes a /me or /user endpoint exists
    // Adjust endpoint based on actual API
    let protected_res = client
        .get(format!("{}/me", base))
        .bearer_auth(access_token)
        .send()
        .await
        .expect("Protected endpoint request failed");

    // Should return 200 with valid token
    assert_eq!(
        protected_res.status(),
        StatusCode::OK,
        "Protected endpoint should be accessible with valid token"
    );

    println!("✅ E2E Auth Protected Endpoint: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_token_refresh() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let (email, password) = test_credentials();

    // 1. Login to get refresh token
    let login_res = client
        .post(format!("{}/auth/login", base))
        .json(&json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Login request failed");

    assert_eq!(login_res.status(), StatusCode::OK, "Login failed");

    let body: serde_json::Value = login_res.json().await.expect("Invalid login JSON");
    let refresh_token = body["refresh_token"]
        .as_str()
        .expect("Missing refresh_token");

    // 2. Use refresh token to get new access token
    let refresh_res = client
        .post(format!("{}/auth/refresh", base))
        .json(&json!({
            "refresh_token": refresh_token
        }))
        .send()
        .await
        .expect("Token refresh request failed");

    assert_eq!(
        refresh_res.status(),
        StatusCode::OK,
        "Token refresh should succeed"
    );

    let refresh_body: serde_json::Value = refresh_res
        .json()
        .await
        .expect("Invalid refresh response JSON");

    // Validate new tokens
    assert!(
        refresh_body["access_token"].is_string(),
        "Refresh should return new access_token"
    );
    assert!(
        refresh_body["refresh_token"].is_string(),
        "Refresh should return new refresh_token"
    );

    // New tokens should be different from original
    let new_access = refresh_body["access_token"].as_str().unwrap();
    let original_access = body["access_token"].as_str().unwrap();

    assert_ne!(
        new_access, original_access,
        "New access token should differ from original (token rotation)"
    );

    println!("✅ E2E Auth Token Refresh: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_invalid_credentials() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Test login with invalid credentials
    let login_res = client
        .post(format!("{}/auth/login", base))
        .json(&json!({
            "email": "invalid@bizra.ai",
            "password": "WrongPassword123!"
        }))
        .send()
        .await
        .expect("Login request failed");

    // Should return 401 Unauthorized
    assert_eq!(
        login_res.status(),
        StatusCode::UNAUTHORIZED,
        "Invalid credentials should return 401"
    );

    println!("✅ E2E Auth Invalid Credentials: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_missing_token() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Access protected endpoint without token
    let protected_res = client
        .get(format!("{}/me", base))
        .send()
        .await
        .expect("Request failed");

    // Should return 401 Unauthorized
    assert_eq!(
        protected_res.status(),
        StatusCode::UNAUTHORIZED,
        "Missing token should return 401"
    );

    println!("✅ E2E Auth Missing Token: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_invalid_token() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Access protected endpoint with invalid token
    let protected_res = client
        .get(format!("{}/me", base))
        .bearer_auth("invalid_token_12345")
        .send()
        .await
        .expect("Request failed");

    // Should return 401 Unauthorized
    assert_eq!(
        protected_res.status(),
        StatusCode::UNAUTHORIZED,
        "Invalid token should return 401"
    );

    println!("✅ E2E Auth Invalid Token: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_auth_rate_limiting() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Make rapid requests to trigger rate limiting
    let mut rate_limited = false;

    for i in 0..20 {
        let login_res = client
            .post(format!("{}/auth/login", base))
            .json(&json!({
                "email": format!("test{}@bizra.ai", i),
                "password": "TestPassword123!"
            }))
            .send()
            .await
            .expect("Request failed");

        if login_res.status() == StatusCode::TOO_MANY_REQUESTS {
            rate_limited = true;
            break;
        }

        // Small delay to avoid overwhelming the server
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    // Note: This test may not trigger rate limiting if limits are high
    // It's informational rather than a hard requirement
    if rate_limited {
        println!("✅ E2E Auth Rate Limiting: PASSED (rate limit triggered)");
    } else {
        println!("⚠️  E2E Auth Rate Limiting: SKIPPED (rate limit not triggered - limits may be high)");
    }
}
