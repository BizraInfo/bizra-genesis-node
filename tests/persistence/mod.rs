// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PERSISTENCE LAYER TESTS                             ║
// ║  Comprehensive tests for database operations with transaction integrity   ║
// ║  Professional Elite Test Infrastructure                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod mocks;
pub mod receipt_tests;
pub mod transaction_tests;
pub mod cache_tests;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Test Utilities
// ═══════════════════════════════════════════════════════════════════════════

/// Generate unique test ID
pub fn generate_test_id() -> String {
    format!("test-{}", uuid::Uuid::new_v4())
}

/// Generate test run receipt data
pub fn generate_test_receipt() -> TestReceipt {
    TestReceipt {
        run_id: generate_test_id(),
        inputs_sha256: "sha256:test-inputs-hash".to_string(),
        winner_model: "test-model".to_string(),
        winner_json_sha256: "sha256:test-winner-hash".to_string(),
        consensus_hash_hex: "consensus-hash-hex".to_string(),
        policy_version: "1.0.0".to_string(),
        pattern_pack_sha256: "sha256:pattern-hash".to_string(),
        timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
        public_key_der: vec![1, 2, 3, 4],
        signature: vec![5, 6, 7, 8],
    }
}

/// Test receipt structure (mirrors production RunReceipt)
#[derive(Debug, Clone)]
pub struct TestReceipt {
    pub run_id: String,
    pub inputs_sha256: String,
    pub winner_model: String,
    pub winner_json_sha256: String,
    pub consensus_hash_hex: String,
    pub policy_version: String,
    pub pattern_pack_sha256: String,
    pub timestamp_ms: u64,
    pub public_key_der: Vec<u8>,
    pub signature: Vec<u8>,
}

/// Test agent metrics structure
#[derive(Debug, Clone, Default)]
pub struct TestAgentMetrics {
    pub agent_id: String,
    pub tasks_completed: i64,
    pub tasks_failed: i64,
    pub avg_latency_ms: f64,
    pub avg_confidence: f64,
    pub total_tokens_used: i64,
}

/// Test consensus result structure
#[derive(Debug, Clone)]
pub struct TestConsensusResult {
    pub run_id: String,
    pub winner_model: String,
    pub winner_score: f64,
    pub participants: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ═══════════════════════════════════════════════════════════════════════════
// Database Error Types for Testing
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, PartialEq)]
pub enum MockDbError {
    Connection(String),
    NotFound(String),
    ConstraintViolation(String),
    Serialization(String),
    Timeout(String),
    TransactionFailed(String),
}

impl std::fmt::Display for MockDbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MockDbError::Connection(msg) => write!(f, "Connection error: {}", msg),
            MockDbError::NotFound(msg) => write!(f, "Not found: {}", msg),
            MockDbError::ConstraintViolation(msg) => write!(f, "Constraint violation: {}", msg),
            MockDbError::Serialization(msg) => write!(f, "Serialization error: {}", msg),
            MockDbError::Timeout(msg) => write!(f, "Timeout: {}", msg),
            MockDbError::TransactionFailed(msg) => write!(f, "Transaction failed: {}", msg),
        }
    }
}

impl std::error::Error for MockDbError {}

pub type MockDbResult<T> = Result<T, MockDbError>;

// ═══════════════════════════════════════════════════════════════════════════
// Pool Statistics
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Default)]
pub struct TestPoolStats {
    pub size: u32,
    pub idle: usize,
    pub active: usize,
    pub waiting: usize,
}

// ═══════════════════════════════════════════════════════════════════════════
// Assertion Helpers
// ═══════════════════════════════════════════════════════════════════════════

/// Assert receipt fields match
pub fn assert_receipts_equal(a: &TestReceipt, b: &TestReceipt) {
    assert_eq!(a.run_id, b.run_id);
    assert_eq!(a.inputs_sha256, b.inputs_sha256);
    assert_eq!(a.winner_model, b.winner_model);
    assert_eq!(a.policy_version, b.policy_version);
}

/// Assert transaction was successful
pub fn assert_transaction_success<T>(result: &MockDbResult<T>) {
    assert!(result.is_ok(), "Transaction should succeed");
}

/// Assert transaction failed with specific error
pub fn assert_transaction_error(result: &MockDbResult<()>, expected_type: &str) {
    assert!(result.is_err(), "Transaction should fail");
    let err = result.as_ref().unwrap_err();
    let err_string = format!("{}", err);
    assert!(
        err_string.contains(expected_type),
        "Expected error type '{}', got '{}'",
        expected_type,
        err_string
    );
}
