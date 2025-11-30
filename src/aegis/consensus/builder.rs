use crate::aegis::consensus::WeightedSelectiveConsensus;
use crate::aegis::error::{AegisError, AegisResult};
use std::sync::Arc;

/// Builder for WeightedSelectiveConsensus engine
/// Implements the "Node Builder" pattern for deterministic lifecycle management.
pub struct ConsensusBuilder {
    worker_threads: usize,
    ihsan_threshold: f64,
}

impl ConsensusBuilder {
    /// Create a new builder with default settings
    pub fn new() -> Self {
        Self {
            worker_threads: 4,
            ihsan_threshold: 0.85,
        }
    }

    /// Set the number of worker threads for the Tokio runtime
    pub fn worker_threads(mut self, threads: usize) -> Self {
        self.worker_threads = threads;
        self
    }

    /// Set the Ihsan Gate threshold for ethics scoring
    pub fn ihsan_threshold(mut self, threshold: f64) -> Self {
        self.ihsan_threshold = threshold;
        self
    }

    /// Build and initialize the consensus engine
    /// Returns an error if the runtime fails to initialize
    pub fn build(self) -> AegisResult<WeightedSelectiveConsensus> {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(self.worker_threads)
            .enable_all()
            .build()
            .map_err(|e| {
                AegisError::RuntimeInitError(format!("Failed to initialize Tokio runtime: {}", e))
            })?;

        Ok(WeightedSelectiveConsensus::new(
            Arc::new(runtime),
            self.ihsan_threshold,
        ))
    }
}

impl Default for ConsensusBuilder {
    fn default() -> Self {
        Self::new()
    }
}
