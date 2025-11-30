// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET SESSION TESTS                             ║
// ║  Comprehensive tests for session management and lifecycle                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::*;
use bizra_genesis_node::websocket::{
    session::{Session, SessionManager},
    types::PresenceStatus,
};
use std::time::Duration;

// ═══════════════════════════════════════════════════════════════════════════
// Session Creation Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_creation_tests {
    use super::*;

    #[test]
    fn test_session_new_generates_unique_id() {
        let addr = create_test_addr(8080);

        let session1 = Session::new(addr);
        let session2 = Session::new(addr);

        assert_ne!(session1.id, session2.id);
        assert!(!session1.id.is_empty());
        assert!(!session2.id.is_empty());
    }

    #[test]
    fn test_session_new_sets_correct_addr() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        assert_eq!(session.addr, addr);
    }

    #[test]
    fn test_session_new_starts_unauthenticated() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        assert!(session.user_id.is_none());
    }

    #[test]
    fn test_session_new_sets_online_presence() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        assert_eq!(session.presence, PresenceStatus::Online);
    }

    #[test]
    fn test_session_new_has_no_sender() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        assert!(session.tx.is_none());
    }

    #[test]
    fn test_session_uuid_format() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        // UUID v4 format: 8-4-4-4-12 hex characters
        let parts: Vec<&str> = session.id.split('-').collect();
        assert_eq!(parts.len(), 5);
        assert_eq!(parts[0].len(), 8);
        assert_eq!(parts[1].len(), 4);
        assert_eq!(parts[2].len(), 4);
        assert_eq!(parts[3].len(), 4);
        assert_eq!(parts[4].len(), 12);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Authentication Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_authentication_tests {
    use super::*;

    #[test]
    fn test_session_authenticate_sets_user_id() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);

        session.authenticate("user123".to_string());

        assert_eq!(session.user_id, Some("user123".to_string()));
    }

    #[test]
    fn test_session_authenticate_updates_activity() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);
        let initial_activity = session.last_activity;

        std::thread::sleep(Duration::from_millis(10));
        session.authenticate("user123".to_string());

        assert!(session.last_activity > initial_activity);
    }

    #[test]
    fn test_session_can_reauthenticate() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);

        session.authenticate("user1".to_string());
        assert_eq!(session.user_id, Some("user1".to_string()));

        session.authenticate("user2".to_string());
        assert_eq!(session.user_id, Some("user2".to_string()));
    }

    #[test]
    fn test_session_authenticate_preserves_other_fields() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);
        let original_id = session.id.clone();
        let original_addr = session.addr;

        session.authenticate("user123".to_string());

        assert_eq!(session.id, original_id);
        assert_eq!(session.addr, original_addr);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Activity Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_activity_tests {
    use super::*;

    #[test]
    fn test_session_update_activity() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);
        let initial = session.last_activity;

        std::thread::sleep(Duration::from_millis(10));
        session.update_activity();

        assert!(session.last_activity > initial);
    }

    #[test]
    fn test_session_is_expired_fresh() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        // Fresh session should not be expired with 5 minute timeout
        assert!(!session.is_expired(Duration::from_secs(300)));
    }

    #[test]
    fn test_session_is_expired_zero_timeout() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        // With zero timeout, any session should be expired
        std::thread::sleep(Duration::from_millis(1));
        assert!(session.is_expired(Duration::from_millis(0)));
    }

    #[test]
    fn test_session_expiration_boundary() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        // With very short timeout
        std::thread::sleep(Duration::from_millis(50));

        // Should be expired with 10ms timeout
        assert!(session.is_expired(Duration::from_millis(10)));

        // Should not be expired with 100ms timeout
        assert!(!session.is_expired(Duration::from_millis(100)));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SessionManager Basic Operations Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_manager_basic_tests {
    use super::*;

    #[test]
    fn test_manager_new_empty() {
        let manager = SessionManager::new();

        assert_eq!(manager.session_count(), 0);
        assert_eq!(manager.authenticated_session_count(), 0);
    }

    #[test]
    fn test_manager_add_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let result = manager.add_session(addr);

        assert!(result.is_ok());
        assert_eq!(manager.session_count(), 1);
    }

    #[test]
    fn test_manager_add_session_returns_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();

        assert_eq!(session.addr, addr);
        assert!(session.user_id.is_none());
    }

    #[test]
    fn test_manager_remove_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        manager.remove_session(&session_id);

        assert_eq!(manager.session_count(), 0);
        assert!(manager.get_session(&session_id).is_none());
    }

    #[test]
    fn test_manager_remove_nonexistent_session() {
        let mut manager = SessionManager::new();

        // Should not panic
        manager.remove_session("nonexistent-id");
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_manager_get_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        let retrieved = manager.get_session(&session_id);

        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().id, session_id);
    }

    #[test]
    fn test_manager_get_session_mut() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        if let Some(session_mut) = manager.get_session_mut(&session_id) {
            session_mut.presence = PresenceStatus::Away;
        }

        let retrieved = manager.get_session(&session_id).unwrap();
        assert_eq!(retrieved.presence, PresenceStatus::Away);
    }

    #[test]
    fn test_manager_get_nonexistent_session() {
        let manager = SessionManager::new();

        assert!(manager.get_session("nonexistent").is_none());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SessionManager Connection Limit Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_manager_limit_tests {
    use super::*;

    #[test]
    fn test_manager_connection_limit_per_ip() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        // Add 10 sessions (the default limit)
        for _ in 0..10 {
            assert!(manager.add_session(addr).is_ok());
        }

        // 11th should fail
        let result = manager.add_session(addr);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Connection limit exceeded"));
    }

    #[test]
    fn test_manager_connection_limit_different_ips() {
        let mut manager = SessionManager::new();

        // Add 10 sessions from IP 1
        let addr1 = create_test_addr_with_ip([192, 168, 1, 1], 8080);
        for _ in 0..10 {
            assert!(manager.add_session(addr1).is_ok());
        }

        // Can still add from different IP
        let addr2 = create_test_addr_with_ip([192, 168, 1, 2], 8080);
        assert!(manager.add_session(addr2).is_ok());

        assert_eq!(manager.session_count(), 11);
    }

    #[test]
    fn test_manager_remove_frees_connection_slot() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        // Fill up slots
        let mut session_ids = Vec::new();
        for _ in 0..10 {
            let session = manager.add_session(addr).unwrap();
            session_ids.push(session.id);
        }

        // Cannot add more
        assert!(manager.add_session(addr).is_err());

        // Remove one session
        manager.remove_session(&session_ids[0]);

        // Now can add
        assert!(manager.add_session(addr).is_ok());
    }

    #[test]
    fn test_manager_ip_count_tracks_correctly() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session1 = manager.add_session(addr).unwrap();
        let session2 = manager.add_session(addr).unwrap();

        assert_eq!(manager.session_count(), 2);

        manager.remove_session(&session1.id);
        assert_eq!(manager.session_count(), 1);

        // Can add more since one was removed
        assert!(manager.add_session(addr).is_ok());

        manager.remove_session(&session2.id);
        // Removed original session 2, but added a new one above
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SessionManager Authentication Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_manager_auth_tests {
    use super::*;

    #[test]
    fn test_manager_authenticate_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        let result = manager.authenticate_session(&session_id, "user123".to_string());

        assert!(result.is_ok());
        assert_eq!(manager.authenticated_session_count(), 1);
    }

    #[test]
    fn test_manager_authenticate_nonexistent_session() {
        let mut manager = SessionManager::new();

        let result = manager.authenticate_session("nonexistent", "user123".to_string());

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Session not found"));
    }

    #[test]
    fn test_manager_get_user_sessions() {
        let mut manager = SessionManager::new();
        let addr1 = create_test_addr(8080);
        let addr2 = create_test_addr(8081);

        let session1 = manager.add_session(addr1).unwrap();
        let session2 = manager.add_session(addr2).unwrap();

        manager.authenticate_session(&session1.id, "user123".to_string()).unwrap();
        manager.authenticate_session(&session2.id, "user123".to_string()).unwrap();

        let user_sessions = manager.get_user_sessions("user123");
        assert_eq!(user_sessions.len(), 2);
    }

    #[test]
    fn test_manager_get_user_sessions_different_users() {
        let mut manager = SessionManager::new();

        let session1 = manager.add_session(create_test_addr(8080)).unwrap();
        let session2 = manager.add_session(create_test_addr(8081)).unwrap();
        let session3 = manager.add_session(create_test_addr(8082)).unwrap();

        manager.authenticate_session(&session1.id, "user1".to_string()).unwrap();
        manager.authenticate_session(&session2.id, "user2".to_string()).unwrap();
        manager.authenticate_session(&session3.id, "user1".to_string()).unwrap();

        assert_eq!(manager.get_user_sessions("user1").len(), 2);
        assert_eq!(manager.get_user_sessions("user2").len(), 1);
        assert_eq!(manager.get_user_sessions("user3").len(), 0);
    }

    #[test]
    fn test_manager_remove_updates_user_sessions() {
        let mut manager = SessionManager::new();

        let session = manager.add_session(create_test_addr(8080)).unwrap();
        let session_id = session.id.clone();

        manager.authenticate_session(&session_id, "user123".to_string()).unwrap();
        assert_eq!(manager.get_user_sessions("user123").len(), 1);

        manager.remove_session(&session_id);
        assert_eq!(manager.get_user_sessions("user123").len(), 0);
    }

    #[test]
    fn test_manager_authenticated_count() {
        let mut manager = SessionManager::new();

        manager.add_session(create_test_addr(8080)).unwrap();
        manager.add_session(create_test_addr(8081)).unwrap();
        let session3 = manager.add_session(create_test_addr(8082)).unwrap();

        assert_eq!(manager.authenticated_session_count(), 0);

        manager.authenticate_session(&session3.id, "user".to_string()).unwrap();
        assert_eq!(manager.authenticated_session_count(), 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SessionManager Cleanup Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_manager_cleanup_tests {
    use super::*;

    #[test]
    fn test_manager_clean_expired_sessions_zero_timeout() {
        let mut manager = SessionManager::new();

        manager.add_session(create_test_addr(8080)).unwrap();
        manager.add_session(create_test_addr(8081)).unwrap();
        manager.add_session(create_test_addr(8082)).unwrap();

        assert_eq!(manager.session_count(), 3);

        // With zero timeout, all sessions are "expired" immediately after creation
        std::thread::sleep(Duration::from_millis(1));
        let cleaned = manager.clean_expired_sessions(Duration::from_millis(0));

        assert_eq!(cleaned, 3);
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_manager_clean_expired_sessions_long_timeout() {
        let mut manager = SessionManager::new();

        manager.add_session(create_test_addr(8080)).unwrap();
        manager.add_session(create_test_addr(8081)).unwrap();

        // With long timeout, no sessions should be cleaned
        let cleaned = manager.clean_expired_sessions(Duration::from_secs(300));

        assert_eq!(cleaned, 0);
        assert_eq!(manager.session_count(), 2);
    }

    #[test]
    fn test_manager_clean_expired_sessions_partial() {
        let mut manager = SessionManager::new();

        // Add session 1
        let session1 = manager.add_session(create_test_addr(8080)).unwrap();

        // Wait
        std::thread::sleep(Duration::from_millis(50));

        // Add session 2
        manager.add_session(create_test_addr(8081)).unwrap();

        // Update activity on session 1
        if let Some(s) = manager.get_session_mut(&session1.id) {
            s.update_activity();
        }

        // Both sessions should be fresh now
        let cleaned = manager.clean_expired_sessions(Duration::from_millis(30));
        assert_eq!(cleaned, 0);
    }

    #[test]
    fn test_manager_clean_updates_ip_connections() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        // Fill up connection slots
        for _ in 0..10 {
            manager.add_session(addr).unwrap();
        }

        // Cannot add more
        assert!(manager.add_session(addr).is_err());

        // Clean all sessions
        std::thread::sleep(Duration::from_millis(1));
        manager.clean_expired_sessions(Duration::from_millis(0));

        // Now can add again
        assert!(manager.add_session(addr).is_ok());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Concurrency Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_concurrency_tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::RwLock;

    #[tokio::test]
    async fn test_concurrent_session_reads() {
        let manager = Arc::new(RwLock::new(SessionManager::new()));

        // Add some sessions
        {
            let mut mgr = manager.write().await;
            for i in 0..10 {
                mgr.add_session(create_test_addr(8080 + i)).unwrap();
            }
        }

        // Concurrent reads
        let mut handles = vec![];
        for _ in 0..100 {
            let mgr_clone = Arc::clone(&manager);
            handles.push(tokio::spawn(async move {
                let mgr = mgr_clone.read().await;
                mgr.session_count()
            }));
        }

        for handle in handles {
            let count = handle.await.unwrap();
            assert_eq!(count, 10);
        }
    }

    #[tokio::test]
    async fn test_concurrent_session_writes() {
        let manager = Arc::new(RwLock::new(SessionManager::new()));
        let mut handles = vec![];

        // Concurrent writes (different ports to avoid IP limit)
        for i in 0..10 {
            let mgr_clone = Arc::clone(&manager);
            handles.push(tokio::spawn(async move {
                let mut mgr = mgr_clone.write().await;
                mgr.add_session(create_test_addr(8080 + i as u16)).unwrap()
            }));
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let mgr = manager.read().await;
        assert_eq!(mgr.session_count(), 10);
    }

    #[tokio::test]
    async fn test_concurrent_auth_operations() {
        let manager = Arc::new(RwLock::new(SessionManager::new()));

        // Add sessions
        let session_ids: Vec<String> = {
            let mut mgr = manager.write().await;
            (0..10)
                .map(|i| {
                    mgr.add_session(create_test_addr(8080 + i)).unwrap().id
                })
                .collect()
        };

        // Concurrent authentication
        let mut handles = vec![];
        for (i, session_id) in session_ids.iter().enumerate() {
            let mgr_clone = Arc::clone(&manager);
            let sid = session_id.clone();
            handles.push(tokio::spawn(async move {
                let mut mgr = mgr_clone.write().await;
                mgr.authenticate_session(&sid, format!("user{}", i))
            }));
        }

        for handle in handles {
            assert!(handle.await.unwrap().is_ok());
        }

        let mgr = manager.read().await;
        assert_eq!(mgr.authenticated_session_count(), 10);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Edge Case Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod session_edge_case_tests {
    use super::*;

    #[test]
    fn test_session_with_ipv6_addr() {
        use std::net::{IpAddr, Ipv6Addr};

        let addr = SocketAddr::new(
            IpAddr::V6(Ipv6Addr::new(0, 0, 0, 0, 0, 0, 0, 1)),
            8080,
        );

        let session = Session::new(addr);
        assert_eq!(session.addr, addr);
    }

    #[test]
    fn test_session_manager_with_ipv6() {
        use std::net::{IpAddr, Ipv6Addr};

        let mut manager = SessionManager::new();
        let addr = SocketAddr::new(
            IpAddr::V6(Ipv6Addr::new(0, 0, 0, 0, 0, 0, 0, 1)),
            8080,
        );

        let result = manager.add_session(addr);
        assert!(result.is_ok());
    }

    #[test]
    fn test_empty_user_id_authentication() {
        let mut manager = SessionManager::new();
        let session = manager.add_session(create_test_addr(8080)).unwrap();

        // Empty user ID is technically valid
        let result = manager.authenticate_session(&session.id, "".to_string());
        assert!(result.is_ok());
    }

    #[test]
    fn test_unicode_user_id() {
        let mut manager = SessionManager::new();
        let session = manager.add_session(create_test_addr(8080)).unwrap();

        let unicode_user = "用户123_مستخدم";
        let result = manager.authenticate_session(&session.id, unicode_user.to_string());

        assert!(result.is_ok());

        let user_sessions = manager.get_user_sessions(unicode_user);
        assert_eq!(user_sessions.len(), 1);
    }

    #[test]
    fn test_very_long_user_id() {
        let mut manager = SessionManager::new();
        let session = manager.add_session(create_test_addr(8080)).unwrap();

        let long_user = "x".repeat(10000);
        let result = manager.authenticate_session(&session.id, long_user.clone());

        assert!(result.is_ok());

        let retrieved = manager.get_session(&session.id).unwrap();
        assert_eq!(retrieved.user_id, Some(long_user));
    }

    #[test]
    fn test_session_rapid_activity_updates() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);

        // Rapid updates shouldn't cause issues
        for _ in 0..1000 {
            session.update_activity();
        }

        // Session should still be valid
        assert!(!session.is_expired(Duration::from_secs(300)));
    }

    #[test]
    fn test_manager_many_sessions_same_user() {
        let mut manager = SessionManager::new();

        // Add sessions from many different IPs, all same user
        for i in 0..100 {
            let addr = create_test_addr_with_ip(
                [192, 168, (i / 256) as u8, (i % 256) as u8],
                8080,
            );
            let session = manager.add_session(addr).unwrap();
            manager.authenticate_session(&session.id, "single_user".to_string()).unwrap();
        }

        let user_sessions = manager.get_user_sessions("single_user");
        assert_eq!(user_sessions.len(), 100);
    }
}
