// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET TESTS                                     ║
// ║  Comprehensive tests for WebSocket handlers, sessions, and message flow   ║
// ║  Professional Elite Test Infrastructure                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod handler_tests;
pub mod session_tests;
pub mod rate_limit_tests;
pub mod integration_tests;

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Test Utilities
// ═══════════════════════════════════════════════════════════════════════════

/// Create test socket address
pub fn create_test_addr(port: u16) -> SocketAddr {
    SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port)
}

/// Create test socket address with custom IP
pub fn create_test_addr_with_ip(ip: [u8; 4], port: u16) -> SocketAddr {
    SocketAddr::new(IpAddr::V4(Ipv4Addr::new(ip[0], ip[1], ip[2], ip[3])), port)
}

/// Generate unique session ID for tests
pub fn generate_test_session_id() -> String {
    format!("test-session-{}", uuid::Uuid::new_v4())
}

/// Generate unique user ID for tests
pub fn generate_test_user_id() -> String {
    format!("test-user-{}", uuid::Uuid::new_v4())
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Message Builders
// ═══════════════════════════════════════════════════════════════════════════

use bizra_genesis_node::websocket::types::*;

/// Create test authentication request
pub fn create_auth_request(token: &str) -> WebSocketMessage {
    let auth_req = AuthRequest {
        token: token.to_string(),
    };

    WebSocketMessage::new(
        MessageType::Authenticate,
        serde_json::to_value(auth_req).unwrap(),
    )
}

/// Create test agent message
pub fn create_agent_message(agent_id: &str, content: &str) -> WebSocketMessage {
    let agent_msg = AgentMessage {
        agent_id: agent_id.to_string(),
        content: content.to_string(),
        metadata: None,
        parent_id: None,
    };

    WebSocketMessage::new(
        MessageType::AgentMessage,
        serde_json::to_value(agent_msg).unwrap(),
    )
}

/// Create test agent message with metadata
pub fn create_agent_message_with_metadata(
    agent_id: &str,
    content: &str,
    metadata: serde_json::Value,
) -> WebSocketMessage {
    let agent_msg = AgentMessage {
        agent_id: agent_id.to_string(),
        content: content.to_string(),
        metadata: Some(metadata),
        parent_id: None,
    };

    WebSocketMessage::new(
        MessageType::AgentMessage,
        serde_json::to_value(agent_msg).unwrap(),
    )
}

/// Create test ping message
pub fn create_ping_message() -> WebSocketMessage {
    WebSocketMessage::new(
        MessageType::Ping,
        serde_json::json!({"timestamp": chrono::Utc::now().timestamp()}),
    )
}

/// Create test presence update
pub fn create_presence_update(user_id: &str, status: PresenceStatus) -> WebSocketMessage {
    let presence = PresenceUpdate {
        user_id: user_id.to_string(),
        status,
        last_activity: chrono::Utc::now().timestamp() as u64,
    };

    WebSocketMessage::new(
        MessageType::PresenceUpdate,
        serde_json::to_value(presence).unwrap(),
    )
}

/// Create test typing indicator
pub fn create_typing_indicator(actor_id: &str, is_typing: bool) -> WebSocketMessage {
    let typing = TypingIndicator {
        actor_id: actor_id.to_string(),
        is_typing,
    };

    WebSocketMessage::new(
        MessageType::TypingIndicator,
        serde_json::to_value(typing).unwrap(),
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Response Validators
// ═══════════════════════════════════════════════════════════════════════════

/// Validate authentication response
pub fn validate_auth_response(message: &WebSocketMessage) -> bool {
    if message.message_type != MessageType::AuthResponse {
        return false;
    }

    let response: Result<AuthResponse, _> = serde_json::from_value(message.payload.clone());
    response.is_ok()
}

/// Extract auth response from message
pub fn extract_auth_response(message: &WebSocketMessage) -> Option<AuthResponse> {
    if message.message_type != MessageType::AuthResponse {
        return None;
    }

    serde_json::from_value(message.payload.clone()).ok()
}

/// Validate agent response
pub fn validate_agent_response(message: &WebSocketMessage) -> bool {
    if message.message_type != MessageType::AgentResponse {
        return false;
    }

    let response: Result<AgentResponse, _> = serde_json::from_value(message.payload.clone());
    response.is_ok()
}

/// Extract agent response from message
pub fn extract_agent_response(message: &WebSocketMessage) -> Option<AgentResponse> {
    if message.message_type != MessageType::AgentResponse {
        return None;
    }

    serde_json::from_value(message.payload.clone()).ok()
}

// ═══════════════════════════════════════════════════════════════════════════
// Assertion Helpers
// ═══════════════════════════════════════════════════════════════════════════

/// Assert message has expected type
pub fn assert_message_type(message: &WebSocketMessage, expected: MessageType) {
    assert_eq!(
        message.message_type, expected,
        "Expected message type {:?}, got {:?}",
        expected, message.message_type
    );
}

/// Assert response indicates success
pub fn assert_auth_success(message: &WebSocketMessage) {
    let response = extract_auth_response(message)
        .expect("Expected valid auth response");

    assert!(response.success, "Expected successful authentication");
    assert!(response.error.is_none(), "Expected no error");
    assert!(response.user_id.is_some(), "Expected user_id to be set");
}

/// Assert response indicates failure
pub fn assert_auth_failure(message: &WebSocketMessage, expected_error: Option<&str>) {
    let response = extract_auth_response(message)
        .expect("Expected valid auth response");

    assert!(!response.success, "Expected failed authentication");

    if let Some(expected) = expected_error {
        assert!(
            response.error.as_ref().map(|e| e.contains(expected)).unwrap_or(false),
            "Expected error containing '{}', got {:?}",
            expected,
            response.error
        );
    }
}

/// Assert message timestamp is recent (within N seconds)
pub fn assert_recent_timestamp(message: &WebSocketMessage, max_age_secs: u64) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let age = now.saturating_sub(message.timestamp);
    assert!(
        age <= max_age_secs,
        "Message timestamp too old: {} seconds ago (max: {})",
        age,
        max_age_secs
    );
}
