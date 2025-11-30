// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CSRF PROTECTION MIDDLEWARE                         ║
// ║  Double Submit Cookie pattern for CSRF protection                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::Request,
    http::{header, HeaderValue, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::Rng;
use serde::{Deserialize, Serialize};

/// CSRF token header name
pub const CSRF_HEADER: &str = "x-csrf-token";

/// CSRF cookie name
pub const CSRF_COOKIE: &str = "_csrf";

/// CSRF token length in bytes
const TOKEN_LENGTH: usize = 32;

/// Configuration for CSRF protection
#[derive(Debug, Clone)]
pub struct CsrfConfig {
    /// Cookie name for CSRF token
    pub cookie_name: String,
    /// Header name for CSRF token
    pub header_name: String,
    /// Whether to require CSRF token on all state-changing requests
    pub enabled: bool,
    /// Paths to exclude from CSRF protection (e.g., public APIs)
    pub excluded_paths: Vec<String>,
    /// Cookie secure flag (should be true in production)
    pub secure: bool,
    /// Cookie SameSite attribute
    pub same_site: SameSite,
    /// Token expiry in seconds
    pub token_expiry_secs: u64,
}

/// SameSite cookie attribute
#[derive(Debug, Clone, Copy)]
pub enum SameSite {
    Strict,
    Lax,
    None,
}

impl SameSite {
    fn as_str(&self) -> &'static str {
        match self {
            SameSite::Strict => "Strict",
            SameSite::Lax => "Lax",
            SameSite::None => "None",
        }
    }
}

impl Default for CsrfConfig {
    fn default() -> Self {
        Self {
            cookie_name: CSRF_COOKIE.to_string(),
            header_name: CSRF_HEADER.to_string(),
            enabled: true,
            excluded_paths: vec![
                "/health".to_string(),
                "/metrics".to_string(),
                "/api/telemetry".to_string(),
            ],
            secure: true,
            same_site: SameSite::Strict,
            token_expiry_secs: 3600, // 1 hour
        }
    }
}

/// CSRF error response
#[derive(Debug, Serialize, Deserialize)]
pub struct CsrfError {
    pub error: String,
    pub message: String,
}

/// Generate a cryptographically secure CSRF token
pub fn generate_csrf_token() -> String {
    let mut rng = rand::rng();
    let token: [u8; TOKEN_LENGTH] = rng.random();
    hex::encode(token)
}

/// CSRF protection middleware using Double Submit Cookie pattern
///
/// This middleware:
/// 1. Generates a CSRF token and sets it in a cookie for GET requests
/// 2. Validates the CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
/// 3. Compares the cookie token with the X-CSRF-Token header
///
/// # Security
/// - Uses cryptographically secure random tokens
/// - Cookie has Secure, HttpOnly, and SameSite=Strict attributes
/// - Token comparison is timing-safe
pub async fn csrf_middleware(req: Request, next: Next) -> Response {
    let config = CsrfConfig::default();

    // Skip if CSRF protection is disabled
    if !config.enabled {
        return next.run(req).await;
    }

    // Check if path is excluded
    let path = req.uri().path();
    if config.excluded_paths.iter().any(|p| path.starts_with(p)) {
        return next.run(req).await;
    }

    let method = req.method().clone();

    // For safe methods (GET, HEAD, OPTIONS), set CSRF cookie and continue
    if matches!(method, Method::GET | Method::HEAD | Method::OPTIONS) {
        let mut response = next.run(req).await;

        // Generate new token and set cookie
        let token = generate_csrf_token();
        if let Ok(cookie_value) = build_csrf_cookie(&token, &config) {
            response
                .headers_mut()
                .insert(header::SET_COOKIE, cookie_value);
        }

        return response;
    }

    // For state-changing methods, validate CSRF token
    let cookie_token = extract_cookie_token(req.headers(), &config.cookie_name);
    let header_token = extract_header_token(req.headers(), &config.header_name);

    match (cookie_token, header_token) {
        (Some(cookie), Some(header)) => {
            // Timing-safe comparison to prevent timing attacks
            if constant_time_compare(&cookie, &header) {
                next.run(req).await
            } else {
                csrf_error_response("CSRF token mismatch")
            }
        }
        (None, _) => csrf_error_response("CSRF cookie missing"),
        (_, None) => csrf_error_response("CSRF header missing"),
    }
}

/// Build the Set-Cookie header value for CSRF token
fn build_csrf_cookie(token: &str, config: &CsrfConfig) -> Result<HeaderValue, ()> {
    let secure_flag = if config.secure { "; Secure" } else { "" };

    let cookie = format!(
        "{}={}; Path=/; HttpOnly; SameSite={}{}",
        config.cookie_name,
        token,
        config.same_site.as_str(),
        secure_flag
    );

    HeaderValue::from_str(&cookie).map_err(|_| ())
}

/// Extract CSRF token from cookie header
fn extract_cookie_token(headers: &axum::http::HeaderMap, cookie_name: &str) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|cookie| {
            let cookie = cookie.trim();
            let (name, value) = cookie.split_once('=')?;
            if name.trim() == cookie_name {
                Some(value.trim().to_string())
            } else {
                None
            }
        })
}

/// Extract CSRF token from request header
fn extract_header_token(headers: &axum::http::HeaderMap, header_name: &str) -> Option<String> {
    headers
        .get(header_name)?
        .to_str()
        .ok()
        .map(|s| s.to_string())
}

/// Constant-time string comparison to prevent timing attacks
fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

/// Generate CSRF error response
fn csrf_error_response(message: &str) -> Response {
    let error = CsrfError {
        error: "csrf_validation_failed".to_string(),
        message: message.to_string(),
    };

    (StatusCode::FORBIDDEN, Json(error)).into_response()
}

/// CSRF token endpoint for SPA clients
///
/// Returns a new CSRF token for clients that need to obtain one programmatically.
/// This is useful for SPA applications that need to get a token before making
/// their first state-changing request.
#[derive(Debug, Serialize)]
pub struct CsrfTokenResponse {
    pub token: String,
}

/// Handler to get a CSRF token
pub async fn get_csrf_token() -> impl IntoResponse {
    let token = generate_csrf_token();
    let config = CsrfConfig::default();

    let mut response = Json(CsrfTokenResponse {
        token: token.clone(),
    })
    .into_response();

    if let Ok(cookie_value) = build_csrf_cookie(&token, &config) {
        response
            .headers_mut()
            .insert(header::SET_COOKIE, cookie_value);
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, routing::get, routing::post, Router};
    use http::Request;
    use tower::ServiceExt;

    async fn test_handler() -> &'static str {
        "OK"
    }

    #[test]
    fn test_generate_csrf_token() {
        let token1 = generate_csrf_token();
        let token2 = generate_csrf_token();

        // Tokens should be unique
        assert_ne!(token1, token2);

        // Tokens should be 64 characters (32 bytes hex encoded)
        assert_eq!(token1.len(), 64);
        assert_eq!(token2.len(), 64);

        // Tokens should be valid hex
        assert!(hex::decode(&token1).is_ok());
        assert!(hex::decode(&token2).is_ok());
    }

    #[test]
    fn test_constant_time_compare() {
        assert!(constant_time_compare("abc", "abc"));
        assert!(!constant_time_compare("abc", "abd"));
        assert!(!constant_time_compare("abc", "ab"));
        assert!(!constant_time_compare("abc", "abcd"));
    }

    #[tokio::test]
    async fn test_csrf_get_request_sets_cookie() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(axum::middleware::from_fn(csrf_middleware));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        // GET request should set CSRF cookie
        assert!(response.headers().contains_key(header::SET_COOKIE));
    }

    #[tokio::test]
    async fn test_csrf_post_without_token_fails() {
        let app = Router::new()
            .route("/action", post(test_handler))
            .layer(axum::middleware::from_fn(csrf_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/action")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // POST without CSRF token should fail with 403
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_csrf_excluded_path_bypasses() {
        let app = Router::new()
            .route("/health", post(test_handler))
            .layer(axum::middleware::from_fn(csrf_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // Excluded path should bypass CSRF check
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_csrf_post_with_valid_token_succeeds() {
        let app = Router::new()
            .route("/action", post(test_handler))
            .layer(axum::middleware::from_fn(csrf_middleware));

        let token = generate_csrf_token();

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/action")
                    .header(header::COOKIE, format!("_csrf={}", token))
                    .header("x-csrf-token", &token)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // POST with matching CSRF token should succeed
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_csrf_post_with_mismatched_token_fails() {
        let app = Router::new()
            .route("/action", post(test_handler))
            .layer(axum::middleware::from_fn(csrf_middleware));

        let cookie_token = generate_csrf_token();
        let header_token = generate_csrf_token();

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/action")
                    .header(header::COOKIE, format!("_csrf={}", cookie_token))
                    .header("x-csrf-token", &header_token)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // POST with mismatched CSRF token should fail
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
