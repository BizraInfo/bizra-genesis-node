// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PoI (PROOF OF IMPACT) API MODULE                    ║
// ║  Impact attestation verification and management                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod types;
pub mod verifier;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::instrument;
use uuid::Uuid;
use validator::Validate;

use crate::middleware::rate_limit::{AttestationRateLimitError, AttestationRateLimiter};

// Re-export public types
pub use types::{
    PoiDomainAggregate, PoiRecentActivity, PoiRecord, PoiStatus, PoiSummaryResponse,
    PoiVerifyRequest, PoiVerifyResponse,
};

// ╔══════════════════════════════════════════════════════════════════════════
// APPLICATION STATE
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Clone)]
pub struct PoiAppState {
    pub db: Arc<PgPool>,
    pub verifier: Arc<dyn verifier::PoiSignatureVerifier + Send + Sync>,
    pub rate_limiter: Arc<dyn AttestationRateLimiter>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// ROUTER
// ╔══════════════════════════════════════════════════════════════════════════

pub fn poi_router() -> Router<PoiAppState> {
    Router::new()
        .route("/verify", post(verify_poi))
        .route("/attestations/:id", get(get_poi_attestation))
        .route("/attestations", get(list_poi_attestations))
        .route("/summary", get(get_poi_summary))
}

// ╔══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ╔══════════════════════════════════════════════════════════════════════════

// POST /api/poi/verify
/// Verify and persist a Proof-of-Impact attestation
///
/// Validates the cryptographic signature, computes normalized score,
/// and persists the attestation record for reward calculation.
///
///
#[utoipa::path(
    post,
    path = "/api/poi/verify",
    request_body = PoiVerifyRequest,
    responses(
        (status = 200, description = "Attestation verified and stored", body = PoiVerifyResponse),
        (status = 400, description = "Validation error", body = serde_json::Value),
        (status = 401, description = "Authentication required", body = serde_json::Value),
        (status = 409, description = "Duplicate attestation", body = serde_json::Value),
        (status = 422, description = "Cryptographic verification failed", body = serde_json::Value),
        (status = 429, description = "Rate limit exceeded", body = serde_json::Value),
        (status = 500, description = "Internal server error", body = serde_json::Value)
    ),
    tag = "poi"
)]
// ╔══════════════════════════════════════════════════════════════════════════
// TRACING & OBSERVABILITY - ECONOMIC IMPACT TRACKING
// ╔══════════════════════════════════════════════════════════════════════════

#[instrument(
    skip(state, body),
    fields(
        contributor_id = %body.contributor_id,
        impact_domain = %body.impact_domain,
        raw_score = body.raw_score,
        weight = body.weight,
        payload_hash = %body.payload_hash
    )
)]
pub async fn verify_poi(
    State(state): State<PoiAppState>,
    Json(body): Json<PoiVerifyRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!(
        contributor_id = %body.contributor_id,
        impact_domain = %body.impact_domain,
        operation = "poi_verify_start"
    );
    // 1) Basic validation
    if let Err(e) = body.validate() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Validation failed",
                "details": e.to_string()
            })),
        ));
    }

    // 2) Rate limiting check (per contributor)
    state
        .rate_limiter
        .check_contributor(&body.contributor_id)
        .await
        .map_err(|e| match e {
            AttestationRateLimitError::Exceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                Json(serde_json::json!({
                    "error": "Rate limit exceeded",
                    "message": "Too many attestation requests"
                }))
            ),
            AttestationRateLimitError::BackendError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Rate limiter error"
                }))
            ),
        })?;

    // 3) Build canonical payload for signature verification
    let canonical_payload = build_canonical_payload(&body);

    // 4) Verify cryptographic signature
    state
        .verifier
        .verify(&canonical_payload, &body.signature, &body.contributor_id)
        .await
        .map_err(|_| {
            (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(serde_json::json!({
                    "error": "Cryptographic verification failed",
                    "message": "Signature does not match payload"
                })),
            )
        })?;

    // 5) Compute normalized score
    let normalized_score = compute_normalized_score(body.raw_score, body.weight);

    // 6) Persist attestation record
    let record = sqlx::query_as!(
        PoiRecord,
        r#"
        INSERT INTO poi_attestations (
            contributor_id,
            impact_domain,
            raw_score,
            weight,
            normalized_score,
            payload_hash,
            signature,
            status,
            attestation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'verified', $8)
        RETURNING
            id,
            contributor_id,
            impact_domain,
            raw_score,
            weight,
            normalized_score,
            payload_hash,
            status as "status: _",
            created_at,
            verified_at
        "#,
        body.contributor_id,
        body.impact_domain,
        body.raw_score,
        body.weight,
        normalized_score,
        body.payload_hash,
        body.signature,
        body.attestation_id
    )
    .fetch_one(&*state.db)
    .await
    .map_err(|e| {
        // Handle unique constraint violation for duplicate payload_hash
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.code().as_deref() == Some("23505") { // PostgreSQL unique_violation
                return (
                    StatusCode::CONFLICT,
                    Json(serde_json::json!({
                        "error": "Duplicate attestation",
                        "message": "This attestation has already been submitted"
                    })),
                );
            }
        }

        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error",
                "details": e.to_string()
            })),
        )
    })?;

    // 7) Audit log successful verification
    tracing::info!(
        contributor_id = %record.contributor_id,
        attestation_id = %record.id,
        impact_domain = %record.impact_domain,
        normalized_score = %record.normalized_score,
        "PoI attestation verified and stored"
    );

    // 8) Return verification response
    let response = PoiVerifyResponse {
        id: record.id,
        verified: true,
        normalized_score: record.normalized_score,
        status: record.status,
        reason: "attestation_verified".to_string(),
    };

    Ok((StatusCode::OK, Json(response)))
}

// GET /api/poi/attestations/{id}
/// Retrieve a specific PoI attestation by ID
///
/// Returns detailed information about a single attestation record.
///
#[utoipa::path(
    get,
    path = "/api/poi/attestations/{id}",
    params(
        ("id" = Uuid, Path, description = "Attestation unique identifier")
    ),
    responses(
        (status = 200, description = "Attestation found", body = PoiRecord),
        (status = 404, description = "Attestation not found", body = serde_json::Value),
        (status = 500, description = "Internal server error", body = serde_json::Value)
    ),
    tag = "poi"
)]
pub async fn get_poi_attestation(
    State(state): State<PoiAppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let record = sqlx::query_as!(
        PoiRecord,
        r#"
        SELECT
            id,
            contributor_id,
            impact_domain,
            raw_score,
            weight,
            normalized_score,
            payload_hash,
            status as "status: _",
            created_at,
            verified_at
        FROM poi_attestations
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&*state.db)
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

    match record {
        Some(r) => Ok(Json(r)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Attestation not found"
            })),
        )),
    }
}

// GET /api/poi/attestations?contributor_id={uuid}&limit={10}
/// List PoI attestations with optional filtering
///
/// Returns a list of attestations, optionally filtered by contributor.
/// Results are ordered by creation time (newest first).
///
#[utoipa::path(
    get,
    path = "/api/poi/attestations",
    params(
        ("contributor_id" = Option<Uuid>, Query, description = "Filter by contributor ID"),
        ("limit" = Option<i64>, Query, description = "Maximum number of results (1-100, default: 10)")
    ),
    responses(
        (status = 200, description = "Attestations list", body = Vec<PoiRecord>),
        (status = 500, description = "Internal server error", body = serde_json::Value)
    ),
    tag = "poi"
)]
pub async fn list_poi_attestations(
    State(state): State<PoiAppState>,
    Query(params): Query<ListPoiQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(10).clamp(1, 100);

    let records = if let Some(contributor_id) = params.contributor_id {
        sqlx::query_as!(
            PoiRecord,
            r#"
            SELECT
                id,
                contributor_id,
                impact_domain,
                raw_score,
                weight,
                normalized_score,
                payload_hash,
                status as "status: _",
                created_at,
                verified_at
            FROM poi_attestations
            WHERE contributor_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
            contributor_id,
            limit
        )
        .fetch_all(&*state.db)
        .await
    } else {
        sqlx::query_as!(
            PoiRecord,
            r#"
            SELECT
                id,
                contributor_id,
                impact_domain,
                raw_score,
                weight,
                normalized_score,
                payload_hash,
                status as "status: _",
                created_at,
                verified_at
            FROM poi_attestations
            ORDER BY created_at DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&*state.db)
        .await
    }
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error",
                "details": e.to_string()
            })),
        )
    })?;

    Ok(Json(records))
}

// GET /api/poi/summary
/// Get PoI verification summary and statistics
///
/// Provides overview of attestation activity, domain breakdowns,
/// and recent verification activity.
///
#[utoipa::path(
    get,
    path = "/api/poi/summary",
    responses(
        (status = 200, description = "Summary data", body = PoiSummaryResponse),
        (status = 500, description = "Internal server error", body = serde_json::Value)
    ),
    tag = "poi"
)]
pub async fn get_poi_summary(
    State(state): State<PoiAppState>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get overall statistics
    let summary = sqlx::query!(
        r#"
        SELECT
            COUNT(*)::bigint AS total_attestations,
            COUNT(*) FILTER (WHERE status = 'verified')::bigint AS verified_attestations,
            COALESCE(AVG(normalized_score), 0.0) AS avg_score
        FROM poi_attestations
        "#
    )
    .fetch_one(&*state.db)
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

    // Get statistics by impact domain
    let by_domain = sqlx::query_as!(
        PoiDomainAggregate,
        r#"
        SELECT
            impact_domain,
            COUNT(*)::bigint AS count,
            COALESCE(AVG(normalized_score), 0.0) AS avg_score
        FROM poi_attestations
        WHERE status = 'verified'
        GROUP BY impact_domain
        ORDER BY count DESC
        "#
    )
    .fetch_all(&*state.db)
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

    // Get recent activity (last 20 attestations)
    let recent_activity = sqlx::query_as!(
        PoiRecentActivity,
        r#"
        SELECT
            contributor_id,
            impact_domain,
            normalized_score,
            status as "status: PoiStatus",
            created_at as "timestamp"
        FROM poi_attestations
        ORDER BY created_at DESC
        LIMIT 20
        "#
    )
    .fetch_all(&*state.db)
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

    let response = PoiSummaryResponse {
        total_attestations: summary.total_attestations.unwrap_or(0),
        verified_attestations: summary.verified_attestations.unwrap_or(0),
        avg_score: summary.avg_score.unwrap_or(0.0) as f32,
        by_domain,
        recent_activity,
    };

    Ok(Json(response))
}

// ╔══════════════════════════════════════════════════════════════════════════
// QUERY PARAMETERS
// ╔══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct ListPoiQuery {
    pub contributor_id: Option<Uuid>,
    pub limit: Option<i64>,
}

// ╔══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ╔══════════════════════════════════════════════════════════════════════════

/// Build canonical payload string for signature verification
///
/// Follows deterministic serialization format for cryptographic verification.
/// This can be upgraded later to JCF + CBOR as defined in PoI methodology.
///
fn build_canonical_payload(req: &PoiVerifyRequest) -> Vec<u8> {
    // Format: contributor_id|impact_domain|raw_score|weight|payload_hash
    // Using form_urlencoded-style formatting with fixed precision floats
    format!(
        "{}|{}|{:.4}|{:.4}|{}",
        req.contributor_id, req.impact_domain, req.raw_score, req.weight, req.payload_hash
    )
    .into_bytes()
}

/// Compute normalized PoI score [0, 1]
///
/// Applies domain-specific weighting and clamps to valid range.
/// This is a simplified version - full PoI methodology will add
/// dimension weighting (quality, utility, evidence strength, etc.)
///
fn compute_normalized_score(raw_score: f32, weight: f32) -> f32 {
    let scaled = (raw_score / 100.0) * weight;
    scaled.clamp(0.0, 1.0)
}

// ╔══════════════════════════════════════════════════════════════════════════
// TESTS
// ╔══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::poi::types::PoiStatus;
    use chrono::Utc;

    #[test]
    fn test_compute_normalized_score() {
        // Maximum score
        assert_eq!(compute_normalized_score(100.0, 1.0), 1.0);

        // Minimum score
        assert_eq!(compute_normalized_score(0.0, 1.0), 0.0);

        // Weighted calculation
        assert_eq!(compute_normalized_score(85.0, 1.2), 1.0); // Clamped

        // Edge cases
        assert_eq!(compute_normalized_score(50.0, 0.5), 0.25);
        assert_eq!(compute_normalized_score(75.0, 2.0), 1.0); // Clamped
    }

    #[test]
    fn test_build_canonical_payload() {
        let req = PoiVerifyRequest {
            contributor_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            impact_domain: "education".to_string(),
            raw_score: 85.7,
            weight: 1.2,
            payload_hash: "sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa".to_string(),
            signature: "test_signature".to_string(),
            attestation_id: None,
        };

        let canonical = String::from_utf8(build_canonical_payload(&req)).unwrap();
        assert_eq!(
            canonical,
            "550e8400-e29b-41d4-a716-446655440000|education|85.7000|1.2000|sha256:d9c9fa504add65a1be737f3fe3447bc056fd1aa"
        );
    }

    #[test]
    fn test_poi_status_from_str() {
        assert_eq!(PoiStatus::Pending.as_str(), "pending");
        assert_eq!(PoiStatus::Verified.as_str(), "verified");
        assert_eq!(PoiStatus::Rejected.as_str(), "rejected");
        assert_eq!(PoiStatus::Revoked.as_str(), "revoked");
    }
}
