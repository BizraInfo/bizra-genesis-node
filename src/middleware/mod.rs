// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MIDDLEWARE MODULE                                  ║
// ║  HTTP middleware components (auth, rate limiting, logging, etc.)         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod audit;
pub mod circuit_breaker;
pub mod cors;
pub mod csrf;
pub mod jwt;
pub mod metrics_middleware;
pub mod rate_limit;
pub mod rbac;
pub mod request_id;
pub mod security_headers;
pub mod tracing_context;

// Re-export commonly used items for convenience
pub use audit::audit_middleware;
pub use circuit_breaker::{
    CircuitBreaker, CircuitBreakerConfig, CircuitBreakerError, CircuitBreakerRegistry,
    CircuitBreakerStats, CircuitState,
};
pub use cors::{create_cors_layer, default_cors_layer, CorsConfig};
pub use csrf::{csrf_middleware, get_csrf_token, CsrfConfig, CSRF_COOKIE, CSRF_HEADER};
pub use jwt::jwt_auth_middleware;
pub use rbac::{rbac_middleware, require_min_role, require_roles, Permission, RbacChecker, Role};
pub use request_id::{
    request_id_middleware, RequestContext, CORRELATION_ID_HEADER, REQUEST_ID_HEADER,
};
pub use security_headers::security_headers_middleware;
