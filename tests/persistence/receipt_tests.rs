// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RECEIPT REPOSITORY TESTS                            ║
// ║  Comprehensive tests for trust receipt persistence                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::mocks::MockReceiptRepository;
use super::{
    assert_receipts_equal, assert_transaction_success, generate_test_id, generate_test_receipt,
    MockDbError, TestReceipt,
};
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════════════════════
// Basic CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════

mod crud_tests {
    use super::*;

    #[tokio::test]
    async fn test_insert_receipt_success() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        let result = repo.insert(&receipt).await;

        assert!(result.is_ok());
        assert_eq!(repo.get_insert_count(), 1);
    }

    #[tokio::test]
    async fn test_get_receipt_success() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap();

        assert!(retrieved.is_some());
        assert_receipts_equal(&receipt, &retrieved.unwrap());
    }

    #[tokio::test]
    async fn test_get_receipt_not_found() {
        let repo = MockReceiptRepository::new();

        let result = repo.get("nonexistent-id").await.unwrap();

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_by_model_filters_correctly() {
        let repo = MockReceiptRepository::new();

        // Insert receipts for different models
        for _ in 0..3 {
            let mut receipt = generate_test_receipt();
            receipt.winner_model = "gpt-4".to_string();
            repo.insert(&receipt).await.unwrap();
        }

        for _ in 0..2 {
            let mut receipt = generate_test_receipt();
            receipt.winner_model = "claude-3".to_string();
            repo.insert(&receipt).await.unwrap();
        }

        let gpt4_receipts = repo.get_by_model("gpt-4", 100).await.unwrap();
        let claude_receipts = repo.get_by_model("claude-3", 100).await.unwrap();

        assert_eq!(gpt4_receipts.len(), 3);
        assert_eq!(claude_receipts.len(), 2);
    }

    #[tokio::test]
    async fn test_get_by_model_respects_limit() {
        let repo = MockReceiptRepository::new();

        for _ in 0..10 {
            let mut receipt = generate_test_receipt();
            receipt.winner_model = "test-model".to_string();
            repo.insert(&receipt).await.unwrap();
        }

        let limited = repo.get_by_model("test-model", 5).await.unwrap();

        assert_eq!(limited.len(), 5);
    }

    #[tokio::test]
    async fn test_get_recent_returns_latest() {
        let repo = MockReceiptRepository::new();

        // Insert receipts with increasing timestamps
        for i in 0..5 {
            let mut receipt = generate_test_receipt();
            receipt.timestamp_ms = 1000 + i;
            repo.insert(&receipt).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;
        }

        let recent = repo.get_recent(3).await.unwrap();

        assert_eq!(recent.len(), 3);
        // Most recent should be first
        assert!(recent[0].timestamp_ms >= recent[1].timestamp_ms);
    }

    #[tokio::test]
    async fn test_count_returns_correct_value() {
        let repo = MockReceiptRepository::new();

        assert_eq!(repo.count().await.unwrap(), 0);

        for _ in 0..5 {
            let receipt = generate_test_receipt();
            repo.insert(&receipt).await.unwrap();
        }

        assert_eq!(repo.count().await.unwrap(), 5);
    }

    #[tokio::test]
    async fn test_clear_removes_all_receipts() {
        let repo = MockReceiptRepository::new();

        for _ in 0..3 {
            let receipt = generate_test_receipt();
            repo.insert(&receipt).await.unwrap();
        }

        assert_eq!(repo.count().await.unwrap(), 3);

        repo.clear().await;

        assert_eq!(repo.count().await.unwrap(), 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Duplicate Handling (ON CONFLICT DO NOTHING)
// ═══════════════════════════════════════════════════════════════════════════

mod duplicate_tests {
    use super::*;

    #[tokio::test]
    async fn test_duplicate_insert_is_idempotent() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        // Insert twice
        repo.insert(&receipt).await.unwrap();
        repo.insert(&receipt).await.unwrap();

        // Should only have one record
        assert_eq!(repo.count().await.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_duplicate_insert_preserves_original() {
        let repo = MockReceiptRepository::new();
        let mut receipt = generate_test_receipt();
        receipt.winner_model = "original-model".to_string();

        repo.insert(&receipt).await.unwrap();

        // Try to insert with different data but same run_id
        receipt.winner_model = "updated-model".to_string();
        repo.insert(&receipt).await.unwrap();

        // Original should be preserved
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();
        assert_eq!(retrieved.winner_model, "original-model");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════════════════

mod error_handling_tests {
    use super::*;

    #[tokio::test]
    async fn test_connection_failure_on_insert() {
        let repo = MockReceiptRepository::new();
        repo.set_should_fail(true);

        let receipt = generate_test_receipt();
        let result = repo.insert(&receipt).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MockDbError::Connection(_) => {}
            _ => panic!("Expected Connection error"),
        }
    }

    #[tokio::test]
    async fn test_connection_failure_on_get() {
        let repo = MockReceiptRepository::new();
        repo.set_should_fail(true);

        let result = repo.get("any-id").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_recovery_after_failure() {
        let repo = MockReceiptRepository::new();
        let receipt = generate_test_receipt();

        // Fail first
        repo.set_should_fail(true);
        assert!(repo.insert(&receipt).await.is_err());

        // Recover
        repo.set_should_fail(false);
        assert!(repo.insert(&receipt).await.is_ok());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent Operations
// ═══════════════════════════════════════════════════════════════════════════

mod concurrent_tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrent_inserts() {
        let repo = Arc::new(MockReceiptRepository::new());
        let mut handles = vec![];

        for _ in 0..100 {
            let repo_clone = repo.clone();
            let handle = tokio::spawn(async move {
                let receipt = generate_test_receipt();
                repo_clone.insert(&receipt).await
            });
            handles.push(handle);
        }

        for handle in handles {
            assert!(handle.await.unwrap().is_ok());
        }

        assert_eq!(repo.count().await.unwrap(), 100);
    }

    #[tokio::test]
    async fn test_concurrent_reads_and_writes() {
        let repo = Arc::new(MockReceiptRepository::new());

        // Pre-populate
        let known_receipt = generate_test_receipt();
        repo.insert(&known_receipt).await.unwrap();

        let mut handles = vec![];

        // Concurrent reads
        for _ in 0..50 {
            let repo_clone = repo.clone();
            let run_id = known_receipt.run_id.clone();
            let handle = tokio::spawn(async move { repo_clone.get(&run_id).await });
            handles.push(handle);
        }

        // Concurrent writes
        for _ in 0..50 {
            let repo_clone = repo.clone();
            let handle = tokio::spawn(async move {
                let receipt = generate_test_receipt();
                repo_clone.insert(&receipt).await
            });
            handles.push(handle);
        }

        for handle in handles {
            assert!(handle.await.unwrap().is_ok());
        }
    }

    #[tokio::test]
    async fn test_concurrent_same_id_insert() {
        let repo = Arc::new(MockReceiptRepository::new());
        let receipt = generate_test_receipt();

        let mut handles = vec![];

        // Try to insert same receipt 10 times concurrently
        for _ in 0..10 {
            let repo_clone = repo.clone();
            let receipt_clone = receipt.clone();
            let handle = tokio::spawn(async move { repo_clone.insert(&receipt_clone).await });
            handles.push(handle);
        }

        for handle in handles {
            assert!(handle.await.unwrap().is_ok());
        }

        // Should still only have one
        assert_eq!(repo.count().await.unwrap(), 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Performance & Latency Tests
// ═══════════════════════════════════════════════════════════════════════════

mod performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_latency_simulation() {
        let repo = MockReceiptRepository::new().with_latency(50);
        let receipt = generate_test_receipt();

        let start = std::time::Instant::now();
        repo.insert(&receipt).await.unwrap();
        let duration = start.elapsed();

        assert!(duration.as_millis() >= 50);
    }

    #[tokio::test]
    async fn test_bulk_insert_performance() {
        let repo = MockReceiptRepository::new();

        let start = std::time::Instant::now();

        for _ in 0..1000 {
            let receipt = generate_test_receipt();
            repo.insert(&receipt).await.unwrap();
        }

        let duration = start.elapsed();

        // Should complete reasonably fast (< 1 second for mock)
        assert!(duration.as_secs() < 1);
        assert_eq!(repo.count().await.unwrap(), 1000);
    }

    #[tokio::test]
    async fn test_operation_counting() {
        let repo = MockReceiptRepository::new();

        for _ in 0..5 {
            let receipt = generate_test_receipt();
            repo.insert(&receipt).await.unwrap();
        }

        for _ in 0..10 {
            repo.get("any-id").await.ok();
        }

        assert_eq!(repo.get_insert_count(), 5);
        assert_eq!(repo.get_get_count(), 10);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Data Integrity Tests
// ═══════════════════════════════════════════════════════════════════════════

mod integrity_tests {
    use super::*;

    #[tokio::test]
    async fn test_receipt_data_preserved() {
        let repo = MockReceiptRepository::new();

        let receipt = TestReceipt {
            run_id: "integrity-test-001".to_string(),
            inputs_sha256: "sha256:specific-input-hash".to_string(),
            winner_model: "specific-model".to_string(),
            winner_json_sha256: "sha256:specific-json-hash".to_string(),
            consensus_hash_hex: "specific-consensus-hash".to_string(),
            policy_version: "2.0.0".to_string(),
            pattern_pack_sha256: "sha256:specific-pattern".to_string(),
            timestamp_ms: 1234567890,
            public_key_der: vec![10, 20, 30, 40, 50],
            signature: vec![100, 110, 120, 130, 140],
        };

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.run_id, "integrity-test-001");
        assert_eq!(retrieved.inputs_sha256, "sha256:specific-input-hash");
        assert_eq!(retrieved.winner_model, "specific-model");
        assert_eq!(retrieved.winner_json_sha256, "sha256:specific-json-hash");
        assert_eq!(retrieved.consensus_hash_hex, "specific-consensus-hash");
        assert_eq!(retrieved.policy_version, "2.0.0");
        assert_eq!(retrieved.pattern_pack_sha256, "sha256:specific-pattern");
        assert_eq!(retrieved.timestamp_ms, 1234567890);
        assert_eq!(retrieved.public_key_der, vec![10, 20, 30, 40, 50]);
        assert_eq!(retrieved.signature, vec![100, 110, 120, 130, 140]);
    }

    #[tokio::test]
    async fn test_binary_data_preserved() {
        let repo = MockReceiptRepository::new();

        let mut receipt = generate_test_receipt();
        // Include various byte patterns
        receipt.public_key_der = (0u8..=255).collect();
        receipt.signature = (0u8..64).collect();

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.public_key_der.len(), 256);
        assert_eq!(retrieved.signature.len(), 64);
        assert_eq!(retrieved.public_key_der, receipt.public_key_der);
        assert_eq!(retrieved.signature, receipt.signature);
    }

    #[tokio::test]
    async fn test_special_characters_in_strings() {
        let repo = MockReceiptRepository::new();

        let mut receipt = generate_test_receipt();
        receipt.winner_model = "model-with-special-chars: 'quotes' & \"double\" <brackets>".to_string();
        receipt.policy_version = "1.0.0-beta+build.123".to_string();

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.winner_model, receipt.winner_model);
        assert_eq!(retrieved.policy_version, receipt.policy_version);
    }

    #[tokio::test]
    async fn test_unicode_in_strings() {
        let repo = MockReceiptRepository::new();

        let mut receipt = generate_test_receipt();
        receipt.winner_model = "模型-🤖-مدل".to_string();

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.winner_model, "模型-🤖-مدل");
    }

    #[tokio::test]
    async fn test_empty_strings_handled() {
        let repo = MockReceiptRepository::new();

        let mut receipt = generate_test_receipt();
        receipt.policy_version = "".to_string();

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.policy_version, "");
    }

    #[tokio::test]
    async fn test_max_timestamp_handled() {
        let repo = MockReceiptRepository::new();

        let mut receipt = generate_test_receipt();
        receipt.timestamp_ms = u64::MAX;

        repo.insert(&receipt).await.unwrap();
        let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();

        assert_eq!(retrieved.timestamp_ms, u64::MAX);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn test_any_run_id_can_be_stored(run_id in "[a-zA-Z0-9_-]{1,100}") {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let repo = MockReceiptRepository::new();
                let mut receipt = generate_test_receipt();
                receipt.run_id = run_id.clone();

                let result = repo.insert(&receipt).await;
                prop_assert!(result.is_ok());

                let retrieved = repo.get(&run_id).await.unwrap();
                prop_assert!(retrieved.is_some());
                prop_assert_eq!(retrieved.unwrap().run_id, run_id);

                Ok(())
            }).unwrap();
        }

        #[test]
        fn test_any_model_name_can_be_stored(model in ".{0,200}") {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let repo = MockReceiptRepository::new();
                let mut receipt = generate_test_receipt();
                receipt.winner_model = model.clone();

                let result = repo.insert(&receipt).await;
                prop_assert!(result.is_ok());

                let retrieved = repo.get(&receipt.run_id).await.unwrap().unwrap();
                prop_assert_eq!(retrieved.winner_model, model);

                Ok(())
            }).unwrap();
        }

        #[test]
        fn test_count_matches_inserts(insert_count in 0usize..100) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let repo = MockReceiptRepository::new();

                for _ in 0..insert_count {
                    let receipt = generate_test_receipt();
                    repo.insert(&receipt).await.unwrap();
                }

                let count = repo.count().await.unwrap();
                prop_assert_eq!(count as usize, insert_count);

                Ok(())
            }).unwrap();
        }
    }
}
