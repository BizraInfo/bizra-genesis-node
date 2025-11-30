// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SECURITY HEADERS MIDDLEWARE                       ║
// ║  HTTP Security headers for defense-in-depth                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::extract::Request;
use axum::http::header::{HeaderName, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;

/// Security headers middleware implementing OWASP recommended HTTP headers.
///
/// This middleware adds the following security headers to all responses:
/// - Strict-Transport-Security (HSTS): Forces HTTPS connections
/// - Content-Security-Policy (CSP): Prevents XSS and injection attacks
/// - X-Content-Type-Options: Prevents MIME type sniffing
/// - X-Frame-Options: Prevents clickjacking
/// - X-XSS-Protection: Legacy XSS protection (for older browsers)
/// - Referrer-Policy: Controls referrer information leakage
/// - Permissions-Policy: Restricts browser features
/// - Cache-Control: Prevents caching of sensitive responses
pub async fn security_headers_middleware(req: Request, next: Next) -> Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();

    // Strict-Transport-Security (HSTS)
    // Force HTTPS for 1 year, include subdomains, allow preload list
    headers.insert(
        HeaderName::from_static("strict-transport-security"),
        HeaderValue::from_static("max-age=31536000; includeSubDomains; preload"),
    );

    // Content-Security-Policy (CSP)
    // Restrictive policy - customize based on application needs
    // This default allows:
    // - Scripts from same origin only
    // - Styles from same origin with unsafe-inline (for styled-components, etc.)
    // - Images from same origin and data URIs
    // - Fonts from same origin
    // - Connect to same origin and localhost for development
    // - Frame ancestors none (prevent embedding)
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static(
            "default-src 'self'; \
             script-src 'self'; \
             style-src 'self' 'unsafe-inline'; \
             img-src 'self' data: https:; \
             font-src 'self'; \
             connect-src 'self' ws: wss: http://localhost:* https://localhost:*; \
             frame-ancestors 'none'; \
             base-uri 'self'; \
             form-action 'self'; \
             upgrade-insecure-requests",
        ),
    );

    // X-Content-Type-Options
    // Prevents browsers from MIME-sniffing away from declared Content-Type
    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );

    // X-Frame-Options
    // Prevents page from being embedded in iframes (clickjacking protection)
    headers.insert(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );

    // X-XSS-Protection
    // Legacy header for older browsers - modern browsers use CSP
    headers.insert(
        HeaderName::from_static("x-xss-protection"),
        HeaderValue::from_static("1; mode=block"),
    );

    // Referrer-Policy
    // Controls how much referrer information is sent with requests
    // strict-origin-when-cross-origin: Send full URL for same-origin, origin only for cross-origin
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );

    // Permissions-Policy (formerly Feature-Policy)
    // Restricts which browser features can be used
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static(
            "accelerometer=(), \
             camera=(), \
             geolocation=(), \
             gyroscope=(), \
             magnetometer=(), \
             microphone=(), \
             payment=(), \
             usb=()",
        ),
    );

    // Cache-Control for API responses
    // Prevent caching of potentially sensitive data
    // Individual routes can override this for cacheable content
    if !headers.contains_key("cache-control") {
        headers.insert(
            HeaderName::from_static("cache-control"),
            HeaderValue::from_static("no-store, no-cache, must-revalidate, private"),
        );
    }

    // Cross-Origin-Opener-Policy
    // Protects against Spectre-type attacks
    headers.insert(
        HeaderName::from_static("cross-origin-opener-policy"),
        HeaderValue::from_static("same-origin"),
    );

    // Cross-Origin-Resource-Policy
    // Prevents resources from being loaded by other origins
    headers.insert(
        HeaderName::from_static("cross-origin-resource-policy"),
        HeaderValue::from_static("same-origin"),
    );

    response
}

/// Configuration for security headers middleware
#[derive(Debug, Clone)]
pub struct SecurityHeadersConfig {
    /// Enable HSTS header
    pub enable_hsts: bool,
    /// HSTS max-age in seconds (default: 1 year)
    pub hsts_max_age: u64,
    /// Include subdomains in HSTS
    pub hsts_include_subdomains: bool,
    /// Enable HSTS preload
    pub hsts_preload: bool,
    /// Custom CSP policy (None uses default)
    pub custom_csp: Option<String>,
    /// Enable X-Frame-Options
    pub enable_frame_options: bool,
    /// Frame options value (DENY or SAMEORIGIN)
    pub frame_options_value: FrameOptionsValue,
}

#[derive(Debug, Clone, Copy)]
pub enum FrameOptionsValue {
    Deny,
    SameOrigin,
}

impl Default for SecurityHeadersConfig {
    fn default() -> Self {
        Self {
            enable_hsts: true,
            hsts_max_age: 31536000, // 1 year
            hsts_include_subdomains: true,
            hsts_preload: true,
            custom_csp: None,
            enable_frame_options: true,
            frame_options_value: FrameOptionsValue::Deny,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, routing::get, Router};
    use http::Request;
    use tower::ServiceExt;

    async fn test_handler() -> &'static str {
        "OK"
    }

    #[tokio::test]
    async fn test_security_headers_present() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(axum::middleware::from_fn(security_headers_middleware));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let headers = response.headers();

        // Verify all security headers are present
        assert!(headers.contains_key("strict-transport-security"));
        assert!(headers.contains_key("content-security-policy"));
        assert!(headers.contains_key("x-content-type-options"));
        assert!(headers.contains_key("x-frame-options"));
        assert!(headers.contains_key("x-xss-protection"));
        assert!(headers.contains_key("referrer-policy"));
        assert!(headers.contains_key("permissions-policy"));
        assert!(headers.contains_key("cache-control"));
    }

    #[tokio::test]
    async fn test_hsts_header_value() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(axum::middleware::from_fn(security_headers_middleware));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let hsts = response
            .headers()
            .get("strict-transport-security")
            .unwrap()
            .to_str()
            .unwrap();

        assert!(hsts.contains("max-age=31536000"));
        assert!(hsts.contains("includeSubDomains"));
        assert!(hsts.contains("preload"));
    }

    #[tokio::test]
    async fn test_xframe_options_deny() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(axum::middleware::from_fn(security_headers_middleware));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let xfo = response
            .headers()
            .get("x-frame-options")
            .unwrap()
            .to_str()
            .unwrap();

        assert_eq!(xfo, "DENY");
    }

    #[tokio::test]
    async fn test_content_type_options() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(axum::middleware::from_fn(security_headers_middleware));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let xcto = response
            .headers()
            .get("x-content-type-options")
            .unwrap()
            .to_str()
            .unwrap();

        assert_eq!(xcto, "nosniff");
    }
}
