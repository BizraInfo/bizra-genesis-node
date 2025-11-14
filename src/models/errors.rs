// src/models/errors.rs
// Error types for AI model providers

use std::fmt;
use std::error::Error as StdError;

/// Result type for model operations
pub type ModelResult<T> = Result<T, ModelError>;

/// Comprehensive error types for model provider operations
#[derive(Debug)]
pub enum ModelError {
    /// Network communication error
    Network {
        source: Box<dyn StdError + Send + Sync>,
        retryable: bool,
    },

    /// Authentication or authorization failure
    Authentication {
        provider: String,
        message: String,
    },

    /// Rate limit exceeded
    RateLimit {
        provider: String,
        retry_after_secs: Option<u64>,
        message: String,
    },

    /// Requested model not found or not available
    ModelNotFound {
        provider: String,
        model: String,
    },

    /// Invalid request parameters
    InvalidRequest {
        message: String,
        field: Option<String>,
    },

    /// Provider-specific error
    ProviderError {
        provider: String,
        code: Option<String>,
        message: String,
    },

    /// Request timeout
    Timeout {
        duration_ms: u64,
        operation: String,
    },

    /// Insufficient quota or credits
    QuotaExceeded {
        provider: String,
        message: String,
    },

    /// Model output was filtered by safety systems
    ContentFiltered {
        model: String,
        reason: String,
    },

    /// Token limit exceeded
    TokenLimitExceeded {
        requested: usize,
        max_allowed: usize,
        model: String,
    },

    /// Response parsing error
    ParseError {
        message: String,
        raw_response: Option<String>,
    },

    /// Configuration error
    ConfigurationError {
        message: String,
    },

    /// Internal error
    Internal {
        message: String,
    },
}

impl ModelError {
    /// Returns true if this error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            ModelError::Network { retryable, .. } => *retryable,
            ModelError::RateLimit { .. } => true,
            ModelError::Timeout { .. } => true,
            ModelError::ProviderError { code, .. } => {
                // Some provider error codes are retryable (e.g., 503 Service Unavailable)
                matches!(code.as_deref(), Some("503") | Some("504") | Some("429"))
            }
            _ => false,
        }
    }

    /// Returns the provider name if available
    pub fn provider(&self) -> Option<&str> {
        match self {
            ModelError::Authentication { provider, .. }
            | ModelError::RateLimit { provider, .. }
            | ModelError::ModelNotFound { provider, .. }
            | ModelError::ProviderError { provider, .. }
            | ModelError::QuotaExceeded { provider, .. } => Some(provider),
            _ => None,
        }
    }

    /// Returns suggested retry delay in milliseconds
    pub fn retry_after_ms(&self) -> Option<u64> {
        match self {
            ModelError::RateLimit {
                retry_after_secs, ..
            } => retry_after_secs.map(|s| s * 1000),
            ModelError::Network { retryable: true, .. } => Some(1000), // 1 second
            ModelError::Timeout { .. } => Some(2000),                  // 2 seconds
            _ => None,
        }
    }
}

impl fmt::Display for ModelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ModelError::Network { source, retryable } => {
                write!(
                    f,
                    "Network error: {} (retryable: {})",
                    source, retryable
                )
            }
            ModelError::Authentication { provider, message } => {
                write!(f, "Authentication failed for {}: {}", provider, message)
            }
            ModelError::RateLimit {
                provider,
                retry_after_secs,
                message,
            } => {
                if let Some(secs) = retry_after_secs {
                    write!(
                        f,
                        "Rate limit exceeded for {}: {} (retry after {}s)",
                        provider, message, secs
                    )
                } else {
                    write!(f, "Rate limit exceeded for {}: {}", provider, message)
                }
            }
            ModelError::ModelNotFound { provider, model } => {
                write!(f, "Model '{}' not found on provider '{}'", model, provider)
            }
            ModelError::InvalidRequest { message, field } => {
                if let Some(field_name) = field {
                    write!(f, "Invalid request (field '{}'): {}", field_name, message)
                } else {
                    write!(f, "Invalid request: {}", message)
                }
            }
            ModelError::ProviderError {
                provider,
                code,
                message,
            } => {
                if let Some(error_code) = code {
                    write!(
                        f,
                        "Provider error from {} ({}): {}",
                        provider, error_code, message
                    )
                } else {
                    write!(f, "Provider error from {}: {}", provider, message)
                }
            }
            ModelError::Timeout {
                duration_ms,
                operation,
            } => {
                write!(
                    f,
                    "Operation '{}' timed out after {}ms",
                    operation, duration_ms
                )
            }
            ModelError::QuotaExceeded { provider, message } => {
                write!(f, "Quota exceeded for {}: {}", provider, message)
            }
            ModelError::ContentFiltered { model, reason } => {
                write!(f, "Content filtered by {} (reason: {})", model, reason)
            }
            ModelError::TokenLimitExceeded {
                requested,
                max_allowed,
                model,
            } => {
                write!(
                    f,
                    "Token limit exceeded for {}: requested {}, max allowed {}",
                    model, requested, max_allowed
                )
            }
            ModelError::ParseError {
                message,
                raw_response,
            } => {
                if let Some(response) = raw_response {
                    write!(f, "Parse error: {} (response: {})", message, response)
                } else {
                    write!(f, "Parse error: {}", message)
                }
            }
            ModelError::ConfigurationError { message } => {
                write!(f, "Configuration error: {}", message)
            }
            ModelError::Internal { message } => {
                write!(f, "Internal error: {}", message)
            }
        }
    }
}

impl StdError for ModelError {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        match self {
            ModelError::Network { source, .. } => Some(source.as_ref() as &dyn StdError),
            _ => None,
        }
    }
}

// Convenience implementations for common error conversions
impl From<reqwest::Error> for ModelError {
    fn from(err: reqwest::Error) -> Self {
        let retryable = err.is_timeout() || err.is_connect() || err.status().map_or(false, |s| {
            s.is_server_error() || s == reqwest::StatusCode::TOO_MANY_REQUESTS
        });

        ModelError::Network {
            source: Box::new(err),
            retryable,
        }
    }
}

impl From<serde_json::Error> for ModelError {
    fn from(err: serde_json::Error) -> Self {
        ModelError::ParseError {
            message: err.to_string(),
            raw_response: None,
        }
    }
}

impl From<tokio::time::error::Elapsed> for ModelError {
    fn from(err: tokio::time::error::Elapsed) -> Self {
        ModelError::Timeout {
            duration_ms: 0, // Duration is consumed by error
            operation: format!("Operation timed out: {}", err),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retryable_errors() {
        let rate_limit = ModelError::RateLimit {
            provider: "test".to_string(),
            retry_after_secs: Some(60),
            message: "Too many requests".to_string(),
        };
        assert!(rate_limit.is_retryable());

        let auth_error = ModelError::Authentication {
            provider: "test".to_string(),
            message: "Invalid API key".to_string(),
        };
        assert!(!auth_error.is_retryable());

        let timeout = ModelError::Timeout {
            duration_ms: 5000,
            operation: "completion".to_string(),
        };
        assert!(timeout.is_retryable());
    }

    #[test]
    fn test_provider_extraction() {
        let error = ModelError::ModelNotFound {
            provider: "openai".to_string(),
            model: "gpt-5".to_string(),
        };
        assert_eq!(error.provider(), Some("openai"));

        let internal = ModelError::Internal {
            message: "Something went wrong".to_string(),
        };
        assert_eq!(internal.provider(), None);
    }

    #[test]
    fn test_retry_after() {
        let rate_limit = ModelError::RateLimit {
            provider: "test".to_string(),
            retry_after_secs: Some(120),
            message: "Rate limited".to_string(),
        };
        assert_eq!(rate_limit.retry_after_ms(), Some(120_000));

        let no_retry = ModelError::Authentication {
            provider: "test".to_string(),
            message: "Invalid key".to_string(),
        };
        assert_eq!(no_retry.retry_after_ms(), None);
    }

    #[test]
    fn test_error_display() {
        let error = ModelError::TokenLimitExceeded {
            requested: 10000,
            max_allowed: 8192,
            model: "gpt-4".to_string(),
        };
        let display = format!("{}", error);
        assert!(display.contains("10000"));
        assert!(display.contains("8192"));
        assert!(display.contains("gpt-4"));
    }
}
