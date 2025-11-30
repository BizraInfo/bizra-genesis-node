// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET SERVER                                   ║
// ║  Production-grade WebSocket server with encryption and rate limiting     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use std::time::Duration;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{accept_async, tungstenite::Message};

use crate::websocket::{
    encryption::MessageEncryption,
    handlers::{handle_message, HandlerContext},
    rate_limit::RateLimiter,
    session::SessionManager,
    types::*,
    WebSocketConfig,
};

/// WebSocket server
pub struct WebSocketServer {
    /// Server configuration
    config: WebSocketConfig,
    /// Session manager
    sessions: Arc<RwLock<SessionManager>>,
    /// Message encryption
    encryption: Arc<MessageEncryption>,
    /// Rate limiter
    rate_limiter: Arc<RwLock<RateLimiter>>,
}

impl WebSocketServer {
    /// Create new WebSocket server
    pub fn new(config: WebSocketConfig) -> Self {
        let sessions = Arc::new(RwLock::new(SessionManager::new()));
        let encryption = Arc::new(MessageEncryption::new());
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(
            config.rate_limit,
            config.rate_limit,
        )));

        Self {
            config,
            sessions,
            encryption,
            rate_limiter,
        }
    }

    /// Start WebSocket server
    pub async fn start(&self) -> Result<(), String> {
        let listener = TcpListener::bind(&self.config.bind_address)
            .await
            .map_err(|e| format!("Failed to bind: {}", e))?;

        println!(
            "✅ WebSocket server listening on {}",
            self.config.bind_address
        );

        // Start session cleanup task
        self.start_cleanup_task();

        // Accept connections
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    println!("📥 New connection from: {}", addr);

                    let sessions = self.sessions.clone();
                    let encryption = self.encryption.clone();
                    let rate_limiter = self.rate_limiter.clone();
                    let config = self.config.clone();

                    tokio::spawn(async move {
                        if let Err(e) = handle_connection(
                            stream,
                            addr,
                            sessions,
                            encryption,
                            rate_limiter,
                            config,
                        )
                        .await
                        {
                            eprintln!("❌ Connection error: {}", e);
                        }
                    });
                }
                Err(e) => {
                    eprintln!("❌ Accept error: {}", e);
                }
            }
        }
    }

    /// Start background task to clean expired sessions
    fn start_cleanup_task(&self) {
        let sessions = self.sessions.clone();
        let timeout = Duration::from_secs(self.config.session_timeout);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;

                let mut mgr = sessions.write().await;
                let cleaned = mgr.clean_expired_sessions(timeout);
                if cleaned > 0 {
                    println!("🧹 Cleaned {} expired sessions", cleaned);
                }
            }
        });
    }

    /// Get session count
    pub async fn session_count(&self) -> usize {
        self.sessions.read().await.session_count()
    }

    /// Get authenticated session count
    pub async fn authenticated_session_count(&self) -> usize {
        self.sessions.read().await.authenticated_session_count()
    }
}

/// Handle individual WebSocket connection
async fn handle_connection(
    stream: TcpStream,
    addr: std::net::SocketAddr,
    sessions: Arc<RwLock<SessionManager>>,
    encryption: Arc<MessageEncryption>,
    rate_limiter: Arc<RwLock<RateLimiter>>,
    _config: WebSocketConfig,
) -> Result<(), String> {
    // Upgrade to WebSocket
    let ws_stream = accept_async(stream)
        .await
        .map_err(|e| format!("WebSocket handshake failed: {}", e))?;

    // Create session
    let session = {
        let mut mgr = sessions.write().await;
        mgr.add_session(addr)?
    };

    let session_id = session.id.clone();
    println!("✨ Session created: {}", session_id);

    // Create message channel
    let (tx, mut rx) = mpsc::unbounded_channel();

    // Set sender in session
    {
        let mut mgr = sessions.write().await;
        if let Some(session) = mgr.get_session_mut(&session_id) {
            session.set_sender(tx);
        }
    }

    // Split WebSocket stream
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Create handler context
    let ctx = Arc::new(HandlerContext::new(
        sessions.clone(),
        encryption,
        rate_limiter.clone(),
    ));

    // Spawn task to send messages to client
    let session_id_clone = session_id.clone();
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&message) {
                if let Err(e) = ws_sender.send(Message::Text(json)).await {
                    eprintln!("❌ Failed to send message: {}", e);
                    break;
                }
            }
        }
        println!("📤 Sender task ended for session: {}", session_id_clone);
    });

    // Handle incoming messages
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                // Parse message
                match serde_json::from_str::<WebSocketMessage>(&text) {
                    Ok(message) => {
                        // Handle message
                        match handle_message(&ctx, session_id.clone(), message).await {
                            Ok(Some(response)) => {
                                // Send response
                                let session = {
                                    let mgr = sessions.read().await;
                                    mgr.get_session(&session_id).cloned()
                                };

                                if let Some(session) = session {
                                    if let Err(e) = session.send_message(response).await {
                                        eprintln!("❌ Failed to send response: {}", e);
                                    }
                                }
                            }
                            Ok(None) => {
                                // No response needed
                            }
                            Err(e) => {
                                eprintln!("❌ Message handling error: {}", e);

                                // Send error response
                                let error_msg = WebSocketMessage::new(
                                    MessageType::Error,
                                    serde_json::to_value(ErrorMessage {
                                        code: "MESSAGE_ERROR".to_string(),
                                        message: e.to_string(),
                                        context: None,
                                    })
                                    .unwrap(),
                                );

                                let session = {
                                    let mgr = sessions.read().await;
                                    mgr.get_session(&session_id).cloned()
                                };

                                if let Some(session) = session {
                                    if let Ok(msg) = error_msg {
                                        let _ = session.send_message(msg).await;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("❌ Invalid message format: {}", e);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                println!("👋 Client closed connection: {}", session_id);
                break;
            }
            Ok(Message::Ping(data)) => {
                // Respond to ping
                let session = {
                    let mgr = sessions.read().await;
                    mgr.get_session(&session_id).cloned()
                };

                if let Some(session) = session {
                    let pong_msg = WebSocketMessage::new(
                        MessageType::Pong,
                        serde_json::to_value(&data).unwrap(),
                    );
                    if let Ok(msg) = pong_msg {
                        let _ = session.send_message(msg).await;
                    }
                }
            }
            Err(e) => {
                eprintln!("❌ WebSocket error: {}", e);
                break;
            }
            _ => {}
        }

        // Update session activity
        {
            let mut mgr = sessions.write().await;
            if let Some(session) = mgr.get_session_mut(&session_id) {
                session.update_activity();
            }
        }
    }

    // Clean up session
    {
        let mut mgr = sessions.write().await;
        mgr.remove_session(&session_id);

        let mut limiter = rate_limiter.write().await;
        limiter.remove_session(&session_id);
    }

    println!("🔌 Session disconnected: {}", session_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_websocket_server_creation() {
        let config = WebSocketConfig::default();
        let server = WebSocketServer::new(config.clone());

        assert_eq!(server.config.bind_address, config.bind_address);
    }

    #[tokio::test]
    async fn test_websocket_server_session_count() {
        let config = WebSocketConfig::default();
        let server = WebSocketServer::new(config);

        assert_eq!(server.session_count().await, 0);
        assert_eq!(server.authenticated_session_count().await, 0);
    }
}
