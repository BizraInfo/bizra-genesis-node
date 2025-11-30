//! BIZRA Genesis Node - Observability Stack
//!
//! Complete metrics and monitoring system for production operations.
//!
//! Phase ONE P1.2 Critical Success Factors:
//! - Prometheus metrics export
//! - HTTP + AI + DB instrumentation
//! - Grafana dashboard integration

pub mod metrics;
pub mod http;
pub mod middleware;

pub use metrics::{init_prometheus, global_handle};
pub use http::metrics_handler;
