// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MESSAGE HANDLERS                                   ║
// ║  WebSocket message handling and routing                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::sync::Arc;
use tokio::sync::RwLock;

use crate::websocket::{
    encryption::MessageEncryption, rate_limit::RateLimiter, session::SessionManager, types::*,
};

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
) -> Result<Option<WebSocketMessage>, String> {
    // Check rate limit
    {
        let mut rate_limiter = ctx.rate_limiter.write().await;
        if !rate_limiter.check_rate_limit(&session_id) {
            return Err("Rate limit exceeded".to_string());
        }
    }

    // Route message based on type
    match message.message_type {
        MessageType::Authenticate => handle_authenticate(ctx, session_id, message).await,
        MessageType::AgentMessage => handle_agent_message(ctx, session_id, message).await,
        MessageType::TypingIndicator => handle_typing_indicator(ctx, session_id, message).await,
        MessageType::PresenceUpdate => handle_presence_update(ctx, session_id, message).await,
        MessageType::Ping => handle_ping(message).await,
        _ => Err(format!(
            "Unsupported message type: {:?}",
            message.message_type
        )),
    }
}

/// Handle authentication message
async fn handle_authenticate(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> Result<Option<WebSocketMessage>, String> {
    // Parse authentication request
    let auth_req: AuthRequest = serde_json::from_value(message.payload)
        .map_err(|e| format!("Invalid auth request: {}", e))?;

    // TODO: Validate JWT token
    // For now, accept any token and extract user_id
    let user_id = extract_user_id_from_token(&auth_req.token)?;

    // Authenticate session
    {
        let mut sessions = ctx.sessions.write().await;
        sessions.authenticate_session(&session_id, user_id.clone())?;
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
        serde_json::to_value(response).unwrap(),
    )))
}

/// Handle agent message
async fn handle_agent_message(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> Result<Option<WebSocketMessage>, String> {
    // Verify session is authenticated
    {
        let sessions = ctx.sessions.read().await;
        let session = sessions
            .get_session(&session_id)
            .ok_or("Session not found")?;

        if session.user_id.is_none() {
            return Err("Unauthorized: authentication required".to_string());
        }
    }

    // Parse agent message
    let agent_msg: AgentMessage = serde_json::from_value(message.payload)
        .map_err(|e| format!("Invalid agent message: {}", e))?;

    // TODO: Route to appropriate agent and get response
    // For now, echo back a simple response
    let response = AgentResponse {
        agent_id: agent_msg.agent_id.clone(),
        content: format!("Echo from {}: {}", agent_msg.agent_id, agent_msg.content),
        metadata: agent_msg.metadata,
        message_id: message.message_id.clone(),
        is_streaming: false,
        is_complete: true,
    };

    Ok(Some(WebSocketMessage::new(
        MessageType::AgentResponse,
        serde_json::to_value(response).unwrap(),
    )))
}

/// Handle typing indicator
async fn handle_typing_indicator(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> Result<Option<WebSocketMessage>, String> {
    // Verify session is authenticated
    {
        let sessions = ctx.sessions.read().await;
        let session = sessions
            .get_session(&session_id)
            .ok_or("Session not found")?;

        if session.user_id.is_none() {
            return Err("Unauthorized: authentication required".to_string());
        }
    }

    // Parse typing indicator
    let _typing: TypingIndicator = serde_json::from_value(message.payload)
        .map_err(|e| format!("Invalid typing indicator: {}", e))?;

    // TODO: Broadcast to relevant sessions
    // For now, just acknowledge
    Ok(None)
}

/// Handle presence update
async fn handle_presence_update(
    ctx: &HandlerContext,
    session_id: String,
    message: WebSocketMessage,
) -> Result<Option<WebSocketMessage>, String> {
    // Parse presence update
    let presence: PresenceUpdate = serde_json::from_value(message.payload)
        .map_err(|e| format!("Invalid presence update: {}", e))?;

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
async fn handle_ping(message: WebSocketMessage) -> Result<Option<WebSocketMessage>, String> {
    Ok(Some(WebSocketMessage::new(
        MessageType::Pong,
        message.payload,
    )))
}

/// Extract user ID from JWT token
/// TODO: Implement proper JWT validation
fn extract_user_id_from_token(token: &str) -> Result<String, String> {
    // Temporary implementation - accept demo tokens
    if token.starts_with("demo_") {
        Ok(token.to_string())
    } else {
        // In production, validate JWT and extract user_id
        Ok("user_placeholder".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_user_id_demo_token() {
        let result = extract_user_id_from_token("demo_user123");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "demo_user123");
    }

    #[test]
    fn test_extract_user_id_regular_token() {
        let result = extract_user_id_from_token("regular_token");
        assert!(result.is_ok());
        // Returns placeholder for now
        assert_eq!(result.unwrap(), "user_placeholder");
    }

    #[tokio::test]
    async fn test_handle_ping() {
        let message =
            WebSocketMessage::new(MessageType::Ping, serde_json::json!({"timestamp": 123456}));

        let result = handle_ping(message).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.is_some());
        assert_eq!(response.unwrap().message_type, MessageType::Pong);
    }

    #[tokio::test]
    async fn test_handle_authenticate() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(10, 5)));

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Add session first
        let session = {
            let mut mgr = sessions.write().await;
            mgr.add_session(std::net::SocketAddr::from(([127, 0, 0, 1], 8080)))
                .unwrap()
        };

        let auth_req = AuthRequest {
            token: "demo_user123".to_string(),
        };

        let message = WebSocketMessage::new(
            MessageType::Authenticate,
            serde_json::to_value(auth_req).unwrap(),
        );

        let result = handle_authenticate(&ctx, session.id.clone(), message).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.is_some());

        let auth_response: AuthResponse =
            serde_json::from_value(response.unwrap().payload).unwrap();
        assert!(auth_response.success);
        assert_eq!(auth_response.user_id, Some("demo_user123".to_string()));
    }
}
