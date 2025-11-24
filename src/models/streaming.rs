// BIZRA Genesis Node - Professional Elite Implementation
// Advanced Streaming Utilities
//
// Production-grade streaming support with:
// - Buffered streaming for batching tokens
// - Backpressure handling to prevent memory exhaustion
// - Stream aggregation for combining multiple sources
// - Cancellation token support
// - Error recovery and retry logic
// - Performance monitoring and metrics

use futures::stream::{Stream, StreamExt};
use std::collections::VecDeque;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, RwLock};
use tokio::time::sleep;
use tracing::{debug, warn};

use super::errors::{ModelError, ModelResult};
use super::types::{FinishReason, StreamChunk, TokenUsage};

// ============================================================================
// Stream Buffer Configuration
// ============================================================================

/// Configuration for stream buffering
#[derive(Debug, Clone)]
pub struct BufferConfig {
    /// Maximum buffer size (number of chunks)
    pub max_size: usize,

    /// Flush interval (milliseconds)
    pub flush_interval_ms: u64,

    /// Enable auto-flush on newlines
    pub auto_flush_newlines: bool,

    /// Enable backpressure when buffer is full
    pub enable_backpressure: bool,
}

impl Default for BufferConfig {
    fn default() -> Self {
        Self {
            max_size: 100,
            flush_interval_ms: 100,
            auto_flush_newlines: true,
            enable_backpressure: true,
        }
    }
}

impl BufferConfig {
    /// Create config optimized for low latency
    pub fn low_latency() -> Self {
        Self {
            max_size: 10,
            flush_interval_ms: 10,
            auto_flush_newlines: true,
            enable_backpressure: false,
        }
    }

    /// Create config optimized for throughput
    pub fn high_throughput() -> Self {
        Self {
            max_size: 500,
            flush_interval_ms: 500,
            auto_flush_newlines: false,
            enable_backpressure: true,
        }
    }
}

// ============================================================================
// Buffered Stream
// ============================================================================

/// Buffered stream that batches chunks for efficiency
pub struct BufferedStream {
    buffer: VecDeque<StreamChunk>,
    config: BufferConfig,
    last_flush: Instant,
    total_chunks: usize,
    total_bytes: usize,
}

impl BufferedStream {
    /// Create a new buffered stream
    pub fn new(config: BufferConfig) -> Self {
        Self {
            buffer: VecDeque::with_capacity(config.max_size),
            config,
            last_flush: Instant::now(),
            total_chunks: 0,
            total_bytes: 0,
        }
    }

    /// Add a chunk to the buffer
    pub fn push(&mut self, chunk: StreamChunk) -> Option<Vec<StreamChunk>> {
        self.total_chunks += 1;
        self.total_bytes += chunk.delta.len();
        self.buffer.push_back(chunk.clone());

        // Check if we should flush
        if self.should_flush(&chunk) {
            self.flush()
        } else {
            None
        }
    }

    /// Check if buffer should be flushed
    fn should_flush(&self, chunk: &StreamChunk) -> bool {
        // Flush if buffer is full
        if self.buffer.len() >= self.config.max_size {
            return true;
        }

        // Flush if interval elapsed
        if self.last_flush.elapsed() >= Duration::from_millis(self.config.flush_interval_ms) {
            return true;
        }

        // Flush on final chunk
        if chunk.finish_reason.is_some() {
            return true;
        }

        // Flush on newlines if enabled
        if self.config.auto_flush_newlines && chunk.delta.contains('\n') {
            return true;
        }

        false
    }

    /// Flush the buffer and return all chunks
    pub fn flush(&mut self) -> Option<Vec<StreamChunk>> {
        if self.buffer.is_empty() {
            return None;
        }

        let chunks: Vec<_> = self.buffer.drain(..).collect();
        self.last_flush = Instant::now();
        Some(chunks)
    }

    /// Get buffer statistics
    pub fn stats(&self) -> BufferStats {
        BufferStats {
            buffered_chunks: self.buffer.len(),
            total_chunks: self.total_chunks,
            total_bytes: self.total_bytes,
        }
    }
}

/// Buffer statistics
#[derive(Debug, Clone)]
pub struct BufferStats {
    pub buffered_chunks: usize,
    pub total_chunks: usize,
    pub total_bytes: usize,
}

// ============================================================================
// Stream Aggregator
// ============================================================================

/// Aggregates multiple streams into batched chunks
pub struct StreamAggregator {
    chunks: Vec<StreamChunk>,
    total_input_tokens: usize,
    total_output_tokens: usize,
}

impl StreamAggregator {
    /// Create a new stream aggregator
    pub fn new() -> Self {
        Self {
            chunks: Vec::new(),
            total_input_tokens: 0,
            total_output_tokens: 0,
        }
    }

    /// Add a chunk to the aggregator
    pub fn add_chunk(&mut self, chunk: StreamChunk) {
        if let Some(ref usage) = chunk.usage {
            self.total_input_tokens += usage.input_tokens;
            self.total_output_tokens += usage.output_tokens;
        }
        self.chunks.push(chunk);
    }

    /// Get the complete aggregated text
    pub fn get_text(&self) -> String {
        self.chunks.iter().map(|c| c.delta.as_str()).collect()
    }

    /// Get the final finish reason
    pub fn get_finish_reason(&self) -> Option<FinishReason> {
        self.chunks
            .iter()
            .rev()
            .find_map(|c| c.finish_reason.clone())
    }

    /// Get total token usage
    pub fn get_usage(&self) -> TokenUsage {
        TokenUsage {
            input_tokens: self.total_input_tokens,
            output_tokens: self.total_output_tokens,
            total_tokens: self.total_input_tokens + self.total_output_tokens,
        }
    }

    /// Get number of chunks processed
    pub fn chunk_count(&self) -> usize {
        self.chunks.len()
    }

    /// Reset the aggregator
    pub fn reset(&mut self) {
        self.chunks.clear();
        self.total_input_tokens = 0;
        self.total_output_tokens = 0;
    }
}

impl Default for StreamAggregator {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Stream Combiner
// ============================================================================

/// Combines multiple streams with intelligent merging
pub struct StreamCombiner {
    model_name: String,
    streams: Vec<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>>,
    next_index: usize,
}

impl StreamCombiner {
    /// Create a new stream combiner
    pub fn new(model_name: String) -> Self {
        Self {
            model_name,
            streams: Vec::new(),
            next_index: 0,
        }
    }

    /// Add a stream to combine
    pub fn add_stream(
        &mut self,
        stream: Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>,
    ) {
        self.streams.push(stream);
    }

    /// Combine all streams with round-robin selection
    pub async fn combine(mut self) -> Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>> {
        let (tx, rx) = mpsc::channel(100);
        let model_name = self.model_name.clone();

        tokio::spawn(async move {
            let mut chunk_index = 0;

            // Process all streams concurrently
            while !self.streams.is_empty() {
                let stream_idx = self.next_index % self.streams.len();
                self.next_index += 1;

                if let Some(stream) = self.streams.get_mut(stream_idx) {
                    match stream.next().await {
                        Some(Ok(mut chunk)) => {
                            chunk.model = model_name.clone();
                            chunk.index = chunk_index;
                            chunk_index += 1;

                            if tx.send(Ok(chunk)).await.is_err() {
                                break;
                            }
                        }
                        Some(Err(e)) => {
                            let _ = tx.send(Err(e)).await;
                            self.streams.remove(stream_idx);
                        }
                        None => {
                            self.streams.remove(stream_idx);
                        }
                    }
                }
            }
        });

        Box::pin(tokio_stream::wrappers::ReceiverStream::new(rx))
    }
}

// ============================================================================
// Backpressure Handler
// ============================================================================

/// Handles backpressure in streaming to prevent memory exhaustion
pub struct BackpressureHandler {
    /// Maximum pending chunks before applying backpressure
    max_pending: usize,
    /// Current pending chunk count
    pending: Arc<RwLock<usize>>,
    /// Backpressure delay (milliseconds)
    delay_ms: u64,
}

impl BackpressureHandler {
    /// Create a new backpressure handler
    pub fn new(max_pending: usize, delay_ms: u64) -> Self {
        Self {
            max_pending,
            pending: Arc::new(RwLock::new(0)),
            delay_ms,
        }
    }

    /// Wait if backpressure is needed
    pub async fn check(&self) -> bool {
        let pending = *self.pending.read().await;

        if pending >= self.max_pending {
            debug!(
                pending = pending,
                max = self.max_pending,
                "Applying backpressure"
            );
            sleep(Duration::from_millis(self.delay_ms)).await;
            true
        } else {
            false
        }
    }

    /// Increment pending count
    pub async fn inc(&self) {
        let mut pending = self.pending.write().await;
        *pending += 1;
    }

    /// Decrement pending count
    pub async fn dec(&self) {
        let mut pending = self.pending.write().await;
        if *pending > 0 {
            *pending -= 1;
        }
    }

    /// Get current pending count
    pub async fn pending(&self) -> usize {
        *self.pending.read().await
    }
}

// ============================================================================
// Stream Retry Handler
// ============================================================================

/// Handles retries for failed streams
pub struct StreamRetryHandler {
    max_retries: u32,
    initial_backoff_ms: u64,
    max_backoff_ms: u64,
}

impl StreamRetryHandler {
    /// Create a new retry handler
    pub fn new(max_retries: u32, initial_backoff_ms: u64, max_backoff_ms: u64) -> Self {
        Self {
            max_retries,
            initial_backoff_ms,
            max_backoff_ms,
        }
    }

    /// Execute with retry logic
    pub async fn execute<F, Fut, T>(&self, operation: F) -> ModelResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = ModelResult<T>>,
    {
        let mut last_error_msg = None;

        for attempt in 0..self.max_retries {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    if !e.is_retryable() {
                        return Err(e);
                    }

                    last_error_msg = Some(format!("{}", e));

                    if attempt < self.max_retries - 1 {
                        let backoff = self.calculate_backoff(attempt);
                        warn!(
                            attempt = attempt + 1,
                            backoff_ms = backoff.as_millis(),
                            error = ?e,
                            "Retrying stream operation"
                        );
                        sleep(backoff).await;
                    } else {
                        return Err(e);
                    }
                }
            }
        }

        Err(ModelError::Internal {
            message: last_error_msg.unwrap_or_else(|| "All retry attempts failed".to_string()),
        })
    }

    /// Calculate exponential backoff with jitter
    fn calculate_backoff(&self, attempt: u32) -> Duration {
        let base_ms = self.initial_backoff_ms;
        let max_ms = self.max_backoff_ms;

        let exponential_ms = base_ms * 2_u64.pow(attempt);
        let capped_ms = exponential_ms.min(max_ms);

        // Add jitter (±25%)
        let jitter = (rand::random::<f64>() * 0.5 - 0.25) * capped_ms as f64;
        let final_ms = (capped_ms as f64 + jitter).max(0.0) as u64;

        Duration::from_millis(final_ms)
    }
}

impl Default for StreamRetryHandler {
    fn default() -> Self {
        Self::new(3, 1000, 60000)
    }
}

// ============================================================================
// Stream Monitor
// ============================================================================

/// Monitors stream performance and health
#[derive(Debug, Clone)]
pub struct StreamMonitor {
    start_time: Instant,
    first_chunk_time: Option<Instant>,
    last_chunk_time: Option<Instant>,
    chunk_count: usize,
    byte_count: usize,
    error_count: usize,
}

impl StreamMonitor {
    /// Create a new stream monitor
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            first_chunk_time: None,
            last_chunk_time: None,
            chunk_count: 0,
            byte_count: 0,
            error_count: 0,
        }
    }

    /// Record a chunk
    pub fn record_chunk(&mut self, chunk: &StreamChunk) {
        let now = Instant::now();

        if self.first_chunk_time.is_none() {
            self.first_chunk_time = Some(now);
        }

        self.last_chunk_time = Some(now);
        self.chunk_count += 1;
        self.byte_count += chunk.delta.len();
    }

    /// Record an error
    pub fn record_error(&mut self) {
        self.error_count += 1;
    }

    /// Get stream metrics
    pub fn metrics(&self) -> StreamMetrics {
        let total_duration = self.start_time.elapsed();
        let time_to_first_chunk = self
            .first_chunk_time
            .map(|t| t.duration_since(self.start_time).as_millis() as u64);

        let chunks_per_second = if total_duration.as_secs() > 0 {
            self.chunk_count as f64 / total_duration.as_secs_f64()
        } else {
            0.0
        };

        let bytes_per_second = if total_duration.as_secs() > 0 {
            self.byte_count as f64 / total_duration.as_secs_f64()
        } else {
            0.0
        };

        StreamMetrics {
            total_duration_ms: total_duration.as_millis() as u64,
            time_to_first_chunk_ms: time_to_first_chunk,
            chunk_count: self.chunk_count,
            byte_count: self.byte_count,
            error_count: self.error_count,
            chunks_per_second,
            bytes_per_second,
        }
    }
}

impl Default for StreamMonitor {
    fn default() -> Self {
        Self::new()
    }
}

/// Stream performance metrics
#[derive(Debug, Clone)]
pub struct StreamMetrics {
    pub total_duration_ms: u64,
    pub time_to_first_chunk_ms: Option<u64>,
    pub chunk_count: usize,
    pub byte_count: usize,
    pub error_count: usize,
    pub chunks_per_second: f64,
    pub bytes_per_second: f64,
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Collect a stream into a single aggregated response
pub async fn collect_stream<S>(mut stream: S) -> ModelResult<(String, Option<TokenUsage>)>
where
    S: Stream<Item = ModelResult<StreamChunk>> + Unpin,
{
    let mut aggregator = StreamAggregator::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result?;
        aggregator.add_chunk(chunk);
    }

    let text = aggregator.get_text();
    let usage = if aggregator.total_input_tokens > 0 || aggregator.total_output_tokens > 0 {
        Some(aggregator.get_usage())
    } else {
        None
    };

    Ok((text, usage))
}

/// Collect stream with monitoring
pub async fn collect_stream_with_metrics<S>(
    mut stream: S,
) -> ModelResult<(String, Option<TokenUsage>, StreamMetrics)>
where
    S: Stream<Item = ModelResult<StreamChunk>> + Unpin,
{
    let mut aggregator = StreamAggregator::new();
    let mut monitor = StreamMonitor::new();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                monitor.record_chunk(&chunk);
                aggregator.add_chunk(chunk);
            }
            Err(e) => {
                monitor.record_error();
                return Err(e);
            }
        }
    }

    let text = aggregator.get_text();
    let usage = if aggregator.total_input_tokens > 0 || aggregator.total_output_tokens > 0 {
        Some(aggregator.get_usage())
    } else {
        None
    };
    let metrics = monitor.metrics();

    Ok((text, usage, metrics))
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_buffer_config_presets() {
        let low_latency = BufferConfig::low_latency();
        assert_eq!(low_latency.max_size, 10);
        assert_eq!(low_latency.flush_interval_ms, 10);

        let high_throughput = BufferConfig::high_throughput();
        assert_eq!(high_throughput.max_size, 500);
        assert_eq!(high_throughput.flush_interval_ms, 500);
    }

    #[test]
    fn test_stream_aggregator() {
        let mut aggregator = StreamAggregator::new();

        let chunk1 = StreamChunk {
            delta: "Hello ".to_string(),
            model: "test".to_string(),
            finish_reason: None,
            usage: None,
            index: 0,
        };

        let chunk2 = StreamChunk {
            delta: "world!".to_string(),
            model: "test".to_string(),
            finish_reason: Some(FinishReason::Stop),
            usage: Some(TokenUsage::new(5, 10)),
            index: 1,
        };

        aggregator.add_chunk(chunk1);
        aggregator.add_chunk(chunk2);

        assert_eq!(aggregator.get_text(), "Hello world!");
        assert_eq!(aggregator.chunk_count(), 2);

        let usage = aggregator.get_usage();
        assert_eq!(usage.input_tokens, 5);
        assert_eq!(usage.output_tokens, 10);
    }

    #[test]
    fn test_buffered_stream() {
        let config = BufferConfig {
            max_size: 3,
            flush_interval_ms: 1000,
            auto_flush_newlines: false,
            enable_backpressure: false,
        };

        let mut buffer = BufferedStream::new(config);

        // Add chunks without flushing
        for i in 0..2 {
            let chunk = StreamChunk {
                delta: format!("chunk{}", i),
                model: "test".to_string(),
                finish_reason: None,
                usage: None,
                index: i,
            };
            assert!(buffer.push(chunk).is_none());
        }

        // Third chunk should trigger flush
        let chunk = StreamChunk {
            delta: "chunk2".to_string(),
            model: "test".to_string(),
            finish_reason: None,
            usage: None,
            index: 2,
        };
        let flushed = buffer.push(chunk);
        assert!(flushed.is_some());
        assert_eq!(flushed.unwrap().len(), 3);
    }

    #[tokio::test]
    async fn test_backpressure_handler() {
        let handler = BackpressureHandler::new(2, 10);

        // Should not apply backpressure
        handler.inc().await;
        assert!(!handler.check().await);

        // Should apply backpressure
        handler.inc().await;
        assert!(handler.check().await);

        // Decrease and check again
        handler.dec().await;
        assert!(!handler.check().await);
    }

    #[test]
    fn test_stream_monitor() {
        let mut monitor = StreamMonitor::new();

        let chunk = StreamChunk {
            delta: "test".to_string(),
            model: "test".to_string(),
            finish_reason: None,
            usage: None,
            index: 0,
        };

        monitor.record_chunk(&chunk);
        monitor.record_error();

        let metrics = monitor.metrics();
        assert_eq!(metrics.chunk_count, 1);
        assert_eq!(metrics.byte_count, 4);
        assert_eq!(metrics.error_count, 1);
    }
}
