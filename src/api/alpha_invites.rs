// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - ALPHA INVITE SYSTEM
// User onboarding and invitation management
// Requires 'database' feature to be enabled
// ═══════════════════════════════════════════════════════════════════════════

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Extension, Json};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use validator::Validate;

// ─────────────────────────────────────────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Validate, sqlx::FromRow)]
pub struct AlphaRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(max = 200))]
    pub organization: Option<String>,

    #[validate(length(min = 20, max = 1000))]
    pub use_case: String,

    #[validate(length(min = 1, max = 50))]
    pub experience: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlphaInvite {
    pub id: String,
    pub email: String,
    pub invite_code: String,
    pub status: InviteStatus,
    pub position: i32,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "invite_status", rename_all = "lowercase")]
pub enum InviteStatus {
    Pending,
    Sent,
    Accepted,
    Expired,
    Revoked,
}

#[derive(Debug, Serialize)]
pub struct AlphaRequestResponse {
    pub message: String,
    pub position: i32,
    pub estimated_wait: String,
}

#[derive(Debug, Serialize)]
pub struct InviteAcceptance {
    pub success: bool,
    pub user_id: String,
    pub access_token: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/// Submit alpha access request
pub async fn request_alpha_access(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<AlphaRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Validate input
    payload.validate().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Validation failed",
                "details": e.to_string()
            })),
        )
    })?;

    // Check if email already requested
    let existing =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM alpha_requests WHERE email = $1")
            .bind(&payload.email)
            .fetch_one(&*pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": "Database error",
                        "details": e.to_string()
                    })),
                )
            })?;

    if existing > 0 {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "Email already registered for alpha access"
            })),
        ));
    }

    // Get current position
    let current_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM alpha_requests")
        .fetch_one(&*pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Database error",
                    "details": e.to_string()
                })),
            )
        })?;

    let position = (current_count + 1) as i32;

    // Check if we have capacity (first 100 users)
    let status = if position <= 100 {
        InviteStatus::Pending
    } else {
        InviteStatus::Pending // Still pending but will be waitlisted
    };

    // Insert request
    sqlx::query(
        r#"
        INSERT INTO alpha_requests (
            name, email, organization, use_case, experience,
            position, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&payload.organization)
    .bind(&payload.use_case)
    .bind(&payload.experience)
    .bind(position)
    .bind(&status)
    .bind(Utc::now())
    .execute(&*pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to create request",
                "details": e.to_string()
            })),
        )
    })?;

    // If within first 100, generate invite immediately
    if position <= 100 {
        let invite_code = generate_invite_code();
        let expires_at = Utc::now() + Duration::days(7);

        sqlx::query(
            r#"
            INSERT INTO alpha_invites (
                id, email, invite_code, status, position,
                expires_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&payload.email)
        .bind(&invite_code)
        .bind(InviteStatus::Sent)
        .bind(position)
        .bind(expires_at)
        .bind(Utc::now())
        .execute(&*pool)
        .await
        .ok(); // Don't fail if invite creation fails

        // TODO: Send email with invite code
        send_alpha_invite_email(&payload.email, &payload.name, &invite_code).await;
    }

    let estimated_wait = if position <= 100 {
        "Immediate - Check your email!".to_string()
    } else {
        format!("~{} days", (position - 100) / 10) // Assuming 10 invites per day
    };

    Ok((
        StatusCode::CREATED,
        Json(AlphaRequestResponse {
            message: if position <= 100 {
                "Welcome to the alpha program! Check your email for your invite code.".to_string()
            } else {
                format!("You're on the waitlist at position {}", position)
            },
            position,
            estimated_wait,
        }),
    ))
}

/// Accept alpha invite and create user account
pub async fn accept_alpha_invite(
    Extension(pool): Extension<Arc<PgPool>>,
    Path(invite_code): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Find invite
    let invite: Option<AlphaInvite> = sqlx::query_as::<_, AlphaInvite>(
        r#"
        SELECT id, email, invite_code, status as "status: InviteStatus",
               position, expires_at, created_at, accepted_at
        FROM alpha_invites
        WHERE invite_code = $1
        "#,
    )
    .bind(invite_code)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error",
                "details": e.to_string()
            })),
        )
    })?;

    let invite = invite.ok_or((
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({
            "error": "Invalid invite code"
        })),
    ))?;

    // Check if already accepted
    if matches!(invite.status, InviteStatus::Accepted) {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "Invite already accepted"
            })),
        ));
    }

    // Check if expired
    if invite.expires_at < Utc::now() {
        sqlx::query("UPDATE alpha_invites SET status = $1 WHERE id = $2")
            .bind(InviteStatus::Expired)
            .bind(&invite.id)
            .execute(&*pool)
            .await
            .ok();

        return Err((
            StatusCode::GONE,
            Json(serde_json::json!({
                "error": "Invite has expired"
            })),
        ));
    }

    // Extract user registration data
    let email = invite.email.clone();
    let password = payload["password"].as_str().ok_or((
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "error": "Password required"
        })),
    ))?;

    // Hash password
    let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to hash password"
            })),
        )
    })?;

    // Create user
    let user_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, password_hash, is_alpha_user, alpha_position,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(&user_id)
    .bind(&email)
    .bind(&password_hash)
    .bind(true)
    .bind(invite.position)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(&*pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to create user",
                "details": e.to_string()
            })),
        )
    })?;

    // Mark invite as accepted
    sqlx::query("UPDATE alpha_invites SET status = $1, accepted_at = $2 WHERE id = $3")
        .bind(InviteStatus::Accepted)
        .bind(Utc::now())
        .bind(&invite.id)
        .execute(&*pool)
        .await
        .ok();

    // Generate access token
    let access_token = generate_jwt_token(&user_id)?;

    Ok((
        StatusCode::CREATED,
        Json(InviteAcceptance {
            success: true,
            user_id,
            access_token,
        }),
    ))
}

/// List pending alpha requests (admin only)
pub async fn list_alpha_requests(
    Extension(pool): Extension<Arc<PgPool>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let requests = sqlx::query_as::<_, AlphaRequest>(
        r#"
        SELECT name, email, organization, use_case, experience
        FROM alpha_requests
        WHERE status = 'pending'
        ORDER BY position ASC
        LIMIT 100
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error",
                "details": e.to_string()
            })),
        )
    })?;

    Ok(Json(requests))
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

fn generate_invite_code() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous chars
    let mut rng = rand::rng();

    (0..12)
        .map(|_| {
            let idx = rng.random_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect::<String>()
        .chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

async fn send_alpha_invite_email(email: &str, name: &str, invite_code: &str) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    println!("=== ALPHA INVITE EMAIL ===");
    println!("To: {}", email);
    println!("Subject: Welcome to BIZRA Genesis Node Alpha!");
    println!("\nHi {},", name);
    println!("\nWelcome to the BIZRA Genesis Node alpha program!");
    println!("\nYour invite code: {}", invite_code);
    println!(
        "\nAccess the platform at: https://bizra.ai/invite/{}",
        invite_code
    );
    println!("\nThis invite expires in 7 days.");
    println!("\n=========================");
}

fn generate_jwt_token(user_id: &str) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct Claims {
        sub: String,
        exp: usize,
        iat: usize,
        jti: String,
    }

    let now = Utc::now();
    let claims = Claims {
        sub: user_id.to_string(),
        exp: (now + Duration::days(30)).timestamp() as usize,
        iat: now.timestamp() as usize,
        jti: uuid::Uuid::new_v4().to_string(),
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SECURITY: JWT_SECRET MUST BE SET AT RUNTIME
    // This is a HARD requirement - no fallbacks, no development shortcuts
    // ═══════════════════════════════════════════════════════════════════════
    let secret = std::env::var("JWT_SECRET").map_err(|_| {
        tracing::error!("CRITICAL SECURITY ERROR: JWT_SECRET environment variable not set");
        tracing::error!("This is a fatal configuration error. Set JWT_SECRET before starting the service.");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Authentication service configuration error",
                "code": "JWT_SECRET_MISSING",
                "hint": "Set the JWT_SECRET environment variable to a secure random string (min 32 characters)"
            })),
        )
    })?;

    // Validate secret strength - enforce minimum security standards
    if secret.len() < 32 {
        tracing::error!(
            "CRITICAL SECURITY ERROR: JWT_SECRET is only {} characters (minimum: 32)",
            secret.len()
        );
        tracing::error!("Generate a secure secret: openssl rand -base64 32");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Authentication service configuration error",
                "code": "JWT_SECRET_WEAK",
                "hint": "JWT_SECRET must be at least 32 characters. Use: openssl rand -base64 32"
            })),
        ));
    }

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|e| {
        tracing::error!("Failed to generate JWT token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to generate token",
                "code": "JWT_GENERATION_ERROR"
            })),
        )
    })
}
