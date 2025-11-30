// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET INTEGRATION TESTS                         ║
// ║  End-to-end tests for WebSocket system behavior                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::*;
use bizra_genesis_node::websocket::{
    encryption::MessageEncryption,
    handlers::{handle_message, HandlerContext},
    rate_limit::RateLimiter,
    session::SessionManager,
    types::*,
    WebSocketConfig, WebSocketState,
};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Full Lifecycle Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod lifecycle_tests {
    use super::*;

    /// Test complete user session lifecycle
    #[tokio::test]
    async fn test_complete_session_lifecycle() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        // 1. Client connects - new session created
        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption.clone(), rate_limiter.clone());

        // 2. Client sends ping - health check
        let ping = create_ping_message();
        let pong = handle_message(&ctx, session_id.clone(), ping).await.unwrap().unwrap();
        assert_message_type(&pong, MessageType::Pong);

        // 3. Client authenticates
        let auth = create_auth_request("demo_lifecycle_user");
        let auth_response = handle_message(&ctx, session_id.clone(), auth).await.unwrap().unwrap();
        assert_auth_success(&auth_response);

        // 4. Client sends agent message
        let agent_msg = create_agent_message("PLANNER", "Create a project plan");
        let agent_response = handle_message(&ctx, session_id.clone(), agent_msg).await.unwrap().unwrap();
        assert_message_type(&agent_response, MessageType::AgentResponse);

        // 5. Client updates presence
        let presence = create_presence_update("demo_lifecycle_user", PresenceStatus::Away);
        handle_message(&ctx, session_id.clone(), presence).await.unwrap();

        // 6. Verify session state
        let mgr = sessions.read().await;
        let session = mgr.get_session(&session_id).unwrap();
        assert_eq!(session.user_id, Some("demo_lifecycle_user".to_string()));
        assert_eq!(session.presence, PresenceStatus::Away);

        // 7. Client disconnects - cleanup
        drop(mgr);
        {
            let mut mgr = sessions.write().await;
            mgr.remove_session(&session_id);
        }

        let mgr = sessions.read().await;
        assert!(mgr.get_session(&session_id).is_none());
    }

    /// Test multiple users interacting simultaneously
    #[tokio::test]
    async fn test_multi_user_interaction() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Create 5 user sessions
        let mut session_ids = Vec::new();
        {
            let mut mgr = sessions.write().await;
            for i in 0..5 {
                let session = mgr.add_session(create_test_addr(8080 + i)).unwrap();
                session_ids.push(session.id);
            }
        }

        // Authenticate all users
        for (i, session_id) in session_ids.iter().enumerate() {
            let auth = create_auth_request(&format!("demo_user_{}", i));
            let response = handle_message(&ctx, session_id.clone(), auth).await.unwrap().unwrap();
            assert_auth_success(&response);
        }

        // All users send messages concurrently
        let mut handles = Vec::new();
        for (i, session_id) in session_ids.iter().enumerate() {
            let ctx_sessions = sessions.clone();
            let sid = session_id.clone();
            let user_num = i;

            handles.push(tokio::spawn(async move {
                let encryption = Arc::new(MessageEncryption::new());
                let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));
                let ctx = HandlerContext::new(ctx_sessions, encryption, rate_limiter);

                let msg = create_agent_message(
                    "CODER",
                    &format!("Message from user {}", user_num),
                );
                handle_message(&ctx, sid, msg).await
            }));
        }

        // All should succeed
        for handle in handles {
            let result = handle.await.unwrap();
            assert!(result.is_ok());
        }

        // Verify all sessions exist
        let mgr = sessions.read().await;
        assert_eq!(mgr.authenticated_session_count(), 5);
    }

    /// Test session reconnection scenario
    #[tokio::test]
    async fn test_session_reconnection() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        // First connection
        let session1_id = {
            let mut mgr = sessions.write().await;
            let session = mgr.add_session(create_test_addr(8080)).unwrap();
            mgr.authenticate_session(&session.id, "demo_reconnect_user".to_string()).unwrap();
            session.id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption.clone(), rate_limiter.clone());

        // User works on session 1
        let msg = create_agent_message("ACE", "First session work");
        handle_message(&ctx, session1_id.clone(), msg).await.unwrap();

        // Disconnect (simulate network issue)
        {
            let mut mgr = sessions.write().await;
            mgr.remove_session(&session1_id);
        }

        // Reconnect with new session
        let session2_id = {
            let mut mgr = sessions.write().await;
            let session = mgr.add_session(create_test_addr(8080)).unwrap();
            mgr.authenticate_session(&session.id, "demo_reconnect_user".to_string()).unwrap();
            session.id
        };

        // Continue work on new session
        let msg = create_agent_message("ACE", "Reconnected session work");
        let result = handle_message(&ctx, session2_id.clone(), msg).await;
        assert!(result.is_ok());

        // Verify user has single session
        let mgr = sessions.read().await;
        let user_sessions = mgr.get_user_sessions("demo_reconnect_user");
        assert_eq!(user_sessions.len(), 1);
        assert_eq!(user_sessions[0].id, session2_id);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Recovery Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod error_recovery_tests {
    use super::*;

    /// Test handling malformed messages
    #[tokio::test]
    async fn test_malformed_message_handling() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Send malformed authentication
        let malformed_auth = WebSocketMessage::new(
            MessageType::Authenticate,
            serde_json::json!({"wrong_field": "value"}),
        );

        let result = handle_message(&ctx, session_id.clone(), malformed_auth).await;
        assert!(result.is_err());

        // Session should still be valid
        let mgr = sessions.read().await;
        assert!(mgr.get_session(&session_id).is_some());
    }

    /// Test recovery after rate limiting
    #[tokio::test]
    async fn test_rate_limit_recovery() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(3, 10))); // 10 tokens/sec refill

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        // Exhaust rate limit
        for _ in 0..3 {
            let ping = create_ping_message();
            handle_message(&ctx, session_id.clone(), ping).await.unwrap();
        }

        // Should be rate limited
        let ping = create_ping_message();
        let result = handle_message(&ctx, session_id.clone(), ping).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Rate limit"));

        // Wait for token refill
        tokio::time::sleep(Duration::from_millis(150)).await;

        // Should work again
        let ping = create_ping_message();
        let result = handle_message(&ctx, session_id, ping).await;
        assert!(result.is_ok());
    }

    /// Test multiple error types in sequence
    #[tokio::test]
    async fn test_sequential_errors() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Error 1: Agent message without auth
        let agent_msg = create_agent_message("ACE", "Test");
        let result1 = handle_message(&ctx, session_id.clone(), agent_msg).await;
        assert!(result1.is_err());

        // Error 2: Invalid message type
        let invalid = WebSocketMessage::new(MessageType::Error, serde_json::json!({}));
        let result2 = handle_message(&ctx, session_id.clone(), invalid).await;
        assert!(result2.is_err());

        // Error 3: Malformed payload
        let malformed = WebSocketMessage::new(
            MessageType::AgentMessage,
            serde_json::json!("not_an_object"),
        );
        let result3 = handle_message(&ctx, session_id.clone(), malformed).await;
        assert!(result3.is_err());

        // System should still function after errors
        let auth = create_auth_request("demo_recovery");
        let result4 = handle_message(&ctx, session_id, auth).await;
        assert!(result4.is_ok());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// State Consistency Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod state_consistency_tests {
    use super::*;

    /// Test session state remains consistent under load
    #[tokio::test]
    async fn test_state_consistency_under_load() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(1000, 100)));

        // Create multiple sessions
        let session_ids: Vec<String> = {
            let mut mgr = sessions.write().await;
            (0..10)
                .map(|i| mgr.add_session(create_test_addr(8080 + i)).unwrap().id)
                .collect()
        };

        let ctx = HandlerContext::new(sessions.clone(), encryption, rate_limiter);

        // Concurrent operations
        let mut handles = Vec::new();
        for session_id in &session_ids {
            let ctx_clone = sessions.clone();
            let sid = session_id.clone();

            handles.push(tokio::spawn(async move {
                let encryption = Arc::new(MessageEncryption::new());
                let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(1000, 100)));
                let ctx = HandlerContext::new(ctx_clone, encryption, rate_limiter);

                // Auth
                let auth = create_auth_request(&format!("demo_{}", sid));
                handle_message(&ctx, sid.clone(), auth).await.unwrap();

                // Multiple pings
                for _ in 0..10 {
                    let ping = create_ping_message();
                    handle_message(&ctx, sid.clone(), ping).await.unwrap();
                }

                // Multiple agent messages
                for i in 0..5 {
                    let msg = create_agent_message("ACE", &format!("Message {}", i));
                    handle_message(&ctx, sid.clone(), msg).await.unwrap();
                }
            }));
        }

        for handle in handles {
            handle.await.unwrap();
        }

        // Verify state consistency
        let mgr = sessions.read().await;
        assert_eq!(mgr.session_count(), 10);
        assert_eq!(mgr.authenticated_session_count(), 10);

        for session_id in &session_ids {
            let session = mgr.get_session(session_id).unwrap();
            assert!(session.user_id.is_some());
        }
    }

    /// Test user-session mapping consistency
    #[tokio::test]
    async fn test_user_session_mapping_consistency() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));

        // Create 3 sessions for same user
        let session_ids: Vec<String> = {
            let mut mgr = sessions.write().await;
            (0..3)
                .map(|i| {
                    let session = mgr.add_session(create_test_addr(8080 + i)).unwrap();
                    mgr.authenticate_session(&session.id, "shared_user".to_string()).unwrap();
                    session.id
                })
                .collect()
        };

        // Verify mapping
        {
            let mgr = sessions.read().await;
            let user_sessions = mgr.get_user_sessions("shared_user");
            assert_eq!(user_sessions.len(), 3);

            for session_id in &session_ids {
                assert!(user_sessions.iter().any(|s| s.id == *session_id));
            }
        }

        // Remove one session
        {
            let mut mgr = sessions.write().await;
            mgr.remove_session(&session_ids[0]);
        }

        // Verify mapping updated
        {
            let mgr = sessions.read().await;
            let user_sessions = mgr.get_user_sessions("shared_user");
            assert_eq!(user_sessions.len(), 2);
            assert!(!user_sessions.iter().any(|s| s.id == session_ids[0]));
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod configuration_tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = WebSocketConfig::default();

        assert_eq!(config.bind_address, "127.0.0.1:8080");
        assert_eq!(config.max_connections_per_ip, 10);
        assert_eq!(config.rate_limit, 10);
        assert!(config.enable_encryption);
        assert_eq!(config.session_timeout, 300);
        assert_eq!(config.max_message_size, 1024 * 1024);
    }

    #[test]
    fn test_custom_config() {
        let config = WebSocketConfig {
            bind_address: "0.0.0.0:9090".to_string(),
            max_connections_per_ip: 5,
            rate_limit: 50,
            enable_encryption: false,
            session_timeout: 600,
            max_message_size: 512 * 1024,
        };

        assert_eq!(config.bind_address, "0.0.0.0:9090");
        assert_eq!(config.max_connections_per_ip, 5);
        assert_eq!(config.rate_limit, 50);
        assert!(!config.enable_encryption);
        assert_eq!(config.session_timeout, 600);
        assert_eq!(config.max_message_size, 512 * 1024);
    }

    #[test]
    fn test_websocket_state_creation() {
        let config = WebSocketConfig::default();
        let state = WebSocketState::new(config.clone());

        assert_eq!(state.config.bind_address, config.bind_address);
        assert_eq!(state.config.rate_limit, config.rate_limit);
    }

    #[tokio::test]
    async fn test_state_session_manager_initialized() {
        let config = WebSocketConfig::default();
        let state = WebSocketState::new(config);

        let mgr = state.sessions.read().await;
        assert_eq!(mgr.session_count(), 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Performance Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod performance_tests {
    use super::*;
    use std::time::Instant;

    #[tokio::test]
    async fn test_high_throughput_ping_pong() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(10000, 1000)));

        let session_id = {
            let mut mgr = sessions.write().await;
            mgr.add_session(create_test_addr(8080)).unwrap().id
        };

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        let iterations = 1000;
        let start = Instant::now();

        for _ in 0..iterations {
            let ping = create_ping_message();
            handle_message(&ctx, session_id.clone(), ping).await.unwrap();
        }

        let duration = start.elapsed();
        let ops_per_sec = iterations as f64 / duration.as_secs_f64();

        // Should handle at least 1000 ops/sec
        assert!(
            ops_per_sec > 1000.0,
            "Throughput too low: {} ops/sec",
            ops_per_sec
        );
    }

    #[tokio::test]
    async fn test_session_creation_performance() {
        let mut manager = SessionManager::new();

        let iterations = 100; // Lower due to IP limit
        let start = Instant::now();

        for i in 0..iterations {
            let addr = create_test_addr_with_ip(
                [192, 168, (i / 256) as u8, (i % 256) as u8],
                8080,
            );
            manager.add_session(addr).unwrap();
        }

        let duration = start.elapsed();
        let ops_per_sec = iterations as f64 / duration.as_secs_f64();

        assert!(
            ops_per_sec > 100.0,
            "Session creation too slow: {} ops/sec",
            ops_per_sec
        );
    }

    #[tokio::test]
    async fn test_authentication_performance() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(10000, 1000)));

        // Create sessions
        let session_ids: Vec<String> = {
            let mut mgr = sessions.write().await;
            (0..100)
                .map(|i| {
                    let addr = create_test_addr_with_ip(
                        [10, 0, (i / 256) as u8, (i % 256) as u8],
                        8080,
                    );
                    mgr.add_session(addr).unwrap().id
                })
                .collect()
        };

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        let start = Instant::now();

        for (i, session_id) in session_ids.iter().enumerate() {
            let auth = create_auth_request(&format!("demo_perf_{}", i));
            handle_message(&ctx, session_id.clone(), auth).await.unwrap();
        }

        let duration = start.elapsed();
        let ops_per_sec = 100.0 / duration.as_secs_f64();

        assert!(
            ops_per_sec > 100.0,
            "Auth performance too low: {} ops/sec",
            ops_per_sec
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod message_validation_tests {
    use super::*;

    #[tokio::test]
    async fn test_message_id_uniqueness() {
        let msg1 = create_ping_message();
        let msg2 = create_ping_message();

        assert_ne!(msg1.message_id, msg2.message_id);
    }

    #[tokio::test]
    async fn test_message_timestamp_ordering() {
        let msg1 = create_ping_message();
        tokio::time::sleep(Duration::from_millis(10)).await;
        let msg2 = create_ping_message();

        assert!(msg2.timestamp >= msg1.timestamp);
    }

    #[tokio::test]
    async fn test_agent_response_references_original() {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));

        let session_id = {
            let mut mgr = sessions.write().await;
            let session = mgr.add_session(create_test_addr(8080)).unwrap();
            mgr.authenticate_session(&session.id, "demo_ref_test".to_string()).unwrap();
            session.id
        };

        let ctx = HandlerContext::new(sessions, encryption, rate_limiter);

        let original_msg = create_agent_message("ACE", "Test reference");
        let original_id = original_msg.message_id.clone();

        let result = handle_message(&ctx, session_id, original_msg).await;
        let response = result.unwrap().unwrap();

        let agent_response = extract_agent_response(&response).unwrap();
        assert_eq!(agent_response.message_id, original_id);
    }

    #[test]
    fn test_message_with_session() {
        let msg = WebSocketMessage::new(MessageType::Ping, serde_json::json!({}))
            .with_session("test-session-123".to_string());

        assert_eq!(msg.session_id, Some("test-session-123".to_string()));
    }
}
