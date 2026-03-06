//! BIZRA Node0 - Library modules
//!
//! This crate provides the core functionality for the BIZRA Genesis Node:
//!
//! # Modules
//!
//! - `core` - Infrastructure components (circuit breaker, rate limiter, cache, etc.)
//! - `services` - Business logic services (PoI, assets, resources, knowledge)
//! - `agents` - AI agent orchestration (PAT and SAT)
//! - `api` - API handlers and routes

pub mod core;
pub mod services;
pub mod agents;
pub mod api;

// Convenience re-exports for commonly used types
// These exports are available for external use when needed
#[allow(unused_imports)]
pub use core::CircuitBreaker;
#[allow(unused_imports)]
pub use core::CircuitBreakerConfig;
#[allow(unused_imports)]
pub use core::CircuitState;
#[allow(unused_imports)]
pub use core::TokenBucketLimiter;
#[allow(unused_imports)]
pub use core::SlidingWindowLimiter;
#[allow(unused_imports)]
pub use core::Quota;
#[allow(unused_imports)]
pub use core::QuotaManager;
#[allow(unused_imports)]
pub use core::MetricsRegistry;
#[allow(unused_imports)]
pub use core::Counter;
#[allow(unused_imports)]
pub use core::Gauge;
#[allow(unused_imports)]
pub use core::Histogram;
#[allow(unused_imports)]
pub use core::TaskScheduler;
#[allow(unused_imports)]
pub use core::Task;
#[allow(unused_imports)]
pub use core::TaskPriority;
#[allow(unused_imports)]
pub use core::TaskState;
#[allow(unused_imports)]
pub use core::LruCache;
#[allow(unused_imports)]
pub use core::CacheAside;
#[allow(unused_imports)]
pub use core::MultiTierCache;
