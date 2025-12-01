//! BIZRA Genesis Node - Observability Stack
//!
//! Complete metrics and monitoring system for production operations.
//!
//! Phase ONE P1.2 Critical Success Factors:
//! - Prometheus metrics export
//! - HTTP + AI + DB instrumentation
//! - Grafana dashboard integration

pub mod http;
pub mod metrics;
pub mod middleware;

pub use http::metrics_handler;
pub use metrics::{global_handle, init_prometheus};
