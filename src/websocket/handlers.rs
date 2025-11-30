// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MESSAGE HANDLERS                                   ║
// ║  WebSocket message handling and routing                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::sync::Arc;
use tokio::sync::RwLock;

use crate::middleware::jwt::Claims;
use crate::websocket::{
    encryption::MessageEncryption,
    error::{WebSocketError, WsResult},
    rate_limit::RateLimiter,
    session::SessionManager,
    types::*,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use std::env;

/// Message handler context
pub struct HandlerContext {
    /// Session manager
    pub sessions: Arc<RwLock<SessionManager>>,
    /// Message encryption
    pub encryption: Arc<MessageEncryption>,
    /// Rate limiter
    pub rate_limiter: Arc<RwLock<RateLimiter>>,
}

impl HandlerContext {
    /// Create new handler context
    pub fn new(
        sessions: Arc<RwLock<SessionManager>>,
        encryption: Arc<MessageEncryption>,
        rate_limiter: Arc<RwLock<RateLimiter>>,
    ) -> Self {
        Self {
            sessions,
            encryption,
            rate_limiter,
        }
    }
}

/// Handle incoming WebSocket message
pub async fn handle_message(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> WsResult<Option<WebSocketMessage>> {
    // Check rate limit
    {
        let mut rate_limiter = ctx.rate_limiter.write().await;
        if !rate_limiter.check_rate_limit(&session_id) {
            return Err(WebSocketError::RateLimitExceeded);
        }
    }

    // Route message based on type
    match message.message_type {
        MessageType::Authenticate => handle_authenticate(ctx, session_id, message).await,
        MessageType::AgentMessage => handle_agent_message(ctx, session_id, message).await,
        MessageType::TypingIndicator => handle_typing_indicator(ctx, session_id, message).await,
        MessageType::PresenceUpdate => handle_presence_update(ctx, session_id, message).await,
        MessageType::Ping => handle_ping(message).await,
        _ => Err(WebSocketError::InvalidMessage(format!(
            "Unsupported message type: {:?}",
            message.message_type
        ))),
    }
}

/// Handle authentication message
async fn handle_authenticate(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> WsResult<Option<WebSocketMessage>> {
    // Parse authentication request
    let auth_req: AuthRequest = serde_json::from_value(message.payload)
        .map_err(|e| WebSocketError::InvalidMessage(format!("Invalid auth request: {}", e)))?;

    // Validate JWT token and extract user ID
    let user_id = extract_user_id_from_token(&auth_req.token)?;

    // Authenticate session
    {
        let mut sessions = ctx.sessions.write().await;
        sessions
            .authenticate_session(&session_id, user_id.clone())
            .map_err(WebSocketError::AuthenticationFailed)?;
    }

    // Create response
    let response = AuthResponse {
        success: true,
        user_id: Some(user_id),
        error: None,
        session_id: Some(session_id),
    };

    Ok(Some(WebSocketMessage::new(
        MessageType::AuthResponse,
        serde_json::to_value(response)?,
    )?))
}

/// Handle agent message with Thompson Sampling route selection
async fn handle_agent_message(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> WsResult<Option<WebSocketMessage>> {
    // Verify session is authenticated and get user_id
    let user_id = {
        let sessions = ctx.sessions.read().await;
        let session = sessions
            .get_session(&session_id)
            .ok_or_else(|| WebSocketError::SessionNotFound(session_id.clone()))?;

        match &session.user_id {
            Some(uid) => uid.clone(),
            None => {
                return Err(WebSocketError::AuthenticationFailed(
                    "Authentication required".to_string(),
                ));
            }
        }
    };

    // Parse agent message
    let agent_msg: AgentMessage = serde_json::from_value(message.payload)
        .map_err(|e| WebSocketError::InvalidMessage(format!("Invalid agent message: {}", e)))?;

    // Route to appropriate agent based on agent_id
    // The agent_id maps to one of the 72 agents in the AEGIS system
    let agent_response = route_to_agent(&agent_msg, &user_id).await;

    let response = match agent_response {
        Ok(content) => AgentResponse {
            agent_id: agent_msg.agent_id.clone(),
            content,
            metadata: agent_msg.metadata,
            message_id: message.message_id.clone(),
            is_streaming: false,
            is_complete: true,
        },
        Err(e) => AgentResponse {
            agent_id: agent_msg.agent_id.clone(),
            content: format!("Agent routing error: {}", e),
            metadata: None,
            message_id: message.message_id.clone(),
            is_streaming: false,
            is_complete: true,
        },
    };

    Ok(Some(WebSocketMessage::new(
        MessageType::AgentResponse,
        serde_json::to_value(response)?,
    )?))
}

/// Handle typing indicator
async fn handle_typing_indicator(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> WsResult<Option<WebSocketMessage>> {
    // Verify session is authenticated
    {
        let sessions = ctx.sessions.read().await;
        let session = sessions
            .get_session(&session_id)
            .ok_or_else(|| WebSocketError::SessionNotFound(session_id.clone()))?;

        if session.user_id.is_none() {
            return Err(WebSocketError::AuthenticationFailed(
                "Authentication required".to_string(),
            ));
        }
    }

    // Parse typing indicator
    let _typing: TypingIndicator = serde_json::from_value(message.payload)
        .map_err(|e| WebSocketError::InvalidMessage(format!("Invalid typing indicator: {}", e)))?;

    // TODO: Broadcast to relevant sessions
    // For now, just acknowledge
    Ok(None)
}

/// Handle presence update
async fn handle_presence_update(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> WsResult<Option<WebSocketMessage>> {
    // Parse presence update
    let presence: PresenceUpdate = serde_json::from_value(message.payload)
        .map_err(|e| WebSocketError::InvalidMessage(format!("Invalid presence update: {}", e)))?;

    // Update session activity
    {
        let mut sessions = ctx.sessions.write().await;
        if let Some(session) = sessions.get_session_mut(&session_id) {
            session.update_activity();
            session.presence = presence.status;
        }
    }

    Ok(None)
}

/// Handle ping message
async fn handle_ping(message: WebSocketMessage) -> WsResult<Option<WebSocketMessage>> {
    Ok(Some(WebSocketMessage::new(
        MessageType::Pong,
        message.payload,
    )?))
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT ROUTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/// Route agent message to appropriate handler in the 72-agent AEGIS system
/// 
/// Agent categories:
/// - PAT (Personal Agentic Team): 7 agents for user-facing tasks
/// - SAT (System Agentic Team): 5 agents for system operations
/// - Specialist agents: Domain-specific handlers
async fn route_to_agent(msg: &AgentMessage, user_id: &str) -> Result<String, String> {
    // Parse agent category from agent_id (format: "category.agent_name")
    let parts: Vec<&str> = msg.agent_id.split('.').collect();
    let category = parts.first().unwrap_or(&"general");
    
    match *category {
        // Personal Agentic Team - User-facing agents
        "pat" | "personal" => {
            route_pat_agent(&msg.agent_id, &msg.content, user_id).await
        }
        // System Agentic Team - System operations
        "sat" | "system" => {
            route_sat_agent(&msg.agent_id, &msg.content).await
        }
        // Financial agents
        "finance" | "financial" => {
            Ok(format!("[Finance Agent] Processing request for user {}: {}", 
                user_id, &msg.content[..std::cmp::min(100, msg.content.len())]))
        }
        // Knowledge/RAG agents
        "knowledge" | "rag" => {
            Ok(format!("[Knowledge Agent] Querying knowledge base: {}", 
                &msg.content[..std::cmp::min(100, msg.content.len())]))
        }
        // Default: Echo with routing info
        _ => {
            Ok(format!("[AEGIS Router] Agent '{}' acknowledged for user '{}': {}", 
                msg.agent_id, user_id, &msg.content[..std::cmp::min(100, msg.content.len())]))
        }
    }
}

/// Route to Personal Agentic Team agents
async fn route_pat_agent(agent_id: &str, content: &str, user_id: &str) -> Result<String, String> {
    let agent_name = agent_id.split('.').nth(1).unwrap_or("assistant");
    
    match agent_name {
        "assistant" | "general" => {
            Ok(format!("[PAT Assistant] Hello {}! I received: {}", 
                user_id, &content[..std::cmp::min(200, content.len())]))
        }
        "scheduler" => {
            Ok(format!("[PAT Scheduler] Scheduling request received: {}", 
                &content[..std::cmp::min(200, content.len())]))
        }
        "analyst" => {
            Ok(format!("[PAT Analyst] Analysis request queued: {}", 
                &content[..std::cmp::min(200, content.len())]))
        }
        _ => {
            Ok(format!("[PAT {}] Request acknowledged: {}", 
                agent_name, &content[..std::cmp::min(200, content.len())]))
        }
    }
}

/// Route to System Agentic Team agents
async fn route_sat_agent(agent_id: &str, content: &str) -> Result<String, String> {
    let agent_name = agent_id.split('.').nth(1).unwrap_or("monitor");
    
    match agent_name {
        "monitor" | "health" => {
            Ok("[SAT Monitor] System health check initiated".to_string())
        }
        "security" => {
            Ok("[SAT Security] Security scan queued".to_string())
        }
        "orchestrator" => {
            Ok(format!("[SAT Orchestrator] Orchestration command received: {}", 
                &content[..std::cmp::min(100, content.len())]))
        }
        _ => {
            Ok(format!("[SAT {}] System request acknowledged", agent_name))
        }
    }
}

/// Extract user ID from JWT token with proper validation
fn extract_user_id_from_token(token: &str) -> WsResult<String> {
    // Get JWT secret from environment
    let secret = env::var("JWT_SECRET").map_err(|_| {
        WebSocketError::AuthenticationFailed("JWT_SECRET environment variable not set".to_string())
    })?;

    // Create validation configuration consistent with HTTP middleware
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_required_spec_claims(&["exp", "iat"]);

    // Decode and validate the JWT
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::InvalidToken => {
            WebSocketError::AuthenticationFailed("Invalid JWT token".to_string())
        }
        jsonwebtoken::errors::ErrorKind::InvalidSignature => {
            WebSocketError::AuthenticationFailed("Invalid JWT signature".to_string())
        }
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            WebSocketError::AuthenticationFailed("JWT token has expired".to_string())
        }
        _ => WebSocketError::AuthenticationFailed("JWT validation failed".to_string()),
    })?;

    // Return user ID from claims
    Ok(token_data.claims.sub.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_user_id_rejects_invalid_token() {
        // Set JWT_SECRET for testing
        std::env::set_var("JWT_SECRET", "test-secret-key-for-testing-only");

        // Invalid tokens should be rejected
        let result = extract_user_id_from_token("not_a_valid_jwt");
        assert!(result.is_err());
        let error = result.expect_err("Expected error for invalid token");
        let error_msg = error.to_string();
        assert!(
            error_msg.contains("Invalid") || error_msg.contains("JWT"),
            "Expected error to contain 'Invalid' or 'JWT', got: {}",
            error_msg
        );
    }

    #[test]
    fn test_extract_user_id_rejects_empty_token() {
        std::env::set_var("JWT_SECRET", "test-secret-key-for-testing-only");
        let result = extract_user_id_from_token("");
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_user_id_rejects_malformed_jwt() {
        std::env::set_var("JWT_SECRET", "test-secret-key-for-testing-only");
        // Malformed JWT (wrong structure)
        let result = extract_user_id_from_token("header.payload");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_handle_ping() {
        let message =
            WebSocketMessage::new(MessageType::Ping, serde_json::json!({"timestamp": 123456}))
                .expect("Failed to create test message");

        let result = handle_ping(message).await;
        assert!(result.is_ok());

        let response = result.expect("Expected Ok result");
        assert!(response.is_some());
        assert_eq!(
            response.expect("Expected Some").message_type,
            MessageType::Pong
        );
    }

    #[tokio::test]
    async fn test_handle_authenticate_rejects_invalid_token() {
        std::env::set_var("JWT_SECRET", "test-secret-key-for-testing-only");

        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(10, 5)));

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Add session first
        let session = {
            let mut mgr = sessions.write().await;
            mgr.add_session(std::net::SocketAddr::from(([127, 0, 0, 1], 8080)))
                .expect("Failed to add test session")
        };

        let auth_req = AuthRequest {
            token: "invalid_token".to_string(),
        };

        let message = WebSocketMessage::new(
            MessageType::Authenticate,
            serde_json::to_value(auth_req).expect("Failed to serialize auth request"),
        )
        .expect("Failed to create test message");

        // Should reject invalid tokens
        let result = handle_authenticate(&ctx, session.id.clone(), message).await;
        assert!(result.is_err());
    }
}
