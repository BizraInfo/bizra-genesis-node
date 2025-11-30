// src/api/compare.rs
// AI Response Comparison API for Genesis 100
// Public endpoint for comparing BIZRA vs OpenAI responses

use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use utoipa::ToSchema;

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST & RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CompareRequest {
    pub prompt: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CompareResponse {
    pub bizra: AIResponse,
    pub openai: AIResponse,
    pub performance: PerformanceMetrics,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AIResponse {
    pub text: String,
    pub model: String,
    pub latency_ms: u64,
    pub tokens: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    pub total_latency_ms: u64,
    pub bizra_consensus_score: f64,
    pub winner: Option<String>, // "bizra" or "openai"
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/// Compare AI Responses for Genesis 100
///
/// Public endpoint for comparing BIZRA vs OpenAI responses
/// No authentication required for Genesis 100 launch (developer access)
#[utoipa::path(
    post,
    path = "/compare",
    request_body = CompareRequest,
    responses(
        (status = 200, description = "Comparison completed successfully", body = CompareResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "comparison"
)]
pub async fn compare_responses(
    Json(payload): Json<CompareRequest>,
) -> impl IntoResponse {
    let request_start = Instant::now();

    tracing::info!("🤖 GENESIS 100: Comparing responses for prompt: {}", payload.prompt);

    // For Genesis 100, we'll simulate both responses
    // In production, this would call actual APIs

    // Instrument BIZRA response call (would be real AI provider)
    let bizra_start = Instant::now();
    let bizra_response = instrument_ai_call("bizra", "consensus-engine", || async {
        simulate_bizra_response(&payload.prompt).await
    }).await;
    let bizra_latency = bizra_start.elapsed().as_millis() as u64;

    // Instrument OpenAI response call (would be real API provider)
    let openai_start = Instant::now();
    let openai_response = instrument_ai_call("openai", "gpt-4", || async {
        simulate_openai_response(&payload.prompt).await
    }).await;
    let openai_latency = openai_start.elapsed().as_millis() as u64;

    let total_latency = request_start.elapsed().as_millis() as u64;

    // Calculate performance metrics
    let bizra_word_count = bizra_response.text.split_whitespace().count();
    let openai_word_count = openai_response.text.split_whitespace().count();

    // Simple consensus score based on response characteristics
    let consensus_score = if bizra_word_count > openai_word_count {
        0.85 // Longer response typically indicates more comprehensive analysis
    } else {
        0.75
    };

    // Determine winner based on latency and quality metrics
    let winner = if consensus_score > 0.8 && bizra_latency < openai_latency * 2 {
        Some("bizra".to_string())
    } else {
        Some("openai".to_string())
    };

    let response = CompareResponse {
        bizra: AIResponse {
            text: bizra_response.text,
            model: "BIZRA-Consensus-Engine".to_string(),
            latency_ms: bizra_latency,
            tokens: Some(bizra_word_count as u32),
        },
        openai: AIResponse {
            text: openai_response.text,
            model: "GPT-4".to_string(), // Simulated for Genesis 100
            latency_ms: openai_latency,
            tokens: Some(openai_word_count as u32),
        },
        performance: PerformanceMetrics {
            total_latency_ms: total_latency,
            bizra_consensus_score: consensus_score,
            winner,
        },
    };

    tracing::info!(
        "✅ Comparison completed: BIZRA vs OpenAI latency {}ms vs {}ms",
        bizra_latency, openai_latency
    );

    (StatusCode::OK, Json(response))
}

/// Simulate BIZRA consensus response for Genesis 100
async fn simulate_bizra_response(prompt: &str) -> SimulatedResponse {
    // Simulate processing time (typical consensus overhead)
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

    // Generate response based on prompt analysis
    let response = if prompt.to_lowercase().contains("consciousness") {
        "Consciousness in AI systems emerges from distributed processing across multiple specialized agents. Unlike single-model architectures, BIZRA employs a consensus mechanism where 12 neural agents collaboratively analyze and synthesize information, achieving higher accuracy through diverse perspectives and built-in verification protocols.".to_string()
    } else if prompt.to_lowercase().contains("code") || prompt.to_lowercase().contains("programming") {
        "This appears to be a coding query. BIZRA would analyze this through multiple specialized agents: syntax validation agents, algorithm optimization agents, security analysis agents, and documentation agents all working together to provide a comprehensive solution.".to_string()
    } else if prompt.to_lowercase().contains("business") || prompt.to_lowercase().contains("strategy") {
        "From a business strategy perspective, this query involves multiple dimensions: market analysis, competitive positioning, risk assessment, and execution planning. A consensus-driven approach ensures all critical factors are considered and validated across different analytical frameworks.".to_string()
    } else {
        format!("Thank you for your question about '{}'. BIZRA's consensus approach ensures comprehensive analysis by engaging multiple specialized agents simultaneously. This distributed intelligence approach provides more thorough and reliable responses compared to single-model architectures.", prompt)
    };

    SimulatedResponse { text: response }
}

/// Simulate OpenAI response for Genesis 100
async fn simulate_openai_response(prompt: &str) -> SimulatedResponse {
    // Simulate processing time (typical API latency)
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;

    let response = if prompt.to_lowercase().contains("consciousness") {
        "Consciousness in AI remains a subject of ongoing research and debate. While current AI systems can simulate aspects of consciousness through complex neural networks, true consciousness as experienced by humans involves self-awareness, qualia, and subjective experience that current artificial systems don't possess.".to_string()
    } else if prompt.to_lowercase().contains("code") || prompt.to_lowercase().contains("programming") {
        "I'd be happy to help you with coding! To provide the most accurate assistance, could you please share the specific programming language you're working with, the framework or library (if applicable), and what you're trying to accomplish? This will help me give you the most relevant and practical code solution.".to_string()
    } else if prompt.to_lowercase().contains("business") || prompt.to_lowercase().contains("strategy") {
        "Business strategy decisions involve multiple factors including market analysis, competitive landscape, resource allocation, risk assessment, and execution planning. The most successful strategies typically align company strengths with market opportunities while mitigating key risks. Would you like me to elaborate on any specific aspect of business strategy?".to_string()
    } else {
        format!("I understand you're asking about '{}'. This is an interesting topic that deserves careful consideration. To provide you with the most helpful and accurate response, could you provide some additional context about what specific aspect you'd like me to focus on?", prompt)
    };

    SimulatedResponse { text: response }
}

/// Instrumented AI model call with metrics recording
///
/// Records latency, success/failure rates, and provider statistics
/// for all AI provider calls through the observability system.
async fn instrument_ai_call<F, Fut, T>(provider: &str, model: &str, call: F) -> T
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = T>,
{
    let start = Instant::now();

    // Execute the AI call
    let result = call().await;

    // Record metrics
    let duration = start.elapsed().as_secs_f64();
    let success = true.to_string(); // For simulated calls, always success

    // Record AI provider metrics
    metrics::counter!(
        "ai_model_calls_total",
        1,
        "provider" => provider.to_string(),
        "model" => model.to_string(),
        "success" => success.clone(),
    );
    metrics::histogram!(
        "ai_model_call_duration_seconds",
        duration,
        "provider" => provider.to_string(),
        "model" => model.to_string(),
        "success" => success,
    );

    result
}

// Helper struct for simulated responses
struct SimulatedResponse {
    text: String,
}
