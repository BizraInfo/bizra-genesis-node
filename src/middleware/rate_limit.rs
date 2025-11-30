// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RATE LIMITING TRAIT                                ║
// ║  Minimal rate limiter interface for PoI attestations                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// use std::collections::HashMap;
use uuid::Uuid;

/// Rate limiting error
#[derive(Debug, thiserror::Error)]
pub enum AttestationRateLimitError {
    #[error("Rate limit exceeded")]
    Exceeded,
    #[error("Rate limit backend error: {0}")]
    BackendError(String),
}

/// Rate limiter trait for PoI attestations
#[async_trait::async_trait]
pub trait AttestationRateLimiter: Send + Sync {
    /// Check if a contributor can submit an attestation
    async fn check_contributor(
        &self,
        contributor_id: &Uuid,
    ) -> Result<(), AttestationRateLimitError>;
}

/// Stub rate limiter that allows all requests (for compilation)
pub struct StubRateLimiter;

#[async_trait::async_trait]
impl AttestationRateLimiter for StubRateLimiter {
    async fn check_contributor(
        &self,
        _contributor_id: &Uuid,
    ) -> Result<(), AttestationRateLimitError> {
        // Always allow for stub implementation
        Ok(())
    }
}

/// Default rate limiter that allows requests (compatible with Arc<RateLimiter>)
impl Default for StubRateLimiter {
    fn default() -> Self {
        StubRateLimiter
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP RATE LIMITING (CANONICAL)
// Consolidated from legacy rate_limiter.rs
// ═══════════════════════════════════════════════════════════════════════════

use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Json,
};
use redis::{AsyncCommands, Client as RedisClient};
use std::net::IpAddr;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct RateLimiterConfig {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub burst_capacity: u32,
    pub enabled: bool,
    pub ip_whitelist: Vec<IpAddr>,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 60,
            requests_per_hour: 1000,
            burst_capacity: 10,
            enabled: true,
            ip_whitelist: vec![],
        }
    }
}

#[derive(Clone)]
pub struct RateLimiter {
    redis: RedisClient,
    config: RateLimiterConfig,
}

impl RateLimiter {
    pub fn new(redis: RedisClient, config: RateLimiterConfig) -> Self {
        Self { redis, config }
    }

    pub async fn check_rate_limit(
        &self,
        ip: &IpAddr,
        user_id: Option<&str>,
    ) -> Result<RateLimitInfo, RateLimitError> {
        if !self.config.enabled {
            return Ok(RateLimitInfo {
                allowed: true,
                remaining: u32::MAX,
                reset_at: 0,
                limit: u32::MAX,
            });
        }
        if self.config.ip_whitelist.contains(ip) {
            return Ok(RateLimitInfo {
                allowed: true,
                remaining: u32::MAX,
                reset_at: 0,
                limit: u32::MAX,
            });
        }
        let identifier = if let Some(uid) = user_id {
            format!("user:{}", uid)
        } else {
            format!("ip:{}", ip)
        };
        let minute_info = self
            .check_limit_window(&identifier, "minute", self.config.requests_per_minute, 60)
            .await?;
        if !minute_info.allowed {
            return Ok(minute_info);
        }
        let hour_info = self
            .check_limit_window(&identifier, "hour", self.config.requests_per_hour, 3600)
            .await?;
        Ok(hour_info)
    }

    async fn check_limit_window(
        &self,
        identifier: &str,
        window: &str,
        limit: u32,
        window_seconds: u64,
    ) -> Result<RateLimitInfo, RateLimitError> {
        let mut conn = self
            .redis
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| RateLimitError::BackendError(e.to_string()))?;

        let key = format!("rate_limit:{}:{}", identifier, window);
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let current: Option<u32> = conn.get(&key).await.ok();
        let current = current.unwrap_or(0);

        if current >= limit {
            let ttl: u64 = conn.ttl(&key).await.unwrap_or(window_seconds as i64) as u64;
            return Ok(RateLimitInfo {
                allowed: false,
                remaining: 0,
                reset_at: now + ttl,
                limit,
            });
        }

        let new_count: u32 = conn
            .incr(&key, 1)
            .await
            .map_err(|e| RateLimitError::BackendError(e.to_string()))?;

        if new_count == 1 {
            let _: () = conn
                .expire(&key, window_seconds as i64)
                .await
                .map_err(|e| RateLimitError::BackendError(e.to_string()))?;
        }

        Ok(RateLimitInfo {
            allowed: true,
            remaining: limit - new_count,
            reset_at: now + window_seconds,
            limit,
        })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RateLimitInfo {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_at: u64,
    pub limit: u32,
}

#[derive(Debug)]
pub enum RateLimitError {
    BackendError(String),
    InvalidIp,
}

impl std::fmt::Display for RateLimitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::BackendError(e) => write!(f, "Redis error: {}", e),
            Self::InvalidIp => write!(f, "Invalid IP address"),
        }
    }
}

impl std::error::Error for RateLimitError {}

pub async fn rate_limit_middleware(
    limiter: Arc<RateLimiter>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let ip = extract_ip_address(&headers, &request)?;
    let user_id = extract_user_id(&headers);
    let rate_limit_info = limiter
        .check_rate_limit(&ip, user_id.as_deref())
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Rate limit check failed",
                    "details": e.to_string()
                })),
            )
        })?;

    if !rate_limit_info.allowed {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({
                "error": "Rate limit exceeded",
                "limit": rate_limit_info.limit,
                "reset_at": rate_limit_info.reset_at,
                "message": format!(
                    "Too many requests. Please try again in {} seconds.",
                    rate_limit_info.reset_at.saturating_sub(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                    )
                )
            })),
        ));
    }

    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    if let Ok(v) = rate_limit_info.limit.to_string().parse() {
        headers.insert("X-RateLimit-Limit", v);
    }
    if let Ok(v) = rate_limit_info.remaining.to_string().parse() {
        headers.insert("X-RateLimit-Remaining", v);
    }
    if let Ok(v) = rate_limit_info.reset_at.to_string().parse() {
        headers.insert("X-RateLimit-Reset", v);
    }
    Ok(response)
}

fn extract_ip_address(
    headers: &HeaderMap,
    request: &Request,
) -> Result<IpAddr, (StatusCode, Json<serde_json::Value>)> {
    if let Some(forwarded_for) = headers.get("X-Forwarded-For") {
        if let Ok(forwarded_for_str) = forwarded_for.to_str() {
            if let Some(first_ip) = forwarded_for_str.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<IpAddr>() {
                    return Ok(ip);
                }
            }
        }
    }
    if let Some(real_ip) = headers.get("X-Real-IP") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            if let Ok(ip) = real_ip_str.parse::<IpAddr>() {
                return Ok(ip);
            }
        }
    }
    if let Some(connect_info) = request
        .extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
    {
        return Ok(connect_info.0.ip());
    }
    Err((
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({ "error": "Unable to determine client IP address" })),
    ))
}

fn extract_user_id(headers: &HeaderMap) -> Option<String> {
    if let Some(auth_header) = headers.get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return decode_jwt_user_id(token);
            }
        }
    }
    None
}

fn decode_jwt_user_id(token: &str) -> Option<String> {
    use crate::middleware::jwt::Claims;
    use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
    let secret = match std::env::var("JWT_SECRET") {
        Ok(secret) => secret,
        Err(_) => {
            tracing::warn!(target: "rate_limit", message = "JWT_SECRET not set for user ID extraction");
            return None;
        }
    };
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_required_spec_claims(&["exp", "iat"]);
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    ) {
        Ok(token_data) => Some(token_data.claims.sub.clone()),
        Err(e) => {
            tracing::debug!(target: "rate_limit", message = %format!("Failed to decode JWT for user ID: {}", e));
            None
        }
    }
}
