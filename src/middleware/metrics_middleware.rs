// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - METRICS MIDDLEWARE                                ║
// ║  Application metrics collection middleware                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// Stub middleware - implement when needed
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

pub async fn metrics_middleware(req: Request, next: Next) -> Response {
    // TODO: Implement metrics collection
    next.run(req).await
}
