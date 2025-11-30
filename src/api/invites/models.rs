// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SYSTEM MODELS                              ║
// ║  Data structures for invite code generation and acceptance              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
// use uuid::Uuid; // Removed unused import

/// Invite status enumeration (matching existing DB enum)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "invite_status", rename_all = "lowercase")]
pub enum InviteStatus {
    Pending,
    Sent,
    Accepted,
    Expired,
    Revoked,
}

/// Database model for invite codes (matching existing alpha_invites table)
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct InviteEntry {
    pub id: String, // VARCHAR(255) in DB
    pub email: String,
    pub invite_code: String,
    pub status: InviteStatus,
    pub position: i32,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
}

impl InviteEntry {
    /// Check if invite is expired
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /// Check if invite is valid for acceptance
    pub fn is_valid_for_acceptance(&self) -> bool {
        matches!(self.status, InviteStatus::Sent)
            && !self.is_expired()
    }
}

/// Request to create a new invite (admin endpoint)
#[derive(Debug, Deserialize)]
pub struct CreateInviteRequest {
    pub email: String,
    pub inviter_id: Option<String>, // String to match DB
    pub notes: Option<String>,
}

/// Response from create invite operation
#[derive(Debug, Serialize)]
pub struct CreateInviteResponse {
    pub invite_id: String,
    pub invite_code: String,
    pub invite_url: String,
    pub expires_at: DateTime<Utc>,
    pub email: String,
}

/// Request to accept an invite (from frontend)
#[derive(Debug, Deserialize)]
pub struct InviteAcceptanceRequest {
    pub invite_code: String,
    pub email: String,
    pub password: String,
    pub full_name: String,
}

/// Response for invite validation/check
#[derive(Debug, Serialize)]
pub struct InviteValidationResponse {
    pub valid: bool,
    pub status: String,
    pub expires_at: DateTime<Utc>,
    pub email: String,
    pub inviter_notes: Option<String>,
}

/// Error responses
#[derive(Debug, Serialize)]
pub struct InviteError {
    pub error: String,
    pub code: String,
    pub details: Option<serde_json::Value>,
}
