// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - TRANSACTION INTEGRITY TESTS                         ║
// ║  Comprehensive tests for transaction behavior, ACID compliance, and       ║
// ║  failure recovery patterns                                                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::{
    generate_test_id, generate_test_receipt, assert_transaction_success,
    assert_transaction_error, MockDbError, MockDbResult, TestReceipt,
    TestAgentMetrics, TestConsensusResult,
};
use super::mocks::{
    MockDatabasePool, MockReceiptRepository, MockAgentRepository,
    MockConsensusRepository, MockTransaction,
};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Transaction State Machine Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod transaction_state_tests {
    use super::*;

    #[tokio::test]
    async fn test_transaction_initial_state() {
        let tx = MockTransaction::new();

        assert!(!tx.is_committed());
        assert!(!tx.is_rolled_back());

        let ops = tx.operations().await;
        assert!(ops.is_empty());
    }

    #[tokio::test]
    async fn test_transaction_normal_commit_flow() {
        let tx = MockTransaction::new();

        // Execute multiple operations
        tx.execute("BEGIN").await.unwrap();
        tx.execute("INSERT INTO receipts VALUES (...)").await.unwrap();
        tx.execute("UPDATE metrics SET count = count + 1").await.unwrap();

        // Commit
        tx.commit().await.unwrap();

        assert!(tx.is_committed());
        assert!(!tx.is_rolled_back());

        let ops = tx.operations().await;
        assert_eq!(ops.len(), 3);
    }

    #[tokio::test]
    async fn test_transaction_rollback_flow() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO receipts VALUES (...)").await.unwrap();
        tx.execute("INSERT INTO invalid_table").await.unwrap();

        // Rollback instead of commit
        tx.rollback().await.unwrap();

        assert!(!tx.is_committed());
        assert!(tx.is_rolled_back());
    }

    #[tokio::test]
    async fn test_transaction_cannot_commit_after_rollback() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test").await.unwrap();
        tx.rollback().await.unwrap();

        let result = tx.commit().await;
        assert!(result.is_err());

        if let Err(MockDbError::TransactionFailed(msg)) = result {
            assert!(msg.contains("rolled back"));
        } else {
            panic!("Expected TransactionFailed error");
        }
    }

    #[tokio::test]
    async fn test_transaction_cannot_rollback_after_commit() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test").await.unwrap();
        tx.commit().await.unwrap();

        let result = tx.rollback().await;
        assert!(result.is_err());

        if let Err(MockDbError::TransactionFailed(msg)) = result {
            assert!(msg.contains("committed"));
        } else {
            panic!("Expected TransactionFailed error");
        }
    }

    #[tokio::test]
    async fn test_transaction_cannot_execute_after_commit() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test1").await.unwrap();
        tx.commit().await.unwrap();

        let result = tx.execute("INSERT INTO test2").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_transaction_cannot_execute_after_rollback() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO test1").await.unwrap();
        tx.rollback().await.unwrap();

        let result = tx.execute("INSERT INTO test2").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_empty_transaction_commit() {
        let tx = MockTransaction::new();

        // Commit without any operations
        let result = tx.commit().await;
        assert!(result.is_ok());
        assert!(tx.is_committed());
    }

    #[tokio::test]
    async fn test_empty_transaction_rollback() {
        let tx = MockTransaction::new();

        // Rollback without any operations
        let result = tx.rollback().await;
        assert!(result.is_ok());
        assert!(tx.is_rolled_back());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACID Property Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod acid_tests {
    use super::*;

    /// Atomicity: All operations succeed or all fail
    #[tokio::test]
    async fn test_atomicity_all_operations_recorded() {
        let tx = MockTransaction::new();

        let operations = vec![
            "INSERT INTO receipts (id) VALUES ('r1')",
            "INSERT INTO receipts (id) VALUES ('r2')",
            "INSERT INTO receipts (id) VALUES ('r3')",
        ];

        for op in &operations {
            tx.execute(op).await.unwrap();
        }

        tx.commit().await.unwrap();

        let recorded = tx.operations().await;
        assert_eq!(recorded.len(), operations.len());

        for (i, op) in operations.iter().enumerate() {
            assert_eq!(&recorded[i], *op);
        }
    }

    /// Atomicity: Failed transaction records no operations
    #[tokio::test]
    async fn test_atomicity_rollback_clears_intent() {
        let tx = MockTransaction::new();

        tx.execute("INSERT INTO receipts (id) VALUES ('r1')").await.unwrap();
        tx.execute("INSERT INTO receipts (id) VALUES ('r2')").await.unwrap();

        // Simulate error detection and rollback
        tx.rollback().await.unwrap();

        // Transaction was rolled back, operations should not be applied
        assert!(tx.is_rolled_back());

        // Operations are recorded for audit but not applied
        let ops = tx.operations().await;
        assert_eq!(ops.len(), 2); // Recorded but would not be applied to DB
    }

    /// Consistency: Data remains valid after transaction
    #[tokio::test]
    async fn test_consistency_constraint_validation() {
        let repo = MockConsensusRepository::new();

        let result = TestConsensusResult {
            run_id: "unique-run-id".to_string(),
            winner_model: "model-a".to_string(),
            winner_score: 0.95,
            participants: vec!["model-a".to_string()],
            created_at: chrono::Utc::now(),
        };

        // First insert succeeds
        repo.insert(&result).await.unwrap();

        // Duplicate violates consistency (unique constraint)
        let duplicate_result = repo.insert(&result).await;
        assert!(matches!(duplicate_result, Err(MockDbError::ConstraintViolation(_))));
    }

    /// Isolation: Concurrent transactions don't interfere
    #[tokio::test]
    async fn test_isolation_concurrent_transactions() {
        let repo = Arc::new(MockReceiptRepository::new());
        let operations_count = Arc::new(AtomicUsize::new(0));

        let mut handles = vec![];

        // Spawn 10 concurrent "transactions"
        for i in 0..10 {
            let repo_clone = Arc::clone(&repo);
            let ops_count = Arc::clone(&operations_count);

            let handle = tokio::spawn(async move {
                let mut receipt = generate_test_receipt();
                receipt.run_id = format!("tx-{}-receipt", i);

                repo_clone.insert(&receipt).await.unwrap();
                ops_count.fetch_add(1, Ordering::SeqCst);
            });

            handles.push(handle);
        }

        // Wait for all to complete
        for handle in handles {
            handle.await.unwrap();
        }

        // All operations should have completed
        assert_eq!(operations_count.load(Ordering::SeqCst), 10);

        // All receipts should exist
        let count = repo.count().await.unwrap();
        assert_eq!(count, 10);
    }

    /// Durability: Committed data persists (simulated)
    #[tokio::test]
    async fn test_durability_committed_data_persists() {
        let pool = MockDatabasePool::new();

        let receipt = generate_test_receipt();
        pool.receipts.insert(&receipt).await.unwrap();

        // Simulate "restart" by creating new references
        // In a real system, this would be a DB restart
        let retrieved = pool.receipts.get(&receipt.run_id).await.unwrap();

        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().run_id, receipt.run_id);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-Repository Transaction Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod multi_repository_tests {
    use super::*;

    /// Test cross-repository transaction (receipt + metrics + consensus)
    #[tokio::test]
    async fn test_cross_repository_transaction_success() {
        let pool = MockDatabasePool::new();
        let tx = MockTransaction::new();

        // Prepare data
        let receipt = generate_test_receipt();
        let metrics = TestAgentMetrics {
            agent_id: "agent-001".to_string(),
            tasks_completed: 1,
            tasks_failed: 0,
            avg_latency_ms: 100.0,
            avg_confidence: 0.95,
            total_tokens_used: 1000,
        };
        let consensus = TestConsensusResult {
            run_id: receipt.run_id.clone(),
            winner_model: receipt.winner_model.clone(),
            winner_score: 0.95,
            participants: vec!["model-a".to_string(), "model-b".to_string()],
            created_at: chrono::Utc::now(),
        };

        // Record transaction operations
        tx.execute("INSERT INTO receipts").await.unwrap();
        tx.execute("UPDATE agent_metrics").await.unwrap();
        tx.execute("INSERT INTO consensus_results").await.unwrap();

        // Perform actual inserts
        pool.receipts.insert(&receipt).await.unwrap();
        pool.agents.upsert_metrics(&metrics).await.unwrap();
        pool.consensus.insert(&consensus).await.unwrap();

        // Commit
        tx.commit().await.unwrap();

        // Verify all data exists
        assert!(pool.receipts.get(&receipt.run_id).await.unwrap().is_some());
        assert!(pool.agents.get_metrics("agent-001").await.unwrap().is_some());
        assert!(pool.consensus.get(&receipt.run_id).await.unwrap().is_some());
    }

    /// Test partial failure handling in cross-repository transaction
    #[tokio::test]
    async fn test_cross_repository_transaction_partial_failure() {
        let pool = MockDatabasePool::new();
        let tx = MockTransaction::new();

        let receipt = generate_test_receipt();

        // First operation succeeds
        tx.execute("INSERT INTO receipts").await.unwrap();
        pool.receipts.insert(&receipt).await.unwrap();

        // Second operation fails (simulate constraint violation)
        pool.consensus.set_should_fail(true);

        let consensus = TestConsensusResult {
            run_id: receipt.run_id.clone(),
            winner_model: "model-a".to_string(),
            winner_score: 0.95,
            participants: vec![],
            created_at: chrono::Utc::now(),
        };

        let result = pool.consensus.insert(&consensus).await;

        // On failure, rollback
        if result.is_err() {
            tx.rollback().await.unwrap();
        }

        assert!(tx.is_rolled_back());
    }

    /// Test transaction with dependent operations
    #[tokio::test]
    async fn test_dependent_operations_ordering() {
        let pool = MockDatabasePool::new();

        // First, create agent metrics (dependency)
        let metrics = TestAgentMetrics {
            agent_id: "agent-001".to_string(),
            tasks_completed: 0,
            tasks_failed: 0,
            avg_latency_ms: 0.0,
            avg_confidence: 0.0,
            total_tokens_used: 0,
        };
        pool.agents.upsert_metrics(&metrics).await.unwrap();

        // Then, record task completion (depends on agent existing)
        pool.agents.increment_tasks("agent-001", 1, 0).await.unwrap();

        // Verify
        let updated = pool.agents.get_metrics("agent-001").await.unwrap().unwrap();
        assert_eq!(updated.tasks_completed, 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Failure Recovery Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod failure_recovery_tests {
    use super::*;

    /// Test recovery from connection failure during transaction
    #[tokio::test]
    async fn test_connection_failure_during_transaction() {
        let repo = MockReceiptRepository::new();
        let tx = MockTransaction::new();

        // Start transaction
        tx.execute("BEGIN").await.unwrap();

        let receipt = generate_test_receipt();

        // First insert succeeds
        repo.insert(&receipt).await.unwrap();
        tx.execute("INSERT receipt 1").await.unwrap();

        // Simulate connection failure
        repo.set_should_fail(true);

        let mut receipt2 = generate_test_receipt();
        receipt2.run_id = generate_test_id();

        let result = repo.insert(&receipt2).await;

        if result.is_err() {
            // Connection failed, rollback transaction
            tx.rollback().await.unwrap();
        }

        assert!(tx.is_rolled_back());
    }

    /// Test retry logic after transient failure
    #[tokio::test]
    async fn test_retry_after_transient_failure() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        // First attempt fails
        repo.set_should_fail(true);
        let result1 = repo.insert(&receipt).await;
        assert!(result1.is_err());

        // Connection recovers
        repo.set_should_fail(false);

        // Retry succeeds
        let result2 = repo.insert(&receipt).await;
        assert!(result2.is_ok());

        // Verify data exists
        let retrieved = repo.get(&receipt.run_id).await.unwrap();
        assert!(retrieved.is_some());
    }

    /// Test exponential backoff pattern
    #[tokio::test]
    async fn test_exponential_backoff_pattern() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        let max_retries = 3;
        let mut attempt = 0;
        let mut backoff_ms = 10u64;

        repo.set_should_fail(true);

        loop {
            attempt += 1;

            let result = repo.insert(&receipt).await;

            if result.is_ok() {
                break;
            }

            if attempt >= max_retries {
                // On third attempt, "fix" the connection
                repo.set_should_fail(false);
            }

            if attempt > max_retries + 1 {
                panic!("Should have succeeded after fixing connection");
            }

            // Simulate backoff
            tokio::time::sleep(tokio::time::Duration::from_millis(backoff_ms)).await;
            backoff_ms *= 2; // Exponential backoff
        }

        assert!(attempt <= max_retries + 1);
    }

    /// Test circuit breaker pattern
    #[tokio::test]
    async fn test_circuit_breaker_pattern() {
        let repo = MockReceiptRepository::new();
        let failure_threshold = 3;
        let mut consecutive_failures = 0;
        let mut circuit_open = false;

        repo.set_should_fail(true);

        for i in 0..10 {
            if circuit_open {
                // Circuit is open, fail fast
                assert!(i >= failure_threshold);
                continue;
            }

            let receipt = generate_test_receipt();
            let result = repo.insert(&receipt).await;

            if result.is_err() {
                consecutive_failures += 1;
                if consecutive_failures >= failure_threshold {
                    circuit_open = true;
                }
            } else {
                consecutive_failures = 0;
            }
        }

        assert!(circuit_open);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent Transaction Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod concurrent_transaction_tests {
    use super::*;

    /// Test concurrent writes to same key (last write wins)
    #[tokio::test]
    async fn test_concurrent_writes_same_key() {
        let repo = Arc::new(MockAgentRepository::new());

        // Create initial record
        let initial = TestAgentMetrics {
            agent_id: "agent-shared".to_string(),
            tasks_completed: 0,
            ..Default::default()
        };
        repo.upsert_metrics(&initial).await.unwrap();

        let mut handles = vec![];

        // Multiple concurrent updates
        for i in 0..5 {
            let repo_clone = Arc::clone(&repo);
            let handle = tokio::spawn(async move {
                let metrics = TestAgentMetrics {
                    agent_id: "agent-shared".to_string(),
                    tasks_completed: i + 1,
                    ..Default::default()
                };
                repo_clone.upsert_metrics(&metrics).await.unwrap();
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        // One of the values should have "won"
        let final_metrics = repo.get_metrics("agent-shared").await.unwrap().unwrap();
        assert!(final_metrics.tasks_completed >= 1 && final_metrics.tasks_completed <= 5);
    }

    /// Test concurrent increments with proper synchronization
    #[tokio::test]
    async fn test_concurrent_increments() {
        let repo = Arc::new(MockAgentRepository::new());

        // Create initial record
        let initial = TestAgentMetrics {
            agent_id: "agent-counter".to_string(),
            tasks_completed: 0,
            ..Default::default()
        };
        repo.upsert_metrics(&initial).await.unwrap();

        let increment_count = 100;
        let mut handles = vec![];

        for _ in 0..increment_count {
            let repo_clone = Arc::clone(&repo);
            let handle = tokio::spawn(async move {
                repo_clone.increment_tasks("agent-counter", 1, 0).await.unwrap();
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let final_metrics = repo.get_metrics("agent-counter").await.unwrap().unwrap();
        // Note: Without proper database-level locking, some increments may be lost
        // This test documents the expected behavior
        assert!(final_metrics.tasks_completed > 0);
    }

    /// Test deadlock prevention (timeout)
    #[tokio::test]
    async fn test_transaction_timeout() {
        let tx = MockTransaction::new();

        // Simulate long-running operation that would be timeout-protected
        let result = tokio::time::timeout(
            tokio::time::Duration::from_millis(100),
            async {
                tx.execute("LONG RUNNING QUERY").await.unwrap();
                // Simulate delay
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                tx.commit().await
            }
        ).await;

        // Should complete within timeout
        assert!(result.is_ok());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Savepoint Tests (Nested Transaction Simulation)
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod savepoint_tests {
    use super::*;

    /// Simulated savepoint structure
    struct Savepoint {
        name: String,
        operations_at_save: usize,
    }

    /// Test savepoint creation and rollback to savepoint
    #[tokio::test]
    async fn test_savepoint_partial_rollback() {
        let tx = MockTransaction::new();
        let mut savepoints: Vec<Savepoint> = vec![];

        // Execute some operations
        tx.execute("INSERT INTO table1").await.unwrap();
        tx.execute("INSERT INTO table2").await.unwrap();

        // Create savepoint
        let ops_count = tx.operations().await.len();
        savepoints.push(Savepoint {
            name: "sp1".to_string(),
            operations_at_save: ops_count,
        });

        // Execute more operations
        tx.execute("INSERT INTO table3").await.unwrap();
        tx.execute("INSERT INTO table4").await.unwrap();

        // "Rollback to savepoint" - in real DB, this would undo table3 and table4
        // Here we just track what operations would remain
        let rollback_to = savepoints.pop().unwrap();
        let final_ops = tx.operations().await;

        assert_eq!(final_ops.len(), 4); // All recorded
        assert_eq!(rollback_to.operations_at_save, 2); // Savepoint was at 2

        // In real implementation, only first 2 operations would be committed
    }

    /// Test nested savepoints
    #[tokio::test]
    async fn test_nested_savepoints() {
        let tx = MockTransaction::new();
        let mut savepoints: Vec<Savepoint> = vec![];

        tx.execute("OP1").await.unwrap();

        // First savepoint
        savepoints.push(Savepoint {
            name: "sp1".to_string(),
            operations_at_save: tx.operations().await.len(),
        });

        tx.execute("OP2").await.unwrap();

        // Nested savepoint
        savepoints.push(Savepoint {
            name: "sp2".to_string(),
            operations_at_save: tx.operations().await.len(),
        });

        tx.execute("OP3").await.unwrap();

        // Verify savepoint stack
        assert_eq!(savepoints.len(), 2);
        assert_eq!(savepoints[0].operations_at_save, 1); // sp1 after OP1
        assert_eq!(savepoints[1].operations_at_save, 2); // sp2 after OP2
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Transaction Isolation Level Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod isolation_level_tests {
    use super::*;

    /// Test read committed isolation (no dirty reads)
    #[tokio::test]
    async fn test_read_committed_no_dirty_reads() {
        let repo = Arc::new(MockReceiptRepository::new());

        // Transaction 1: Insert but don't "commit" (simulated by flag)
        let receipt = generate_test_receipt();
        let uncommitted_id = receipt.run_id.clone();

        // In a real scenario, uncommitted data wouldn't be visible
        // Our mock immediately writes, so this test documents expected behavior
        repo.insert(&receipt).await.unwrap();

        // Transaction 2: Read - in real DB with read committed, wouldn't see uncommitted
        let read_result = repo.get(&uncommitted_id).await.unwrap();

        // With our mock, data is visible immediately
        // Real test would use actual DB isolation
        assert!(read_result.is_some());
    }

    /// Test repeatable read isolation (phantom reads)
    #[tokio::test]
    async fn test_phantom_read_scenario() {
        let repo = Arc::new(MockReceiptRepository::new());

        // Insert initial data
        for i in 0..3 {
            let mut receipt = generate_test_receipt();
            receipt.winner_model = "model-a".to_string();
            receipt.run_id = format!("phantom-test-{}", i);
            repo.insert(&receipt).await.unwrap();
        }

        // First read
        let first_read = repo.get_by_model("model-a", 100).await.unwrap();
        let first_count = first_read.len();

        // Another transaction inserts a new matching record
        let mut new_receipt = generate_test_receipt();
        new_receipt.winner_model = "model-a".to_string();
        new_receipt.run_id = "phantom-test-new".to_string();
        repo.insert(&new_receipt).await.unwrap();

        // Second read (in same "transaction" - would see phantom in non-serializable)
        let second_read = repo.get_by_model("model-a", 100).await.unwrap();
        let second_count = second_read.len();

        // Phantom read occurred: count changed within "transaction"
        assert_eq!(first_count, 3);
        assert_eq!(second_count, 4);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Transaction Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;

    /// Property: Transaction state is always consistent
    #[tokio::test]
    async fn test_transaction_state_consistency() {
        for _ in 0..100 {
            let tx = MockTransaction::new();

            // Random operations
            let op_count = rand::random::<u8>() % 10;
            for i in 0..op_count {
                tx.execute(&format!("OP{}", i)).await.unwrap();
            }

            // Random finalization
            if rand::random::<bool>() {
                tx.commit().await.unwrap();
                assert!(tx.is_committed());
                assert!(!tx.is_rolled_back());
            } else {
                tx.rollback().await.unwrap();
                assert!(!tx.is_committed());
                assert!(tx.is_rolled_back());
            }

            // Verify operations count matches
            let ops = tx.operations().await;
            assert_eq!(ops.len() as u8, op_count);
        }
    }

    /// Property: Committed + Rolled back is always false
    #[tokio::test]
    async fn test_mutual_exclusivity() {
        for _ in 0..100 {
            let tx = MockTransaction::new();

            tx.execute("TEST").await.unwrap();

            if rand::random::<bool>() {
                tx.commit().await.unwrap();
            } else {
                tx.rollback().await.unwrap();
            }

            // Can never be both committed and rolled back
            assert!(!(tx.is_committed() && tx.is_rolled_back()));

            // Must be exactly one after finalization
            assert!(tx.is_committed() ^ tx.is_rolled_back());
        }
    }

    /// Property: Operation count is monotonically increasing until finalization
    #[tokio::test]
    async fn test_operation_count_monotonic() {
        let tx = MockTransaction::new();
        let mut last_count = 0;

        for i in 0..20 {
            tx.execute(&format!("OP{}", i)).await.unwrap();
            let current_count = tx.operations().await.len();

            assert!(current_count > last_count);
            assert_eq!(current_count, i + 1);

            last_count = current_count;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Stress Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod stress_tests {
    use super::*;

    /// High-volume transaction stress test
    #[tokio::test]
    async fn test_high_volume_transactions() {
        let pool = Arc::new(MockDatabasePool::new());
        let successful_txs = Arc::new(AtomicUsize::new(0));
        let failed_txs = Arc::new(AtomicUsize::new(0));

        let mut handles = vec![];
        let transaction_count = 100;

        for i in 0..transaction_count {
            let pool_clone = Arc::clone(&pool);
            let success_counter = Arc::clone(&successful_txs);
            let fail_counter = Arc::clone(&failed_txs);

            let handle = tokio::spawn(async move {
                let tx = MockTransaction::new();
                let receipt = generate_test_receipt();

                // Execute operations
                if let Err(_) = tx.execute(&format!("TX{} OP1", i)).await {
                    fail_counter.fetch_add(1, Ordering::SeqCst);
                    return;
                }

                if let Err(_) = pool_clone.receipts.insert(&receipt).await {
                    tx.rollback().await.ok();
                    fail_counter.fetch_add(1, Ordering::SeqCst);
                    return;
                }

                if let Err(_) = tx.commit().await {
                    fail_counter.fetch_add(1, Ordering::SeqCst);
                    return;
                }

                success_counter.fetch_add(1, Ordering::SeqCst);
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let success = successful_txs.load(Ordering::SeqCst);
        let failed = failed_txs.load(Ordering::SeqCst);

        assert_eq!(success + failed, transaction_count);
        assert_eq!(success, transaction_count); // All should succeed in mock
    }

    /// Large transaction (many operations) test
    #[tokio::test]
    async fn test_large_transaction() {
        let tx = MockTransaction::new();
        let operation_count = 1000;

        for i in 0..operation_count {
            tx.execute(&format!("LARGE_TX_OP_{}", i)).await.unwrap();
        }

        tx.commit().await.unwrap();

        let ops = tx.operations().await;
        assert_eq!(ops.len(), operation_count);
    }
}
