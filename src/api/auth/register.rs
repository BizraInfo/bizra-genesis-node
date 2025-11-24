// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - REGISTRATION API HANDLER                           ║
// ║  Enterprise-grade user registration with Alpha-100 invite support        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bcrypt::{hash, DEFAULT_COST};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use validator::Validate;

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST & RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[validate(length(min = 3, max = 30, message = "Username must be 3-30 characters"))]
    #[validate(regex(path = *USERNAME_REGEX, message = "Username can only contain letters, numbers, and underscores"))]
    pub username: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,

    #[validate(must_match(other = "password", message = "Passwords do not match"))]
    pub confirm_password: String,

    #[validate(length(min = 1, message = "First name is required"))]
    pub first_name: String,

    #[validate(length(min = 1, message = "Last name is required"))]
    pub last_name: String,

    #[validate(custom(function = "validate_accepted"))]
    pub accept_terms: bool,

    #[validate(custom(function = "validate_accepted"))]
    pub accept_privacy: bool,

    /// Optional Alpha-100 invite token
    #[serde(default)]
    pub invite_token: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterResponse {
    pub success: bool,
    pub user_id: Uuid,
    pub program: UserProgram,
    pub has_invite: bool,
    pub next: String,
}

#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum UserProgram {
    Alpha100,
    General,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub success: bool,
    pub code: String,
    pub message: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref USERNAME_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
}

fn validate_accepted(value: &bool) -> Result<(), validator::ValidationError> {
    if *value {
        Ok(())
    } else {
        Err(validator::ValidationError::new("must_accept"))
    }
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

#[derive(Debug, sqlx::FromRow)]
struct InviteToken {
    id: Uuid,
    token: String,
    created_by: Uuid,
    expires_at: DateTime<Utc>,
    used: bool,
    used_by: Option<Uuid>,
    used_at: Option<DateTime<Utc>>,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, thiserror::Error)]
pub enum RegistrationError {
    #[error("Email already registered")]
    EmailTaken,

    #[error("Username already taken")]
    UsernameTaken,

    #[error("Invite token is invalid or has expired")]
    InvalidInvite,

    #[error("Invite token has already been used")]
    InviteUsed,

    #[error("Password does not meet security requirements")]
    WeakPassword,

    #[error("Validation failed: {0}")]
    ValidationFailed(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Password hashing failed: {0}")]
    HashingError(#[from] bcrypt::BcryptError),
}

impl IntoResponse for RegistrationError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            RegistrationError::EmailTaken => (
                StatusCode::CONFLICT,
                "EMAIL_TAKEN",
                "An account already exists for this email",
            ),
            RegistrationError::UsernameTaken => (
                StatusCode::CONFLICT,
                "USERNAME_TAKEN",
                "This username is already taken",
            ),
            RegistrationError::InvalidInvite => (
                StatusCode::BAD_REQUEST,
                "INVALID_INVITE",
                "Invite token is invalid or has expired",
            ),
            RegistrationError::InviteUsed => (
                StatusCode::BAD_REQUEST,
                "INVITE_USED",
                "This invite has already been used",
            ),
            RegistrationError::WeakPassword => (
                StatusCode::BAD_REQUEST,
                "WEAK_PASSWORD",
                "Password does not meet security requirements",
            ),
            RegistrationError::ValidationFailed(ref msg) => {
                (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", msg.as_str())
            }
            RegistrationError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "An internal error occurred",
            ),
            RegistrationError::HashingError(_) => (
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

fn validate_password_strength(password: &str) -> Result<(), RegistrationError> {
    let mut score = 0;

    // Length check (minimum already enforced by validator)
    if password.len() >= 8 {
        score += 25;
    }
    if password.len() >= 12 {
        score += 10;
    }

    // Character diversity
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_numeric = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    if has_uppercase {
        score += 25;
    }
    if has_lowercase {
        score += 25;
    }
    if has_numeric {
        score += 15;
    }
    if has_special {
        score += 10;
    }

    // Require at least 65% strength (ensures minimum 3 criteria)
    // This prevents weak passwords like "alllowercase" which only have
    // length + lowercase but lack uppercase/numbers/special chars
    if score < 65 {
        return Err(RegistrationError::WeakPassword);
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// INVITE TOKEN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

async fn validate_invite_token(
    pool: &PgPool,
    token: &str,
) -> Result<InviteToken, RegistrationError> {
    let invite = sqlx::query_as::<_, InviteToken>(
        r#"
        SELECT id, token, created_by, expires_at, used, used_by, used_at
        FROM invite_tokens
        WHERE token = $1
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await?
    .ok_or(RegistrationError::InvalidInvite)?;

    // Check if already used
    if invite.used {
        return Err(RegistrationError::InviteUsed);
    }

    // Check if expired
    if invite.expires_at < Utc::now() {
        return Err(RegistrationError::InvalidInvite);
    }

    Ok(invite)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REGISTRATION HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn register_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, RegistrationError> {
    // 1. Validate request
    payload
        .validate()
        .map_err(|e| RegistrationError::ValidationFailed(e.to_string()))?;

    // 2. Validate password strength
    validate_password_strength(&payload.password)?;

    // 3. Normalize email and username
    let email = payload.email.trim().to_lowercase();
    let username = payload.username.trim().to_lowercase();

    // 4. Check if email already exists
    let existing_email =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&email)
            .fetch_one(pool.as_ref())
            .await?;

    if existing_email {
        return Err(RegistrationError::EmailTaken);
    }

    // 5. Check if username already exists
    let existing_username =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)")
            .bind(&username)
            .fetch_one(pool.as_ref())
            .await?;

    if existing_username {
        return Err(RegistrationError::UsernameTaken);
    }

    // 6. Validate invite token if present
    let (program, invite_id) = if let Some(ref token) = payload.invite_token {
        let invite = validate_invite_token(pool.as_ref(), token).await?;
        (UserProgram::Alpha100, Some(invite.id))
    } else {
        (UserProgram::General, None)
    };

    // 7. Hash password
    let password_hash = hash(&payload.password, DEFAULT_COST)?;

    // 8. Create user in database (with transaction)
    let mut tx = pool.begin().await?;

    let user_id = Uuid::new_v4();
    let program_str = match program {
        UserProgram::Alpha100 => "alpha-100",
        UserProgram::General => "general",
    };

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, username, password_hash, first_name, last_name,
            program, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        "#,
    )
    .bind(user_id)
    .bind(&email)
    .bind(&username)
    .bind(&password_hash)
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(program_str)
    .execute(&mut *tx)
    .await?;

    // 9. Mark invite as used if present
    if let Some(invite_id) = invite_id {
        sqlx::query(
            r#"
            UPDATE invite_tokens
            SET used = true, used_by = $1, used_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(user_id)
        .bind(invite_id)
        .execute(&mut *tx)
        .await?;
    }

    // 10. Commit transaction
    tx.commit().await?;

    // 11. Log successful registration (for analytics)
    tracing::info!(
        user_id = %user_id,
        program = ?program,
        has_invite = payload.invite_token.is_some(),
        "User registered successfully"
    );

    // 12. Return success response
    Ok(Json(RegisterResponse {
        success: true,
        user_id,
        program,
        has_invite: payload.invite_token.is_some(),
        next: "login".to_string(),
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Note: Rate limiting will be configured at the router level using tower_governor
// For production deployment, configure the governor layer in the API module

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_strength_validation() {
        // Note: Password length >= 8 is enforced by the validator attribute
        // on RegisterRequest, so these tests assume passwords are already >= 8 chars

        // Scoring system (max 100):
        // - Length >= 8: +25
        // - Length >= 12: +10
        // - Has uppercase: +25
        // - Has lowercase: +25
        // - Has numeric: +15
        // - Has special: +10
        // Threshold: score must be >= 65

        // Weak passwords - score < 65 (SHOULD FAIL)
        assert!(validate_password_strength("alllowercase").is_err()); // 12 chars, lowercase: 25+10+25 = 60 ✗
        assert!(validate_password_strength("ALLUPPERCASE").is_err()); // 12 chars, uppercase: 25+10+25 = 60 ✗
        assert!(validate_password_strength("12345678").is_err()); // 8 chars, numeric: 25+15 = 40 ✗
        assert!(validate_password_strength("!@#$%^&*").is_err()); // 8 chars, special: 25+10 = 35 ✗

        // Borderline passwords - score = 65 (SHOULD PASS)
        assert!(validate_password_strength("lower123").is_ok()); // 8 chars, lowercase, numeric: 25+25+15 = 65 ✓
        assert!(validate_password_strength("UPPER123").is_ok()); // 8 chars, uppercase, numeric: 25+25+15 = 65 ✓

        // Good passwords - score >= 70 (SHOULD PASS)
        assert!(validate_password_strength("lowercase12345").is_ok()); // 14 chars, lowercase, numeric: 25+10+25+15 = 75 ✓
        assert!(validate_password_strength("UPPERCASE12345").is_ok()); // 14 chars, uppercase, numeric: 25+10+25+15 = 75 ✓

        // Strong passwords - score >= 80 (SHOULD PASS)
        assert!(validate_password_strength("SecurePass123!").is_ok()); // 14 chars, all 4 classes: 25+10+25+25+15+10 = 110 ✓
        assert!(validate_password_strength("MyP@ssw0rd").is_ok()); // 10 chars, all 4 classes: 25+25+25+15+10 = 100 ✓
        assert!(validate_password_strength("C0mpl3x!Pass").is_ok()); // 12 chars, all 4 classes: 25+10+25+25+15+10 = 110 ✓
    }

    #[test]
    fn test_username_regex() {
        assert!(USERNAME_REGEX.is_match("valid_user123"));
        assert!(USERNAME_REGEX.is_match("user"));
        assert!(!USERNAME_REGEX.is_match("invalid-user"));
        assert!(!USERNAME_REGEX.is_match("user@name"));
        assert!(!USERNAME_REGEX.is_match("user name"));
    }
}
