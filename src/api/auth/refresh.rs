// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - TOKEN REFRESH API HANDLER                          ║
// ║  Secure token rotation with refresh token validation                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

// Import Claims from login module
use super::login::{Claims, RefreshClaims};

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST & RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResponse {
    pub success: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub success: bool,
    pub code: String,
    pub message: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE MODELS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, sqlx::FromRow)]
struct User {
    id: Uuid,
    email: String,
    program: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, thiserror::Error)]
pub enum RefreshError {
    #[error("Invalid or expired refresh token")]
    InvalidToken,

    #[error("User not found")]
    UserNotFound,

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    JwtError(#[from] jsonwebtoken::errors::Error),
}

impl IntoResponse for RefreshError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            RefreshError::InvalidToken => (
                StatusCode::UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Invalid or expired refresh token - please login again",
            ),
            RefreshError::UserNotFound => (
                StatusCode::UNAUTHORIZED,
                "USER_NOT_FOUND",
                "User account no longer exists",
            ),
            RefreshError::Internal(ref msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                msg.as_str(),
            ),
            RefreshError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "An internal error occurred",
            ),
            RefreshError::JwtError(_) => (
                StatusCode::UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Invalid or expired refresh token",
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
// JWT TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/// Generate new access token (24 hour expiration for Alpha-100)
fn generate_access_token(
    user_id: Uuid,
    email: &str,
    program: &str,
    jwt_secret: &str,
) -> Result<String, RefreshError> {
    let now = Utc::now();
    let expiration = now + Duration::hours(24);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        program: program.to_string(),
        exp: expiration.timestamp(),
        iat: now.timestamp(),
        jti: Uuid::new_v4().to_string(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?;

    Ok(token)
}

/// Generate new refresh token with rotation (7 day expiration)
fn generate_refresh_token(user_id: Uuid, jwt_secret: &str) -> Result<String, RefreshError> {
    let now = Utc::now();
    let expiration = now + Duration::days(7);

    let claims = RefreshClaims {
        sub: user_id.to_string(),
        token_family: Uuid::new_v4().to_string(), // New family for rotation
        exp: expiration.timestamp(),
        iat: now.timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?;

    Ok(token)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REFRESH HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/// Token refresh handler
///
/// Validates refresh token and issues new access + refresh token pair.
/// Implements refresh token rotation for enhanced security.
///
/// # Security Features
///
/// - Refresh token rotation (new refresh token on each use)
/// - User account validation (ensure user still exists)
/// - Token expiration enforcement
/// - Audit logging for security monitoring
///
/// # Endpoint
///
/// ```
/// POST /auth/refresh
/// Content-Type: application/json
///
/// {
///   "refreshToken": "eyJhbGciOiJIUzI1..."
/// }
/// ```
pub async fn refresh_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<RefreshResponse>, RefreshError> {
    // 1. Get JWT secret from environment
    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| RefreshError::Internal("JWT_SECRET not configured".to_string()))?;

    // 2. Decode and validate refresh token
    let token_data = decode::<RefreshClaims>(
        &payload.refresh_token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| RefreshError::InvalidToken)?;

    // 3. Extract user ID from token
    let user_id =
        Uuid::parse_str(&token_data.claims.sub).map_err(|_| RefreshError::InvalidToken)?;

    // 4. Verify user still exists in database
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, program
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(RefreshError::UserNotFound)?;

    // 5. Generate new access token
    let access_token = generate_access_token(user.id, &user.email, &user.program, &jwt_secret)?;

    // 6. Generate new refresh token (rotation)
    let new_refresh_token = generate_refresh_token(user.id, &jwt_secret)?;

    // 7. Log token refresh for security audit
    tracing::info!(
        user_id = %user.id,
        email = %user.email,
        old_token_family = %token_data.claims.token_family,
        "Token refreshed successfully"
    );

    // 8. Return new token pair
    Ok(Json(RefreshResponse {
        success: true,
        access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 86400, // 24 hours in seconds
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_refresh_claims_serialization() {
        let claims = RefreshClaims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            token_family: "family-123".to_string(),
            exp: 1700000000,
            iat: 1699000000,
        };

        let json = serde_json::to_string(&claims).unwrap();
        assert!(json.contains("\"sub\""));
        assert!(json.contains("family-123"));
    }

    #[test]
    fn test_token_generation() {
        let user_id = Uuid::new_v4();
        let email = "test@bizra.ai";
        let program = "alpha-100";
        let secret = "test-secret-key-minimum-32-bytes-long";

        let access_token = generate_access_token(user_id, email, program, secret);
        assert!(access_token.is_ok());

        let refresh_token = generate_refresh_token(user_id, secret);
        assert!(refresh_token.is_ok());

        // Tokens should be different
        assert_ne!(access_token.unwrap(), refresh_token.unwrap());
    }

    #[test]
    fn test_refresh_token_contains_family() {
        let user_id = Uuid::new_v4();
        let secret = "test-secret-key-minimum-32-bytes-long";

        let token = generate_refresh_token(user_id, secret).unwrap();

        // Decode to verify token_family is present
        let token_data = decode::<RefreshClaims>(
            &token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        );

        assert!(token_data.is_ok());
        let claims = token_data.unwrap().claims;
        assert!(!claims.token_family.is_empty());
    }
}
