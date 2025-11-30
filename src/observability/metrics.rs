//! BIZRA Genesis Node - Prometheus Metrics Integration
//!
//! Production-grade metrics collection and export system.
//!
//! Core Metrics Families:
//! - HTTP: requests_total, request_duration_seconds
//! - AI: model_calls_total, model_call_duration_seconds
//! - DB: queries_total, query_duration_seconds (when instrumented)

use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use once_cell::sync::OnceCell;

static PROM_HANDLE: OnceCell<PrometheusHandle> = OnceCell::new();

/// Initialize global Prometheus metrics recorder
///
/// Must be called once at application startup before any other metrics operations.
/// Sets up the global recorder and returns a handle for rendering metrics.
///
/// # Returns
/// `PrometheusHandle` - Used for accessing raw metrics data
///
/// # Example
/// ```rust
/// use bizra_genesis_node::observability::init_prometheus;
///
/// #[tokio::main]
/// async fn main() -> anyhow::Result<()> {
///     // Initialize metrics recorder
///     let _handle = init_prometheus();
///
///     // Metrics will now be recorded globally
///     counter!("test_counter", 1);
///     histogram!("test_histogram", 42.0);
///
///     Ok(())
/// }
/// ```
pub fn init_prometheus() -> Result<PrometheusHandle, String> {
    let builder = PrometheusBuilder::new();

    let handle = builder
        .install_recorder()
        .map_err(|e| format!("Failed to install Prometheus recorder: {}", e))?;

    // Keep a global handle for the /metrics endpoint
    PROM_HANDLE
        .set(handle.clone())
        .map_err(|_| "PrometheusHandle already initialized".to_string())?;

    tracing::info!("Prometheus metrics recorder initialized");

    Ok(handle)
}

/// Get global metrics handle for rendering
///
/// Returns the global Prometheus handle for metrics rendering.
/// Used by the /metrics HTTP endpoint.
///
/// # Returns
/// Reference to the global `PrometheusHandle`
///
/// # Panics
/// Panics if `init_prometheus()` has not been called first
///
/// # Example
/// ```rust
/// use bizra_genesis_node::observability::global_handle;
///
/// let metrics_output = global_handle().render();
/// println!("{}", metrics_output);
/// ```
pub fn global_handle() -> &'static PrometheusHandle {
    PROM_HANDLE
        .get()
        .expect("PrometheusHandle not initialized; call init_prometheus() first")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_initialization() {
        let handle = init_prometheus().unwrap();
        let rendered = handle.render();

        // Should have basic Prometheus format
        assert!(rendered.contains("# TYPE"));
        assert!(rendered.contains("# HELP"));
    }

    #[test]
    fn test_global_handle_access() {
        // This will fail if init hasn't been called
        init_prometheus().unwrap();

        let global_handle = global_handle();
        let rendered = global_handle.render();

        assert!(rendered.contains("# TYPE"));
    }

    #[test]
    fn test_metrics_double_init_fails() {
        // First init should succeed
        let _handle = init_prometheus().unwrap();

        // Second init should fail
        let result = init_prometheus();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already initialized"));
    }
}
