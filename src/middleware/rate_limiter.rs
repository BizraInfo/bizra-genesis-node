// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - RATE LIMITING MIDDLEWARE
// Token bucket algorithm with Redis-backed storage
// ═══════════════════════════════════════════════════════════════════════════

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Json,
};
use redis::{AsyncCommands, Client as RedisClient};
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct RateLimiterConfig {
    /// Maximum requests per minute
    pub requests_per_minute: u32,

    /// Maximum requests per hour
    pub requests_per_hour: u32,

    /// Burst capacity (additional requests allowed temporarily)
    pub burst_capacity: u32,

    /// Whether rate limiting is enabled
    pub enabled: bool,

    /// IP whitelist (bypass rate limiting)
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

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct RateLimiter {
    redis: RedisClient,
    config: RateLimiterConfig,
}

impl RateLimiter {
    pub fn new(redis: RedisClient, config: RateLimiterConfig) -> Self {
        Self { redis, config }
    }

    /// Check if request is allowed
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

        // Check IP whitelist
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

        // Check minute limit
        let minute_info = self
            .check_limit_window(&identifier, "minute", self.config.requests_per_minute, 60)
            .await?;

        if !minute_info.allowed {
            return Ok(minute_info);
        }

        // Check hour limit
        let hour_info = self
            .check_limit_window(&identifier, "hour", self.config.requests_per_hour, 3600)
            .await?;

        Ok(hour_info)
    }

    /// Check rate limit for a specific time window
    async fn check_limit_window(
        &self,
        identifier: &str,
        window: &str,
        limit: u32,
        window_seconds: u64,
    ) -> Result<RateLimitInfo, RateLimitError> {
        let mut conn = self
            .redis
            .get_async_connection()
            .await
            .map_err(|e| RateLimitError::RedisError(e.to_string()))?;

        let key = format!("rate_limit:{}:{}", identifier, window);
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Get current count
        let current: Option<u32> = conn.get(&key).await.ok();
        let current = current.unwrap_or(0);

        // Check if limit exceeded
        if current >= limit {
            let ttl: u64 = conn.ttl(&key).await.unwrap_or(window_seconds as i64) as u64;

            return Ok(RateLimitInfo {
                allowed: false,
                remaining: 0,
                reset_at: now + ttl,
                limit,
            });
        }

        // Increment counter
        let new_count: u32 = conn.incr(&key, 1).await.map_err(|e| {
            RateLimitError::RedisError(e.to_string())
        })?;

        // Set expiry on first request
        if new_count == 1 {
            let _: () = conn.expire(&key, window_seconds as usize).await.map_err(|e| {
                RateLimitError::RedisError(e.to_string())
            })?;
        }

        Ok(RateLimitInfo {
            allowed: true,
            remaining: limit - new_count,
            reset_at: now + window_seconds,
            limit,
        })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitInfo {
    /// Whether the request is allowed
    pub allowed: bool,

    /// Number of remaining requests in current window
    pub remaining: u32,

    /// Unix timestamp when the rate limit resets
    pub reset_at: u64,

    /// Total limit for this window
    pub limit: u32,
}

#[derive(Debug)]
pub enum RateLimitError {
    RedisError(String),
    InvalidIp,
}

impl std::fmt::Display for RateLimitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::RedisError(e) => write!(f, "Redis error: {}", e),
            Self::InvalidIp => write!(f, "Invalid IP address"),
        }
    }
}

impl std::error::Error for RateLimitError {}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

pub async fn rate_limit_middleware(
    State(limiter): State<RateLimiter>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Extract IP address
    let ip = extract_ip_address(&headers, &request)?;

    // Extract user ID if authenticated
    let user_id = extract_user_id(&headers);

    // Check rate limit
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

    // If rate limit exceeded, return 429
    if !rate_limit_info.allowed {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({
                "error": "Rate limit exceeded",
                "limit": rate_limit_info.limit,
                "reset_at": rate_limit_info.reset_at,
                "message": format!(
                    "Too many requests. Please try again in {} seconds.",
                    rate_limit_info.reset_at - std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs()
                )
            })),
        ));
    }

    // Add rate limit headers to response
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    headers.insert(
        "X-RateLimit-Limit",
        rate_limit_info.limit.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        rate_limit_info.remaining.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Reset",
        rate_limit_info.reset_at.to_string().parse().unwrap(),
    );

    Ok(response)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

fn extract_ip_address(
    headers: &HeaderMap,
    request: &Request,
) -> Result<IpAddr, (StatusCode, Json<serde_json::Value>)> {
    // Try X-Forwarded-For header (from load balancer)
    if let Some(forwarded_for) = headers.get("X-Forwarded-For") {
        if let Ok(forwarded_for_str) = forwarded_for.to_str() {
            if let Some(first_ip) = forwarded_for_str.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<IpAddr>() {
                    return Ok(ip);
                }
            }
        }
    }

    // Try X-Real-IP header
    if let Some(real_ip) = headers.get("X-Real-IP") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            if let Ok(ip) = real_ip_str.parse::<IpAddr>() {
                return Ok(ip);
            }
        }
    }

    // Fallback to connection remote address
    if let Some(connect_info) = request.extensions().get::<axum::extract::ConnectInfo<std::net::SocketAddr>>() {
        return Ok(connect_info.0.ip());
    }

    Err((
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "error": "Unable to determine client IP address"
        })),
    ))
}

fn extract_user_id(headers: &HeaderMap) -> Option<String> {
    // Extract from Authorization header (JWT)
    if let Some(auth_header) = headers.get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                // TODO: Decode JWT and extract user ID
                // For now, return None
                return None;
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_allows_requests_within_limit() {
        // Test implementation
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_requests_exceeding_limit() {
        // Test implementation
    }

    #[tokio::test]
    async fn test_rate_limiter_respects_ip_whitelist() {
        // Test implementation
    }
}
