// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET ERROR TYPES                              ║
// ║  Unified error handling for WebSocket operations                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use thiserror::Error;

/// WebSocket operation errors
///
/// This enum represents all possible errors that can occur during WebSocket
/// message handling, replacing panic-inducing `unwrap()` calls with proper
/// error propagation.
#[derive(Debug, Error)]
pub enum WebSocketError {
    /// Message serialization/deserialization failed
    #[error("Message serialization failed: {0}")]
    SerializationFailed(#[from] serde_json::Error),

    /// Message encryption failed
    #[error("Message encryption failed: {0}")]
    EncryptionFailed(String),

    /// Message decryption failed
    #[error("Message decryption failed: {0}")]
    DecryptionFailed(String),

    /// Session not found in session manager
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    /// Authentication failed
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    /// Rate limit exceeded
    #[error("Rate limit exceeded for session")]
    RateLimitExceeded,

    /// Invalid message format
    #[error("Invalid message format: {0}")]
    InvalidMessage(String),

    /// Internal error (should not happen in production)
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Convert WebSocketError to a JSON error message that can be sent to clients
impl WebSocketError {
    pub fn to_json_message(&self) -> serde_json::Value {
        serde_json::json!({
            "error": self.to_string(),
            "code": self.error_code(),
        })
    }

    pub fn error_code(&self) -> &'static str {
        match self {
            WebSocketError::SerializationFailed(_) => "SERIALIZATION_ERROR",
            WebSocketError::EncryptionFailed(_) => "ENCRYPTION_ERROR",
            WebSocketError::DecryptionFailed(_) => "DECRYPTION_ERROR",
            WebSocketError::SessionNotFound(_) => "SESSION_NOT_FOUND",
            WebSocketError::AuthenticationFailed(_) => "AUTH_FAILED",
            WebSocketError::RateLimitExceeded => "RATE_LIMIT",
            WebSocketError::InvalidMessage(_) => "INVALID_MESSAGE",
            WebSocketError::Internal(_) => "INTERNAL_ERROR",
        }
    }
}

/// Result type alias for WebSocket operations
pub type WsResult<T> = Result<T, WebSocketError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        let err = WebSocketError::RateLimitExceeded;
        assert_eq!(err.error_code(), "RATE_LIMIT");

        let err = WebSocketError::AuthenticationFailed("invalid token".to_string());
        assert_eq!(err.error_code(), "AUTH_FAILED");
    }

    #[test]
    fn test_json_message() {
        let err = WebSocketError::SessionNotFound("abc123".to_string());
        let json = err.to_json_message();

        assert_eq!(json["code"], "SESSION_NOT_FOUND");
        assert!(json["error"].as_str().unwrap().contains("abc123"));
    }
}
