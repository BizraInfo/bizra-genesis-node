// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - LOGIN API HANDLER                                  ║
// ║  JWT-based authentication with secure token generation                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bcrypt::verify;
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST & RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub success: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub program: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub success: bool,
    pub code: String,
    pub message: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT CLAIMS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,     // Subject (user ID)
    pub email: String,   // User email
    pub program: String, // User program (alpha-100, general)
    pub exp: i64,        // Expiration time (Unix timestamp)
    pub iat: i64,        // Issued at (Unix timestamp)
    pub jti: String,     // JWT ID (unique token identifier)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,          // Subject (user ID)
    pub token_family: String, // Token family for refresh rotation
    pub exp: i64,             // Expiration time (Unix timestamp)
    pub iat: i64,             // Issued at (Unix timestamp)
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE MODELS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, sqlx::FromRow)]
#[allow(dead_code)] // User struct may be expanded for future API endpoints
struct User {
    id: Uuid,
    email: String,
    username: String,
    password_hash: String,
    first_name: String,
    last_name: String,
    program: String,
    created_at: DateTime<Utc>,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, thiserror::Error)]
pub enum LoginError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Account not found")]
    AccountNotFound,

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    JwtError(#[from] jsonwebtoken::errors::Error),

    #[error("Password verification failed")]
    BcryptError(#[from] bcrypt::BcryptError),
}

impl IntoResponse for LoginError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            LoginError::InvalidCredentials => (
                StatusCode::UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Invalid email or password",
            ),
            LoginError::AccountNotFound => (
                StatusCode::UNAUTHORIZED,
                "ACCOUNT_NOT_FOUND",
                "No account found for this email",
            ),
            LoginError::Internal(ref msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                msg.as_str(),
            ),
            LoginError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "An internal error occurred",
            ),
            LoginError::JwtError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "TOKEN_ERROR",
                "Failed to generate authentication token",
            ),
            LoginError::BcryptError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "An internal error occurred",
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

/// Generate access token (24 hour expiration for Alpha-100)
fn generate_access_token(
    user_id: Uuid,
    email: &str,
    program: &str,
    jwt_secret: &str,
) -> Result<String, LoginError> {
    let now = Utc::now();
    let expiration = now + Duration::hours(24); // 24 hour expiration for Alpha-100

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        program: program.to_string(),
        exp: expiration.timestamp(),
        iat: now.timestamp(),
        jti: Uuid::new_v4().to_string(), // Unique token ID for tracking/revocation
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?;

    Ok(token)
}

/// Generate refresh token (7 day expiration for Alpha-100)
fn generate_refresh_token(user_id: Uuid, jwt_secret: &str) -> Result<String, LoginError> {
    let now = Utc::now();
    let expiration = now + Duration::days(7); // 7 day expiration for Alpha-100

    let claims = RefreshClaims {
        sub: user_id.to_string(),
        token_family: Uuid::new_v4().to_string(), // For refresh token rotation
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
// MAIN LOGIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn login_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, LoginError> {
    // 1. Normalize email
    let email = payload.email.trim().to_lowercase();

    // 2. Fetch user from database
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, username, password_hash, first_name, last_name, program, created_at
        FROM users
        WHERE email = $1
        "#,
    )
    .bind(&email)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(LoginError::AccountNotFound)?;

    // 3. Verify password
    let password_valid = verify(&payload.password, &user.password_hash)?;
    if !password_valid {
        return Err(LoginError::InvalidCredentials);
    }

    // 4. Get JWT secret from environment
    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| LoginError::Internal("JWT_SECRET not configured".to_string()))?;

    // 5. Generate access token
    let access_token = generate_access_token(user.id, &user.email, &user.program, &jwt_secret)?;

    // 6. Generate refresh token
    let refresh_token = generate_refresh_token(user.id, &jwt_secret)?;

    // 7. Log successful login (for security audit)
    tracing::info!(
        user_id = %user.id,
        email = %user.email,
        program = %user.program,
        "User logged in successfully"
    );

    // 8. Return success response
    Ok(Json(LoginResponse {
        success: true,
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 86400, // 24 hours in seconds
        user: UserInfo {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            program: user.program,
        },
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claims_serialization() {
        let claims = Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            email: "test@bizra.ai".to_string(),
            program: "alpha-100".to_string(),
            exp: 1700000000,
            iat: 1699000000,
            jti: "token-123".to_string(),
        };

        let json = serde_json::to_string(&claims).unwrap();
        assert!(json.contains("\"sub\""));
        assert!(json.contains("test@bizra.ai"));
        assert!(json.contains("alpha-100"));
    }

    #[test]
    fn test_token_generation() {
        let user_id = Uuid::new_v4();
        let email = "test@bizra.ai";
        let program = "alpha-100";
        let secret = "test-secret-key-minimum-32-bytes-long";

        let token = generate_access_token(user_id, email, program, secret);
        assert!(token.is_ok());

        let token_str = token.unwrap();
        assert!(!token_str.is_empty());
        assert!(token_str.contains(".")); // JWT format: header.payload.signature
    }

    #[test]
    fn test_refresh_token_generation() {
        let user_id = Uuid::new_v4();
        let secret = "test-secret-key-minimum-32-bytes-long";

        let token = generate_refresh_token(user_id, secret);
        assert!(token.is_ok());

        let token_str = token.unwrap();
        assert!(!token_str.is_empty());
        assert!(token_str.contains(".")); // JWT format
    }
}
