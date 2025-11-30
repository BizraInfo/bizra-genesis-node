// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET HANDLER TESTS                             ║
// ║  Comprehensive tests for message handling and routing                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::*;
use bizra_genesis_node::websocket::{
    encryption::MessageEncryption,
    handlers::{handle_message, HandlerContext},
    rate_limit::RateLimiter,
    session::SessionManager,
    types::*,
};
use std::sync::Arc;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════

/// Create test handler context with session
async fn create_test_context_with_session() -> (HandlerContext, String) {
    let sessions = Arc::new(RwLock::new(SessionManager::new()));
    let encryption = Arc::new(MessageEncryption::new());
    let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

    // Add a test session
    let session = {
        let mut mgr = sessions.write().await;
        mgr.add_session(create_test_addr(8080)).unwrap()
    };

    let ctx = HandlerContext::new(sessions, encryption, rate_limiter);
    (ctx, session.id)
}

/// Create test handler context with authenticated session
async fn create_test_context_with_auth_session() -> (HandlerContext, String) {
    let sessions = Arc::new(RwLock::new(SessionManager::new()));
    let encryption = Arc::new(MessageEncryption::new());
    let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

    // Add and authenticate a test session
    let session_id = {
        let mut mgr = sessions.write().await;
        let session = mgr.add_session(create_test_addr(8080)).unwrap();
        mgr.authenticate_session(&session.id, "test_user".to_string()).unwrap();
        session.id
    };

    let ctx = HandlerContext::new(sessions, encryption, rate_limiter);
    (ctx, session_id)
}

/// Create test handler context with rate-limited settings
async fn create_rate_limited_context() -> (HandlerContext, String) {
    let sessions = Arc::new(RwLock::new(SessionManager::new()));
    let encryption = Arc::new(MessageEncryption::new());
    let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(3, 1))); // Only 3 messages allowed

    let session = {
        let mut mgr = sessions.write().await;
        mgr.add_session(create_test_addr(8080)).unwrap()
    };

    let ctx = HandlerContext::new(sessions, encryption, rate_limiter);
    (ctx, session.id)
}

// ═══════════════════════════════════════════════════════════════════════════
// Ping/Pong Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod ping_pong_tests {
    use super::*;

    #[tokio::test]
    async fn test_ping_returns_pong() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let ping = create_ping_message();
        let result = handle_message(&ctx, session_id, ping).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.is_some());
        assert_message_type(&response.unwrap(), MessageType::Pong);
    }

    #[tokio::test]
    async fn test_pong_preserves_payload() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let timestamp = chrono::Utc::now().timestamp();
        let ping = WebSocketMessage::new(
            MessageType::Ping,
            serde_json::json!({"timestamp": timestamp, "custom_data": "test"}),
        );

        let result = handle_message(&ctx, session_id, ping).await;
        let response = result.unwrap().unwrap();

        assert_eq!(response.payload["timestamp"], timestamp);
        assert_eq!(response.payload["custom_data"], "test");
    }

    #[tokio::test]
    async fn test_ping_with_empty_payload() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let ping = WebSocketMessage::new(MessageType::Ping, serde_json::json!({}));
        let result = handle_message(&ctx, session_id, ping).await;

        assert!(result.is_ok());
        let response = result.unwrap().unwrap();
        assert_message_type(&response, MessageType::Pong);
    }

    #[tokio::test]
    async fn test_ping_response_is_fresh() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let ping = create_ping_message();
        let result = handle_message(&ctx, session_id, ping).await;
        let response = result.unwrap().unwrap();

        assert_recent_timestamp(&response, 5);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod authentication_tests {
    use super::*;

    #[tokio::test]
    async fn test_authenticate_with_demo_token() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let auth_msg = create_auth_request("demo_user123");
        let result = handle_message(&ctx, session_id, auth_msg).await;

        assert!(result.is_ok());
        let response = result.unwrap().unwrap();

        assert_message_type(&response, MessageType::AuthResponse);
        assert_auth_success(&response);

        let auth_response = extract_auth_response(&response).unwrap();
        assert_eq!(auth_response.user_id, Some("demo_user123".to_string()));
    }

    #[tokio::test]
    async fn test_authenticate_with_regular_token() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let auth_msg = create_auth_request("jwt.token.here");
        let result = handle_message(&ctx, session_id, auth_msg).await;

        assert!(result.is_ok());
        let response = result.unwrap().unwrap();
        assert_auth_success(&response);
    }

    #[tokio::test]
    async fn test_authenticate_returns_session_id() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let auth_msg = create_auth_request("demo_test");
        let result = handle_message(&ctx, session_id.clone(), auth_msg).await;

        let auth_response = extract_auth_response(&result.unwrap().unwrap()).unwrap();
        assert_eq!(auth_response.session_id, Some(session_id));
    }

    #[tokio::test]
    async fn test_authenticate_invalid_payload() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // Invalid auth request (missing token field)
        let invalid_msg = WebSocketMessage::new(
            MessageType::Authenticate,
            serde_json::json!({"invalid": "payload"}),
        );

        let result = handle_message(&ctx, session_id, invalid_msg).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid auth request"));
    }

    #[tokio::test]
    async fn test_authenticate_nonexistent_session() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        let auth_msg = create_auth_request("demo_test");
        let result = handle_message(&ctx, "nonexistent-session".to_string(), auth_msg).await;

        // Should fail because session doesn't exist
        // Rate limiter will create entry, but session authentication will fail
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_authenticate_updates_session() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        let auth_msg = create_auth_request("demo_authenticated_user");
        handle_message(&ctx, session_id.clone(), auth_msg).await.unwrap();

        // Verify session was updated
        let mgr = sessions.read().await;
        let session = mgr.get_session(&session_id).unwrap();
        assert_eq!(session.user_id, Some("demo_authenticated_user".to_string()));
    }

    #[tokio::test]
    async fn test_re_authentication() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // First authentication
        let auth1 = create_auth_request("demo_user1");
        handle_message(&ctx, session_id.clone(), auth1).await.unwrap();

        // Second authentication (re-auth as different user)
        let auth2 = create_auth_request("demo_user2");
        let result = handle_message(&ctx, session_id, auth2).await;

        // Should succeed and update the user
        assert!(result.is_ok());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent Message Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod agent_message_tests {
    use super::*;

    #[tokio::test]
    async fn test_agent_message_requires_auth() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let msg = create_agent_message("ACE", "Hello agent");
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unauthorized"));
    }

    #[tokio::test]
    async fn test_agent_message_authenticated() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let msg = create_agent_message("ACE", "Hello agent");
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
        let response = result.unwrap().unwrap();
        assert_message_type(&response, MessageType::AgentResponse);
    }

    #[tokio::test]
    async fn test_agent_message_response_structure() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let msg = create_agent_message("PLANNER", "Create a plan");
        let result = handle_message(&ctx, session_id, msg.clone()).await;

        let response = result.unwrap().unwrap();
        let agent_response = extract_agent_response(&response).unwrap();

        assert_eq!(agent_response.agent_id, "PLANNER");
        assert_eq!(agent_response.message_id, msg.message_id);
        assert!(agent_response.is_complete);
        assert!(!agent_response.is_streaming);
    }

    #[tokio::test]
    async fn test_agent_message_with_metadata() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let metadata = serde_json::json!({
            "priority": "high",
            "tags": ["urgent", "review"]
        });

        let msg = create_agent_message_with_metadata("REVIEWER", "Review this", metadata.clone());
        let result = handle_message(&ctx, session_id, msg).await;

        let response = result.unwrap().unwrap();
        let agent_response = extract_agent_response(&response).unwrap();

        assert!(agent_response.metadata.is_some());
    }

    #[tokio::test]
    async fn test_agent_message_invalid_payload() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let invalid_msg = WebSocketMessage::new(
            MessageType::AgentMessage,
            serde_json::json!({"invalid": "structure"}),
        );

        let result = handle_message(&ctx, session_id, invalid_msg).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid agent message"));
    }

    #[tokio::test]
    async fn test_agent_message_echo_content() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let content = "This is a test message to the agent";
        let msg = create_agent_message("CODER", content);
        let result = handle_message(&ctx, session_id, msg).await;

        let response = result.unwrap().unwrap();
        let agent_response = extract_agent_response(&response).unwrap();

        // Current implementation echoes the content
        assert!(agent_response.content.contains(content));
        assert!(agent_response.content.contains("CODER"));
    }

    #[tokio::test]
    async fn test_agent_message_session_not_found() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        let msg = create_agent_message("ACE", "Hello");
        let result = handle_message(&ctx, "nonexistent".to_string(), msg).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Session not found"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Typing Indicator Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod typing_indicator_tests {
    use super::*;

    #[tokio::test]
    async fn test_typing_indicator_requires_auth() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let msg = create_typing_indicator("user123", true);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unauthorized"));
    }

    #[tokio::test]
    async fn test_typing_indicator_authenticated() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let msg = create_typing_indicator("user123", true);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
        // Typing indicator returns None (acknowledgment only)
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_typing_indicator_stop() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let msg = create_typing_indicator("user123", false);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_typing_indicator_invalid_payload() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let invalid_msg = WebSocketMessage::new(
            MessageType::TypingIndicator,
            serde_json::json!({"wrong": "format"}),
        );

        let result = handle_message(&ctx, session_id, invalid_msg).await;
        assert!(result.is_err());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Presence Update Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod presence_update_tests {
    use super::*;

    #[tokio::test]
    async fn test_presence_update_online() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let msg = create_presence_update("user123", PresenceStatus::Online);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_none()); // No response expected
    }

    #[tokio::test]
    async fn test_presence_update_away() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let msg = create_presence_update("user123", PresenceStatus::Away);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_presence_update_offline() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let msg = create_presence_update("user123", PresenceStatus::Offline);
        let result = handle_message(&ctx, session_id, msg).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_presence_update_modifies_session() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Update to Away status
        let msg = create_presence_update("user123", PresenceStatus::Away);
        handle_message(&ctx, session_id.clone(), msg).await.unwrap();

        // Verify session presence was updated
        let mgr = sessions.read().await;
        let session = mgr.get_session(&session_id).unwrap();
        assert_eq!(session.presence, PresenceStatus::Away);
    }

    #[tokio::test]
    async fn test_presence_update_invalid_payload() {
        let (ctx, session_id) = create_test_context_with_session().await;

        let invalid_msg = WebSocketMessage::new(
            MessageType::PresenceUpdate,
            serde_json::json!({"status": "invalid_status"}),
        );

        let result = handle_message(&ctx, session_id, invalid_msg).await;
        assert!(result.is_err());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiting Handler Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiting_tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_exceeded() {
        let (ctx, session_id) = create_rate_limited_context().await;

        // Send messages up to the limit
        for _ in 0..3 {
            let ping = create_ping_message();
            let result = handle_message(&ctx, session_id.clone(), ping).await;
            assert!(result.is_ok());
        }

        // Fourth message should be rate limited
        let ping = create_ping_message();
        let result = handle_message(&ctx, session_id, ping).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Rate limit exceeded"));
    }

    #[tokio::test]
    async fn test_rate_limit_per_session() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(2, 1)));

        // Add two sessions
        let session1 = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };
        let session2 = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8081)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        // Exhaust session1's limit
        for _ in 0..2 {
            let ping = create_ping_message();
            handle_message(&ctx, session1.clone(), ping).await.unwrap();
        }

        // Session1 is rate limited
        let ping = create_ping_message();
        let result1 = handle_message(&ctx, session1, ping).await;
        assert!(result1.is_err());

        // Session2 should still work
        let ping = create_ping_message();
        let result2 = handle_message(&ctx, session2, ping).await;
        assert!(result2.is_ok());
    }

    #[tokio::test]
    async fn test_rate_limit_applies_to_all_message_types() {
        let (ctx, session_id) = create_rate_limited_context().await;

        // Different message types all count against rate limit
        let ping = create_ping_message();
        handle_message(&ctx, session_id.clone(), ping).await.unwrap();

        let presence = create_presence_update("user", PresenceStatus::Online);
        handle_message(&ctx, session_id.clone(), presence).await.unwrap();

        let ping2 = create_ping_message();
        handle_message(&ctx, session_id.clone(), ping2).await.unwrap();

        // Fourth message is rate limited
        let ping3 = create_ping_message();
        let result = handle_message(&ctx, session_id, ping3).await;
        assert!(result.is_err());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Unsupported Message Type Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod unsupported_message_tests {
    use super::*;

    #[tokio::test]
    async fn test_unsupported_message_type_error() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // Error message type is not a valid input
        let msg = WebSocketMessage::new(
            MessageType::Error,
            serde_json::json!({"code": "test"}),
        );

        let result = handle_message(&ctx, session_id, msg).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported message type"));
    }

    #[tokio::test]
    async fn test_auth_response_as_input() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // AuthResponse is output only, not valid input
        let msg = WebSocketMessage::new(
            MessageType::AuthResponse,
            serde_json::json!({"success": true}),
        );

        let result = handle_message(&ctx, session_id, msg).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_agent_response_as_input() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // AgentResponse is output only
        let msg = WebSocketMessage::new(
            MessageType::AgentResponse,
            serde_json::json!({"agent_id": "test"}),
        );

        let result = handle_message(&ctx, session_id, msg).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_pong_as_input() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // Pong is output only (response to Ping)
        let msg = WebSocketMessage::new(
            MessageType::Pong,
            serde_json::json!({}),
        );

        let result = handle_message(&ctx, session_id, msg).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_system_message_as_input() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // SystemMessage is typically server-generated
        let msg = WebSocketMessage::new(
            MessageType::SystemMessage,
            serde_json::json!({"message": "test"}),
        );

        let result = handle_message(&ctx, session_id, msg).await;
        assert!(result.is_err());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Flow Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod message_flow_tests {
    use super::*;

    #[tokio::test]
    async fn test_complete_auth_and_agent_flow() {
        let (ctx, session_id) = create_test_context_with_session().await;

        // Step 1: Authenticate
        let auth = create_auth_request("demo_flow_user");
        let auth_result = handle_message(&ctx, session_id.clone(), auth).await;
        assert!(auth_result.is_ok());
        assert_auth_success(&auth_result.unwrap().unwrap());

        // Step 2: Send agent message
        let agent_msg = create_agent_message("PLANNER", "Create project plan");
        let agent_result = handle_message(&ctx, session_id.clone(), agent_msg).await;
        assert!(agent_result.is_ok());

        let response = agent_result.unwrap().unwrap();
        assert_message_type(&response, MessageType::AgentResponse);
    }

    #[tokio::test]
    async fn test_multiple_agent_messages_flow() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        let agents = vec!["PLANNER", "RESEARCHER", "CODER", "EVALUATOR"];

        for agent_id in agents {
            let msg = create_agent_message(agent_id, &format!("Message to {}", agent_id));
            let result = handle_message(&ctx, session_id.clone(), msg).await;

            assert!(result.is_ok());
            let response = result.unwrap().unwrap();
            let agent_response = extract_agent_response(&response).unwrap();
            assert_eq!(agent_response.agent_id, agent_id);
        }
    }

    #[tokio::test]
    async fn test_interleaved_message_types() {
        let (ctx, session_id) = create_test_context_with_auth_session().await;

        // Interleave different message types
        let ping = create_ping_message();
        handle_message(&ctx, session_id.clone(), ping).await.unwrap();

        let agent = create_agent_message("ACE", "Test");
        handle_message(&ctx, session_id.clone(), agent).await.unwrap();

        let presence = create_presence_update("user", PresenceStatus::Away);
        handle_message(&ctx, session_id.clone(), presence).await.unwrap();

        let typing = create_typing_indicator("user", true);
        handle_message(&ctx, session_id.clone(), typing).await.unwrap();

        let ping2 = create_ping_message();
        let result = handle_message(&ctx, session_id, ping2).await;
        assert!(result.is_ok());
    }
}
