// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PERSISTENCE MOCKS                                   ║
// ║  In-memory mock repositories for testing without database                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::{
    generate_test_id, MockDbError, MockDbResult, TestAgentMetrics, TestConsensusResult,
    TestPoolStats, TestReceipt,
};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Mock Receipt Repository
// ═══════════════════════════════════════════════════════════════════════════

/// In-memory mock receipt repository
pub struct MockReceiptRepository {
    receipts: Arc<RwLock<HashMap<String, TestReceipt>>>,
    /// Simulate connection errors
    should_fail: AtomicBool,
    /// Track operation counts
    insert_count: AtomicUsize,
    get_count: AtomicUsize,
    /// Simulated latency (milliseconds)
    latency_ms: u64,
}

impl MockReceiptRepository {
    pub fn new() -> Self {
        Self {
            receipts: Arc::new(RwLock::new(HashMap::new())),
            should_fail: AtomicBool::new(false),
            insert_count: AtomicUsize::new(0),
            get_count: AtomicUsize::new(0),
            latency_ms: 0,
        }
    }

    pub fn with_latency(mut self, latency_ms: u64) -> Self {
        self.latency_ms = latency_ms;
        self
    }

    pub fn set_should_fail(&self, should_fail: bool) {
        self.should_fail.store(should_fail, Ordering::SeqCst);
    }

    pub fn get_insert_count(&self) -> usize {
        self.insert_count.load(Ordering::SeqCst)
    }

    pub fn get_get_count(&self) -> usize {
        self.get_count.load(Ordering::SeqCst)
    }

    async fn simulate_latency(&self) {
        if self.latency_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(self.latency_ms)).await;
        }
    }

    fn check_failure(&self) -> MockDbResult<()> {
        if self.should_fail.load(Ordering::SeqCst) {
            return Err(MockDbError::Connection("Simulated connection failure".into()));
        }
        Ok(())
    }

    pub async fn insert(&self, receipt: &TestReceipt) -> MockDbResult<()> {
        self.check_failure()?;
        self.simulate_latency().await;
        self.insert_count.fetch_add(1, Ordering::SeqCst);

        let mut receipts = self.receipts.write().await;

        // Check for duplicate (ON CONFLICT DO NOTHING behavior)
        if receipts.contains_key(&receipt.run_id) {
            return Ok(()); // Silently ignore duplicates
        }

        receipts.insert(receipt.run_id.clone(), receipt.clone());
        Ok(())
    }

    pub async fn get(&self, run_id: &str) -> MockDbResult<Option<TestReceipt>> {
        self.check_failure()?;
        self.simulate_latency().await;
        self.get_count.fetch_add(1, Ordering::SeqCst);

        let receipts = self.receipts.read().await;
        Ok(receipts.get(run_id).cloned())
    }

    pub async fn get_by_model(&self, model: &str, limit: i64) -> MockDbResult<Vec<TestReceipt>> {
        self.check_failure()?;
        self.simulate_latency().await;

        let receipts = self.receipts.read().await;
        let filtered: Vec<TestReceipt> = receipts
            .values()
            .filter(|r| r.winner_model == model)
            .take(limit as usize)
            .cloned()
            .collect();

        Ok(filtered)
    }

    pub async fn get_recent(&self, limit: i64) -> MockDbResult<Vec<TestReceipt>> {
        self.check_failure()?;
        self.simulate_latency().await;

        let receipts = self.receipts.read().await;
        let mut all: Vec<TestReceipt> = receipts.values().cloned().collect();

        // Sort by timestamp descending
        all.sort_by(|a, b| b.timestamp_ms.cmp(&a.timestamp_ms));
        all.truncate(limit as usize);

        Ok(all)
    }

    pub async fn count(&self) -> MockDbResult<i64> {
        self.check_failure()?;
        self.simulate_latency().await;

        let receipts = self.receipts.read().await;
        Ok(receipts.len() as i64)
    }

    pub async fn clear(&self) {
        let mut receipts = self.receipts.write().await;
        receipts.clear();
    }
}

impl Default for MockReceiptRepository {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Agent Repository
// ═══════════════════════════════════════════════════════════════════════════

pub struct MockAgentRepository {
    agents: Arc<RwLock<HashMap<String, TestAgentMetrics>>>,
    should_fail: AtomicBool,
}

impl MockAgentRepository {
    pub fn new() -> Self {
        Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            should_fail: AtomicBool::new(false),
        }
    }

    pub fn set_should_fail(&self, should_fail: bool) {
        self.should_fail.store(should_fail, Ordering::SeqCst);
    }

    fn check_failure(&self) -> MockDbResult<()> {
        if self.should_fail.load(Ordering::SeqCst) {
            return Err(MockDbError::Connection("Simulated failure".into()));
        }
        Ok(())
    }

    pub async fn upsert_metrics(&self, metrics: &TestAgentMetrics) -> MockDbResult<()> {
        self.check_failure()?;

        let mut agents = self.agents.write().await;
        agents.insert(metrics.agent_id.clone(), metrics.clone());
        Ok(())
    }

    pub async fn get_metrics(&self, agent_id: &str) -> MockDbResult<Option<TestAgentMetrics>> {
        self.check_failure()?;

        let agents = self.agents.read().await;
        Ok(agents.get(agent_id).cloned())
    }

    pub async fn get_all_metrics(&self) -> MockDbResult<Vec<TestAgentMetrics>> {
        self.check_failure()?;

        let agents = self.agents.read().await;
        Ok(agents.values().cloned().collect())
    }

    pub async fn increment_tasks(&self, agent_id: &str, completed: i64, failed: i64) -> MockDbResult<()> {
        self.check_failure()?;

        let mut agents = self.agents.write().await;
        if let Some(metrics) = agents.get_mut(agent_id) {
            metrics.tasks_completed += completed;
            metrics.tasks_failed += failed;
        }
        Ok(())
    }
}

impl Default for MockAgentRepository {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Consensus Repository
// ═══════════════════════════════════════════════════════════════════════════

pub struct MockConsensusRepository {
    results: Arc<RwLock<HashMap<String, TestConsensusResult>>>,
    should_fail: AtomicBool,
}

impl MockConsensusRepository {
    pub fn new() -> Self {
        Self {
            results: Arc::new(RwLock::new(HashMap::new())),
            should_fail: AtomicBool::new(false),
        }
    }

    pub fn set_should_fail(&self, should_fail: bool) {
        self.should_fail.store(should_fail, Ordering::SeqCst);
    }

    fn check_failure(&self) -> MockDbResult<()> {
        if self.should_fail.load(Ordering::SeqCst) {
            return Err(MockDbError::Connection("Simulated failure".into()));
        }
        Ok(())
    }

    pub async fn insert(&self, result: &TestConsensusResult) -> MockDbResult<()> {
        self.check_failure()?;

        let mut results = self.results.write().await;
        if results.contains_key(&result.run_id) {
            return Err(MockDbError::ConstraintViolation(
                "Duplicate run_id".into(),
            ));
        }
        results.insert(result.run_id.clone(), result.clone());
        Ok(())
    }

    pub async fn get(&self, run_id: &str) -> MockDbResult<Option<TestConsensusResult>> {
        self.check_failure()?;

        let results = self.results.read().await;
        Ok(results.get(run_id).cloned())
    }
}

impl Default for MockConsensusRepository {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Database Pool
// ═══════════════════════════════════════════════════════════════════════════

pub struct MockDatabasePool {
    pub receipts: Arc<MockReceiptRepository>,
    pub agents: Arc<MockAgentRepository>,
    pub consensus: Arc<MockConsensusRepository>,
    stats: Arc<RwLock<TestPoolStats>>,
    healthy: AtomicBool,
}

impl MockDatabasePool {
    pub fn new() -> Self {
        Self {
            receipts: Arc::new(MockReceiptRepository::new()),
            agents: Arc::new(MockAgentRepository::new()),
            consensus: Arc::new(MockConsensusRepository::new()),
            stats: Arc::new(RwLock::new(TestPoolStats {
                size: 10,
                idle: 8,
                active: 2,
                waiting: 0,
            })),
            healthy: AtomicBool::new(true),
        }
    }

    pub fn set_healthy(&self, healthy: bool) {
        self.healthy.store(healthy, Ordering::SeqCst);
    }

    pub async fn health_check(&self) -> MockDbResult<()> {
        if self.healthy.load(Ordering::SeqCst) {
            Ok(())
        } else {
            Err(MockDbError::Connection("Database unhealthy".into()))
        }
    }

    pub async fn pool_stats(&self) -> TestPoolStats {
        self.stats.read().await.clone()
    }

    pub async fn update_stats(&self, stats: TestPoolStats) {
        let mut s = self.stats.write().await;
        *s = stats;
    }
}

impl Default for MockDatabasePool {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Transaction Manager
// ═══════════════════════════════════════════════════════════════════════════

pub struct MockTransaction {
    committed: AtomicBool,
    rolled_back: AtomicBool,
    operations: Arc<RwLock<Vec<String>>>,
}

impl MockTransaction {
    pub fn new() -> Self {
        Self {
            committed: AtomicBool::new(false),
            rolled_back: AtomicBool::new(false),
            operations: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn execute(&self, operation: &str) -> MockDbResult<()> {
        if self.rolled_back.load(Ordering::SeqCst) {
            return Err(MockDbError::TransactionFailed(
                "Transaction already rolled back".into(),
            ));
        }
        if self.committed.load(Ordering::SeqCst) {
            return Err(MockDbError::TransactionFailed(
                "Transaction already committed".into(),
            ));
        }

        let mut ops = self.operations.write().await;
        ops.push(operation.to_string());
        Ok(())
    }

    pub async fn commit(&self) -> MockDbResult<()> {
        if self.rolled_back.load(Ordering::SeqCst) {
            return Err(MockDbError::TransactionFailed(
                "Cannot commit rolled back transaction".into(),
            ));
        }
        self.committed.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub async fn rollback(&self) -> MockDbResult<()> {
        if self.committed.load(Ordering::SeqCst) {
            return Err(MockDbError::TransactionFailed(
                "Cannot rollback committed transaction".into(),
            ));
        }
        self.rolled_back.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn is_committed(&self) -> bool {
        self.committed.load(Ordering::SeqCst)
    }

    pub fn is_rolled_back(&self) -> bool {
        self.rolled_back.load(Ordering::SeqCst)
    }

    pub async fn operations(&self) -> Vec<String> {
        self.operations.read().await.clone()
    }
}

impl Default for MockTransaction {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests for Mock Infrastructure
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::generate_test_receipt;

    #[tokio::test]
    async fn test_mock_receipt_repository_insert_get() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        // Insert
        let result = repo.insert(&receipt).await;
        assert!(result.is_ok());

        // Get
        let retrieved = repo.get(&receipt.run_id).await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().run_id, receipt.run_id);
    }

    #[tokio::test]
    async fn test_mock_receipt_repository_duplicate_handling() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        // First insert
        repo.insert(&receipt).await.unwrap();

        // Duplicate insert should succeed (ON CONFLICT DO NOTHING)
        let result = repo.insert(&receipt).await;
        assert!(result.is_ok());

        // Count should still be 1
        let count = repo.count().await.unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_mock_receipt_repository_failure_simulation() {
        let repo = MockReceiptRepository::new();
        repo.set_should_fail(true);

        let receipt = generate_test_receipt();
        let result = repo.insert(&receipt).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_mock_receipt_repository_get_by_model() {
        let repo = MockReceiptRepository::new();

        // Insert multiple receipts
        for i in 0..5 {
            let mut receipt = generate_test_receipt();
            receipt.winner_model = if i < 3 { "model-a" } else { "model-b" }.to_string();
            repo.insert(&receipt).await.unwrap();
        }

        let model_a_receipts = repo.get_by_model("model-a", 10).await.unwrap();
        assert_eq!(model_a_receipts.len(), 3);

        let model_b_receipts = repo.get_by_model("model-b", 10).await.unwrap();
        assert_eq!(model_b_receipts.len(), 2);
    }

    #[tokio::test]
    async fn test_mock_transaction_commit() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test").await.unwrap();
        tx.execute("UPDATE test SET x = 1").await.unwrap();
        tx.commit().await.unwrap();

        assert!(tx.is_committed());
        assert!(!tx.is_rolled_back());

        let ops = tx.operations().await;
        assert_eq!(ops.len(), 2);
    }

    #[tokio::test]
    async fn test_mock_transaction_rollback() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test").await.unwrap();
        tx.rollback().await.unwrap();

        assert!(!tx.is_committed());
        assert!(tx.is_rolled_back());
    }

    #[tokio::test]
    async fn test_mock_transaction_cannot_execute_after_commit() {
        let tx = MockTransaction::new();

        tx.commit().await.unwrap();
        let result = tx.execute("INSERT INTO test").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_mock_database_pool_health() {
        let pool = MockDatabasePool::new();

        // Healthy by default
        assert!(pool.health_check().await.is_ok());

        // Set unhealthy
        pool.set_healthy(false);
        assert!(pool.health_check().await.is_err());
    }

    #[tokio::test]
    async fn test_mock_agent_repository() {
        let repo = MockAgentRepository::new();

        let metrics = TestAgentMetrics {
            agent_id: "agent-001".to_string(),
            tasks_completed: 10,
            tasks_failed: 1,
            avg_latency_ms: 150.0,
            avg_confidence: 0.92,
            total_tokens_used: 5000,
        };

        // Upsert
        repo.upsert_metrics(&metrics).await.unwrap();

        // Get
        let retrieved = repo.get_metrics("agent-001").await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().tasks_completed, 10);

        // Increment
        repo.increment_tasks("agent-001", 5, 0).await.unwrap();
        let updated = repo.get_metrics("agent-001").await.unwrap().unwrap();
        assert_eq!(updated.tasks_completed, 15);
    }

    #[tokio::test]
    async fn test_mock_consensus_repository() {
        let repo = MockConsensusRepository::new();

        let result = TestConsensusResult {
            run_id: "run-001".to_string(),
            winner_model: "model-a".to_string(),
            winner_score: 0.95,
            participants: vec!["model-a".to_string(), "model-b".to_string()],
            created_at: chrono::Utc::now(),
        };

        // Insert
        repo.insert(&result).await.unwrap();

        // Get
        let retrieved = repo.get("run-001").await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().winner_score, 0.95);

        // Duplicate should fail
        let duplicate_result = repo.insert(&result).await;
        assert!(duplicate_result.is_err());
    }
}
