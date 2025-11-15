// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - JWT AUTHENTICATION MIDDLEWARE                      ║
// ║  Token validation and user extraction for protected routes               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

// Re-export Claims from login module for consistency
pub use crate::api::auth::login::Claims;

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED USER CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/// User information extracted from validated JWT token
/// Available in handlers via `Extension<Arc<AuthenticatedUser>>`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub email: String,
    pub program: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorResponse {
    success: bool,
    code: String,
    message: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/// JWT authentication middleware
///
/// Validates JWT token from Authorization header and extracts user information.
/// Rejects requests with missing, invalid, or expired tokens.
///
/// # Usage
///
/// ```rust,no_run
/// use axum::{Router, routing::get, middleware};
/// use bizra_genesis_node::api::middleware::jwt::jwt_auth;
///
/// let protected_routes = Router::new()
///     .route("/protected", get(protected_handler))
///     .layer(middleware::from_fn(jwt_auth));
/// ```
pub async fn jwt_auth(
    mut request: Request,
    next: Next,
) -> Result<Response, AuthError> {
    // 1. Extract Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AuthError::MissingToken)?;

    // 2. Verify Bearer token format
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AuthError::InvalidTokenFormat)?;

    // 3. Get JWT secret from environment
    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| AuthError::ServerError("JWT_SECRET not configured".to_string()))?;

    // 4. Decode and validate token
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::ExpiredToken,
        jsonwebtoken::errors::ErrorKind::InvalidToken => AuthError::InvalidToken,
        _ => AuthError::InvalidToken,
    })?;

    // 5. Extract user information from claims
    let user_id = Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AuthError::InvalidToken)?;

    let authenticated_user = AuthenticatedUser {
        user_id,
        email: token_data.claims.email,
        program: token_data.claims.program,
    };

    // 6. Insert authenticated user into request extensions
    request.extensions_mut().insert(Arc::new(authenticated_user));

    // 7. Continue to next middleware/handler
    Ok(next.run(request).await)
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Missing authentication token")]
    MissingToken,

    #[error("Invalid token format - must be 'Bearer <token>'")]
    InvalidTokenFormat,

    #[error("Invalid or malformed token")]
    InvalidToken,

    #[error("Token has expired")]
    ExpiredToken,

    #[error("Server error: {0}")]
    ServerError(String),
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            AuthError::MissingToken => (
                StatusCode::UNAUTHORIZED,
                "MISSING_TOKEN",
                "Authentication token is required",
            ),
            AuthError::InvalidTokenFormat => (
                StatusCode::UNAUTHORIZED,
                "INVALID_TOKEN_FORMAT",
                "Authorization header must be 'Bearer <token>'",
            ),
            AuthError::InvalidToken => (
                StatusCode::UNAUTHORIZED,
                "INVALID_TOKEN",
                "Invalid or malformed authentication token",
            ),
            AuthError::ExpiredToken => (
                StatusCode::UNAUTHORIZED,
                "EXPIRED_TOKEN",
                "Authentication token has expired - please login again",
            ),
            AuthError::ServerError(ref msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "SERVER_ERROR",
                msg.as_str(),
            ),
        };

        let error_response = ErrorResponse {
            success: false,
            code: code.to_string(),
            message: message.to_string(),
        };

        (status, Json(error_response)).into_response()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Extract authenticated user from request extensions
///
/// Use this in protected route handlers to get the current user.
///
/// # Example
///
/// ```rust,no_run
/// use axum::{Extension, Json};
/// use bizra_genesis_node::api::middleware::jwt::AuthenticatedUser;
///
/// async fn protected_handler(
///     Extension(user): Extension<Arc<AuthenticatedUser>>,
/// ) -> Json<String> {
///     Json(format!("Hello, {}!", user.email))
/// }
/// ```
pub fn extract_user(extensions: &axum::http::Extensions) -> Option<Arc<AuthenticatedUser>> {
    extensions.get::<Arc<AuthenticatedUser>>().cloned()
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};
    use chrono::{Duration, Utc};

    fn generate_test_token(secret: &str, expired: bool) -> String {
        let now = Utc::now();
        let expiration = if expired {
            now - Duration::hours(1) // Expired 1 hour ago
        } else {
            now + Duration::hours(24) // Valid for 24 hours
        };

        let claims = Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            email: "test@bizra.ai".to_string(),
            program: "alpha-100".to_string(),
            exp: expiration.timestamp(),
            iat: now.timestamp(),
            jti: "test-token-123".to_string(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    #[test]
    fn test_authenticated_user_serialization() {
        let user = AuthenticatedUser {
            user_id: Uuid::new_v4(),
            email: "test@bizra.ai".to_string(),
            program: "alpha-100".to_string(),
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("test@bizra.ai"));
        assert!(json.contains("alpha-100"));
    }

    #[test]
    fn test_auth_error_responses() {
        let errors = vec![
            (AuthError::MissingToken, StatusCode::UNAUTHORIZED),
            (AuthError::InvalidTokenFormat, StatusCode::UNAUTHORIZED),
            (AuthError::InvalidToken, StatusCode::UNAUTHORIZED),
            (AuthError::ExpiredToken, StatusCode::UNAUTHORIZED),
            (AuthError::ServerError("Test error".to_string()), StatusCode::INTERNAL_SERVER_ERROR),
        ];

        for (error, expected_status) in errors {
            let response = error.into_response();
            assert_eq!(response.status(), expected_status);
        }
    }

    #[test]
    fn test_token_validation() {
        // Note: Full integration tests would require setting up Axum test server
        // This tests the token generation helper
        let secret = "test-secret-key-minimum-32-bytes-long";

        let valid_token = generate_test_token(secret, false);
        assert!(!valid_token.is_empty());

        let expired_token = generate_test_token(secret, true);
        assert!(!expired_token.is_empty());

        // Tokens should be different
        assert_ne!(valid_token, expired_token);
    }
}
