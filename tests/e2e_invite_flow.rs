// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E INVITE FLOW TEST                               ║
// ║  End-to-end testing of Alpha-100 invite code registration flow          ║
// ║  Part of Alpha-100 Deployment Plan (Days 7-8/12)                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use reqwest::{Client, StatusCode};
use serde_json::json;
use std::env;
use uuid::Uuid;

/// Get base URL from environment or use default
fn base_url() -> String {
    env::var("E2E_BASE_URL").unwrap_or_else(|_| "https://localhost:8443".to_string())
}

/// Get test invite code from environment
fn test_invite_code() -> String {
    env::var("E2E_INVITE_CODE").unwrap_or_else(|_| "ALPHA-E2E-TEST-001".to_string())
}

#[tokio::test]
#[ignore] // Run only with: cargo test --test e2e_invite_flow -- --ignored
async fn e2e_invite_registration_success() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true) // For local/staging SSL
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Generate unique email for this test
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let password = "Str0ngP@ssw0rd!";

    // Test registration with invite code
    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    assert_eq!(
        register_res.status(),
        StatusCode::CREATED,
        "Registration with valid invite code should return 201 Created"
    );

    let body: serde_json::Value = register_res
        .json()
        .await
        .expect("Registration response should be valid JSON");

    // Validate response structure
    assert!(
        body["user_id"].is_string(),
        "Response should contain user_id"
    );
    assert_eq!(
        body["email"].as_str(),
        Some(email.as_str()),
        "Response should contain correct email"
    );
    assert_eq!(
        body["program"].as_str(),
        Some("Alpha-100"),
        "Response should indicate Alpha-100 program"
    );

    println!("✅ E2E Invite Registration Success: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_registration_and_login() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Generate unique credentials
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let password = "Str0ngP@ssw0rd!";

    // 1. Register with invite code
    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    assert_eq!(
        register_res.status(),
        StatusCode::CREATED,
        "Registration failed"
    );

    // 2. Login with newly registered credentials
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
        "Login should succeed with newly registered credentials"
    );

    let login_body: serde_json::Value = login_res.json().await.expect("Invalid login JSON");

    // Validate tokens
    assert!(
        login_body["access_token"].is_string(),
        "Login should return access_token"
    );
    assert!(
        login_body["refresh_token"].is_string(),
        "Login should return refresh_token"
    );

    println!("✅ E2E Invite Registration and Login: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_invalid_code() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Use invalid invite code
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let password = "Str0ngP@ssw0rd!";

    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": "INVALID-CODE-123",
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    // Should return 400 Bad Request or 403 Forbidden
    assert!(
        register_res.status() == StatusCode::BAD_REQUEST
            || register_res.status() == StatusCode::FORBIDDEN,
        "Invalid invite code should be rejected"
    );

    println!("✅ E2E Invite Invalid Code: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_missing_code() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();

    // Omit invite code
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let password = "Str0ngP@ssw0rd!";

    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    // Should return 400 Bad Request
    assert_eq!(
        register_res.status(),
        StatusCode::BAD_REQUEST,
        "Missing invite code should return 400"
    );

    println!("✅ E2E Invite Missing Code: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_duplicate_email() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Use same email for both registrations
    let email = "e2e+duplicate@bizra.ai".to_string();
    let password = "Str0ngP@ssw0rd!";

    // First registration (should succeed if email is new)
    let _first_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("First registration request failed");

    // Second registration with same email (should fail)
    let second_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Second registration request failed");

    // Second registration should fail with 409 Conflict or 400 Bad Request
    assert!(
        second_res.status() == StatusCode::CONFLICT
            || second_res.status() == StatusCode::BAD_REQUEST,
        "Duplicate email registration should be rejected"
    );

    println!("✅ E2E Invite Duplicate Email: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_weak_password() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Use weak password
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let weak_password = "weak"; // Too short, no complexity

    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": weak_password
        }))
        .send()
        .await
        .expect("Registration request failed");

    // Should return 400 Bad Request due to password validation
    assert_eq!(
        register_res.status(),
        StatusCode::BAD_REQUEST,
        "Weak password should be rejected"
    );

    println!("✅ E2E Invite Weak Password: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_invalid_email_format() {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Use invalid email format
    let invalid_email = "not-an-email";
    let password = "Str0ngP@ssw0rd!";

    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": invalid_email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    // Should return 400 Bad Request due to email validation
    assert_eq!(
        register_res.status(),
        StatusCode::BAD_REQUEST,
        "Invalid email format should be rejected"
    );

    println!("✅ E2E Invite Invalid Email Format: PASSED");
}

#[tokio::test]
#[ignore]
async fn e2e_invite_alpha_100_limit() {
    // This test is informational - it validates that the system
    // tracks Alpha-100 participant count, but may not actually
    // reach the limit during testing

    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to build HTTP client");

    let base = base_url();
    let invite_code = test_invite_code();

    // Attempt registration
    let email = format!("e2e+{}@bizra.ai", Uuid::new_v4());
    let password = "Str0ngP@ssw0rd!";

    let register_res = client
        .post(format!("{}/auth/register", base))
        .json(&json!({
            "invite_code": invite_code,
            "email": email,
            "password": password
        }))
        .send()
        .await
        .expect("Registration request failed");

    // If Alpha-100 is full, should return 403 Forbidden
    // Otherwise, should succeed with 201 Created
    match register_res.status() {
        StatusCode::CREATED => {
            println!("✅ E2E Invite Alpha-100 Limit: PASSED (slots available)");
        }
        StatusCode::FORBIDDEN => {
            println!("✅ E2E Invite Alpha-100 Limit: PASSED (program full)");
        }
        status => {
            panic!(
                "Unexpected status code: {}. Expected 201 (available) or 403 (full)",
                status
            );
        }
    }
}
