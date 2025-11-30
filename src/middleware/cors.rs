// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CORS MIDDLEWARE                                     ║
// ║  Cross-Origin Resource Sharing configuration for API security             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::http::{header, HeaderValue, Method};
use tower_http::cors::{Any, CorsLayer};

// ═══════════════════════════════════════════════════════════════════════════
// CORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/// Environment-aware CORS origins
#[derive(Debug, Clone)]
pub struct CorsConfig {
    /// Allowed origins for CORS
    pub allowed_origins: Vec<String>,
    /// Whether to allow credentials (cookies, authorization headers)
    pub allow_credentials: bool,
    /// Max age for preflight cache (seconds)
    pub max_age_seconds: u64,
}

impl Default for CorsConfig {
    fn default() -> Self {
        Self {
            allowed_origins: vec![
                "http://localhost:3000".to_string(),
                "http://localhost:3001".to_string(),
                "http://localhost:5173".to_string(), // Vite dev server
            ],
            allow_credentials: true,
            max_age_seconds: 3600,
        }
    }
}

impl CorsConfig {
    /// Create production CORS config from environment
    pub fn from_env() -> Self {
        let origins = std::env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect::<Vec<_>>();

        let allowed_origins = if origins.is_empty() {
            // Default to development origins if not configured
            tracing::warn!(
                "CORS_ALLOWED_ORIGINS not set, using development defaults. \
                Set CORS_ALLOWED_ORIGINS in production!"
            );
            vec![
                "http://localhost:3000".to_string(),
                "http://localhost:3001".to_string(),
                "http://localhost:5173".to_string(),
            ]
        } else {
            origins
        };

        let allow_credentials = std::env::var("CORS_ALLOW_CREDENTIALS")
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(true);

        let max_age_seconds = std::env::var("CORS_MAX_AGE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3600);

        Self {
            allowed_origins,
            allow_credentials,
            max_age_seconds,
        }
    }

    /// Create restrictive production config
    pub fn production() -> Self {
        Self {
            allowed_origins: vec![
                "https://app.bizra.ai".to_string(),
                "https://dashboard.bizra.ai".to_string(),
                "https://api.bizra.ai".to_string(),
            ],
            allow_credentials: true,
            max_age_seconds: 86400, // 24 hours
        }
    }

    /// Create permissive development config
    pub fn development() -> Self {
        Self::default()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORS LAYER CREATION
// ═══════════════════════════════════════════════════════════════════════════

/// Create a CORS layer from configuration
///
/// # Example
/// ```rust,ignore
/// use bizra_genesis_node::middleware::cors::{CorsConfig, create_cors_layer};
///
/// let cors = create_cors_layer(CorsConfig::from_env());
/// let app = Router::new()
///     .route("/api/health", get(health_handler))
///     .layer(cors);
/// ```
pub fn create_cors_layer(config: CorsConfig) -> CorsLayer {
    let allowed_methods = [
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::PATCH,
        Method::DELETE,
        Method::OPTIONS,
    ];

    let allowed_headers = [
        header::AUTHORIZATION,
        header::CONTENT_TYPE,
        header::ACCEPT,
        header::ORIGIN,
        header::HeaderName::from_static("x-requested-with"),
        header::HeaderName::from_static("x-request-id"),
    ];

    let expose_headers = [
        header::HeaderName::from_static("x-request-id"),
        header::HeaderName::from_static("x-response-time"),
    ];

    // Build the CORS layer based on configuration
    let mut cors = CorsLayer::new()
        .allow_methods(allowed_methods)
        .allow_headers(allowed_headers)
        .expose_headers(expose_headers)
        .max_age(std::time::Duration::from_secs(config.max_age_seconds));

    // Set allowed origins
    if config.allowed_origins.is_empty() {
        // If no origins specified, allow any (not recommended for production)
        tracing::warn!("CORS: No origins specified, allowing any origin");
        cors = cors.allow_origin(Any);
    } else {
        // Parse origins into HeaderValues
        let origins: Vec<HeaderValue> = config
            .allowed_origins
            .iter()
            .filter_map(|origin| {
                origin.parse::<HeaderValue>().ok().or_else(|| {
                    tracing::error!("Invalid CORS origin: {}", origin);
                    None
                })
            })
            .collect();

        if origins.is_empty() {
            tracing::error!("No valid CORS origins after parsing, allowing any");
            cors = cors.allow_origin(Any);
        } else {
            tracing::info!(
                "CORS configured with {} allowed origins: {:?}",
                origins.len(),
                config.allowed_origins
            );
            cors = cors.allow_origin(origins);
        }
    }

    // Configure credentials
    if config.allow_credentials {
        cors = cors.allow_credentials(true);
    }

    cors
}

/// Create default CORS layer from environment
///
/// This is the recommended way to create a CORS layer for the API server.
/// It reads configuration from environment variables:
/// - `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins
/// - `CORS_ALLOW_CREDENTIALS`: Whether to allow credentials (default: true)
/// - `CORS_MAX_AGE`: Preflight cache max age in seconds (default: 3600)
pub fn default_cors_layer() -> CorsLayer {
    create_cors_layer(CorsConfig::from_env())
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = CorsConfig::default();
        assert_eq!(config.allowed_origins.len(), 3);
        assert!(config.allow_credentials);
        assert_eq!(config.max_age_seconds, 3600);
    }

    #[test]
    fn test_production_config() {
        let config = CorsConfig::production();
        assert!(config
            .allowed_origins
            .iter()
            .all(|o| o.starts_with("https://")));
        assert!(config.allow_credentials);
        assert_eq!(config.max_age_seconds, 86400);
    }

    #[test]
    fn test_development_config() {
        let config = CorsConfig::development();
        assert!(config
            .allowed_origins
            .iter()
            .all(|o| o.starts_with("http://localhost")));
    }

    #[test]
    fn test_create_cors_layer_with_valid_origins() {
        let config = CorsConfig {
            allowed_origins: vec![
                "http://localhost:3000".to_string(),
                "https://app.bizra.ai".to_string(),
            ],
            allow_credentials: true,
            max_age_seconds: 3600,
        };
        // This should not panic
        let _layer = create_cors_layer(config);
    }

    #[test]
    fn test_create_cors_layer_empty_origins() {
        let config = CorsConfig {
            allowed_origins: vec![],
            allow_credentials: false,
            max_age_seconds: 1800,
        };
        // This should not panic, will allow any origin
        let _layer = create_cors_layer(config);
    }
}
