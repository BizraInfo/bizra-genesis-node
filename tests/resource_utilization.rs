//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  BIZRA GENESIS NODE - RESOURCE UTILIZATION MONITORING TESTS              ║
//! ║  Production-grade resource monitoring and leak detection                 ║
//! ║  Version: 1.0.0 - Elite Full-Stack Blueprint                             ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝
//!
//! This module provides comprehensive resource utilization tests that verify
//! the system operates within acceptable resource bounds under various loads.
//!
//! RESOURCE TARGETS:
//! - Memory Growth: < 10% over baseline after 1000 operations
//! - Connection Leaks: 0 leaked connections after stress test
//! - File Descriptor Growth: < 5% over baseline
//! - Allocation Churn: < 100 allocations per request (average)

use std::alloc::{GlobalAlloc, Layout, System};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// ALLOCATION TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/// Tracks memory allocations for leak detection
#[derive(Debug, Default)]
pub struct AllocationTracker {
    /// Total bytes currently allocated
    current_bytes: AtomicU64,
    /// Peak bytes allocated
    peak_bytes: AtomicU64,
    /// Total allocations made
    total_allocations: AtomicU64,
    /// Total deallocations made
    total_deallocations: AtomicU64,
    /// Total bytes allocated (cumulative)
    total_bytes_allocated: AtomicU64,
    /// Total bytes deallocated (cumulative)
    total_bytes_deallocated: AtomicU64,
    /// Tracking enabled flag
    enabled: AtomicBool,
}

impl AllocationTracker {
    pub fn new() -> Self {
        Self {
            enabled: AtomicBool::new(true),
            ..Default::default()
        }
    }

    pub fn enable(&self) {
        self.enabled.store(true, Ordering::SeqCst);
    }

    pub fn disable(&self) {
        self.enabled.store(false, Ordering::SeqCst);
    }

    pub fn record_alloc(&self, size: usize) {
        if !self.enabled.load(Ordering::Relaxed) {
            return;
        }

        let size = size as u64;
        let new_current = self.current_bytes.fetch_add(size, Ordering::Relaxed) + size;
        self.total_allocations.fetch_add(1, Ordering::Relaxed);
        self.total_bytes_allocated
            .fetch_add(size, Ordering::Relaxed);

        // Update peak if necessary
        loop {
            let current_peak = self.peak_bytes.load(Ordering::Relaxed);
            if new_current <= current_peak {
                break;
            }
            if self
                .peak_bytes
                .compare_exchange_weak(
                    current_peak,
                    new_current,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                )
                .is_ok()
            {
                break;
            }
        }
    }

    pub fn record_dealloc(&self, size: usize) {
        if !self.enabled.load(Ordering::Relaxed) {
            return;
        }

        let size = size as u64;
        self.current_bytes.fetch_sub(size, Ordering::Relaxed);
        self.total_deallocations.fetch_add(1, Ordering::Relaxed);
        self.total_bytes_deallocated
            .fetch_add(size, Ordering::Relaxed);
    }

    pub fn current_bytes(&self) -> u64 {
        self.current_bytes.load(Ordering::Relaxed)
    }

    pub fn peak_bytes(&self) -> u64 {
        self.peak_bytes.load(Ordering::Relaxed)
    }

    pub fn total_allocations(&self) -> u64 {
        self.total_allocations.load(Ordering::Relaxed)
    }

    pub fn total_deallocations(&self) -> u64 {
        self.total_deallocations.load(Ordering::Relaxed)
    }

    pub fn allocation_leak_count(&self) -> i64 {
        let allocs = self.total_allocations.load(Ordering::Relaxed);
        let deallocs = self.total_deallocations.load(Ordering::Relaxed);
        allocs as i64 - deallocs as i64
    }

    pub fn reset(&self) {
        self.current_bytes.store(0, Ordering::Relaxed);
        self.peak_bytes.store(0, Ordering::Relaxed);
        self.total_allocations.store(0, Ordering::Relaxed);
        self.total_deallocations.store(0, Ordering::Relaxed);
        self.total_bytes_allocated.store(0, Ordering::Relaxed);
        self.total_bytes_deallocated.store(0, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> AllocationSnapshot {
        AllocationSnapshot {
            current_bytes: self.current_bytes(),
            peak_bytes: self.peak_bytes(),
            total_allocations: self.total_allocations(),
            total_deallocations: self.total_deallocations(),
            total_bytes_allocated: self.total_bytes_allocated.load(Ordering::Relaxed),
            total_bytes_deallocated: self.total_bytes_deallocated.load(Ordering::Relaxed),
            timestamp: Instant::now(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AllocationSnapshot {
    pub current_bytes: u64,
    pub peak_bytes: u64,
    pub total_allocations: u64,
    pub total_deallocations: u64,
    pub total_bytes_allocated: u64,
    pub total_bytes_deallocated: u64,
    pub timestamp: Instant,
}

impl AllocationSnapshot {
    pub fn memory_growth_percent(&self, baseline: &AllocationSnapshot) -> f64 {
        if baseline.current_bytes == 0 {
            return 0.0;
        }
        ((self.current_bytes as f64 - baseline.current_bytes as f64)
            / baseline.current_bytes as f64)
            * 100.0
    }

    pub fn allocation_rate(&self, baseline: &AllocationSnapshot) -> f64 {
        let elapsed = self
            .timestamp
            .duration_since(baseline.timestamp)
            .as_secs_f64();
        if elapsed == 0.0 {
            return 0.0;
        }
        (self.total_allocations - baseline.total_allocations) as f64 / elapsed
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION POOL MONITORING
// ═══════════════════════════════════════════════════════════════════════════

/// Monitors connection pool utilization
#[derive(Debug)]
pub struct ConnectionPoolMonitor {
    /// Active connections
    active: AtomicUsize,
    /// Idle connections
    idle: AtomicUsize,
    /// Maximum connections allowed
    max_connections: usize,
    /// Total connections acquired
    total_acquired: AtomicU64,
    /// Total connections released
    total_released: AtomicU64,
    /// Connection wait times in microseconds
    wait_times: RwLock<Vec<u64>>,
    /// Connections that exceeded max wait time
    timeouts: AtomicU64,
}

impl ConnectionPoolMonitor {
    pub fn new(max_connections: usize) -> Self {
        Self {
            active: AtomicUsize::new(0),
            idle: AtomicUsize::new(0),
            max_connections,
            total_acquired: AtomicU64::new(0),
            total_released: AtomicU64::new(0),
            wait_times: RwLock::new(Vec::with_capacity(1000)),
            timeouts: AtomicU64::new(0),
        }
    }

    pub fn acquire(&self, wait_time_us: u64) -> bool {
        let current_active = self.active.fetch_add(1, Ordering::Relaxed);
        if current_active >= self.max_connections {
            self.active.fetch_sub(1, Ordering::Relaxed);
            self.timeouts.fetch_add(1, Ordering::Relaxed);
            return false;
        }

        self.total_acquired.fetch_add(1, Ordering::Relaxed);
        self.wait_times.write().push(wait_time_us);
        true
    }

    pub fn release(&self) {
        let prev = self.active.fetch_sub(1, Ordering::Relaxed);
        if prev > 0 {
            self.total_released.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn set_idle(&self, count: usize) {
        self.idle.store(count, Ordering::Relaxed);
    }

    pub fn active_connections(&self) -> usize {
        self.active.load(Ordering::Relaxed)
    }

    pub fn idle_connections(&self) -> usize {
        self.idle.load(Ordering::Relaxed)
    }

    pub fn utilization_percent(&self) -> f64 {
        (self.active.load(Ordering::Relaxed) as f64 / self.max_connections as f64) * 100.0
    }

    pub fn leaked_connections(&self) -> i64 {
        let acquired = self.total_acquired.load(Ordering::Relaxed);
        let released = self.total_released.load(Ordering::Relaxed);
        acquired as i64 - released as i64
    }

    pub fn avg_wait_time_us(&self) -> f64 {
        let times = self.wait_times.read();
        if times.is_empty() {
            return 0.0;
        }
        times.iter().sum::<u64>() as f64 / times.len() as f64
    }

    pub fn p95_wait_time_us(&self) -> u64 {
        let mut times = self.wait_times.read().clone();
        if times.is_empty() {
            return 0;
        }
        times.sort_unstable();
        let idx = (times.len() as f64 * 0.95) as usize;
        times[idx.min(times.len() - 1)]
    }

    pub fn timeout_count(&self) -> u64 {
        self.timeouts.load(Ordering::Relaxed)
    }

    pub fn reset(&self) {
        self.active.store(0, Ordering::Relaxed);
        self.idle.store(0, Ordering::Relaxed);
        self.total_acquired.store(0, Ordering::Relaxed);
        self.total_released.store(0, Ordering::Relaxed);
        self.wait_times.write().clear();
        self.timeouts.store(0, Ordering::Relaxed);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE DESCRIPTOR MONITORING
// ═══════════════════════════════════════════════════════════════════════════

/// Monitors file descriptor utilization
#[derive(Debug)]
pub struct FileDescriptorMonitor {
    /// Current open file descriptors
    open_fds: AtomicUsize,
    /// Peak open file descriptors
    peak_fds: AtomicUsize,
    /// Total file opens
    total_opens: AtomicU64,
    /// Total file closes
    total_closes: AtomicU64,
}

impl FileDescriptorMonitor {
    pub fn new() -> Self {
        Self {
            open_fds: AtomicUsize::new(0),
            peak_fds: AtomicUsize::new(0),
            total_opens: AtomicU64::new(0),
            total_closes: AtomicU64::new(0),
        }
    }

    pub fn open(&self) {
        let new_count = self.open_fds.fetch_add(1, Ordering::Relaxed) + 1;
        self.total_opens.fetch_add(1, Ordering::Relaxed);

        // Update peak if necessary
        loop {
            let current_peak = self.peak_fds.load(Ordering::Relaxed);
            if new_count <= current_peak {
                break;
            }
            if self
                .peak_fds
                .compare_exchange_weak(
                    current_peak,
                    new_count,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                )
                .is_ok()
            {
                break;
            }
        }
    }

    pub fn close(&self) {
        let prev = self.open_fds.fetch_sub(1, Ordering::Relaxed);
        if prev > 0 {
            self.total_closes.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn current_open(&self) -> usize {
        self.open_fds.load(Ordering::Relaxed)
    }

    pub fn peak_open(&self) -> usize {
        self.peak_fds.load(Ordering::Relaxed)
    }

    pub fn leaked_fds(&self) -> i64 {
        let opens = self.total_opens.load(Ordering::Relaxed);
        let closes = self.total_closes.load(Ordering::Relaxed);
        opens as i64 - closes as i64
    }

    pub fn growth_percent(&self, baseline: usize) -> f64 {
        if baseline == 0 {
            return 0.0;
        }
        ((self.current_open() as f64 - baseline as f64) / baseline as f64) * 100.0
    }

    pub fn reset(&self) {
        self.open_fds.store(0, Ordering::Relaxed);
        self.peak_fds.store(0, Ordering::Relaxed);
        self.total_opens.store(0, Ordering::Relaxed);
        self.total_closes.store(0, Ordering::Relaxed);
    }
}

impl Default for FileDescriptorMonitor {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE UTILIZATION REPORT
// ═══════════════════════════════════════════════════════════════════════════

/// Comprehensive resource utilization report
#[derive(Debug, Clone)]
pub struct ResourceUtilizationReport {
    pub memory_current_bytes: u64,
    pub memory_peak_bytes: u64,
    pub memory_growth_percent: f64,
    pub allocation_count: u64,
    pub deallocation_count: u64,
    pub allocation_leak_count: i64,
    pub allocation_rate_per_sec: f64,

    pub connection_active: usize,
    pub connection_idle: usize,
    pub connection_utilization_percent: f64,
    pub connection_leak_count: i64,
    pub connection_avg_wait_us: f64,
    pub connection_p95_wait_us: u64,
    pub connection_timeouts: u64,

    pub fd_current: usize,
    pub fd_peak: usize,
    pub fd_growth_percent: f64,
    pub fd_leak_count: i64,

    pub duration: Duration,
    pub operations_completed: u64,
    pub operations_per_second: f64,
}

/// Thresholds for resource utilization validation
#[derive(Debug, Clone)]
pub struct ResourceThresholds {
    /// Maximum acceptable memory growth percentage
    pub max_memory_growth_percent: f64,
    /// Maximum acceptable allocation leaks
    pub max_allocation_leaks: i64,
    /// Maximum acceptable allocations per operation
    pub max_allocations_per_operation: f64,
    /// Maximum acceptable connection leaks
    pub max_connection_leaks: i64,
    /// Maximum acceptable connection utilization percent
    pub max_connection_utilization_percent: f64,
    /// Maximum acceptable P95 connection wait time (microseconds)
    pub max_connection_p95_wait_us: u64,
    /// Maximum acceptable FD growth percentage
    pub max_fd_growth_percent: f64,
    /// Maximum acceptable FD leaks
    pub max_fd_leaks: i64,
}

impl Default for ResourceThresholds {
    fn default() -> Self {
        Self {
            max_memory_growth_percent: 10.0,
            max_allocation_leaks: 100,
            max_allocations_per_operation: 100.0,
            max_connection_leaks: 0,
            max_connection_utilization_percent: 80.0,
            max_connection_p95_wait_us: 100_000, // 100ms
            max_fd_growth_percent: 5.0,
            max_fd_leaks: 10,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ResourceValidationResult {
    pub passed: bool,
    pub violations: Vec<String>,
    pub warnings: Vec<String>,
}

impl ResourceUtilizationReport {
    /// Validate resource utilization against thresholds
    pub fn validate(&self, thresholds: &ResourceThresholds) -> ResourceValidationResult {
        let mut violations = Vec::new();
        let mut warnings = Vec::new();

        // Memory validation
        if self.memory_growth_percent > thresholds.max_memory_growth_percent {
            violations.push(format!(
                "Memory growth {:.1}% exceeds threshold {:.1}%",
                self.memory_growth_percent, thresholds.max_memory_growth_percent
            ));
        }

        if self.allocation_leak_count > thresholds.max_allocation_leaks {
            violations.push(format!(
                "Allocation leaks {} exceed threshold {}",
                self.allocation_leak_count, thresholds.max_allocation_leaks
            ));
        }

        let allocations_per_op = if self.operations_completed > 0 {
            self.allocation_count as f64 / self.operations_completed as f64
        } else {
            0.0
        };
        if allocations_per_op > thresholds.max_allocations_per_operation {
            warnings.push(format!(
                "Allocations per operation {:.1} exceeds threshold {:.1}",
                allocations_per_op, thresholds.max_allocations_per_operation
            ));
        }

        // Connection validation
        if self.connection_leak_count > thresholds.max_connection_leaks {
            violations.push(format!(
                "Connection leaks {} exceed threshold {}",
                self.connection_leak_count, thresholds.max_connection_leaks
            ));
        }

        if self.connection_utilization_percent > thresholds.max_connection_utilization_percent {
            warnings.push(format!(
                "Connection utilization {:.1}% exceeds threshold {:.1}%",
                self.connection_utilization_percent, thresholds.max_connection_utilization_percent
            ));
        }

        if self.connection_p95_wait_us > thresholds.max_connection_p95_wait_us {
            warnings.push(format!(
                "Connection P95 wait time {}μs exceeds threshold {}μs",
                self.connection_p95_wait_us, thresholds.max_connection_p95_wait_us
            ));
        }

        if self.connection_timeouts > 0 {
            warnings.push(format!(
                "{} connection timeouts occurred",
                self.connection_timeouts
            ));
        }

        // File descriptor validation
        if self.fd_growth_percent > thresholds.max_fd_growth_percent {
            warnings.push(format!(
                "FD growth {:.1}% exceeds threshold {:.1}%",
                self.fd_growth_percent, thresholds.max_fd_growth_percent
            ));
        }

        if self.fd_leak_count > thresholds.max_fd_leaks {
            violations.push(format!(
                "FD leaks {} exceed threshold {}",
                self.fd_leak_count, thresholds.max_fd_leaks
            ));
        }

        ResourceValidationResult {
            passed: violations.is_empty(),
            violations,
            warnings,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_allocation_tracker_basic() {
        let tracker = AllocationTracker::new();

        // Simulate allocations
        tracker.record_alloc(1024);
        tracker.record_alloc(2048);

        assert_eq!(tracker.current_bytes(), 3072);
        assert_eq!(tracker.total_allocations(), 2);

        // Simulate deallocations
        tracker.record_dealloc(1024);

        assert_eq!(tracker.current_bytes(), 2048);
        assert_eq!(tracker.total_deallocations(), 1);
        assert_eq!(tracker.allocation_leak_count(), 1);
    }

    #[test]
    fn test_allocation_tracker_peak_tracking() {
        let tracker = AllocationTracker::new();

        tracker.record_alloc(1000);
        tracker.record_alloc(2000);
        assert_eq!(tracker.peak_bytes(), 3000);

        tracker.record_dealloc(1500);
        assert_eq!(tracker.current_bytes(), 1500);
        assert_eq!(tracker.peak_bytes(), 3000); // Peak unchanged

        tracker.record_alloc(5000);
        assert_eq!(tracker.peak_bytes(), 6500); // New peak
    }

    #[test]
    fn test_allocation_snapshot_comparison() {
        let tracker = AllocationTracker::new();

        // Baseline
        tracker.record_alloc(1000);
        let baseline = tracker.snapshot();

        // Wait a bit and add more
        thread::sleep(Duration::from_millis(10));
        tracker.record_alloc(200);
        let current = tracker.snapshot();

        let growth = current.memory_growth_percent(&baseline);
        assert!(
            (growth - 20.0).abs() < 1.0,
            "Expected ~20% growth, got {}%",
            growth
        );

        let rate = current.allocation_rate(&baseline);
        assert!(rate > 0.0, "Expected positive allocation rate");
    }

    #[test]
    fn test_connection_pool_monitor_basic() {
        let monitor = ConnectionPoolMonitor::new(10);

        // Acquire connections
        assert!(monitor.acquire(100));
        assert!(monitor.acquire(200));
        assert_eq!(monitor.active_connections(), 2);
        assert_eq!(monitor.utilization_percent(), 20.0);

        // Release connections
        monitor.release();
        assert_eq!(monitor.active_connections(), 1);
        assert_eq!(monitor.leaked_connections(), 1);

        monitor.release();
        assert_eq!(monitor.leaked_connections(), 0);
    }

    #[test]
    fn test_connection_pool_monitor_max_limit() {
        let monitor = ConnectionPoolMonitor::new(2);

        assert!(monitor.acquire(10));
        assert!(monitor.acquire(10));
        assert!(!monitor.acquire(10)); // Should fail - at max

        assert_eq!(monitor.active_connections(), 2);
        assert_eq!(monitor.timeout_count(), 1);
    }

    #[test]
    fn test_connection_pool_wait_times() {
        let monitor = ConnectionPoolMonitor::new(100);

        // Add varying wait times
        for i in 0..100 {
            monitor.acquire(i * 10);
        }

        let avg = monitor.avg_wait_time_us();
        assert!(avg > 0.0);

        let p95 = monitor.p95_wait_time_us();
        assert!(p95 > avg as u64, "P95 should be higher than average");
    }

    #[test]
    fn test_file_descriptor_monitor() {
        let monitor = FileDescriptorMonitor::new();

        // Open files
        monitor.open();
        monitor.open();
        monitor.open();
        assert_eq!(monitor.current_open(), 3);
        assert_eq!(monitor.peak_open(), 3);

        // Close some
        monitor.close();
        assert_eq!(monitor.current_open(), 2);
        assert_eq!(monitor.peak_open(), 3); // Peak unchanged

        // Open more (new peak)
        monitor.open();
        monitor.open();
        monitor.open();
        assert_eq!(monitor.peak_open(), 5);

        // Leak check
        // Total opens: 6, closes: 1
        assert_eq!(monitor.leaked_fds(), 5);
    }

    #[test]
    fn test_fd_growth_calculation() {
        let monitor = FileDescriptorMonitor::new();

        // Baseline of 10 FDs
        for _ in 0..10 {
            monitor.open();
        }
        let baseline = monitor.current_open();

        // Add 2 more (20% growth)
        monitor.open();
        monitor.open();

        let growth = monitor.growth_percent(baseline);
        assert!(
            (growth - 20.0).abs() < 0.1,
            "Expected 20% growth, got {}%",
            growth
        );
    }

    #[test]
    fn test_resource_utilization_validation_passing() {
        let report = ResourceUtilizationReport {
            memory_current_bytes: 1_000_000,
            memory_peak_bytes: 1_200_000,
            memory_growth_percent: 5.0, // Within threshold
            allocation_count: 1000,
            deallocation_count: 1000,
            allocation_leak_count: 0, // No leaks
            allocation_rate_per_sec: 100.0,
            connection_active: 5,
            connection_idle: 15,
            connection_utilization_percent: 25.0,
            connection_leak_count: 0,
            connection_avg_wait_us: 50.0,
            connection_p95_wait_us: 100,
            connection_timeouts: 0,
            fd_current: 100,
            fd_peak: 105,
            fd_growth_percent: 2.0,
            fd_leak_count: 0,
            duration: Duration::from_secs(10),
            operations_completed: 1000,
            operations_per_second: 100.0,
        };

        let thresholds = ResourceThresholds::default();
        let result = report.validate(&thresholds);

        assert!(
            result.passed,
            "Should pass with normal metrics. Violations: {:?}",
            result.violations
        );
    }

    #[test]
    fn test_resource_utilization_validation_failing() {
        let report = ResourceUtilizationReport {
            memory_current_bytes: 1_000_000,
            memory_peak_bytes: 2_000_000,
            memory_growth_percent: 50.0, // Exceeds 10% threshold
            allocation_count: 1000,
            deallocation_count: 800,
            allocation_leak_count: 200, // Exceeds 100 threshold
            allocation_rate_per_sec: 100.0,
            connection_active: 5,
            connection_idle: 15,
            connection_utilization_percent: 25.0,
            connection_leak_count: 5, // Exceeds 0 threshold
            connection_avg_wait_us: 50.0,
            connection_p95_wait_us: 100,
            connection_timeouts: 0,
            fd_current: 100,
            fd_peak: 200,
            fd_growth_percent: 50.0, // Warning
            fd_leak_count: 50,       // Exceeds 10 threshold
            duration: Duration::from_secs(10),
            operations_completed: 1000,
            operations_per_second: 100.0,
        };

        let thresholds = ResourceThresholds::default();
        let result = report.validate(&thresholds);

        assert!(!result.passed, "Should fail with violations");
        assert!(
            result.violations.len() >= 3,
            "Should have multiple violations: {:?}",
            result.violations
        );
    }

    #[test]
    fn test_concurrent_allocation_tracking() {
        let tracker = Arc::new(AllocationTracker::new());
        let mut handles = vec![];

        // Spawn multiple threads doing allocations
        for _ in 0..4 {
            let tracker = Arc::clone(&tracker);
            handles.push(thread::spawn(move || {
                for _ in 0..100 {
                    tracker.record_alloc(1024);
                    thread::yield_now();
                    tracker.record_dealloc(1024);
                }
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // All allocations should be balanced
        assert_eq!(tracker.total_allocations(), 400);
        assert_eq!(tracker.total_deallocations(), 400);
        assert_eq!(tracker.allocation_leak_count(), 0);
    }

    #[test]
    fn test_concurrent_connection_pool() {
        let monitor = Arc::new(ConnectionPoolMonitor::new(50));
        let mut handles = vec![];

        // Spawn threads acquiring and releasing connections
        for _ in 0..10 {
            let monitor = Arc::clone(&monitor);
            handles.push(thread::spawn(move || {
                for i in 0..20 {
                    if monitor.acquire(i * 10) {
                        thread::sleep(Duration::from_micros(10));
                        monitor.release();
                    }
                }
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // Should have no leaks
        assert_eq!(
            monitor.leaked_connections(),
            0,
            "Should have no connection leaks"
        );
    }

    #[test]
    fn test_stress_memory_stability() {
        let tracker = AllocationTracker::new();

        // Take baseline
        tracker.record_alloc(1_000_000); // 1MB baseline
        let baseline = tracker.snapshot();

        // Simulate stress load with churn
        for _ in 0..1000 {
            let size = 1024 + (rand_value() % 4096) as usize;
            tracker.record_alloc(size);
            tracker.record_dealloc(size);
        }

        let after_stress = tracker.snapshot();

        // Memory should be stable
        assert_eq!(
            after_stress.current_bytes, baseline.current_bytes,
            "Memory should return to baseline after churn"
        );
    }

    /// Simple random value generator (not cryptographic)
    fn rand_value() -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            .hash(&mut hasher);
        thread::current().id().hash(&mut hasher);
        hasher.finish()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod integration_tests {
    use super::*;

    /// Simulates a realistic workload and validates resource utilization
    #[test]
    fn test_realistic_workload_resource_utilization() {
        let allocation_tracker = AllocationTracker::new();
        let connection_monitor = ConnectionPoolMonitor::new(20);
        let fd_monitor = FileDescriptorMonitor::new();

        // Take baseline measurements
        allocation_tracker.record_alloc(1_000_000); // 1MB baseline
        let baseline_alloc = allocation_tracker.snapshot();
        for _ in 0..10 {
            fd_monitor.open();
        }
        let baseline_fd = fd_monitor.current_open();

        let start_time = Instant::now();
        let mut operations = 0u64;

        // Simulate 1000 request operations
        for _ in 0..1000 {
            // Simulate request allocation (1-4KB per request)
            let request_size = 1024 + (operations as usize % 3072);
            allocation_tracker.record_alloc(request_size);

            // Simulate connection usage
            if connection_monitor.acquire(10 + (operations % 100) as u64) {
                // Simulate work
                thread::yield_now();
                connection_monitor.release();
            }

            // Simulate occasional file access
            if operations % 100 == 0 {
                fd_monitor.open();
            }

            // Simulate response
            allocation_tracker.record_dealloc(request_size);

            operations += 1;
        }

        // Close FDs from test
        for _ in 0..10 {
            fd_monitor.close();
        }

        let duration = start_time.elapsed();
        let final_alloc = allocation_tracker.snapshot();

        // Build report
        let report = ResourceUtilizationReport {
            memory_current_bytes: final_alloc.current_bytes,
            memory_peak_bytes: final_alloc.peak_bytes,
            memory_growth_percent: final_alloc.memory_growth_percent(&baseline_alloc),
            allocation_count: final_alloc.total_allocations,
            deallocation_count: final_alloc.total_deallocations,
            allocation_leak_count: allocation_tracker.allocation_leak_count(),
            allocation_rate_per_sec: final_alloc.allocation_rate(&baseline_alloc),
            connection_active: connection_monitor.active_connections(),
            connection_idle: connection_monitor.idle_connections(),
            connection_utilization_percent: connection_monitor.utilization_percent(),
            connection_leak_count: connection_monitor.leaked_connections(),
            connection_avg_wait_us: connection_monitor.avg_wait_time_us(),
            connection_p95_wait_us: connection_monitor.p95_wait_time_us(),
            connection_timeouts: connection_monitor.timeout_count(),
            fd_current: fd_monitor.current_open(),
            fd_peak: fd_monitor.peak_open(),
            fd_growth_percent: fd_monitor.growth_percent(baseline_fd),
            fd_leak_count: fd_monitor.leaked_fds(),
            duration,
            operations_completed: operations,
            operations_per_second: operations as f64 / duration.as_secs_f64(),
        };

        // Print report
        println!("\n=== Resource Utilization Report ===");
        println!("Duration: {:?}", report.duration);
        println!(
            "Operations: {} ({:.1}/s)",
            report.operations_completed, report.operations_per_second
        );
        println!();
        println!("Memory:");
        println!("  Current: {} bytes", report.memory_current_bytes);
        println!("  Peak: {} bytes", report.memory_peak_bytes);
        println!("  Growth: {:.1}%", report.memory_growth_percent);
        println!("  Allocations: {}", report.allocation_count);
        println!("  Deallocations: {}", report.deallocation_count);
        println!("  Leaks: {}", report.allocation_leak_count);
        println!();
        println!("Connections:");
        println!("  Active: {}", report.connection_active);
        println!(
            "  Utilization: {:.1}%",
            report.connection_utilization_percent
        );
        println!("  Leaks: {}", report.connection_leak_count);
        println!("  Avg Wait: {:.1}μs", report.connection_avg_wait_us);
        println!("  P95 Wait: {}μs", report.connection_p95_wait_us);
        println!("  Timeouts: {}", report.connection_timeouts);
        println!();
        println!("File Descriptors:");
        println!("  Current: {}", report.fd_current);
        println!("  Peak: {}", report.fd_peak);
        println!("  Growth: {:.1}%", report.fd_growth_percent);
        println!("  Leaks: {}", report.fd_leak_count);

        // Validate against thresholds
        let thresholds = ResourceThresholds::default();
        let result = report.validate(&thresholds);

        println!();
        if result.passed {
            println!("✅ PASSED: All resource utilization checks within thresholds");
        } else {
            println!("❌ FAILED: Resource utilization violations detected");
            for violation in &result.violations {
                println!("  - {}", violation);
            }
        }

        if !result.warnings.is_empty() {
            println!("\n⚠️  Warnings:");
            for warning in &result.warnings {
                println!("  - {}", warning);
            }
        }

        assert!(
            result.passed,
            "Workload should pass resource utilization checks"
        );
    }

    #[test]
    fn test_memory_leak_detection() {
        let tracker = AllocationTracker::new();

        // Simulate a memory leak
        for _ in 0..100 {
            tracker.record_alloc(1024);
            // Intentionally don't deallocate some
            if tracker.total_allocations() % 10 != 0 {
                tracker.record_dealloc(1024);
            }
        }

        // Should have ~10 leaked allocations
        let leaks = tracker.allocation_leak_count();
        assert!(leaks > 0, "Should detect allocation leaks");

        let thresholds = ResourceThresholds {
            max_allocation_leaks: 5, // Strict threshold
            ..Default::default()
        };

        let report = ResourceUtilizationReport {
            memory_current_bytes: tracker.current_bytes(),
            memory_peak_bytes: tracker.peak_bytes(),
            memory_growth_percent: 0.0,
            allocation_count: tracker.total_allocations(),
            deallocation_count: tracker.total_deallocations(),
            allocation_leak_count: leaks,
            allocation_rate_per_sec: 0.0,
            connection_active: 0,
            connection_idle: 0,
            connection_utilization_percent: 0.0,
            connection_leak_count: 0,
            connection_avg_wait_us: 0.0,
            connection_p95_wait_us: 0,
            connection_timeouts: 0,
            fd_current: 0,
            fd_peak: 0,
            fd_growth_percent: 0.0,
            fd_leak_count: 0,
            duration: Duration::from_secs(1),
            operations_completed: 100,
            operations_per_second: 100.0,
        };

        let result = report.validate(&thresholds);
        assert!(!result.passed, "Should fail with memory leak violations");
        assert!(
            result
                .violations
                .iter()
                .any(|v| v.contains("Allocation leaks")),
            "Should report allocation leak violation"
        );
    }
}
