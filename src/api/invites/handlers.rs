// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SYSTEM HANDLERS                            ║
// ║  API handlers for invite code generation and acceptance                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Extension,
    Json
};
use chrono::{Duration, Utc};
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use bcrypt;

use super::models::*;

/// Generate a secure invite code (12 character alphanumeric)
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

/// Generate JWT token for authenticated user
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
        jti: Uuid::new_v4().to_string(),
    };

    let secret = std::env::var("JWT_SECRET").map_err(|_| {
        tracing::error!("CRITICAL SECURITY ERROR: JWT_SECRET environment variable not set");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "Authentication service configuration error",
                "code": "JWT_SECRET_MISSING"
            })),
        )
    })?;

    if secret.len() < 32 {
        tracing::error!("CRITICAL SECURITY ERROR: JWT_SECRET is only {} characters (minimum: 32)", secret.len());
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "Authentication service configuration error",
                "code": "JWT_SECRET_WEAK"
            })),
        ));
    }

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "Failed to generate token"
            })),
        )
    })
}

/// ADMIN ENDPOINT: Create a new invite code
pub async fn create_invite_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<CreateInviteRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<InviteError>)> {
    // Generate secure invite code
    let invite_code = generate_invite_code();
    let invite_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::days(7); // 7 days expiry

    // Insert invite into database
    sqlx::query(
        r#"
        INSERT INTO alpha_invites (
            id, email, invite_code, status, position,
            expires_at, created_at
        )
        VALUES ($1, $2, $3, 'sent', 999, $4, $5)
        "#,
    )
    .bind(&invite_id)
    .bind(&payload.email)
    .bind(&invite_code)
    .bind(expires_at)
    .bind(Utc::now())
    .execute(&*pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create invite: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InviteError {
                error: "Database error".to_string(),
                code: "DB_ERROR".to_string(),
                details: Some(json!(e.to_string())),
            }),
        )
    })?;

    let invite_url = format!("https://node0.bizra.ai/invite/{}", invite_code);

    let response = CreateInviteResponse {
        invite_id,
        invite_code,
        invite_url,
        expires_at,
        email: payload.email.clone(),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Validate an invite code (used by frontend before showing registration form)
pub async fn validate_invite_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Path(invite_code): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<InviteError>)> {
    let invite: Option<InviteEntry> = sqlx::query_as::<_, InviteEntry>(
        r#"
        SELECT id, email, invite_code, status as "status: InviteStatus",
               position, expires_at, created_at, accepted_at
        FROM alpha_invites
        WHERE invite_code = $1
        "#,
    )
    .bind(&invite_code)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error validating invite: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InviteError {
                error: "Database error".to_string(),
                code: "DB_ERROR".to_string(),
                details: Some(json!(e.to_string())),
            }),
        )
    })?;

    if let Some(invite) = invite {
        if invite.is_expired() {
            return Ok(Json(InviteValidationResponse {
                valid: false,
                status: "expired".to_string(),
                expires_at: invite.expires_at,
                email: invite.email,
                inviter_notes: None, // Could add notes field later
            }));
        }

        match invite.status {
            InviteStatus::Sent => Ok(Json(InviteValidationResponse {
                valid: true,
                status: "sent".to_string(),
                expires_at: invite.expires_at,
                email: invite.email,
                inviter_notes: None,
            })),
            InviteStatus::Accepted => Ok(Json(InviteValidationResponse {
                valid: false,
                status: "accepted".to_string(),
                expires_at: invite.expires_at,
                email: invite.email,
                inviter_notes: None,
            })),
            _ => Ok(Json(InviteValidationResponse {
                valid: false,
                status: "invalid".to_string(),
                expires_at: invite.expires_at,
                email: invite.email,
                inviter_notes: None,
            })),
        }
    } else {
        Ok(Json(InviteValidationResponse {
            valid: false,
            status: "not_found".to_string(),
            expires_at: Utc::now(),
            email: String::new(),
            inviter_notes: None,
        }))
    }
}

/// Accept invite and create user account
pub async fn accept_invite_handler(
    Extension(pool): Extension<Arc<PgPool>>,
    Path(invite_code): Path<String>,
    Json(payload): Json<InviteAcceptanceRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<InviteError>)> {
    // First validate and fetch the invite from database
    let invite: Option<InviteEntry> = sqlx::query_as::<_, InviteEntry>(
        r#"
        SELECT id, email, invite_code, status as "status: InviteStatus",
               position, expires_at, created_at, accepted_at
        FROM alpha_invites
        WHERE invite_code = $1
        "#,
    )
    .bind(&invite_code)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error fetching invite: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InviteError {
                error: "Database error".to_string(),
                code: "DB_ERROR".to_string(),
                details: Some(json!(e.to_string())),
            }),
        )
    })?;

    let invite_data = match invite {
        Some(invite) => invite,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(InviteError {
                    error: "Invalid invite code".to_string(),
                    code: "INVALID_INVITE".to_string(),
                    details: None,
                }),
            ));
        }
    };

    // Check if invite is valid
    if !invite_data.is_valid_for_acceptance() {
        let status_str = match invite_data.status {
            InviteStatus::Accepted => "already_accepted",
            InviteStatus::Expired => "expired",
            _ => "invalid_status",
        };

        return Err((
            StatusCode::BAD_REQUEST,
            Json(InviteError {
                error: format!("Invite is {}", status_str.replace('_', " ")),
                code: status_str.to_uppercase(),
                details: None,
            }),
        ));
    }

    // Verify email matches invite
    if invite_data.email != payload.email {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(InviteError {
                error: "Email does not match invite".to_string(),
                code: "EMAIL_MISMATCH".to_string(),
                details: None,
            }),
        ));
    }

    // Check if user already exists
    let existing_user = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_one(&*pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InviteError {
                error: "Database error".to_string(),
                code: "DB_ERROR".to_string(),
                details: None,
            }),
        )
    })?;

    if existing_user > 0 {
        return Err((
            StatusCode::CONFLICT,
            Json(InviteError {
                error: "User account already exists".to_string(),
                code: "USER_EXISTS".to_string(),
                details: None,
            }),
        ));
    }

    // Hash password
    let password_hash = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(InviteError {
                    error: "Failed to process password".to_string(),
                    code: "PASSWORD_HASH_ERROR".to_string(),
                    details: None,
                }),
            )
        })?;

    // Create user account
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
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(true)
    .bind(invite_data.position)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(&*pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create user account: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InviteError {
                error: "Failed to create account".to_string(),
                code: "ACCOUNT_CREATION_FAILED".to_string(),
                details: None,
            }),
        )
    })?;

    // Mark invite as accepted
    sqlx::query(
        "UPDATE alpha_invites SET status = 'accepted', accepted_at = $2 WHERE id = $1"
    )
    .bind(&invite_data.id)
    .bind(Utc::now())
    .execute(&*pool)
    .await
    .ok(); // Don't fail if update fails

    // Generate JWT token
    let access_token = match generate_jwt_token(&user_id) {
        Ok(token) => token,
        Err((_, json_response)) => {
            tracing::error!("Failed to generate JWT token for user {}", user_id);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(InviteError {
                    error: json_response["error"].as_str().unwrap_or("Token generation failed").to_string(),
                    code: "TOKEN_GENERATION_FAILED".to_string(),
                    details: None,
                }),
            ));
        }
    };

    let response = json!({
        "success": true,
        "user_id": user_id,
        "email": payload.email,
        "access_token": access_token,
        "expires_in": 30 * 24 * 60 * 60, // 30 days in seconds
    });

    Ok((StatusCode::CREATED, Json(response)))
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{DateTime, Duration, Utc};
    use super::super::models::{InviteEntry, InviteStatus, InviteAcceptanceRequest, InviteValidationResponse, CreateInviteRequest, InviteError};

    // -------------------------------------------------------------------------
    // generate_invite_code() Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_generate_invite_code_format() {
        let code = generate_invite_code();
        
        // Format: XXXX-XXXX-XXXX (14 chars total with hyphens)
        assert_eq!(code.len(), 14, "Invite code should be 14 characters (12 + 2 hyphens)");
        
        // Check hyphen positions
        let chars: Vec<char> = code.chars().collect();
        assert_eq!(chars[4], '-', "First hyphen should be at position 4");
        assert_eq!(chars[9], '-', "Second hyphen should be at position 9");
    }

    #[test]
    fn test_generate_invite_code_charset() {
        let code = generate_invite_code();
        
        // Should only contain allowed characters (excluding ambiguous: 0, 1, I, O)
        let allowed_chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789-";
        
        for c in code.chars() {
            assert!(
                allowed_chars.contains(c),
                "Character '{}' should be in allowed charset", c
            );
        }
    }

    #[test]
    fn test_generate_invite_code_no_ambiguous_chars() {
        // Generate multiple codes to increase confidence
        for _ in 0..100 {
            let code = generate_invite_code();
            let code_without_hyphens: String = code.chars().filter(|&c| c != '-').collect();
            
            assert!(!code_without_hyphens.contains('0'), "Code should not contain '0'");
            assert!(!code_without_hyphens.contains('1'), "Code should not contain '1'");
            assert!(!code_without_hyphens.contains('I'), "Code should not contain 'I'");
            assert!(!code_without_hyphens.contains('O'), "Code should not contain 'O'");
            assert!(!code_without_hyphens.chars().any(|c| c.is_lowercase()), "Code should be uppercase");
        }
    }

    #[test]
    fn test_generate_invite_code_uniqueness() {
        use std::collections::HashSet;
        
        let codes: HashSet<String> = (0..100)
            .map(|_| generate_invite_code())
            .collect();
        
        // All 100 codes should be unique
        assert_eq!(codes.len(), 100, "All generated codes should be unique");
    }

    #[test]
    fn test_generate_invite_code_segments() {
        let code = generate_invite_code();
        let segments: Vec<&str> = code.split('-').collect();
        
        assert_eq!(segments.len(), 3, "Code should have 3 segments");
        
        for segment in segments {
            assert_eq!(segment.len(), 4, "Each segment should be 4 characters");
        }
    }

    // -------------------------------------------------------------------------
    // InviteEntry::is_expired() Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_invite_not_expired() {
        let invite = create_test_invite_entry(
            InviteStatus::Sent,
            Utc::now() + Duration::days(7), // Expires in 7 days
        );
        
        assert!(!invite.is_expired(), "Invite with future expiry should not be expired");
    }

    #[test]
    fn test_invite_expired() {
        let invite = create_test_invite_entry(
            InviteStatus::Sent,
            Utc::now() - Duration::hours(1), // Expired 1 hour ago
        );
        
        assert!(invite.is_expired(), "Invite with past expiry should be expired");
    }

    #[test]
    fn test_invite_expired_just_now() {
        let invite = create_test_invite_entry(
            InviteStatus::Sent,
            Utc::now() - Duration::seconds(1), // Expired 1 second ago
        );
        
        assert!(invite.is_expired(), "Invite expired 1 second ago should be expired");
    }

    // -------------------------------------------------------------------------
    // InviteEntry::is_valid_for_acceptance() Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_valid_for_acceptance_sent_not_expired() {
        let invite = create_test_invite_entry(
            InviteStatus::Sent,
            Utc::now() + Duration::days(7),
        );
        
        assert!(
            invite.is_valid_for_acceptance(),
            "Sent invite with future expiry should be valid for acceptance"
        );
    }

    #[test]
    fn test_invalid_for_acceptance_already_accepted() {
        let invite = create_test_invite_entry(
            InviteStatus::Accepted,
            Utc::now() + Duration::days(7),
        );
        
        assert!(
            !invite.is_valid_for_acceptance(),
            "Already accepted invite should not be valid for acceptance"
        );
    }

    #[test]
    fn test_invalid_for_acceptance_expired_status() {
        let invite = create_test_invite_entry(
            InviteStatus::Expired,
            Utc::now() + Duration::days(7), // Status says expired
        );
        
        assert!(
            !invite.is_valid_for_acceptance(),
            "Invite with Expired status should not be valid for acceptance"
        );
    }

    #[test]
    fn test_invalid_for_acceptance_revoked() {
        let invite = create_test_invite_entry(
            InviteStatus::Revoked,
            Utc::now() + Duration::days(7),
        );
        
        assert!(
            !invite.is_valid_for_acceptance(),
            "Revoked invite should not be valid for acceptance"
        );
    }

    #[test]
    fn test_invalid_for_acceptance_pending() {
        let invite = create_test_invite_entry(
            InviteStatus::Pending,
            Utc::now() + Duration::days(7),
        );
        
        assert!(
            !invite.is_valid_for_acceptance(),
            "Pending invite should not be valid for acceptance (only Sent is valid)"
        );
    }

    #[test]
    fn test_invalid_for_acceptance_sent_but_expired() {
        let invite = create_test_invite_entry(
            InviteStatus::Sent,
            Utc::now() - Duration::hours(1), // Expired
        );
        
        assert!(
            !invite.is_valid_for_acceptance(),
            "Sent invite that has expired should not be valid for acceptance"
        );
    }

    // -------------------------------------------------------------------------
    // InviteStatus Serialization Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_invite_status_serialization() {
        // Serde uses PascalCase by default (sqlx rename_all only affects DB)
        let statuses = vec![
            (InviteStatus::Pending, r#""Pending""#),
            (InviteStatus::Sent, r#""Sent""#),
            (InviteStatus::Accepted, r#""Accepted""#),
            (InviteStatus::Expired, r#""Expired""#),
            (InviteStatus::Revoked, r#""Revoked""#),
        ];
        
        for (status, expected_json) in statuses {
            let json = serde_json::to_string(&status)
                .expect("Should serialize status");
            assert_eq!(json, expected_json, "Status {:?} should serialize to {}", status, expected_json);
        }
    }

    #[test]
    fn test_invite_status_deserialization() {
        // Serde uses PascalCase by default (sqlx rename_all only affects DB)
        let test_cases = vec![
            (r#""Pending""#, InviteStatus::Pending),
            (r#""Sent""#, InviteStatus::Sent),
            (r#""Accepted""#, InviteStatus::Accepted),
            (r#""Expired""#, InviteStatus::Expired),
            (r#""Revoked""#, InviteStatus::Revoked),
        ];
        
        for (json, expected_status) in test_cases {
            let status: InviteStatus = serde_json::from_str(json)
                .expect("Should deserialize status");
            assert_eq!(status, expected_status);
        }
    }

    // -------------------------------------------------------------------------
    // Test Helper Functions
    // -------------------------------------------------------------------------

    fn create_test_invite_entry(status: InviteStatus, expires_at: DateTime<Utc>) -> InviteEntry {
        InviteEntry {
            id: Uuid::new_v4().to_string(),
            email: "test@example.com".to_string(),
            invite_code: "TEST-CODE-1234".to_string(),
            status,
            position: 1,
            expires_at,
            created_at: Utc::now(),
            accepted_at: None,
        }
    }

    // -------------------------------------------------------------------------
    // Request/Response Model Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_invite_acceptance_request_deserialization() {
        let json = r#"{
            "invite_code": "ABCD-EFGH-IJKL",
            "email": "test@example.com",
            "password": "SecurePassword123!",
            "full_name": "Test User"
        }"#;
        
        let request: InviteAcceptanceRequest = 
            serde_json::from_str(json).expect("Should deserialize");
        
        assert_eq!(request.invite_code, "ABCD-EFGH-IJKL");
        assert_eq!(request.email, "test@example.com");
        assert_eq!(request.password, "SecurePassword123!");
        assert_eq!(request.full_name, "Test User");
    }

    #[test]
    fn test_invite_validation_response_serialization() {
        let response = InviteValidationResponse {
            valid: true,
            status: "sent".to_string(),
            expires_at: Utc::now(),
            email: "test@example.com".to_string(),
            inviter_notes: Some("Welcome to BIZRA!".to_string()),
        };
        
        let json = serde_json::to_string(&response).expect("Should serialize");
        assert!(json.contains(r#""valid":true"#));
        assert!(json.contains(r#""status":"sent""#));
        assert!(json.contains(r#""email":"test@example.com""#));
        assert!(json.contains(r#""inviter_notes":"Welcome to BIZRA!""#));
    }

    #[test]
    fn test_create_invite_request_deserialization() {
        let json = r#"{
            "email": "newuser@example.com",
            "inviter_id": "admin-123",
            "notes": "VIP invite"
        }"#;
        
        let request: CreateInviteRequest = 
            serde_json::from_str(json).expect("Should deserialize");
        
        assert_eq!(request.email, "newuser@example.com");
        assert_eq!(request.inviter_id, Some("admin-123".to_string()));
        assert_eq!(request.notes, Some("VIP invite".to_string()));
    }

    #[test]
    fn test_create_invite_request_minimal() {
        let json = r#"{"email": "user@example.com"}"#;
        
        let request: CreateInviteRequest = 
            serde_json::from_str(json).expect("Should deserialize");
        
        assert_eq!(request.email, "user@example.com");
        assert!(request.inviter_id.is_none());
        assert!(request.notes.is_none());
    }

    #[test]
    fn test_invite_error_serialization() {
        let error = InviteError {
            error: "Invalid invite code".to_string(),
            code: "INVALID_INVITE".to_string(),
            details: Some(serde_json::json!({"hint": "Check the code format"})),
        };
        
        let json = serde_json::to_string(&error).expect("Should serialize");
        assert!(json.contains(r#""error":"Invalid invite code""#));
        assert!(json.contains(r#""code":"INVALID_INVITE""#));
        assert!(json.contains(r#""details""#));
    }
}
