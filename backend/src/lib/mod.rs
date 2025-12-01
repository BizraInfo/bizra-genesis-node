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
pub use core::CircuitBreaker;
pub use core::CircuitBreakerConfig;
pub use core::CircuitState;
pub use core::TokenBucketLimiter;
pub use core::SlidingWindowLimiter;
pub use core::Quota;
pub use core::QuotaManager;
pub use core::MetricsRegistry;
pub use core::Counter;
pub use core::Gauge;
pub use core::Histogram;
pub use core::TaskScheduler;
pub use core::Task;
pub use core::TaskPriority;
pub use core::TaskState;
pub use core::LruCache;
pub use core::CacheAside;
pub use core::MultiTierCache;
