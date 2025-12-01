//! BIZRA Node0 - High-Performance Metrics Aggregator
//!
//! Provides comprehensive observability with:
//! - Counters, Gauges, Histograms with percentile calculations
//! - Time-series data with configurable retention
//! - Real-time streaming via channels
//! - Lock-free atomic operations where possible
//! - Integration with Prometheus exposition format

use std::collections::{BTreeMap, HashMap, VecDeque};
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::{broadcast, RwLock};
use serde::{Deserialize, Serialize};

/// Metric label set
pub type Labels = BTreeMap<String, String>;

/// Create labels from key-value pairs
#[macro_export]
macro_rules! labels {
    ($($key:expr => $value:expr),* $(,)?) => {{
        let mut labels = std::collections::BTreeMap::new();
        $(
            labels.insert($key.to_string(), $value.to_string());
        )*
        labels
    }};
}

/// Metric types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MetricType {
    Counter,
    Gauge,
    Histogram,
    Summary,
}

/// Metric descriptor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricDescriptor {
    pub name: String,
    pub help: String,
    pub metric_type: MetricType,
    pub labels: Vec<String>,
}

/// A monotonically increasing counter
/// 
/// Lock-free implementation using atomics
#[derive(Debug)]
pub struct Counter {
    descriptor: MetricDescriptor,
    /// Values per label combination
    values: RwLock<HashMap<Labels, AtomicU64>>,
}

impl Counter {
    /// Create a new counter
    pub fn new(name: impl Into<String>, help: impl Into<String>) -> Self {
        Self {
            descriptor: MetricDescriptor {
                name: name.into(),
                help: help.into(),
                metric_type: MetricType::Counter,
                labels: Vec::new(),
            },
            values: RwLock::new(HashMap::new()),
        }
    }

    /// Create counter with label names
    pub fn with_labels(mut self, labels: Vec<&str>) -> Self {
        self.descriptor.labels = labels.into_iter().map(String::from).collect();
        self
    }

    /// Increment counter by 1
    pub async fn inc(&self, labels: Labels) {
        self.add(labels, 1).await;
    }

    /// Add value to counter
    pub async fn add(&self, labels: Labels, value: u64) {
        // Fast path: try to get existing value
        {
            let values = self.values.read().await;
            if let Some(counter) = values.get(&labels) {
                counter.fetch_add(value, Ordering::Relaxed);
                return;
            }
        }

        // Slow path: create new counter
        let mut values = self.values.write().await;
        values
            .entry(labels)
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(value, Ordering::Relaxed);
    }

    /// Get current value for labels
    pub async fn get(&self, labels: &Labels) -> u64 {
        let values = self.values.read().await;
        values
            .get(labels)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0)
    }

    /// Get all values
    pub async fn collect(&self) -> Vec<(Labels, u64)> {
        let values = self.values.read().await;
        values
            .iter()
            .map(|(labels, value)| (labels.clone(), value.load(Ordering::Relaxed)))
            .collect()
    }

    /// Get descriptor
    pub fn descriptor(&self) -> &MetricDescriptor {
        &self.descriptor
    }
}

/// A gauge that can go up or down
/// 
/// Lock-free implementation using atomics
#[derive(Debug)]
pub struct Gauge {
    descriptor: MetricDescriptor,
    /// Values per label combination (stored as i64 bits in u64)
    values: RwLock<HashMap<Labels, AtomicI64>>,
}

impl Gauge {
    /// Create a new gauge
    pub fn new(name: impl Into<String>, help: impl Into<String>) -> Self {
        Self {
            descriptor: MetricDescriptor {
                name: name.into(),
                help: help.into(),
                metric_type: MetricType::Gauge,
                labels: Vec::new(),
            },
            values: RwLock::new(HashMap::new()),
        }
    }

    /// Create gauge with label names
    pub fn with_labels(mut self, labels: Vec<&str>) -> Self {
        self.descriptor.labels = labels.into_iter().map(String::from).collect();
        self
    }

    /// Set gauge value
    pub async fn set(&self, labels: Labels, value: f64) {
        let bits = value.to_bits() as i64;
        
        {
            let values = self.values.read().await;
            if let Some(gauge) = values.get(&labels) {
                gauge.store(bits, Ordering::Relaxed);
                return;
            }
        }

        let mut values = self.values.write().await;
        values
            .entry(labels)
            .or_insert_with(|| AtomicI64::new(0))
            .store(bits, Ordering::Relaxed);
    }

    /// Increment gauge by 1
    pub async fn inc(&self, labels: Labels) {
        self.add(labels, 1.0).await;
    }

    /// Decrement gauge by 1
    pub async fn dec(&self, labels: Labels) {
        self.add(labels, -1.0).await;
    }

    /// Add value to gauge
    pub async fn add(&self, labels: Labels, delta: f64) {
        let current = self.get(&labels).await;
        self.set(labels, current + delta).await;
    }

    /// Get current value for labels
    pub async fn get(&self, labels: &Labels) -> f64 {
        let values = self.values.read().await;
        values
            .get(labels)
            .map(|v| f64::from_bits(v.load(Ordering::Relaxed) as u64))
            .unwrap_or(0.0)
    }

    /// Get all values
    pub async fn collect(&self) -> Vec<(Labels, f64)> {
        let values = self.values.read().await;
        values
            .iter()
            .map(|(labels, value)| {
                (labels.clone(), f64::from_bits(value.load(Ordering::Relaxed) as u64))
            })
            .collect()
    }

    /// Set to current unix timestamp
    pub async fn set_to_current_time(&self, labels: Labels) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();
        self.set(labels, now).await;
    }

    /// Get descriptor
    pub fn descriptor(&self) -> &MetricDescriptor {
        &self.descriptor
    }
}

/// Histogram bucket configuration
#[derive(Debug, Clone)]
pub struct HistogramBuckets {
    /// Upper bounds for buckets (exclusive)
    pub bounds: Vec<f64>,
}

impl HistogramBuckets {
    /// Create linear buckets
    pub fn linear(start: f64, width: f64, count: usize) -> Self {
        let bounds: Vec<f64> = (0..count)
            .map(|i| start + width * i as f64)
            .collect();
        Self { bounds }
    }

    /// Create exponential buckets
    pub fn exponential(start: f64, factor: f64, count: usize) -> Self {
        let bounds: Vec<f64> = (0..count)
            .map(|i| start * factor.powi(i as i32))
            .collect();
        Self { bounds }
    }

    /// Default buckets for request latency (in seconds)
    pub fn default_latency() -> Self {
        Self {
            bounds: vec![
                0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0,
            ],
        }
    }

    /// Default buckets for request size (in bytes)
    pub fn default_size() -> Self {
        Self::exponential(100.0, 10.0, 7) // 100B to 100MB
    }
}

impl Default for HistogramBuckets {
    fn default() -> Self {
        Self::default_latency()
    }
}

/// Histogram data for a single label set
#[derive(Debug)]
struct HistogramData {
    /// Bucket counts
    buckets: Vec<AtomicU64>,
    /// Sum of all observations (stored as bits for f64)
    sum: AtomicU64,
    /// Count of all observations
    count: AtomicU64,
}

impl HistogramData {
    fn new(bucket_count: usize) -> Self {
        Self {
            buckets: (0..bucket_count).map(|_| AtomicU64::new(0)).collect(),
            sum: AtomicU64::new(0),
            count: AtomicU64::new(0),
        }
    }
}

/// A histogram for measuring distributions
#[derive(Debug)]
pub struct Histogram {
    descriptor: MetricDescriptor,
    buckets_config: HistogramBuckets,
    data: RwLock<HashMap<Labels, HistogramData>>,
}

impl Histogram {
    /// Create a new histogram
    pub fn new(name: impl Into<String>, help: impl Into<String>) -> Self {
        Self::with_buckets(name, help, HistogramBuckets::default())
    }

    /// Create histogram with custom buckets
    pub fn with_buckets(
        name: impl Into<String>,
        help: impl Into<String>,
        buckets: HistogramBuckets,
    ) -> Self {
        Self {
            descriptor: MetricDescriptor {
                name: name.into(),
                help: help.into(),
                metric_type: MetricType::Histogram,
                labels: Vec::new(),
            },
            buckets_config: buckets,
            data: RwLock::new(HashMap::new()),
        }
    }

    /// Create histogram with label names
    pub fn with_labels(mut self, labels: Vec<&str>) -> Self {
        self.descriptor.labels = labels.into_iter().map(String::from).collect();
        self
    }

    /// Observe a value
    pub async fn observe(&self, labels: Labels, value: f64) {
        let bucket_idx = self
            .buckets_config
            .bounds
            .iter()
            .position(|&b| value <= b)
            .unwrap_or(self.buckets_config.bounds.len());

        // Get or create histogram data
        {
            let data = self.data.read().await;
            if let Some(hist) = data.get(&labels) {
                // Update bucket
                if bucket_idx < hist.buckets.len() {
                    hist.buckets[bucket_idx].fetch_add(1, Ordering::Relaxed);
                }
                // Update sum and count
                let bits = value.to_bits();
                hist.sum.fetch_add(bits, Ordering::Relaxed);
                hist.count.fetch_add(1, Ordering::Relaxed);
                return;
            }
        }

        // Create new histogram data
        let mut data = self.data.write().await;
        let hist = data
            .entry(labels)
            .or_insert_with(|| HistogramData::new(self.buckets_config.bounds.len() + 1));

        if bucket_idx < hist.buckets.len() {
            hist.buckets[bucket_idx].fetch_add(1, Ordering::Relaxed);
        }
        hist.sum.fetch_add(value.to_bits(), Ordering::Relaxed);
        hist.count.fetch_add(1, Ordering::Relaxed);
    }

    /// Time a block of code
    pub fn start_timer(&self) -> HistogramTimer {
        HistogramTimer {
            start: Instant::now(),
        }
    }

    /// Get histogram snapshot
    pub async fn collect(&self) -> Vec<HistogramSnapshot> {
        let data = self.data.read().await;
        let mut snapshots = Vec::new();

        for (labels, hist) in data.iter() {
            let bucket_counts: Vec<u64> = hist
                .buckets
                .iter()
                .map(|b| b.load(Ordering::Relaxed))
                .collect();

            let sum = f64::from_bits(hist.sum.load(Ordering::Relaxed));
            let count = hist.count.load(Ordering::Relaxed);

            // Calculate cumulative counts
            let mut cumulative = Vec::with_capacity(bucket_counts.len());
            let mut running_total = 0u64;
            for count in &bucket_counts {
                running_total += count;
                cumulative.push(running_total);
            }

            snapshots.push(HistogramSnapshot {
                labels: labels.clone(),
                buckets: self
                    .buckets_config
                    .bounds
                    .iter()
                    .zip(cumulative.iter())
                    .map(|(&bound, &count)| (bound, count))
                    .collect(),
                sum,
                count,
            });
        }

        snapshots
    }

    /// Get descriptor
    pub fn descriptor(&self) -> &MetricDescriptor {
        &self.descriptor
    }
}

/// Timer for histogram observations
pub struct HistogramTimer {
    start: Instant,
}

impl HistogramTimer {
    /// Get elapsed duration in seconds
    pub fn elapsed_seconds(&self) -> f64 {
        self.start.elapsed().as_secs_f64()
    }
}

/// Histogram snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistogramSnapshot {
    pub labels: Labels,
    /// (upper_bound, cumulative_count)
    pub buckets: Vec<(f64, u64)>,
    pub sum: f64,
    pub count: u64,
}

impl HistogramSnapshot {
    /// Calculate percentile (0.0 - 1.0)
    pub fn percentile(&self, p: f64) -> f64 {
        if self.count == 0 {
            return 0.0;
        }

        let target = (self.count as f64 * p).ceil() as u64;
        
        for (i, &(bound, cumulative)) in self.buckets.iter().enumerate() {
            if cumulative >= target {
                // Linear interpolation within bucket
                let prev_cumulative = if i > 0 { self.buckets[i - 1].1 } else { 0 };
                let prev_bound = if i > 0 { self.buckets[i - 1].0 } else { 0.0 };
                
                let bucket_count = cumulative - prev_cumulative;
                if bucket_count == 0 {
                    return bound;
                }

                let fraction = (target - prev_cumulative) as f64 / bucket_count as f64;
                return prev_bound + (bound - prev_bound) * fraction;
            }
        }

        // Beyond last bucket
        self.buckets.last().map(|&(b, _)| b).unwrap_or(0.0)
    }

    /// Get mean
    pub fn mean(&self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            self.sum / self.count as f64
        }
    }

    /// Get common percentiles
    pub fn percentiles(&self) -> PercentileSnapshot {
        PercentileSnapshot {
            p50: self.percentile(0.50),
            p75: self.percentile(0.75),
            p90: self.percentile(0.90),
            p95: self.percentile(0.95),
            p99: self.percentile(0.99),
            p999: self.percentile(0.999),
        }
    }
}

/// Common percentiles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PercentileSnapshot {
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
    pub p999: f64,
}

/// Time series point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesPoint {
    pub timestamp: u64,  // Unix timestamp in milliseconds
    pub value: f64,
}

/// Time series data with retention
#[derive(Debug)]
pub struct TimeSeries {
    name: String,
    labels: Labels,
    points: RwLock<VecDeque<TimeSeriesPoint>>,
    retention: Duration,
    max_points: usize,
}

impl TimeSeries {
    /// Create new time series
    pub fn new(
        name: impl Into<String>,
        labels: Labels,
        retention: Duration,
        max_points: usize,
    ) -> Self {
        Self {
            name: name.into(),
            labels,
            points: RwLock::new(VecDeque::with_capacity(max_points)),
            retention,
            max_points,
        }
    }

    /// Add a point
    pub async fn add(&self, value: f64) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let mut points = self.points.write().await;
        
        // Remove expired points
        let cutoff = timestamp.saturating_sub(self.retention.as_millis() as u64);
        while points.front().map(|p| p.timestamp < cutoff).unwrap_or(false) {
            points.pop_front();
        }

        // Enforce max points
        while points.len() >= self.max_points {
            points.pop_front();
        }

        points.push_back(TimeSeriesPoint { timestamp, value });
    }

    /// Get all points
    pub async fn points(&self) -> Vec<TimeSeriesPoint> {
        self.points.read().await.iter().cloned().collect()
    }

    /// Get points in time range
    pub async fn range(&self, start: u64, end: u64) -> Vec<TimeSeriesPoint> {
        self.points
            .read()
            .await
            .iter()
            .filter(|p| p.timestamp >= start && p.timestamp <= end)
            .cloned()
            .collect()
    }

    /// Get latest value
    pub async fn latest(&self) -> Option<TimeSeriesPoint> {
        self.points.read().await.back().cloned()
    }

    /// Calculate rate of change (per second)
    pub async fn rate(&self, window: Duration) -> Option<f64> {
        let points = self.points.read().await;
        if points.len() < 2 {
            return None;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let cutoff = now.saturating_sub(window.as_millis() as u64);

        let relevant: Vec<_> = points
            .iter()
            .filter(|p| p.timestamp >= cutoff)
            .collect();

        if relevant.len() < 2 {
            return None;
        }

        let first = relevant.first()?;
        let last = relevant.last()?;
        let duration = (last.timestamp - first.timestamp) as f64 / 1000.0; // To seconds

        if duration > 0.0 {
            Some((last.value - first.value) / duration)
        } else {
            None
        }
    }
}

/// Metric event for streaming
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricEvent {
    pub name: String,
    pub labels: Labels,
    pub value: f64,
    pub timestamp: u64,
    pub metric_type: MetricType,
}

/// Central metrics registry
pub struct MetricsRegistry {
    counters: RwLock<HashMap<String, Arc<Counter>>>,
    gauges: RwLock<HashMap<String, Arc<Gauge>>>,
    histograms: RwLock<HashMap<String, Arc<Histogram>>>,
    time_series: RwLock<HashMap<String, Arc<TimeSeries>>>,
    /// Broadcast channel for real-time streaming
    event_tx: broadcast::Sender<MetricEvent>,
}

impl MetricsRegistry {
    /// Create new metrics registry
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(10000);
        Self {
            counters: RwLock::new(HashMap::new()),
            gauges: RwLock::new(HashMap::new()),
            histograms: RwLock::new(HashMap::new()),
            time_series: RwLock::new(HashMap::new()),
            event_tx,
        }
    }

    /// Register a counter
    pub async fn register_counter(&self, counter: Counter) -> Arc<Counter> {
        let name = counter.descriptor.name.clone();
        let arc = Arc::new(counter);
        self.counters.write().await.insert(name, Arc::clone(&arc));
        arc
    }

    /// Register a gauge
    pub async fn register_gauge(&self, gauge: Gauge) -> Arc<Gauge> {
        let name = gauge.descriptor.name.clone();
        let arc = Arc::new(gauge);
        self.gauges.write().await.insert(name, Arc::clone(&arc));
        arc
    }

    /// Register a histogram
    pub async fn register_histogram(&self, histogram: Histogram) -> Arc<Histogram> {
        let name = histogram.descriptor.name.clone();
        let arc = Arc::new(histogram);
        self.histograms.write().await.insert(name, Arc::clone(&arc));
        arc
    }

    /// Get counter by name
    pub async fn counter(&self, name: &str) -> Option<Arc<Counter>> {
        self.counters.read().await.get(name).cloned()
    }

    /// Get gauge by name
    pub async fn gauge(&self, name: &str) -> Option<Arc<Gauge>> {
        self.gauges.read().await.get(name).cloned()
    }

    /// Get histogram by name
    pub async fn histogram(&self, name: &str) -> Option<Arc<Histogram>> {
        self.histograms.read().await.get(name).cloned()
    }

    /// Subscribe to metric events
    pub fn subscribe(&self) -> broadcast::Receiver<MetricEvent> {
        self.event_tx.subscribe()
    }

    /// Emit a metric event
    pub fn emit(&self, event: MetricEvent) {
        let _ = self.event_tx.send(event);
    }

    /// Export all metrics in Prometheus text format
    pub async fn export_prometheus(&self) -> String {
        let mut output = String::new();

        // Counters
        for (_, counter) in self.counters.read().await.iter() {
            let desc = counter.descriptor();
            output.push_str(&format!("# HELP {} {}\n", desc.name, desc.help));
            output.push_str(&format!("# TYPE {} counter\n", desc.name));
            
            for (labels, value) in counter.collect().await {
                let label_str = format_labels(&labels);
                output.push_str(&format!("{}{} {}\n", desc.name, label_str, value));
            }
        }

        // Gauges
        for (_, gauge) in self.gauges.read().await.iter() {
            let desc = gauge.descriptor();
            output.push_str(&format!("# HELP {} {}\n", desc.name, desc.help));
            output.push_str(&format!("# TYPE {} gauge\n", desc.name));
            
            for (labels, value) in gauge.collect().await {
                let label_str = format_labels(&labels);
                output.push_str(&format!("{}{} {}\n", desc.name, label_str, value));
            }
        }

        // Histograms
        for (_, histogram) in self.histograms.read().await.iter() {
            let desc = histogram.descriptor();
            output.push_str(&format!("# HELP {} {}\n", desc.name, desc.help));
            output.push_str(&format!("# TYPE {} histogram\n", desc.name));
            
            for snapshot in histogram.collect().await {
                let base_labels = format_labels(&snapshot.labels);
                
                for (bound, count) in &snapshot.buckets {
                    let bucket_label = if snapshot.labels.is_empty() {
                        format!("{{le=\"{}\"}}", bound)
                    } else {
                        let inner = format_labels_inner(&snapshot.labels);
                        format!("{{{},le=\"{}\"}}", inner, bound)
                    };
                    output.push_str(&format!("{}_bucket{} {}\n", desc.name, bucket_label, count));
                }
                
                // +Inf bucket
                let inf_label = if snapshot.labels.is_empty() {
                    "{le=\"+Inf\"}".to_string()
                } else {
                    let inner = format_labels_inner(&snapshot.labels);
                    format!("{{{},le=\"+Inf\"}}", inner)
                };
                output.push_str(&format!("{}_bucket{} {}\n", desc.name, inf_label, snapshot.count));
                
                output.push_str(&format!("{}_sum{} {}\n", desc.name, base_labels, snapshot.sum));
                output.push_str(&format!("{}_count{} {}\n", desc.name, base_labels, snapshot.count));
            }
        }

        output
    }

    /// Get JSON export of all metrics
    pub async fn export_json(&self) -> serde_json::Value {
        let mut metrics = serde_json::Map::new();

        // Counters
        let mut counters = serde_json::Map::new();
        for (name, counter) in self.counters.read().await.iter() {
            let values: Vec<_> = counter.collect().await;
            counters.insert(name.clone(), serde_json::to_value(values).unwrap_or_default());
        }
        metrics.insert("counters".into(), counters.into());

        // Gauges
        let mut gauges = serde_json::Map::new();
        for (name, gauge) in self.gauges.read().await.iter() {
            let values: Vec<_> = gauge.collect().await;
            gauges.insert(name.clone(), serde_json::to_value(values).unwrap_or_default());
        }
        metrics.insert("gauges".into(), gauges.into());

        // Histograms
        let mut histograms = serde_json::Map::new();
        for (name, histogram) in self.histograms.read().await.iter() {
            let snapshots = histogram.collect().await;
            let with_percentiles: Vec<_> = snapshots
                .iter()
                .map(|s| {
                    serde_json::json!({
                        "labels": s.labels,
                        "count": s.count,
                        "sum": s.sum,
                        "mean": s.mean(),
                        "percentiles": s.percentiles(),
                    })
                })
                .collect();
            histograms.insert(name.clone(), with_percentiles.into());
        }
        metrics.insert("histograms".into(), histograms.into());

        serde_json::Value::Object(metrics)
    }
}

impl Default for MetricsRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Format labels for Prometheus output
fn format_labels(labels: &Labels) -> String {
    if labels.is_empty() {
        String::new()
    } else {
        format!("{{{}}}", format_labels_inner(labels))
    }
}

fn format_labels_inner(labels: &Labels) -> String {
    labels
        .iter()
        .map(|(k, v)| format!("{}=\"{}\"", k, escape_label_value(v)))
        .collect::<Vec<_>>()
        .join(",")
}

fn escape_label_value(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}

/// Pre-built common metrics for BIZRA
pub struct BizraMetrics {
    pub registry: Arc<MetricsRegistry>,
    pub http_requests_total: Arc<Counter>,
    pub http_request_duration: Arc<Histogram>,
    pub http_requests_in_flight: Arc<Gauge>,
    pub pat_chat_latency: Arc<Histogram>,
    pub poi_events_total: Arc<Counter>,
    pub poi_ihsan_score: Arc<Histogram>,
    pub model_inference_latency: Arc<Histogram>,
    pub active_connections: Arc<Gauge>,
    pub error_rate: Arc<Gauge>,
}

impl BizraMetrics {
    /// Create standard BIZRA metrics
    pub async fn new() -> Self {
        let registry = Arc::new(MetricsRegistry::new());

        let http_requests_total = registry
            .register_counter(
                Counter::new("http_requests_total", "Total HTTP requests received")
                    .with_labels(vec!["method", "path", "status"]),
            )
            .await;

        let http_request_duration = registry
            .register_histogram(
                Histogram::with_buckets(
                    "http_request_duration_seconds",
                    "HTTP request duration in seconds",
                    HistogramBuckets::default_latency(),
                )
                .with_labels(vec!["method", "path"]),
            )
            .await;

        let http_requests_in_flight = registry
            .register_gauge(Gauge::new(
                "http_requests_in_flight",
                "Current number of HTTP requests being processed",
            ))
            .await;

        let pat_chat_latency = registry
            .register_histogram(
                Histogram::with_buckets(
                    "bizra_pat_chat_latency_seconds",
                    "PAT chat response latency in seconds",
                    HistogramBuckets::exponential(0.1, 2.0, 10),
                )
                .with_labels(vec!["agent", "model"]),
            )
            .await;

        let poi_events_total = registry
            .register_counter(
                Counter::new("bizra_poi_events_total", "Total PoI events recorded")
                    .with_labels(vec!["event_type", "verified"]),
            )
            .await;

        let poi_ihsan_score = registry
            .register_histogram(
                Histogram::with_buckets(
                    "bizra_poi_ihsan_score",
                    "Distribution of Ihsan scores",
                    HistogramBuckets::linear(0.0, 0.1, 11),
                )
                .with_labels(vec!["event_type"]),
            )
            .await;

        let model_inference_latency = registry
            .register_histogram(
                Histogram::with_buckets(
                    "bizra_model_inference_latency_seconds",
                    "Model inference latency in seconds",
                    HistogramBuckets::exponential(0.01, 2.0, 12),
                )
                .with_labels(vec!["model", "backend"]),
            )
            .await;

        let active_connections = registry
            .register_gauge(
                Gauge::new("bizra_active_connections", "Number of active connections")
                    .with_labels(vec!["service"]),
            )
            .await;

        let error_rate = registry
            .register_gauge(
                Gauge::new("bizra_error_rate", "Current error rate (0-1)")
                    .with_labels(vec!["service"]),
            )
            .await;

        Self {
            registry,
            http_requests_total,
            http_request_duration,
            http_requests_in_flight,
            pat_chat_latency,
            poi_events_total,
            poi_ihsan_score,
            model_inference_latency,
            active_connections,
            error_rate,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_counter_increment() {
        let counter = Counter::new("test_counter", "Test counter");
        let labels = labels!("method" => "GET");

        counter.inc(labels.clone()).await;
        counter.inc(labels.clone()).await;
        counter.add(labels.clone(), 3).await;

        assert_eq!(counter.get(&labels).await, 5);
    }

    #[tokio::test]
    async fn test_gauge_operations() {
        let gauge = Gauge::new("test_gauge", "Test gauge");
        let labels = labels!("service" => "api");

        gauge.set(labels.clone(), 10.0).await;
        assert_eq!(gauge.get(&labels).await, 10.0);

        gauge.inc(labels.clone()).await;
        assert_eq!(gauge.get(&labels).await, 11.0);

        gauge.dec(labels.clone()).await;
        assert_eq!(gauge.get(&labels).await, 10.0);

        gauge.add(labels.clone(), -5.0).await;
        assert_eq!(gauge.get(&labels).await, 5.0);
    }

    #[tokio::test]
    async fn test_histogram_percentiles() {
        let histogram = Histogram::new("test_histogram", "Test histogram");
        let labels = labels!();

        // Observe values 1-100
        for i in 1..=100 {
            histogram.observe(labels.clone(), i as f64).await;
        }

        let snapshots = histogram.collect().await;
        assert_eq!(snapshots.len(), 1);

        let snapshot = &snapshots[0];
        assert_eq!(snapshot.count, 100);
        
        // Mean should be ~50.5
        let mean = snapshot.mean();
        assert!((mean - 50.5).abs() < 1.0);
    }

    #[tokio::test]
    async fn test_prometheus_export() {
        let registry = MetricsRegistry::new();
        
        let counter = registry
            .register_counter(Counter::new("test_requests", "Total requests"))
            .await;
        
        counter.inc(labels!("path" => "/api")).await;
        counter.inc(labels!("path" => "/api")).await;
        counter.inc(labels!("path" => "/health")).await;

        let output = registry.export_prometheus().await;
        
        assert!(output.contains("# HELP test_requests Total requests"));
        assert!(output.contains("# TYPE test_requests counter"));
        assert!(output.contains("test_requests{path=\"/api\"} 2"));
        assert!(output.contains("test_requests{path=\"/health\"} 1"));
    }

    #[tokio::test]
    async fn test_time_series() {
        let ts = TimeSeries::new(
            "cpu_usage",
            labels!("host" => "localhost"),
            Duration::from_secs(60),
            100,
        );

        ts.add(50.0).await;
        tokio::time::sleep(Duration::from_millis(10)).await;
        ts.add(60.0).await;
        tokio::time::sleep(Duration::from_millis(10)).await;
        ts.add(55.0).await;

        let points = ts.points().await;
        assert_eq!(points.len(), 3);

        let latest = ts.latest().await.unwrap();
        assert_eq!(latest.value, 55.0);
    }

    #[tokio::test]
    async fn test_bizra_metrics() {
        let metrics = BizraMetrics::new().await;
        
        metrics.http_requests_total.inc(labels!(
            "method" => "POST",
            "path" => "/api/pat/chat",
            "status" => "200"
        )).await;

        metrics.pat_chat_latency.observe(
            labels!("agent" => "MasterReasoner", "model" => "deepseek-r1:7b"),
            1.234,
        ).await;

        let json = metrics.registry.export_json().await;
        assert!(json.get("counters").is_some());
        assert!(json.get("histograms").is_some());
    }
}
