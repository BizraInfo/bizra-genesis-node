// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PoI (PROOF OF IMPACT) API TYPES                    ║
// ║  Data structures for impact attestation and verification                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;
use sqlx::FromRow;

// ╔══════════════════════════════════════════════════════════════════════════
// DATABASE ENUMS
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, sqlx::Type, Serialize, Deserialize, ToSchema, Clone, Copy)]
#[sqlx(type_name = "poi_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PoiStatus {
    Pending,
    Verified,
    Rejected,
    Revoked,
}

impl PoiStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PoiStatus::Pending => "pending",
            PoiStatus::Verified => "verified",
            PoiStatus::Rejected => "rejected",
            PoiStatus::Revoked => "revoked",
        }
    }
}

// ╔══════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct PoiVerifyRequest {
    /// Contributor account ID (user or node)
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub contributor_id: Uuid,

    /// Impact domain: "education", "security", "environment", etc.
    #[validate(length(min = 1, max = 50))]
    #[schema(example = "education")]
    pub impact_domain: String,

    /// Raw impact score in [0, 100]
    #[validate(range(min = 0.0, max = 100.0))]
    #[schema(example = 85.7)]
    pub raw_score: f32,

    /// Weight multiplier in [0, 10]
    #[validate(range(min = 0.0, max = 10.0))]
    #[schema(example = 1.2)]
    pub weight: f32,

    /// Canonical hash of the underlying evidence/pack (e.g. SHA-256)
    /// Format: "<algo>:<hex>", e.g. "sha256:abcd..."
    #[validate(length(min = 10, max = 255))]
    #[schema(example = "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa")]
    pub payload_hash: String,

    /// Ed25519 signature over canonical payload
    /// base64-encoded
    #[validate(length(min = 44, max = 200))]
    #[schema(example = "base64_ed25519_signature")]
    pub signature: String,

    /// Optional reference to canonical PoI attestation ID, if already built.
    #[schema(example = "d4d33e5a-565a-4a50-91d2-3a3e2e8c5d11")]
    pub attestation_id: Option<Uuid>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoiVerifyResponse {
    pub id: Uuid,
    pub verified: bool,
    pub normalized_score: f32,
    pub status: PoiStatus,
    pub reason: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoiSummaryResponse {
    pub total_attestations: i64,
    pub verified_attestations: i64,
    pub avg_score: f32,
    pub by_domain: Vec<PoiDomainAggregate>,
    pub recent_activity: Vec<PoiRecentActivity>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoiDomainAggregate {
    pub impact_domain: String,
    pub count: Option<i64>,
    pub avg_score: Option<f64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoiRecentActivity {
    pub contributor_id: Uuid,
    pub impact_domain: String,
    pub normalized_score: f32,
    pub status: PoiStatus,
    pub timestamp: DateTime<Utc>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// DATABASE MODELS
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, FromRow, Serialize, ToSchema)]
pub struct PoiRecord {
    pub id: Uuid,
    pub contributor_id: Uuid,
    pub impact_domain: String,
    pub raw_score: f32,
    pub weight: f32,
    pub normalized_score: f32,
    pub payload_hash: String,
    pub status: PoiStatus,
    pub created_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoiErrorResponse {
    pub success: bool,
    pub error: String,
    pub message: Option<String>,
    pub details: Option<String>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATIONS
// ╔══════════════════════════════════════════════════════════════════════════

impl Default for PoiStatus {
    fn default() -> Self {
        PoiStatus::Pending
    }
}

impl std::fmt::Display for PoiStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl From<String> for PoiStatus {
    fn from(value: String) -> Self {
        match value.to_lowercase().as_str() {
            "verified" => PoiStatus::Verified,
            "rejected" => PoiStatus::Rejected,
            "revoked" => PoiStatus::Revoked,
            _ => PoiStatus::Pending,
        }
    }
}

impl From<&str> for PoiStatus {
    fn from(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "verified" => PoiStatus::Verified,
            "rejected" => PoiStatus::Rejected,
            "revoked" => PoiStatus::Revoked,
            _ => PoiStatus::Pending,
        }
    }
}

// ╔══════════════════════════════════════════════════════════════════════════
// TESTS
// ╔══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_poi_status_from_string() {
        assert!(matches!(PoiStatus::from("pending"), PoiStatus::Pending));
        assert!(matches!(PoiStatus::from("verified"), PoiStatus::Verified));
        assert!(matches!(PoiStatus::from("rejected"), PoiStatus::Rejected));
        assert!(matches!(PoiStatus::from("revoked"), PoiStatus::Revoked));
        assert!(matches!(PoiStatus::from("unknown"), PoiStatus::Pending));
    }

    #[test]
    fn test_poi_status_display() {
        assert_eq!(format!("{}", PoiStatus::Pending), "pending");
        assert_eq!(format!("{}", PoiStatus::Verified), "verified");
        assert_eq!(format!("{}", PoiStatus::Rejected), "rejected");
        assert_eq!(format!("{}", PoiStatus::Revoked), "revoked");
    }

    #[test]
    fn test_poi_verify_request_validation() {
        // Valid request - signature must be 44-200 chars (base64 encoded ed25519)
        let valid = PoiVerifyRequest {
            contributor_id: Uuid::new_v4(),
            impact_domain: "education".to_string(),
            raw_score: 85.0,
            weight: 1.2,
            payload_hash: "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa".to_string(),
            signature: "test_b64_signature_ABcdef1234567890ABCDEFghijklmnop".to_string(), // 50 chars
            attestation_id: None,
        };
        assert!(valid.validate().is_ok());

        // Invalid domain (too long)
        let invalid = PoiVerifyRequest {
            contributor_id: Uuid::new_v4(),
            impact_domain: "a".repeat(51),  // 51 > 50 max length
            raw_score: 85.0,
            weight: 1.2,
            payload_hash: "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa".to_string(),
            signature: "test_b64_signature_ABcdef1234567890ABCDEFghijklmnop".to_string(),
            attestation_id: None,
        };
        assert!(invalid.validate().is_err());

        // Invalid score (too high)
        let invalid_score = PoiVerifyRequest {
            contributor_id: Uuid::new_v4(),
            impact_domain: "education".to_string(),
            raw_score: 150.0,  // > 100 max
            weight: 1.2,
            payload_hash: "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa".to_string(),
            signature: "test_b64_signature_ABcdef1234567890ABCDEFghijklmnop".to_string(),
            attestation_id: None,
        };
        assert!(invalid_score.validate().is_err());
    }

    #[test]
    fn test_poi_verify_response_serialization() {
        let response = PoiVerifyResponse {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            verified: true,
            normalized_score: 0.912,
            status: PoiStatus::Verified,
            reason: "attestation_verified".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"verified\":true"));
        assert!(json.contains("\"normalizedScore\":0.912"));
        assert!(json.contains("\"status\":\"verified\""));
    }

    #[test]
    fn test_poi_summary_response_serialization() {
        let summary = PoiSummaryResponse {
            total_attestations: 100,
            verified_attestations: 95,
            avg_score: 0.756,
            by_domain: vec![
                PoiDomainAggregate {
                    impact_domain: "education".to_string(),
                    count: Some(45),
                    avg_score: Some(0.823),
                }
            ],
            recent_activity: vec![
                PoiRecentActivity {
                    contributor_id: Uuid::new_v4(),
                    impact_domain: "education".to_string(),
                    normalized_score: 0.89,
                    status: PoiStatus::Verified,
                    timestamp: Utc::now(),
                }
            ],
        };

        let json = serde_json::to_string(&summary).unwrap();
        assert!(json.contains("\"totalAttestations\":100"));
        assert!(json.contains("\"verifiedAttestations\":95"));
        assert!(json.contains("\"avgScore\":0.756"));
    }
}
