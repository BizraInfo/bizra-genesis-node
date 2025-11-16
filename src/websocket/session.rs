// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SESSION MANAGEMENT                                 ║
// ║  WebSocket session tracking and management                               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::websocket::types::{PresenceStatus, WebSocketMessage};

/// WebSocket session
#[derive(Debug, Clone)]
pub struct Session {
    /// Session ID
    pub id: String,
    /// User ID (after authentication)
    pub user_id: Option<String>,
    /// Client address
    pub addr: SocketAddr,
    /// Session creation time
    pub created_at: SystemTime,
    /// Last activity time
    pub last_activity: SystemTime,
    /// Presence status
    pub presence: PresenceStatus,
    /// Message sender channel
    pub tx: Option<Arc<mpsc::UnboundedSender<WebSocketMessage>>>,
}

impl Session {
    /// Create new session
    pub fn new(addr: SocketAddr) -> Self {
        let now = SystemTime::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user_id: None,
            addr,
            created_at: now,
            last_activity: now,
            presence: PresenceStatus::Online,
            tx: None,
        }
    }

    /// Update last activity timestamp
    pub fn update_activity(&mut self) {
        self.last_activity = SystemTime::now();
    }

    /// Check if session is expired
    pub fn is_expired(&self, timeout: Duration) -> bool {
        if let Ok(elapsed) = self.last_activity.elapsed() {
            elapsed > timeout
        } else {
            false
        }
    }

    /// Authenticate session
    pub fn authenticate(&mut self, user_id: String) {
        self.user_id = Some(user_id);
        self.update_activity();
    }

    /// Set message sender
    pub fn set_sender(&mut self, tx: mpsc::UnboundedSender<WebSocketMessage>) {
        self.tx = Some(Arc::new(tx));
    }

    /// Send message to client
    pub async fn send_message(&self, message: WebSocketMessage) -> Result<(), String> {
        if let Some(tx) = &self.tx {
            tx.send(message)
                .map_err(|e| format!("Failed to send message: {}", e))?;
            Ok(())
        } else {
            Err("No message sender configured".to_string())
        }
    }
}

/// Session manager
pub struct SessionManager {
    /// Active sessions
    sessions: HashMap<String, Session>,
    /// User ID to session ID mapping
    user_sessions: HashMap<String, Vec<String>>,
    /// IP address to session count
    ip_connections: HashMap<SocketAddr, usize>,
}

impl SessionManager {
    /// Create new session manager
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            user_sessions: HashMap::new(),
            ip_connections: HashMap::new(),
        }
    }

    /// Add new session
    pub fn add_session(&mut self, addr: SocketAddr) -> Result<Session, String> {
        // Check IP connection limit (default 10)
        let conn_count = self.ip_connections.get(&addr).unwrap_or(&0);
        if *conn_count >= 10 {
            return Err("Connection limit exceeded for IP".to_string());
        }

        let session = Session::new(addr);
        let session_id = session.id.clone();

        self.sessions.insert(session_id.clone(), session.clone());
        *self.ip_connections.entry(addr).or_insert(0) += 1;

        Ok(session)
    }

    /// Remove session
    pub fn remove_session(&mut self, session_id: &str) {
        if let Some(session) = self.sessions.remove(session_id) {
            // Update IP connection count
            if let Some(count) = self.ip_connections.get_mut(&session.addr) {
                *count = count.saturating_sub(1);
                if *count == 0 {
                    self.ip_connections.remove(&session.addr);
                }
            }

            // Remove from user sessions
            if let Some(user_id) = &session.user_id {
                if let Some(sessions) = self.user_sessions.get_mut(user_id) {
                    sessions.retain(|id| id != session_id);
                    if sessions.is_empty() {
                        self.user_sessions.remove(user_id);
                    }
                }
            }
        }
    }

    /// Get session by ID
    pub fn get_session(&self, session_id: &str) -> Option<&Session> {
        self.sessions.get(session_id)
    }

    /// Get mutable session by ID
    pub fn get_session_mut(&mut self, session_id: &str) -> Option<&mut Session> {
        self.sessions.get_mut(session_id)
    }

    /// Authenticate session
    pub fn authenticate_session(
        &mut self,
        session_id: &str,
        user_id: String,
    ) -> Result<(), String> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.authenticate(user_id.clone());

            // Track user sessions
            self.user_sessions
                .entry(user_id)
                .or_insert_with(Vec::new)
                .push(session_id.to_string());

            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    /// Get all sessions for a user
    pub fn get_user_sessions(&self, user_id: &str) -> Vec<&Session> {
        self.user_sessions
            .get(user_id)
            .map(|session_ids| {
                session_ids
                    .iter()
                    .filter_map(|id| self.sessions.get(id.as_str()))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Clean expired sessions
    pub fn clean_expired_sessions(&mut self, timeout: Duration) -> usize {
        let expired_sessions: Vec<String> = self
            .sessions
            .iter()
            .filter(|(_, session)| session.is_expired(timeout))
            .map(|(id, _)| id.clone())
            .collect();

        let count = expired_sessions.len();
        for session_id in expired_sessions {
            self.remove_session(&session_id);
        }

        count
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Get authenticated session count
    pub fn authenticated_session_count(&self) -> usize {
        self.sessions
            .values()
            .filter(|s| s.user_id.is_some())
            .count()
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr};

    fn create_test_addr(port: u16) -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port)
    }

    #[test]
    fn test_session_creation() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        assert!(!session.id.is_empty());
        assert_eq!(session.addr, addr);
        assert!(session.user_id.is_none());
        assert_eq!(session.presence, PresenceStatus::Online);
    }

    #[test]
    fn test_session_authentication() {
        let addr = create_test_addr(8080);
        let mut session = Session::new(addr);

        session.authenticate("user123".to_string());
        assert_eq!(session.user_id, Some("user123".to_string()));
    }

    #[test]
    fn test_session_expiration() {
        let addr = create_test_addr(8080);
        let session = Session::new(addr);

        // Fresh session should not be expired
        assert!(!session.is_expired(Duration::from_secs(300)));
    }

    #[test]
    fn test_session_manager_add_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let result = manager.add_session(addr);
        assert!(result.is_ok());
        assert_eq!(manager.session_count(), 1);
    }

    #[test]
    fn test_session_manager_remove_session() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        manager.remove_session(&session_id);
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_session_manager_authenticate() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        let session = manager.add_session(addr).unwrap();
        let session_id = session.id.clone();

        manager
            .authenticate_session(&session_id, "user123".to_string())
            .unwrap();

        let user_sessions = manager.get_user_sessions("user123");
        assert_eq!(user_sessions.len(), 1);
        assert_eq!(manager.authenticated_session_count(), 1);
    }

    #[test]
    fn test_session_manager_connection_limit() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        // Add 10 sessions (the limit)
        for _ in 0..10 {
            manager.add_session(addr).unwrap();
        }

        // 11th session should fail
        let result = manager.add_session(addr);
        assert!(result.is_err());
    }

    #[test]
    fn test_session_manager_clean_expired() {
        let mut manager = SessionManager::new();
        let addr = create_test_addr(8080);

        manager.add_session(addr).unwrap();

        // No sessions should be expired immediately
        let cleaned = manager.clean_expired_sessions(Duration::from_secs(0));
        assert_eq!(cleaned, 1); // All sessions are "expired" with 0 timeout
        assert_eq!(manager.session_count(), 0);
    }
}
