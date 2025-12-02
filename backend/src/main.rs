//! BIZRA Node0 - Genesis Node API Server
//! Document ID: BIZRA-NODE0-v1.0.0-GENESIS
//!
//! This is the main entry point for the BIZRA Genesis Node Rust backend.
//! It provides:
//! - REST API for PAT (Personal Agent Team) interactions
//! - PoI (Proof-of-Impact) ledger management
//! - Asset Registry operations
//! - Resource Pool management
//! - System health monitoring

use axum::{
    extract::State,
    http::{header, Method, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod lib;
use lib::services::env_snapshot::EnvSnapshot;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db_pool: sqlx::PgPool,
    pub ollama_url: String,
    pub node_id: String,
}

/// Health check response
#[derive(Serialize)]
struct HealthResponse {
    status: String,
    node_id: String,
    version: String,
    timestamp: String,
}

/// Generic API response wrapper
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    info!("================================================");
    info!("BIZRA Node0 API Server v1.0.0");
    info!("Document ID: BIZRA-NODE0-v1.0.0-GENESIS");
    info!("================================================");

    // Database connection
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            std::env::var("DB_USER").unwrap_or_else(|_| "bizra_node0".into()),
            std::env::var("DB_PASSWORD").unwrap_or_else(|_| "bizra_secure_2025".into()),
            std::env::var("DB_HOST").unwrap_or_else(|_| "localhost".into()),
            std::env::var("DB_PORT").unwrap_or_else(|_| "5432".into()),
            std::env::var("DB_NAME").unwrap_or_else(|_| "bizra_genesis".into()),
        )
    });

    info!("Connecting to PostgreSQL...");
    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    info!("Database pool initialized");

    // Ollama configuration
    let ollama_url =
        std::env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".into());
    info!("Ollama URL: {}", ollama_url);

    // Check Ollama health
    match check_ollama_health(&ollama_url).await {
        Ok(models) => info!("Ollama health check... OK ({} models available)", models),
        Err(e) => info!("Ollama health check... WARN: {}", e),
    }

    // Node configuration
    let node_id = std::env::var("NODE_ID").unwrap_or_else(|_| "NODE0-TITAN".into());

    // Create shared state
    let state = Arc::new(AppState {
        db_pool,
        ollama_url,
        node_id: node_id.clone(),
    });

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_origin(Any);

    // Build router
    let app = Router::new()
        // Health & Status
        .route("/health", get(health_handler))
        .route("/api/services/status", get(services_status_handler))
        // Environment Snapshot
        .route("/api/env/snapshot", get(env_snapshot_handler))
        // User Profile
        .route("/api/user/profile", get(get_profile_handler))
        .route("/api/user/profile", post(create_profile_handler))
        // PAT (Personal Agent Team)
        .route("/api/pat/chat", post(pat_chat_handler))
        .route("/api/pat/agents", get(pat_agents_handler))
        .route("/api/pat/configure", post(pat_configure_handler))
        // PoI (Proof-of-Impact)
        .route("/api/poi/log", post(poi_log_handler))
        .route("/api/poi/stats", get(poi_stats_handler))
        .route("/api/poi/timeline", get(poi_timeline_handler))
        // Resource Pool
        .route("/api/resources/configure", post(resources_configure_handler))
        .route("/api/resources/status", get(resources_status_handler))
        // Asset Registry
        .route("/api/assets/index", post(assets_index_handler))
        .route("/api/assets/search", get(assets_search_handler))
        .route("/api/assets/stats", get(assets_stats_handler))
        // Add state and middleware
        .with_state(state)
        .layer(cors);

    // Start server
    let host = std::env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port = std::env::var("API_PORT").unwrap_or_else(|_| "8080".into());
    let addr = format!("{}:{}", host, port);

    info!("Starting API server on {}", addr);
    info!("Health endpoint: http://{}/health", addr);
    info!("API docs: http://{}/api/docs", addr);

    let listener = TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Check Ollama health and return model count
async fn check_ollama_health(url: &str) -> anyhow::Result<usize> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/tags", url))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await?;

    #[derive(Deserialize)]
    struct OllamaTagsResponse {
        models: Vec<serde_json::Value>,
    }

    let tags: OllamaTagsResponse = response.json().await?;
    Ok(tags.models.len())
}

// ============================================
// HANDLERS
// ============================================

/// Health check endpoint
async fn health_handler(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".into(),
        node_id: state.node_id.clone(),
        version: "1.0.0".into(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Services status endpoint
async fn services_status_handler(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut services = serde_json::json!({});

    // Check PostgreSQL
    let pg_status = match sqlx::query("SELECT 1").fetch_one(&state.db_pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };
    services["postgres"] = serde_json::json!(pg_status);

    // Check Ollama
    let ollama_status = match check_ollama_health(&state.ollama_url).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };
    services["ollama"] = serde_json::json!(ollama_status);

    Json(ApiResponse {
        success: true,
        data: Some(services),
        error: None,
    })
}

/// Environment snapshot endpoint
async fn env_snapshot_handler() -> Json<ApiResponse<EnvSnapshot>> {
    let snapshot = EnvSnapshot::capture();
    Json(ApiResponse {
        success: true,
        data: Some(snapshot),
        error: None,
    })
}

// ============================================
// USER PROFILE HANDLERS
// ============================================

#[derive(Deserialize)]
struct CreateProfileRequest {
    seed_state: String,
    primary_pat_role: String,
    goals: Option<Vec<String>>,
    time_available_weekly: Option<i32>,
}

#[derive(Serialize)]
struct ProfileResponse {
    id: String,
    user_id: String,
    seed_state: String,
    primary_pat_role: String,
    goals: Vec<String>,
    time_available_weekly: Option<i32>,
    created_at: String,
}

async fn get_profile_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<ProfileResponse>>, StatusCode> {
    let result = sqlx::query_as!(
        ProfileResponse,
        r#"
        SELECT 
            id::text, user_id, seed_state, primary_pat_role,
            COALESCE(goals, '[]'::jsonb)::text as "goals!",
            time_available_weekly,
            created_at::text as "created_at!"
        FROM user_profile 
        WHERE user_id = 'NODE0-USER'
        LIMIT 1
        "#
    )
    .fetch_optional(&state.db_pool)
    .await;

    match result {
        Ok(Some(profile)) => {
            let goals: Vec<String> =
                serde_json::from_str(&profile.goals).unwrap_or_default();
            Ok(Json(ApiResponse {
                success: true,
                data: Some(ProfileResponse {
                    id: profile.id,
                    user_id: profile.user_id,
                    seed_state: profile.seed_state,
                    primary_pat_role: profile.primary_pat_role,
                    goals,
                    time_available_weekly: profile.time_available_weekly,
                    created_at: profile.created_at,
                }),
                error: None,
            }))
        }
        Ok(None) => Ok(Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Profile not found".into()),
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn create_profile_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateProfileRequest>,
) -> Result<Json<ApiResponse<ProfileResponse>>, StatusCode> {
    let goals_json = serde_json::to_value(&payload.goals.unwrap_or_default())
        .unwrap_or(serde_json::json!([]));

    let result = sqlx::query!(
        r#"
        INSERT INTO user_profile (seed_state, primary_pat_role, goals, time_available_weekly)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
            seed_state = EXCLUDED.seed_state,
            primary_pat_role = EXCLUDED.primary_pat_role,
            goals = EXCLUDED.goals,
            time_available_weekly = EXCLUDED.time_available_weekly,
            updated_at = NOW()
        RETURNING id::text, user_id, seed_state, primary_pat_role, 
                  goals::text as goals, time_available_weekly, created_at::text as created_at
        "#,
        payload.seed_state,
        payload.primary_pat_role,
        goals_json,
        payload.time_available_weekly
    )
    .fetch_one(&state.db_pool)
    .await;

    match result {
        Ok(row) => {
            let goals: Vec<String> =
                serde_json::from_str(&row.goals.unwrap_or_default()).unwrap_or_default();
            Ok(Json(ApiResponse {
                success: true,
                data: Some(ProfileResponse {
                    id: row.id.unwrap_or_default(),
                    user_id: row.user_id,
                    seed_state: row.seed_state,
                    primary_pat_role: row.primary_pat_role,
                    goals,
                    time_available_weekly: row.time_available_weekly,
                    created_at: row.created_at.unwrap_or_default(),
                }),
                error: None,
            }))
        }
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ============================================
// PAT (Personal Agent Team) HANDLERS
// ============================================

#[derive(Deserialize)]
struct PatChatRequest {
    message: String,
    agent_role: Option<String>,
}

#[derive(Serialize)]
struct PatChatResponse {
    response: String,
    agent: String,
    model: String,
    latency_ms: u64,
    ihsan_score: f64,
}

async fn pat_chat_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PatChatRequest>,
) -> Result<Json<ApiResponse<PatChatResponse>>, StatusCode> {
    let start = std::time::Instant::now();
    let agent_role = payload.agent_role.unwrap_or_else(|| "MasterReasoner".into());

    // Select model based on agent role
    let model = match agent_role.as_str() {
        "MasterReasoner" | "ExecutionPlanner" => "deepseek-r1:7b",
        "MemoryArchitect" | "CreativeSynthesizer" | "EthicsGuardian" => "qwen2.5:7b",
        "DataAnalyzer" | "Communicator" => "mistral:7b",
        _ => "mistral:7b",
    };

    // Build system prompt based on agent role
    let system_prompt = match agent_role.as_str() {
        "MasterReasoner" => "You are BIZRA Master Reasoner, an expert strategic thinker. Help users with complex analysis, planning, and decision-making. Be thorough and insightful.",
        "MemoryArchitect" => "You are BIZRA Memory Architect. Help users organize knowledge, find connections, and structure information effectively.",
        "CreativeSynthesizer" => "You are BIZRA Creative Synthesizer. Help users with creative writing, brainstorming, and ideation. Be imaginative and inspiring.",
        "DataAnalyzer" => "You are BIZRA Data Analyzer. Help users extract insights from data, recognize patterns, and make data-driven decisions.",
        "Communicator" => "You are BIZRA Communicator. Help users craft clear, effective messages, emails, and presentations.",
        "ExecutionPlanner" => "You are BIZRA Execution Planner. Help users break down tasks, create schedules, and build actionable checklists.",
        "EthicsGuardian" => "You are BIZRA Ethics Guardian. Review content for potential harm, bias, or ethical violations. Provide constructive feedback.",
        _ => "You are a helpful BIZRA AI assistant.",
    };

    // Call Ollama
    let client = reqwest::Client::new();
    let ollama_request = serde_json::json!({
        "model": model,
        "prompt": payload.message,
        "system": system_prompt,
        "stream": false,
        "options": {
            "temperature": 0.7,
            "num_predict": 1024
        }
    });

    let ollama_response = client
        .post(format!("{}/api/generate", state.ollama_url))
        .json(&ollama_request)
        .send()
        .await;

    match ollama_response {
        Ok(response) => {
            let json: serde_json::Value = response.json().await.unwrap_or_default();
            let response_text = json["response"]
                .as_str()
                .unwrap_or("I apologize, but I couldn't generate a response.")
                .to_string();

            let latency_ms = start.elapsed().as_millis() as u64;

            // Calculate simple Ihsan score (placeholder - would be more sophisticated in production)
            let ihsan_score = 0.88 + (rand::random::<f64>() * 0.1);

            // Calculate impact score based on message complexity
            let impact_score = ((payload.message.len() as f64) / 80.0).clamp(1.0, 10.0);
            let duration_minutes = ((latency_ms as f64) / 1000.0 / 60.0).ceil() as i32;

            // Calculate rewards
            let bzc_reward = impact_score * duration_minutes.max(1) as f64 * 0.1;
            let imp_reward = ihsan_score * impact_score * 0.5;

            // Log PoI event for this chat interaction
            let poi_result = sqlx::query!(
                r#"
                INSERT INTO poi_ledger (
                    event_type, impact_score, ihsan_score,
                    duration_minutes, description, assets_produced,
                    resources_used, reward_bzc, reward_imp
                )
                VALUES ('task_completed', $1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id::text
                "#,
                impact_score,
                ihsan_score,
                duration_minutes.max(1),
                Some(format!("PAT chat with {}: {}", agent_role, 
                    if payload.message.len() > 50 { 
                        format!("{}...", &payload.message[..50]) 
                    } else { 
                        payload.message.clone() 
                    }
                )),
                &Vec::<String>::new(),
                serde_json::json!({
                    "model": model,
                    "latency_ms": latency_ms,
                    "agent": agent_role
                }),
                bzc_reward,
                imp_reward,
            )
            .fetch_one(&state.db_pool)
            .await;

            if let Err(e) = poi_result {
                tracing::warn!("Failed to log PoI event for chat: {}", e);
            }

            Ok(Json(ApiResponse {
                success: true,
                data: Some(PatChatResponse {
                    response: response_text,
                    agent: agent_role,
                    model: model.to_string(),
                    latency_ms,
                    ihsan_score,
                }),
                error: None,
            }))
        }
        Err(e) => {
            tracing::error!("Ollama request failed: {}", e);
            Ok(Json(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Ollama request failed: {}", e)),
            }))
        }
    }
}

#[derive(Serialize)]
struct PatAgent {
    role: String,
    model: String,
    description: String,
    available: bool,
}

async fn pat_agents_handler() -> Json<ApiResponse<Vec<PatAgent>>> {
    let agents = vec![
        PatAgent {
            role: "MasterReasoner".into(),
            model: "deepseek-r1:7b".into(),
            description: "Strategic thinking, complex analysis, planning".into(),
            available: true,
        },
        PatAgent {
            role: "MemoryArchitect".into(),
            model: "qwen2.5:7b".into(),
            description: "Knowledge organization, finding connections, recall".into(),
            available: true,
        },
        PatAgent {
            role: "CreativeSynthesizer".into(),
            model: "qwen2.5:7b".into(),
            description: "Writing, brainstorming, ideation".into(),
            available: true,
        },
        PatAgent {
            role: "DataAnalyzer".into(),
            model: "mistral:7b".into(),
            description: "Data analysis, pattern recognition".into(),
            available: true,
        },
        PatAgent {
            role: "Communicator".into(),
            model: "mistral:7b".into(),
            description: "Email drafts, presentation scripts".into(),
            available: true,
        },
        PatAgent {
            role: "ExecutionPlanner".into(),
            model: "deepseek-r1:7b".into(),
            description: "Schedules, checklists, task sequencing".into(),
            available: true,
        },
        PatAgent {
            role: "EthicsGuardian".into(),
            model: "qwen2.5:7b".into(),
            description: "Safety compliance, bias detection".into(),
            available: true,
        },
    ];

    Json(ApiResponse {
        success: true,
        data: Some(agents),
        error: None,
    })
}

#[derive(Deserialize)]
struct PatConfigureRequest {
    primary_role: String,
}

async fn pat_configure_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PatConfigureRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let result = sqlx::query!(
        "UPDATE user_profile SET primary_pat_role = $1 WHERE user_id = 'NODE0-USER'",
        payload.primary_role
    )
    .execute(&state.db_pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse {
            success: true,
            data: Some(format!("Primary PAT agent set to {}", payload.primary_role)),
            error: None,
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ============================================
// POI (Proof-of-Impact) HANDLERS
// ============================================

#[derive(Deserialize)]
struct PoiLogRequest {
    event_type: String,
    task_id: Option<String>,
    impact_score: f64,
    ihsan_score: f64,
    duration_minutes: Option<i32>,
    description: Option<String>,
    assets_produced: Option<Vec<String>>,
    resources_used: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct PoiEvent {
    id: String,
    event_type: String,
    impact_score: f64,
    ihsan_score: f64,
    reward_bzc: f64,
    reward_imp: f64,
    verified: bool,
    timestamp: String,
}

async fn poi_log_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PoiLogRequest>,
) -> Result<Json<ApiResponse<PoiEvent>>, StatusCode> {
    // Calculate rewards
    let bzc_reward = payload.impact_score * payload.duration_minutes.unwrap_or(1) as f64 * 0.1;
    let imp_reward = payload.ihsan_score * payload.impact_score * 0.5;

    let result = sqlx::query!(
        r#"
        INSERT INTO poi_ledger (
            event_type, task_id, impact_score, ihsan_score, 
            duration_minutes, description, assets_produced, 
            resources_used, reward_bzc, reward_imp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id::text, event_type, impact_score, ihsan_score, 
                  reward_bzc, reward_imp, verified, timestamp::text
        "#,
        payload.event_type,
        payload.task_id,
        sqlx::types::BigDecimal::try_from(payload.impact_score).ok(),
        sqlx::types::BigDecimal::try_from(payload.ihsan_score).ok(),
        payload.duration_minutes,
        payload.description,
        &payload.assets_produced.unwrap_or_default(),
        payload.resources_used.unwrap_or(serde_json::json!({})),
        sqlx::types::BigDecimal::try_from(bzc_reward).ok(),
        sqlx::types::BigDecimal::try_from(imp_reward).ok(),
    )
    .fetch_one(&state.db_pool)
    .await;

    match result {
        Ok(row) => Ok(Json(ApiResponse {
            success: true,
            data: Some(PoiEvent {
                id: row.id.unwrap_or_default(),
                event_type: row.event_type,
                impact_score: payload.impact_score,
                ihsan_score: payload.ihsan_score,
                reward_bzc: bzc_reward,
                reward_imp: imp_reward,
                verified: row.verified.unwrap_or(false),
                timestamp: row.timestamp.unwrap_or_default(),
            }),
            error: None,
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Serialize)]
struct PoiStats {
    total_events: i64,
    verified_events: i64,
    total_impact: f64,
    avg_ihsan: f64,
    total_minutes: i64,
    total_bzc: f64,
    total_imp: f64,
}

async fn poi_stats_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<PoiStats>>, StatusCode> {
    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*)::bigint as total_events,
            COUNT(*) FILTER (WHERE verified = true)::bigint as verified_events,
            COALESCE(SUM(impact_score), 0)::float8 as total_impact,
            COALESCE(AVG(ihsan_score), 0)::float8 as avg_ihsan,
            COALESCE(SUM(duration_minutes), 0)::bigint as total_minutes,
            COALESCE(SUM(reward_bzc), 0)::float8 as total_bzc,
            COALESCE(SUM(reward_imp), 0)::float8 as total_imp
        FROM poi_ledger
        WHERE user_id = 'NODE0-USER'
        "#
    )
    .fetch_one(&state.db_pool)
    .await;

    match result {
        Ok(row) => Ok(Json(ApiResponse {
            success: true,
            data: Some(PoiStats {
                total_events: row.total_events.unwrap_or(0),
                verified_events: row.verified_events.unwrap_or(0),
                total_impact: row.total_impact.unwrap_or(0.0),
                avg_ihsan: row.avg_ihsan.unwrap_or(0.0),
                total_minutes: row.total_minutes.unwrap_or(0),
                total_bzc: row.total_bzc.unwrap_or(0.0),
                total_imp: row.total_imp.unwrap_or(0.0),
            }),
            error: None,
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
struct PoiTimelineQuery {
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn poi_timeline_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(query): axum::extract::Query<PoiTimelineQuery>,
) -> Result<Json<ApiResponse<Vec<PoiEvent>>>, StatusCode> {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    let result = sqlx::query!(
        r#"
        SELECT 
            id::text, event_type, 
            impact_score::float8 as "impact_score!",
            ihsan_score::float8 as "ihsan_score!",
            reward_bzc::float8 as "reward_bzc!",
            reward_imp::float8 as "reward_imp!",
            verified, timestamp::text as "timestamp!"
        FROM poi_ledger
        WHERE user_id = 'NODE0-USER'
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset
    )
    .fetch_all(&state.db_pool)
    .await;

    match result {
        Ok(rows) => {
            let events: Vec<PoiEvent> = rows
                .into_iter()
                .map(|row| PoiEvent {
                    id: row.id.unwrap_or_default(),
                    event_type: row.event_type,
                    impact_score: row.impact_score,
                    ihsan_score: row.ihsan_score,
                    reward_bzc: row.reward_bzc,
                    reward_imp: row.reward_imp,
                    verified: row.verified.unwrap_or(false),
                    timestamp: row.timestamp,
                })
                .collect();

            Ok(Json(ApiResponse {
                success: true,
                data: Some(events),
                error: None,
            }))
        }
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ============================================
// RESOURCE POOL HANDLERS
// ============================================

#[derive(Deserialize)]
struct ResourceConfigureRequest {
    cpu_cores_allocated: Option<i32>,
    gpu_enabled: Option<bool>,
    storage_gb_allocated: Option<f64>,
    availability_hours: Option<Vec<String>>,
}

async fn resources_configure_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResourceConfigureRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let availability_json =
        serde_json::to_value(&payload.availability_hours.unwrap_or_default()).ok();

    let result = sqlx::query!(
        r#"
        UPDATE resource_pool SET
            cpu_cores_allocated = COALESCE($1, cpu_cores_allocated),
            gpu_enabled = COALESCE($2, gpu_enabled),
            storage_allocated_gb = COALESCE($3, storage_allocated_gb),
            availability_hours = COALESCE($4, availability_hours),
            updated_at = NOW()
        WHERE node_id = 'NODE0-TITAN'
        "#,
        payload.cpu_cores_allocated,
        payload.gpu_enabled,
        payload
            .storage_gb_allocated
            .map(|v| sqlx::types::BigDecimal::try_from(v).ok())
            .flatten(),
        availability_json
    )
    .execute(&state.db_pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse {
            success: true,
            data: Some("Resource allocation updated".into()),
            error: None,
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Serialize)]
struct ResourceStatus {
    node_id: String,
    cpu_cores_total: i32,
    cpu_cores_allocated: i32,
    gpu_enabled: bool,
    storage_total_gb: f64,
    storage_allocated_gb: f64,
    status: String,
    total_tasks_processed: i32,
    total_compute_hours: f64,
}

async fn resources_status_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<ResourceStatus>>, StatusCode> {
    let result = sqlx::query!(
        r#"
        SELECT 
            node_id, cpu_cores_total, cpu_cores_allocated,
            gpu_enabled, 
            storage_total_gb::float8 as "storage_total_gb!",
            storage_allocated_gb::float8 as "storage_allocated_gb!",
            status, total_tasks_processed,
            total_compute_hours::float8 as "total_compute_hours!"
        FROM resource_pool
        WHERE node_id = 'NODE0-TITAN'
        LIMIT 1
        "#
    )
    .fetch_optional(&state.db_pool)
    .await;

    match result {
        Ok(Some(row)) => Ok(Json(ApiResponse {
            success: true,
            data: Some(ResourceStatus {
                node_id: row.node_id,
                cpu_cores_total: row.cpu_cores_total,
                cpu_cores_allocated: row.cpu_cores_allocated,
                gpu_enabled: row.gpu_enabled.unwrap_or(false),
                storage_total_gb: row.storage_total_gb,
                storage_allocated_gb: row.storage_allocated_gb,
                status: row.status,
                total_tasks_processed: row.total_tasks_processed.unwrap_or(0),
                total_compute_hours: row.total_compute_hours,
            }),
            error: None,
        })),
        Ok(None) => Ok(Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Resource pool not found".into()),
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ============================================
// ASSET REGISTRY HANDLERS
// ============================================

#[derive(Deserialize)]
struct AssetsIndexRequest {
    paths: Vec<String>,
    domain: Option<String>,
}

async fn assets_index_handler(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<AssetsIndexRequest>,
) -> Json<ApiResponse<String>> {
    // Placeholder - actual implementation would scan directories
    Json(ApiResponse {
        success: true,
        data: Some(format!(
            "Indexing {} paths in domain '{}'",
            payload.paths.len(),
            payload.domain.unwrap_or_else(|| "core_bizra".into())
        )),
        error: None,
    })
}

#[derive(Deserialize)]
struct AssetsSearchQuery {
    q: String,
    limit: Option<i64>,
}

async fn assets_search_handler(
    State(_state): State<Arc<AppState>>,
    axum::extract::Query(query): axum::extract::Query<AssetsSearchQuery>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    // Placeholder - actual implementation would perform vector search
    Json(ApiResponse {
        success: true,
        data: Some(vec![serde_json::json!({
            "message": format!("Search results for: '{}' (limit: {})", query.q, query.limit.unwrap_or(10))
        })]),
        error: None,
    })
}

async fn assets_stats_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*)::bigint as total_assets,
            COUNT(*) FILTER (WHERE is_indexed = true)::bigint as indexed_assets,
            COALESCE(SUM(size_bytes), 0)::bigint as total_bytes
        FROM asset_registry
        "#
    )
    .fetch_one(&state.db_pool)
    .await;

    match result {
        Ok(row) => Ok(Json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "total_assets": row.total_assets.unwrap_or(0),
                "indexed_assets": row.indexed_assets.unwrap_or(0),
                "total_size_mb": row.total_bytes.unwrap_or(0) as f64 / 1_048_576.0
            })),
            error: None,
        })),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
