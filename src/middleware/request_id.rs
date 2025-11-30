// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - REQUEST ID MIDDLEWARE                               ║
// ║  Production-grade request correlation for distributed tracing             ║
// ║  Version: 2.0.0 - Elite Full-Stack Blueprint                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// This middleware implements request correlation IDs following industry best practices:
// - W3C Trace Context (traceparent/tracestate headers)
// - X-Request-ID for legacy systems
// - X-Correlation-ID for cross-service tracing
//
// # Header Priority (incoming requests)
// 1. traceparent (W3C standard)
// 2. X-Correlation-ID
// 3. X-Request-ID
// 4. Generate new UUID v7 (time-ordered for efficient indexing)

use axum::{
    body::Body,
    extract::Request,
    http::{header::HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info_span, Instrument};
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════════════════
// HEADER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/// W3C Trace Context header
pub const TRACEPARENT_HEADER: &str = "traceparent";

/// Correlation ID header for cross-service tracing
pub const CORRELATION_ID_HEADER: &str = "x-correlation-id";

/// Request ID header (legacy/fallback)
pub const REQUEST_ID_HEADER: &str = "x-request-id";

/// Response header for client visibility
pub const RESPONSE_REQUEST_ID_HEADER: &str = "x-request-id";

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/// Request context containing all correlation information
#[derive(Debug, Clone)]
pub struct RequestContext {
    /// Unique request identifier (UUID v7 for time-ordering)
    pub request_id: String,
    /// Correlation ID for cross-service tracing
    pub correlation_id: String,
    /// W3C trace parent (if provided)
    pub trace_parent: Option<String>,
    /// Request start timestamp (microseconds since epoch)
    pub start_time_us: u64,
    /// Client IP address
    pub client_ip: Option<String>,
    /// User agent
    pub user_agent: Option<String>,
}

impl RequestContext {
    /// Create a new request context, extracting or generating IDs
    pub fn from_request(req: &Request<Body>) -> Self {
        let headers = req.headers();

        // Extract trace parent (W3C standard)
        let trace_parent = headers
            .get(TRACEPARENT_HEADER)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        // Extract or generate correlation ID
        let correlation_id = headers
            .get(CORRELATION_ID_HEADER)
            .or_else(|| headers.get(REQUEST_ID_HEADER))
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(generate_uuid_v7);

        // Generate unique request ID (always new per request)
        let request_id = generate_uuid_v7();

        // Extract client info
        let client_ip = extract_client_ip(req);
        let user_agent = headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        // Timestamp with microsecond precision
        let start_time_us = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_micros() as u64)
            .unwrap_or(0);

        Self {
            request_id,
            correlation_id,
            trace_parent,
            start_time_us,
            client_ip,
            user_agent,
        }
    }

    /// Get the span-compatible trace ID
    pub fn trace_id(&self) -> &str {
        self.trace_parent.as_deref().unwrap_or(&self.correlation_id)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// Request ID middleware for correlation and tracing
///
/// # Features
/// - Extracts or generates request/correlation IDs
/// - Injects IDs into response headers for client visibility
/// - Creates tracing span with request context
/// - Logs request start/end with timing
///
/// # Example
/// ```ignore
/// let app = Router::new()
///     .route("/api", get(handler))
///     .layer(axum::middleware::from_fn(request_id_middleware));
/// ```
pub async fn request_id_middleware(req: Request, next: Next) -> Response {
    // Extract request context
    let ctx = RequestContext::from_request(&req);

    // Extract request metadata for logging
    let method = req.method().clone();
    let uri = req.uri().path().to_string();
    let query = req.uri().query().map(|q| q.to_string());

    // Create tracing span with request context
    let span = info_span!(
        "http_request",
        request_id = %ctx.request_id,
        correlation_id = %ctx.correlation_id,
        trace_id = %ctx.trace_id(),
        method = %method,
        uri = %uri,
        client_ip = ?ctx.client_ip,
    );

    // Log request start
    tracing::info!(
        parent: &span,
        request_id = %ctx.request_id,
        correlation_id = %ctx.correlation_id,
        method = %method,
        uri = %uri,
        query = ?query,
        user_agent = ?ctx.user_agent,
        "Request started"
    );

    // Execute request within span
    let response = async move {
        let mut response = next.run(req).await;

        // Inject correlation headers into response
        let headers = response.headers_mut();

        if let Ok(val) = HeaderValue::from_str(&ctx.request_id) {
            headers.insert(HeaderName::from_static(RESPONSE_REQUEST_ID_HEADER), val);
        }

        if let Ok(val) = HeaderValue::from_str(&ctx.correlation_id) {
            headers.insert(HeaderName::from_static(CORRELATION_ID_HEADER), val);
        }

        // Calculate request duration
        let end_time_us = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_micros() as u64)
            .unwrap_or(0);
        let duration_us = end_time_us.saturating_sub(ctx.start_time_us);
        let duration_ms = duration_us as f64 / 1000.0;

        // Log request completion
        tracing::info!(
            req_id = %ctx.request_id,
            corr_id = %ctx.correlation_id,
            status = %response.status().as_u16(),
            duration_ms = %duration_ms,
            "Request completed"
        );

        response
    }
    .instrument(span)
    .await;

    response
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Generate a UUID v7 (time-ordered UUID)
///
/// UUID v7 provides:
/// - Monotonically increasing values for efficient database indexing
/// - Embedded timestamp for debugging
/// - Collision resistance across distributed systems
fn generate_uuid_v7() -> String {
    // UUID v7: timestamp (48 bits) + version (4 bits) + random (12 bits) + variant (2 bits) + random (62 bits)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let timestamp_ms = now.as_millis() as u64;

    // Build UUID v7 manually for time-ordering
    let mut bytes = [0u8; 16];

    // Timestamp (first 48 bits = 6 bytes)
    bytes[0] = ((timestamp_ms >> 40) & 0xFF) as u8;
    bytes[1] = ((timestamp_ms >> 32) & 0xFF) as u8;
    bytes[2] = ((timestamp_ms >> 24) & 0xFF) as u8;
    bytes[3] = ((timestamp_ms >> 16) & 0xFF) as u8;
    bytes[4] = ((timestamp_ms >> 8) & 0xFF) as u8;
    bytes[5] = (timestamp_ms & 0xFF) as u8;

    // Random data for uniqueness
    let random1: u16 = fastrand::u16(..);
    let random2: u64 = fastrand::u64(..);

    // Version 7 indicator (bits 48-51)
    bytes[6] = (0x70 | ((random1 >> 8) & 0x0F)) as u8;
    bytes[7] = (random1 & 0xFF) as u8;

    // Variant (bits 64-65) + random
    bytes[8] = (0x80 | ((random2 >> 56) & 0x3F)) as u8;
    bytes[9] = ((random2 >> 48) & 0xFF) as u8;
    bytes[10] = ((random2 >> 40) & 0xFF) as u8;
    bytes[11] = ((random2 >> 32) & 0xFF) as u8;
    bytes[12] = ((random2 >> 24) & 0xFF) as u8;
    bytes[13] = ((random2 >> 16) & 0xFF) as u8;
    bytes[14] = ((random2 >> 8) & 0xFF) as u8;
    bytes[15] = (random2 & 0xFF) as u8;

    Uuid::from_bytes(bytes).to_string()
}

/// Extract client IP from request headers
///
/// Checks headers in priority order:
/// 1. X-Forwarded-For (first IP in chain)
/// 2. X-Real-IP
/// 3. CF-Connecting-IP (Cloudflare)
/// 4. True-Client-IP (Akamai)
fn extract_client_ip(req: &Request<Body>) -> Option<String> {
    let headers = req.headers();

    // X-Forwarded-For (may contain multiple IPs)
    if let Some(xff) = headers.get("x-forwarded-for") {
        if let Ok(xff_str) = xff.to_str() {
            // Take first IP (original client)
            if let Some(first_ip) = xff_str.split(',').next() {
                return Some(first_ip.trim().to_string());
            }
        }
    }

    // X-Real-IP
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(ip) = real_ip.to_str() {
            return Some(ip.to_string());
        }
    }

    // CF-Connecting-IP (Cloudflare)
    if let Some(cf_ip) = headers.get("cf-connecting-ip") {
        if let Ok(ip) = cf_ip.to_str() {
            return Some(ip.to_string());
        }
    }

    // True-Client-IP (Akamai)
    if let Some(true_ip) = headers.get("true-client-ip") {
        if let Ok(ip) = true_ip.to_str() {
            return Some(ip.to_string());
        }
    }

    None
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION TRAIT FOR EASY ACCESS
// ═══════════════════════════════════════════════════════════════════════════

/// Extension trait for extracting request context from extensions
pub trait RequestContextExt {
    fn request_context(&self) -> Option<&RequestContext>;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uuid_v7_generation() {
        let id1 = generate_uuid_v7();
        let id2 = generate_uuid_v7();

        // Should be valid UUIDs
        assert!(Uuid::parse_str(&id1).is_ok());
        assert!(Uuid::parse_str(&id2).is_ok());

        // Should be different
        assert_ne!(id1, id2);

        // Should be 36 chars (UUID format with hyphens)
        assert_eq!(id1.len(), 36);
    }

    #[test]
    fn test_uuid_v7_ordering() {
        // UUID v7 should be time-ordered when generated with time delays
        // Note: UUIDs generated in the same millisecond may not be ordered
        // due to random bits, so we test with a time delay
        let id1 = generate_uuid_v7();
        std::thread::sleep(std::time::Duration::from_millis(2));
        let id2 = generate_uuid_v7();

        // IDs generated 2ms apart should be time-ordered
        assert!(
            id2 >= id1,
            "UUID v7 should be time-ordered with delay: {} should be >= {}",
            id2,
            id1
        );
    }

    #[test]
    fn test_uuid_v7_version_bits() {
        let id = generate_uuid_v7();
        let uuid = Uuid::parse_str(&id).unwrap();
        let bytes = uuid.as_bytes();

        // Check version (should be 7)
        let version = (bytes[6] >> 4) & 0x0F;
        assert_eq!(version, 7, "UUID should be version 7");

        // Check variant (should be RFC 4122)
        let variant = (bytes[8] >> 6) & 0x03;
        assert_eq!(variant, 2, "UUID should have RFC 4122 variant");
    }

    #[test]
    fn test_request_context_generation() {
        use axum::http::Request;

        let req = Request::builder().uri("/test").body(Body::empty()).unwrap();

        let ctx = RequestContext::from_request(&req);

        assert!(!ctx.request_id.is_empty());
        assert!(!ctx.correlation_id.is_empty());
        assert!(ctx.start_time_us > 0);
    }

    #[test]
    fn test_request_context_with_headers() {
        use axum::http::Request;

        let req = Request::builder()
            .uri("/test")
            .header("x-correlation-id", "test-correlation-123")
            .header("x-forwarded-for", "192.168.1.1, 10.0.0.1")
            .header("user-agent", "TestClient/1.0")
            .body(Body::empty())
            .unwrap();

        let ctx = RequestContext::from_request(&req);

        assert_eq!(ctx.correlation_id, "test-correlation-123");
        assert_eq!(ctx.client_ip, Some("192.168.1.1".to_string()));
        assert_eq!(ctx.user_agent, Some("TestClient/1.0".to_string()));
    }

    #[test]
    fn test_request_context_traceparent() {
        use axum::http::Request;

        let traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
        let req = Request::builder()
            .uri("/test")
            .header("traceparent", traceparent)
            .body(Body::empty())
            .unwrap();

        let ctx = RequestContext::from_request(&req);

        assert_eq!(ctx.trace_parent, Some(traceparent.to_string()));
        assert_eq!(ctx.trace_id(), traceparent);
    }
}
