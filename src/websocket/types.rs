// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET TYPES                                    ║
// ║  Message types and data structures for WebSocket communication           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::error::{WebSocketError, WsResult};
use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use ts_rs::TS;

/// WebSocket message envelope
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WebSocketMessage {
    /// Message type
    pub message_type: MessageType,
    /// Message payload (raw JSON data)
    #[ts(type = "any")]
    pub payload: serde_json::Value,
    /// Message timestamp
    pub timestamp: u64,
    /// Message ID
    pub message_id: String,
    /// Session ID
    pub session_id: Option<String>,
}

impl WebSocketMessage {
    /// Create new WebSocket message
    ///
    /// # Errors
    /// Returns WebSocketError::Internal if system time is before UNIX epoch (should never happen)
    pub fn new(message_type: MessageType, payload: serde_json::Value) -> WsResult<Self> {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| WebSocketError::Internal(format!("System time error: {}", e)))?
            .as_secs();

        Ok(Self {
            message_type,
            payload,
            timestamp,
            message_id: uuid::Uuid::new_v4().to_string(),
            session_id: None,
        })
    }

    /// Set session ID
    pub fn with_session(mut self, session_id: String) -> Self {
        self.session_id = Some(session_id);
        self
    }
}

/// Message types for WebSocket communication
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum MessageType {
    /// Authentication request
    Authenticate,
    /// Authentication response
    AuthResponse,
    /// Agent message
    AgentMessage,
    /// Agent response
    AgentResponse,
    /// Typing indicator
    TypingIndicator,
    /// Presence update
    PresenceUpdate,
    /// System message
    SystemMessage,
    /// Error message
    Error,
    /// Ping
    Ping,
    /// Pong
    Pong,
}

///// Agent message structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AgentMessage {
    /// Agent ID (e.g., "ACE", "ELF", "IHSAN")
    pub agent_id: String,
    /// Message content
    pub content: String,
    /// Message metadata
    #[ts(type = "any")]
    pub metadata: Option<serde_json::Value>,
    /// Parent message ID (for threading)
    pub parent_id: Option<String>,
}

/// Agent response structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AgentResponse {
    /// Agent ID
    pub agent_id: String,
    /// Response content
    pub content: String,
    /// Response metadata
    #[ts(type = "any")]
    pub metadata: Option<serde_json::Value>,
    /// Original message ID
    pub message_id: String,
    /// Streaming indicator
    pub is_streaming: bool,
    /// Stream completion indicator
    pub is_complete: bool,
}

/// Typing indicator
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TypingIndicator {
    /// User ID or agent ID
    pub actor_id: String,
    /// Whether currently typing
    pub is_typing: bool,
}

/// Presence update
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PresenceUpdate {
    /// User ID
    pub user_id: String,
    /// Presence status
    pub status: PresenceStatus,
    /// Last activity timestamp
    pub last_activity: u64,
}

/// Presence status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum PresenceStatus {
    /// User is online
    Online,
    /// User is away
    Away,
    /// User is offline
    Offline,
}

/// Authentication request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AuthRequest {
    /// JWT token
    pub token: String,
}

/// Authentication response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AuthResponse {
    /// Whether authentication succeeded
    pub success: bool,
    /// User ID if successful
    pub user_id: Option<String>,
    /// Error message if failed
    pub error: Option<String>,
    /// Session ID
    pub session_id: Option<String>,
}

/// Error message
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ErrorMessage {
    /// Error code
    pub code: String,
    /// Error message
    pub message: String,
    /// Additional context
    #[ts(type = "any")]
    pub context: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_websocket_message_creation() {
        let msg = WebSocketMessage::new(
            MessageType::AgentMessage,
            serde_json::json!({"test": "data"}),
        )
        .expect("Failed to create WebSocket message");
        assert_eq!(msg.message_type, MessageType::AgentMessage);
        assert!(msg.timestamp > 0);
        assert!(!msg.message_id.is_empty());
        assert!(msg.session_id.is_none());
    }

    #[test]
    fn test_websocket_message_with_session() {
        let msg = WebSocketMessage::new(
            MessageType::AgentMessage,
            serde_json::json!({"test": "data"}),
        )
        .expect("Failed to create WebSocket message")
        .with_session("test-session-123".to_string());

        assert_eq!(msg.session_id, Some("test-session-123".to_string()));
    }

    #[test]
    fn test_agent_message_serialization() {
        let msg = AgentMessage {
            agent_id: "ACE".to_string(),
            content: "Test message".to_string(),
            metadata: Some(serde_json::json!({"priority": "high"})),
            parent_id: None,
        };

        let json = serde_json::to_string(&msg).expect("Failed to serialize message");
        let deserialized: AgentMessage =
            serde_json::from_str(&json).expect("Failed to deserialize message");
        assert_eq!(deserialized.agent_id, "ACE");
        assert_eq!(deserialized.content, "Test message");
    }

    #[test]
    fn test_presence_status() {
        let presence = PresenceUpdate {
            user_id: "user123".to_string(),
            status: PresenceStatus::Online,
            last_activity: 1234567890,
        };

        assert_eq!(presence.status, PresenceStatus::Online);
        assert_eq!(presence.user_id, "user123");
    }
}
