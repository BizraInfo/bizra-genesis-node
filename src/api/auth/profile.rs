// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PROFILE API HANDLER                                ║
// ║  User profile management with JWT-authenticated updates                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use super::types::Claims;

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdateRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordChangeRequest {
    pub current_password: String,
    pub new_password: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileResponse {
    pub success: bool,
    pub user: UserProfile,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub program: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordChangeResponse {
    pub success: bool,
    pub message: String,
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
pub enum ProfileError {
    #[error("User not found")]
    UserNotFound,

    #[error("Email already in use")]
    EmailAlreadyExists,

    #[error("Invalid current password")]
    InvalidPassword,

    #[error("Password too weak: {0}")]
    WeakPassword(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Password hashing error")]
    BcryptError(#[from] bcrypt::BcryptError),
}

impl IntoResponse for ProfileError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            ProfileError::UserNotFound => {
                (StatusCode::NOT_FOUND, "USER_NOT_FOUND", "User not found")
            }
            ProfileError::EmailAlreadyExists => (
                StatusCode::CONFLICT,
                "EMAIL_EXISTS",
                "This email is already registered to another account",
            ),
            ProfileError::InvalidPassword => (
                StatusCode::UNAUTHORIZED,
                "INVALID_PASSWORD",
                "Current password is incorrect",
            ),
            ProfileError::WeakPassword(ref msg) => {
                (StatusCode::BAD_REQUEST, "WEAK_PASSWORD", msg.as_str())
            }
            ProfileError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                "Authentication required",
            ),
            ProfileError::Internal(ref msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                msg.as_str(),
            ),
            ProfileError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "An internal error occurred",
            ),
            ProfileError::BcryptError(_) => (
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
// PASSWORD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

fn validate_password(password: &str) -> Result<(), ProfileError> {
    if password.len() < 8 {
        return Err(ProfileError::WeakPassword(
            "Password must be at least 8 characters".to_string(),
        ));
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());

    if !has_uppercase || !has_lowercase || !has_digit {
        return Err(ProfileError::WeakPassword(
            "Password must contain uppercase, lowercase, and a number".to_string(),
        ));
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PROFILE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn get_profile_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ProfileResponse>, ProfileError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| ProfileError::Internal("Invalid user ID in token".to_string()))?;

    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, username, password_hash, first_name, last_name, program, created_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ProfileError::UserNotFound)?;

    Ok(Json(ProfileResponse {
        success: true,
        user: UserProfile {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            program: user.program,
            created_at: user.created_at,
        },
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn update_profile_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ProfileUpdateRequest>,
) -> Result<Json<ProfileResponse>, ProfileError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| ProfileError::Internal("Invalid user ID in token".to_string()))?;

    // Check if email is being changed and if it's already taken
    if let Some(ref new_email) = payload.email {
        let normalized_email = new_email.trim().to_lowercase();

        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM users WHERE email = $1 AND id != $2",
        )
        .bind(&normalized_email)
        .bind(user_id)
        .fetch_one(pool.as_ref())
        .await?;

        if existing > 0 {
            return Err(ProfileError::EmailAlreadyExists);
        }
    }

    // Build dynamic update query
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, username, password_hash, first_name, last_name, program, created_at
        "#,
    )
    .bind(user_id)
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(payload.email.map(|e| e.trim().to_lowercase()))
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ProfileError::UserNotFound)?;

    tracing::info!(
        user_id = %user.id,
        "Profile updated successfully"
    );

    Ok(Json(ProfileResponse {
        success: true,
        user: UserProfile {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            program: user.program,
            created_at: user.created_at,
        },
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn change_password_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PasswordChangeRequest>,
) -> Result<Json<PasswordChangeResponse>, ProfileError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| ProfileError::Internal("Invalid user ID in token".to_string()))?;

    // Validate new password strength
    validate_password(&payload.new_password)?;

    // Fetch current password hash
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, username, password_hash, first_name, last_name, program, created_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ProfileError::UserNotFound)?;

    // Verify current password
    let password_valid = verify(&payload.current_password, &user.password_hash)?;
    if !password_valid {
        return Err(ProfileError::InvalidPassword);
    }

    // Hash new password
    let new_password_hash = hash(&payload.new_password, DEFAULT_COST)?;

    // Update password and increment token_version to invalidate existing tokens
    sqlx::query(
        r#"
        UPDATE users
        SET
            password_hash = $2,
            token_version = token_version + 1,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(&new_password_hash)
    .execute(pool.as_ref())
    .await?;

    tracing::info!(
        user_id = %user_id,
        "Password changed successfully - all existing tokens invalidated"
    );

    Ok(Json(PasswordChangeResponse {
        success: true,
        message: "Password changed successfully. Please log in again.".to_string(),
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_validation_too_short() {
        let result = validate_password("Short1");
        assert!(result.is_err());
        match result {
            Err(ProfileError::WeakPassword(msg)) => {
                assert!(msg.contains("8 characters"));
            }
            _ => panic!("Expected WeakPassword error"),
        }
    }

    #[test]
    fn test_password_validation_no_uppercase() {
        let result = validate_password("lowercase123");
        assert!(result.is_err());
    }

    #[test]
    fn test_password_validation_no_lowercase() {
        let result = validate_password("UPPERCASE123");
        assert!(result.is_err());
    }

    #[test]
    fn test_password_validation_no_digit() {
        let result = validate_password("NoDigitsHere");
        assert!(result.is_err());
    }

    #[test]
    fn test_password_validation_valid() {
        let result = validate_password("ValidPass123");
        assert!(result.is_ok());
    }

    #[test]
    fn test_profile_update_request_deserialization() {
        let json = r#"{"firstName": "John", "lastName": "Doe"}"#;
        let request: ProfileUpdateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.first_name, Some("John".to_string()));
        assert_eq!(request.last_name, Some("Doe".to_string()));
        assert!(request.email.is_none());
    }

    #[test]
    fn test_password_change_request_deserialization() {
        let json = r#"{"currentPassword": "OldPass123", "newPassword": "NewPass456"}"#;
        let request: PasswordChangeRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.current_password, "OldPass123");
        assert_eq!(request.new_password, "NewPass456");
    }
}
