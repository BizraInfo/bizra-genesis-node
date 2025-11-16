// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET MODULE                                   ║
// ║  Real-time agent communication infrastructure                            ║
// ║  Sprint 4.1 Week 31-32: Agent Interaction Interface                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod encryption;
pub mod handlers;
pub mod rate_limit;
pub mod server;
pub mod session;
pub mod types;

pub use server::WebSocketServer;
pub use session::{Session, SessionManager};
pub use types::{AgentMessage, MessageType, WebSocketMessage};

use std::sync::Arc;
use tokio::sync::RwLock;

/// WebSocket server configuration
#[derive(Debug, Clone)]
pub struct WebSocketConfig {
    /// Server bind address
    pub bind_address: String,
    /// Maximum connections per IP
    pub max_connections_per_ip: usize,
    /// Message rate limit (messages per second)
    pub rate_limit: u32,
    /// Enable message encryption
    pub enable_encryption: bool,
    /// Session timeout in seconds
    pub session_timeout: u64,
    /// Maximum message size in bytes
    pub max_message_size: usize,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            bind_address: "127.0.0.1:8080".to_string(),
            max_connections_per_ip: 10,
            rate_limit: 10,
            enable_encryption: true,
            session_timeout: 300,
            max_message_size: 1024 * 1024, // 1MB
        }
    }
}

/// WebSocket server state
pub struct WebSocketState {
    /// Session manager
    pub sessions: Arc<RwLock<SessionManager>>,
    /// Configuration
    pub config: WebSocketConfig,
}

impl WebSocketState {
    /// Create new WebSocket state
    pub fn new(config: WebSocketConfig) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(SessionManager::new())),
            config,
        }
    }
}

#[cfg(test)]
mod tests {
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
    fn test_websocket_state_creation() {
        let config = WebSocketConfig::default();
        let state = WebSocketState::new(config.clone());
        assert_eq!(state.config.bind_address, config.bind_address);
    }
}
