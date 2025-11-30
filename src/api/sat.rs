//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  SAT-LAB API ENDPOINTS v0.1                                               ║
//! ║  BIZRA LAB's Internal Enterprise Team - Dashboard Administration         ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use uuid::Uuid;

use crate::sat::lab::{SatOutboxItem, SatRecommendation};

// SAT API Response wrapper
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
    message: Option<String>,
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            message: None,
        }
    }

    fn error<S: Into<String>>(error: S) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error.into()),
            message: None,
        }
    }
}

/// API routes for SAT-LAB dashboard integration
pub fn sat_lab_routes() -> axum::Router<crate::AppState> {
    use axum::routing::{get, post};

    axum::Router::new()
        .route("/sat/outbox", get(list_outbox_items))
        .route("/sat/outbox/:id/approve", post(approve_outbox_item))
        .route("/sat/outbox/:id/reject", post(reject_outbox_item))
        .route("/sat/outbox/:id/publish", post(mark_published))
        .route("/sat/recommendations", get(list_recommendations))
        .route("/sat/trigger-cycle", post(trigger_sat_cycle))
}

/// Get SAT outbox content for approval (Dashboard UI)
async fn list_outbox_items(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
) -> impl IntoResponse {
    let items = match sqlx::query_as::<_, SatOutboxItem>(
        r#"SELECT * FROM sat_outbox_items
           WHERE status IN ('draft', 'approved')
           ORDER BY created_at DESC"#,
    )
    .fetch_all(&*state.db)
    .await
    {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("Failed to fetch SAT outbox: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<Vec<SatOutboxItem>>::error(
                    "Failed to load SAT outbox items",
                )),
            )
                .into_response();
        }
    };

    Json(ApiResponse::success(items)).into_response()
}

/// Approve outbox item for future publishing
async fn approve_outbox_item(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    if let Err(e) = sqlx::query(
        "UPDATE sat_outbox_items SET status = 'approved', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&*state.db)
    .await
    {
        tracing::error!("Failed to approve SAT outbox item {}: {}", id, e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error("Failed to approve content")),
        )
            .into_response();
    }

    tracing::info!("SAT outbox item {} approved for publishing", id);
    Json(ApiResponse::success(())).into_response()
}

/// Reject outbox item (won't be published)
async fn reject_outbox_item(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    if let Err(e) = sqlx::query(
        "UPDATE sat_outbox_items SET status = 'rejected', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&*state.db)
    .await
    {
        tracing::error!("Failed to reject SAT outbox item {}: {}", id, e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error("Failed to reject content")),
        )
            .into_response();
    }

    tracing::info!("SAT outbox item {} rejected", id);
    Json(ApiResponse::success(())).into_response()
}

/// Mark as published (manual copy-paste to social channels)
async fn mark_published(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    if let Err(e) = sqlx::query(
        r#"UPDATE sat_outbox_items
           SET status = 'published', published_at = NOW(), updated_at = NOW()
           WHERE id = $1"#,
    )
    .bind(id)
    .execute(&*state.db)
    .await
    {
        tracing::error!("Failed to mark published SAT outbox item {}: {}", id, e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error("Failed to mark as published")),
        )
            .into_response();
    }

    tracing::info!("SAT outbox item {} marked as published", id);
    Json(ApiResponse::success(())).into_response()
}

/// Get SAT recommendations for BIZRA LAB growth
async fn list_recommendations(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
) -> impl IntoResponse {
    let recommendations = match sqlx::query_as::<_, SatRecommendation>(
        r#"SELECT * FROM sat_recommendations
           ORDER BY priority DESC, created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&*state.db)
    .await
    {
        Ok(recommendations) => recommendations,
        Err(e) => {
            tracing::error!("Failed to fetch SAT recommendations: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<Vec<SatRecommendation>>::error(
                    "Failed to load SAT recommendations",
                )),
            )
                .into_response();
        }
    };

    Json(ApiResponse::success(recommendations)).into_response()
}

/// SAT Outbox Content Item (API response format)
#[derive(Serialize)]
pub struct SatOutboxItemResponse {
    pub id: String,
    pub agent_type: String,
    pub channel_type: String,
    pub content_title: Option<String>,
    pub content_body: String,
    pub schedule_date: Option<String>,
    pub status: String,
    pub created_at: String,
    pub published_at: Option<String>,
    pub engagement_metrics: Option<serde_json::Value>,
}

/// SAT Recommendation Item (API response format)
#[derive(Serialize)]
pub struct SatRecommendationResponse {
    pub id: String,
    pub priority: String,
    pub category: Option<String>,
    pub recommendation: String,
    pub rationale: Option<String>,
    pub actionable_by: Option<String>,
    pub created_at: String,
}

/// Manual trigger endpoint for SAT weekly cycle
pub async fn trigger_sat_cycle(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
) -> impl IntoResponse {
    use crate::sat::orchestrator::SatLabOrchestrator;
    use tracing::{error, info};

    info!("🚀 Triggering SAT-LAB weekly cycle with sovereign model stack");

    // Get primary model from environment or default to bizra-planner
    let primary_model =
        std::env::var("BIZRA_PRIMARY_MODEL").unwrap_or_else(|_| "bizra-planner:latest".to_string());

    info!(
        "🧠 Using primary BIZRA model for SAT generation: {}",
        primary_model
    );

    // Create SAT-LAB orchestrator with model provider
    let orchestrator = SatLabOrchestrator::new(
        state.db.as_ref().clone(),
        Box::new(state.model_provider.clone()),
        std::sync::Arc::new(state.clone()),
    );

    // Execute weekly cycle
    match orchestrator.execute_weekly_cycle().await {
        Ok(_) => {
            info!("✨ SAT-LAB weekly cycle completed successfully");
            Json(ApiResponse::success(())).into_response()
        }
        Err(e) => {
            error!("Failed to execute SAT weekly cycle: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(
                    "Failed to execute SAT weekly cycle",
                )),
            )
                .into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    // Unit tests for SAT API endpoints would go here
    // Testing database operations and API responses
}
