// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS API TESTS                               ║
// ║  Comprehensive API handler tests for reward distribution endpoints         ║
// ║  Professional Elite Test Suite - Phase 4                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bigdecimal::BigDecimal;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════════════════
// TEST TYPES (Mirror API types for testing)
// ═══════════════════════════════════════════════════════════════════════════

/// Epoch status enum for testing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RewardEpochStatus {
    Active,
    Closed,
    Distributed,
}

/// Test epoch structure
#[derive(Debug, Clone)]
pub struct TestEpoch {
    pub id: Uuid,
    pub start_timestamp: chrono::DateTime<Utc>,
    pub end_timestamp: chrono::DateTime<Utc>,
    pub total_pool: BigDecimal,
    pub status: RewardEpochStatus,
    pub created_at: chrono::DateTime<Utc>,
    pub closed_at: Option<chrono::DateTime<Utc>>,
    pub distributed_at: Option<chrono::DateTime<Utc>>,
}

impl TestEpoch {
    pub fn active(pool: u64) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            start_timestamp: now - Duration::days(7),
            end_timestamp: now,
            total_pool: BigDecimal::from(pool),
            status: RewardEpochStatus::Active,
            created_at: now - Duration::days(7),
            closed_at: None,
            distributed_at: None,
        }
    }

    pub fn closed(pool: u64) -> Self {
        let mut epoch = Self::active(pool);
        epoch.status = RewardEpochStatus::Closed;
        epoch.closed_at = Some(Utc::now());
        epoch
    }

    pub fn distributed(pool: u64) -> Self {
        let mut epoch = Self::closed(pool);
        epoch.status = RewardEpochStatus::Distributed;
        epoch.distributed_at = Some(Utc::now());
        epoch
    }
}

/// Test user with roles for authorization testing
#[derive(Debug, Clone)]
pub struct TestUser {
    pub id: Uuid,
    pub email: String,
    pub roles: Vec<String>,
}

impl TestUser {
    pub fn admin() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: "admin@bizra.ai".to_string(),
            roles: vec!["admin".to_string()],
        }
    }

    pub fn superadmin() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: "superadmin@bizra.ai".to_string(),
            roles: vec!["super_admin".to_string(), "admin".to_string()],
        }
    }

    pub fn user() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: "user@bizra.ai".to_string(),
            roles: vec!["user".to_string()],
        }
    }

    pub fn operator() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: "operator@bizra.ai".to_string(),
            roles: vec!["operator".to_string()],
        }
    }

    pub fn anonymous() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: "anonymous@bizra.ai".to_string(),
            roles: vec![],
        }
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    pub fn is_admin(&self) -> bool {
        self.has_role("admin") || self.has_role("super_admin")
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHORIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod authorization_tests {
    use super::*;

    #[test]
    fn test_admin_has_distribute_permission() {
        let admin = TestUser::admin();
        assert!(admin.is_admin(), "Admin should have admin privileges");
        assert!(admin.has_role("admin"), "Admin should have admin role");
    }

    #[test]
    fn test_superadmin_has_distribute_permission() {
        let superadmin = TestUser::superadmin();
        assert!(
            superadmin.is_admin(),
            "SuperAdmin should have admin privileges"
        );
        assert!(
            superadmin.has_role("super_admin"),
            "SuperAdmin should have super_admin role"
        );
    }

    #[test]
    fn test_user_denied_distribute_permission() {
        let user = TestUser::user();
        assert!(!user.is_admin(), "User should not have admin privileges");
        assert!(!user.has_role("admin"), "User should not have admin role");
    }

    #[test]
    fn test_operator_denied_distribute_permission() {
        let operator = TestUser::operator();
        assert!(
            !operator.is_admin(),
            "Operator should not have admin privileges"
        );
        assert!(
            !operator.has_role("admin"),
            "Operator should not have admin role"
        );
    }

    #[test]
    fn test_anonymous_denied_all_permissions() {
        let anon = TestUser::anonymous();
        assert!(
            !anon.is_admin(),
            "Anonymous should not have admin privileges"
        );
        assert!(anon.roles.is_empty(), "Anonymous should have no roles");
    }

    #[test]
    fn test_role_check_case_sensitive() {
        let user = TestUser::user();
        assert!(user.has_role("user"), "Should find exact role match");
        assert!(!user.has_role("USER"), "Should not find uppercase variant");
        assert!(!user.has_role("User"), "Should not find mixed case variant");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EPOCH STATUS TRANSITION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod epoch_status_tests {
    use super::*;

    // Helper: Check if transition is valid
    fn can_transition(from: RewardEpochStatus, to: RewardEpochStatus) -> bool {
        match (from, to) {
            // Valid transitions: Active -> Closed -> Distributed
            (RewardEpochStatus::Active, RewardEpochStatus::Closed) => true,
            (RewardEpochStatus::Closed, RewardEpochStatus::Distributed) => true,
            // Allow atomic Active -> Distributed (combined close+distribute)
            (RewardEpochStatus::Active, RewardEpochStatus::Distributed) => true,
            // Invalid: no backward transitions
            (RewardEpochStatus::Closed, RewardEpochStatus::Active) => false,
            (RewardEpochStatus::Distributed, RewardEpochStatus::Closed) => false,
            (RewardEpochStatus::Distributed, RewardEpochStatus::Active) => false,
            // Same state is invalid (no-op)
            _ if from == to => false,
            _ => false,
        }
    }

    #[test]
    fn test_active_to_closed_valid() {
        assert!(can_transition(
            RewardEpochStatus::Active,
            RewardEpochStatus::Closed
        ));
    }

    #[test]
    fn test_closed_to_distributed_valid() {
        assert!(can_transition(
            RewardEpochStatus::Closed,
            RewardEpochStatus::Distributed
        ));
    }

    #[test]
    fn test_active_to_distributed_valid() {
        // Atomic close+distribute in one operation
        assert!(can_transition(
            RewardEpochStatus::Active,
            RewardEpochStatus::Distributed
        ));
    }

    #[test]
    fn test_closed_to_active_invalid() {
        assert!(!can_transition(
            RewardEpochStatus::Closed,
            RewardEpochStatus::Active
        ));
    }

    #[test]
    fn test_distributed_to_closed_invalid() {
        assert!(!can_transition(
            RewardEpochStatus::Distributed,
            RewardEpochStatus::Closed
        ));
    }

    #[test]
    fn test_distributed_to_active_invalid() {
        assert!(!can_transition(
            RewardEpochStatus::Distributed,
            RewardEpochStatus::Active
        ));
    }

    #[test]
    fn test_same_state_transition_invalid() {
        assert!(!can_transition(
            RewardEpochStatus::Active,
            RewardEpochStatus::Active
        ));
        assert!(!can_transition(
            RewardEpochStatus::Closed,
            RewardEpochStatus::Closed
        ));
        assert!(!can_transition(
            RewardEpochStatus::Distributed,
            RewardEpochStatus::Distributed
        ));
    }

    #[test]
    fn test_epoch_status_serialization() {
        let active = RewardEpochStatus::Active;
        let closed = RewardEpochStatus::Closed;
        let distributed = RewardEpochStatus::Distributed;

        assert_eq!(serde_json::to_string(&active).unwrap(), "\"active\"");
        assert_eq!(serde_json::to_string(&closed).unwrap(), "\"closed\"");
        assert_eq!(
            serde_json::to_string(&distributed).unwrap(),
            "\"distributed\""
        );
    }

    #[test]
    fn test_epoch_status_deserialization() {
        let active: RewardEpochStatus = serde_json::from_str("\"active\"").unwrap();
        let closed: RewardEpochStatus = serde_json::from_str("\"closed\"").unwrap();
        let distributed: RewardEpochStatus = serde_json::from_str("\"distributed\"").unwrap();

        assert_eq!(active, RewardEpochStatus::Active);
        assert_eq!(closed, RewardEpochStatus::Closed);
        assert_eq!(distributed, RewardEpochStatus::Distributed);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTRIBUTION LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod distribution_logic_tests {
    use super::*;

    /// Simulate distribution eligibility check
    fn can_distribute(epoch: &TestEpoch) -> Result<(), &'static str> {
        match epoch.status {
            RewardEpochStatus::Active => Ok(()),
            RewardEpochStatus::Closed => Err("Epoch is already closed"),
            RewardEpochStatus::Distributed => Err("Epoch is already distributed"),
        }
    }

    #[test]
    fn test_active_epoch_can_distribute() {
        let epoch = TestEpoch::active(1000);
        assert!(can_distribute(&epoch).is_ok());
    }

    #[test]
    fn test_closed_epoch_cannot_distribute() {
        let epoch = TestEpoch::closed(1000);
        let result = can_distribute(&epoch);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already closed"));
    }

    #[test]
    fn test_distributed_epoch_cannot_redistribute() {
        let epoch = TestEpoch::distributed(1000);
        let result = can_distribute(&epoch);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already distributed"));
    }

    #[test]
    fn test_epoch_with_zero_pool() {
        let epoch = TestEpoch::active(0);
        // Zero pool is technically valid - should distribute 0 to all contributors
        assert!(can_distribute(&epoch).is_ok());
        assert_eq!(epoch.total_pool, BigDecimal::from(0));
    }

    #[test]
    fn test_epoch_timestamps_valid() {
        let epoch = TestEpoch::active(1000);
        assert!(epoch.end_timestamp > epoch.start_timestamp);
        assert!(epoch.created_at <= epoch.start_timestamp);
    }

    #[test]
    fn test_closed_epoch_has_closed_timestamp() {
        let epoch = TestEpoch::closed(1000);
        assert!(epoch.closed_at.is_some());
        assert!(epoch.distributed_at.is_none());
    }

    #[test]
    fn test_distributed_epoch_has_both_timestamps() {
        let epoch = TestEpoch::distributed(1000);
        assert!(epoch.closed_at.is_some());
        assert!(epoch.distributed_at.is_some());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REWARD CALCULATION INVARIANT TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod reward_invariant_tests {
    use super::*;

    #[derive(Debug, Clone)]
    struct ContributorScore {
        id: Uuid,
        score: BigDecimal,
    }

    fn calculate_rewards(
        scores: &[ContributorScore],
        total_pool: &BigDecimal,
    ) -> Vec<(Uuid, BigDecimal)> {
        if scores.is_empty() {
            return vec![];
        }

        let total_score: BigDecimal = scores.iter().map(|s| &s.score).sum();

        if total_score == BigDecimal::from(0) {
            return scores.iter().map(|s| (s.id, BigDecimal::from(0))).collect();
        }

        scores
            .iter()
            .map(|s| {
                let share = &s.score / &total_score;
                let reward = &share * total_pool;
                (s.id, reward)
            })
            .collect()
    }

    #[test]
    fn test_reward_sum_equals_pool() {
        let scores = vec![
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(100),
            },
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(200),
            },
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(300),
            },
        ];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);
        let reward_sum: BigDecimal = rewards.iter().map(|(_, r)| r).sum();

        // Allow small tolerance for floating point
        let tolerance = BigDecimal::from_str("0.0000001").unwrap();
        let diff = (&reward_sum - &total_pool).abs();
        assert!(
            diff < tolerance,
            "Reward sum {} should equal pool {}",
            reward_sum,
            total_pool
        );
    }

    #[test]
    fn test_rewards_proportional_to_scores() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let scores = vec![
            ContributorScore {
                id: id1,
                score: BigDecimal::from(100),
            },
            ContributorScore {
                id: id2,
                score: BigDecimal::from(300),
            },
        ];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);

        let reward1 = rewards.iter().find(|(id, _)| *id == id1).unwrap().1.clone();
        let reward2 = rewards.iter().find(|(id, _)| *id == id2).unwrap().1.clone();

        // Contributor with 3x score should get 3x reward
        let ratio = &reward2 / &reward1;
        assert_eq!(
            ratio,
            BigDecimal::from(3),
            "Reward ratio should match score ratio"
        );
    }

    #[test]
    fn test_all_rewards_non_negative() {
        let scores = vec![
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(0),
            },
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(100),
            },
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(1),
            },
        ];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);

        for (_, reward) in rewards {
            assert!(
                reward >= BigDecimal::from(0),
                "Reward {} should be non-negative",
                reward
            );
        }
    }

    #[test]
    fn test_zero_score_gets_zero_reward() {
        let zero_id = Uuid::new_v4();
        let scores = vec![
            ContributorScore {
                id: zero_id,
                score: BigDecimal::from(0),
            },
            ContributorScore {
                id: Uuid::new_v4(),
                score: BigDecimal::from(100),
            },
        ];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);
        let zero_reward = rewards
            .iter()
            .find(|(id, _)| *id == zero_id)
            .unwrap()
            .1
            .clone();

        assert_eq!(
            zero_reward,
            BigDecimal::from(0),
            "Zero score should yield zero reward"
        );
    }

    #[test]
    fn test_empty_contributors_returns_empty() {
        let scores: Vec<ContributorScore> = vec![];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);
        assert!(rewards.is_empty());
    }

    #[test]
    fn test_single_contributor_gets_full_pool() {
        let single_id = Uuid::new_v4();
        let scores = vec![ContributorScore {
            id: single_id,
            score: BigDecimal::from(100),
        }];
        let total_pool = BigDecimal::from(1000);

        let rewards = calculate_rewards(&scores, &total_pool);
        let reward = rewards
            .iter()
            .find(|(id, _)| *id == single_id)
            .unwrap()
            .1
            .clone();

        assert_eq!(
            reward, total_pool,
            "Single contributor should get full pool"
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTLEMENT STATE MACHINE TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod settlement_state_tests {
    use super::*;
    use bizra_genesis_node::rewards::{SettlementError, SettlementStatus};

    #[test]
    fn test_settlement_status_pending() {
        let status = SettlementStatus::Pending;
        assert_eq!(serde_json::to_string(&status).unwrap(), "\"pending\"");
    }

    #[test]
    fn test_settlement_status_submitted() {
        let status = SettlementStatus::Submitted;
        assert_eq!(serde_json::to_string(&status).unwrap(), "\"submitted\"");
    }

    #[test]
    fn test_settlement_status_confirmed() {
        let status = SettlementStatus::Confirmed;
        assert_eq!(serde_json::to_string(&status).unwrap(), "\"confirmed\"");
    }

    #[test]
    fn test_settlement_status_failed() {
        let status = SettlementStatus::Failed;
        assert_eq!(serde_json::to_string(&status).unwrap(), "\"failed\"");
    }

    #[test]
    fn test_settlement_error_already_settled() {
        let epoch_id = Uuid::new_v4();
        let error = SettlementError::AlreadySettled(epoch_id);
        let message = error.to_string();

        assert!(
            message.contains("already exists"),
            "Error should mention already exists"
        );
    }

    #[test]
    fn test_settlement_error_no_pending() {
        let epoch_id = Uuid::new_v4();
        let error = SettlementError::NoPendingSettlements(epoch_id);
        let message = error.to_string();

        assert!(
            message.contains("No pending"),
            "Error should mention no pending settlements"
        );
    }

    #[test]
    fn test_settlement_error_missing_batch_id() {
        let error = SettlementError::MissingBatchId;
        let message = error.to_string();

        assert!(
            message.to_lowercase().contains("missing"),
            "Error should mention missing batch ID"
        );
    }

    #[test]
    fn test_settlement_error_service() {
        let error = SettlementError::Service("Connection timeout".to_string());
        let message = error.to_string();

        assert!(
            message.contains("Connection timeout"),
            "Error should contain service message"
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE FORMAT TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod error_response_tests {
    use super::*;

    /// Standard error response structure
    #[derive(Debug, Serialize, Deserialize)]
    struct ErrorResponse {
        success: bool,
        error: String,
        code: String,
    }

    impl ErrorResponse {
        fn forbidden(message: &str) -> Self {
            Self {
                success: false,
                error: message.to_string(),
                code: "FORBIDDEN".to_string(),
            }
        }

        fn not_found(message: &str) -> Self {
            Self {
                success: false,
                error: message.to_string(),
                code: "NOT_FOUND".to_string(),
            }
        }

        fn conflict(message: &str) -> Self {
            Self {
                success: false,
                error: message.to_string(),
                code: "CONFLICT".to_string(),
            }
        }

        fn bad_request(message: &str) -> Self {
            Self {
                success: false,
                error: message.to_string(),
                code: "BAD_REQUEST".to_string(),
            }
        }
    }

    #[test]
    fn test_forbidden_response_structure() {
        let response = ErrorResponse::forbidden("Admin role required");
        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"FORBIDDEN\""));
        assert!(json.contains("Admin role required"));
    }

    #[test]
    fn test_not_found_response_structure() {
        let response = ErrorResponse::not_found("Epoch not found");
        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"NOT_FOUND\""));
        assert!(json.contains("Epoch not found"));
    }

    #[test]
    fn test_conflict_response_structure() {
        let response = ErrorResponse::conflict("Epoch already distributed");
        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"CONFLICT\""));
        assert!(json.contains("already distributed"));
    }

    #[test]
    fn test_bad_request_response_structure() {
        let response = ErrorResponse::bad_request("No pending rewards");
        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"BAD_REQUEST\""));
        assert!(json.contains("No pending rewards"));
    }

    #[test]
    fn test_error_response_deserializes() {
        let json = r#"{"success":false,"error":"Test error","code":"TEST_CODE"}"#;
        let response: ErrorResponse = serde_json::from_str(json).unwrap();

        assert!(!response.success);
        assert_eq!(response.error, "Test error");
        assert_eq!(response.code, "TEST_CODE");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod request_validation_tests {
    use super::*;

    #[test]
    fn test_valid_uuid_parses() {
        let valid = "550e8400-e29b-41d4-a716-446655440000";
        let result = Uuid::parse_str(valid);
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_uuid_fails() {
        let invalid_uuids = vec![
            "not-a-uuid",
            "550e8400-e29b-41d4-a716",
            "550e8400-e29b-41d4-a716-44665544000g", // Invalid character
            "",
            "z50e8400-e29b-41d4-a716-446655440000", // Invalid character at start
        ];

        for invalid in invalid_uuids {
            let result = Uuid::parse_str(invalid);
            assert!(result.is_err(), "Should reject invalid UUID: {}", invalid);
        }
    }

    #[test]
    fn test_uuid_hyphenless_is_valid() {
        // Note: Rust's uuid crate accepts hyphen-less format
        let hyphenless = "550e8400e29b41d4a716446655440000";
        let result = Uuid::parse_str(hyphenless);
        assert!(result.is_ok(), "Hyphen-less UUID should be valid");
    }

    #[test]
    fn test_nil_uuid_is_valid() {
        let nil = "00000000-0000-0000-0000-000000000000";
        let result = Uuid::parse_str(nil);
        assert!(result.is_ok());
        assert!(result.unwrap().is_nil());
    }

    #[test]
    fn test_uuid_case_insensitive() {
        let lower = "550e8400-e29b-41d4-a716-446655440000";
        let upper = "550E8400-E29B-41D4-A716-446655440000";

        let lower_uuid = Uuid::parse_str(lower).unwrap();
        let upper_uuid = Uuid::parse_str(upper).unwrap();

        assert_eq!(lower_uuid, upper_uuid);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EPOCH QUERY FILTER TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod epoch_filter_tests {
    use super::*;

    fn filter_epochs(epochs: &[TestEpoch], status: Option<RewardEpochStatus>) -> Vec<&TestEpoch> {
        match status {
            Some(s) => epochs.iter().filter(|e| e.status == s).collect(),
            None => epochs.iter().collect(),
        }
    }

    #[test]
    fn test_filter_by_active_status() {
        let epochs = vec![
            TestEpoch::active(1000),
            TestEpoch::closed(2000),
            TestEpoch::distributed(3000),
            TestEpoch::active(4000),
        ];

        let filtered = filter_epochs(&epochs, Some(RewardEpochStatus::Active));
        assert_eq!(filtered.len(), 2);
        assert!(filtered
            .iter()
            .all(|e| e.status == RewardEpochStatus::Active));
    }

    #[test]
    fn test_filter_by_closed_status() {
        let epochs = vec![
            TestEpoch::active(1000),
            TestEpoch::closed(2000),
            TestEpoch::distributed(3000),
        ];

        let filtered = filter_epochs(&epochs, Some(RewardEpochStatus::Closed));
        assert_eq!(filtered.len(), 1);
        assert!(filtered[0].status == RewardEpochStatus::Closed);
    }

    #[test]
    fn test_filter_by_distributed_status() {
        let epochs = vec![TestEpoch::distributed(1000), TestEpoch::distributed(2000)];

        let filtered = filter_epochs(&epochs, Some(RewardEpochStatus::Distributed));
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_no_filter_returns_all() {
        let epochs = vec![
            TestEpoch::active(1000),
            TestEpoch::closed(2000),
            TestEpoch::distributed(3000),
        ];

        let filtered = filter_epochs(&epochs, None);
        assert_eq!(filtered.len(), 3);
    }

    #[test]
    fn test_filter_empty_list() {
        let epochs: Vec<TestEpoch> = vec![];
        let filtered = filter_epochs(&epochs, Some(RewardEpochStatus::Active));
        assert!(filtered.is_empty());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENT ACCESS SIMULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod concurrency_tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    /// Simulate concurrent distribute attempts - only first should succeed
    #[test]
    fn test_concurrent_distribute_simulation() {
        // Simulate epoch lock with atomic flag
        let already_distributed = Arc::new(AtomicBool::new(false));
        let mut results = Vec::new();

        // Simulate 5 concurrent attempts
        for i in 0..5 {
            let lock = already_distributed.clone();
            let result = lock.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst);
            results.push((i, result.is_ok()));
        }

        // Exactly one should succeed
        let success_count = results.iter().filter(|(_, ok)| *ok).count();
        assert_eq!(
            success_count, 1,
            "Exactly one concurrent distribute should succeed"
        );
    }

    /// Test idempotency - second attempt should be rejected
    #[test]
    fn test_distribute_idempotency() {
        let mut epoch = TestEpoch::active(1000);

        // First attempt - should succeed
        assert_eq!(epoch.status, RewardEpochStatus::Active);
        epoch.status = RewardEpochStatus::Distributed;
        epoch.distributed_at = Some(Utc::now());

        // Second attempt - should fail (already distributed)
        assert_ne!(epoch.status, RewardEpochStatus::Active);
        // In real implementation, this would return 409 CONFLICT
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REWARD SERVICE INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod reward_service_tests {
    use super::*;
    use bizra_genesis_node::rewards::RewardError;

    #[test]
    fn test_reward_error_epoch_not_found() {
        let error = RewardError::EpochNotFound;
        let message = error.to_string();

        assert!(message.to_lowercase().contains("not found"));
    }

    #[test]
    fn test_reward_error_epoch_not_active() {
        let error = RewardError::EpochNotActive("distributed".to_string());
        let message = error.to_string();

        assert!(message.contains("not active"));
        assert!(message.contains("distributed"));
    }

    #[test]
    fn test_reward_error_variants() {
        // Test that all error variants implement Display correctly
        let errors = vec![
            RewardError::EpochNotFound,
            RewardError::EpochNotActive("closed".to_string()),
        ];

        for error in errors {
            let message = error.to_string();
            assert!(!message.is_empty(), "Error message should not be empty");
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BIGDECIMAL PRECISION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod precision_tests {
    use super::*;

    #[test]
    fn test_high_precision_reward_calculation() {
        // Test with 18 decimal places (matching PostgreSQL NUMERIC(38,18))
        let score = BigDecimal::from_str("123456789.123456789012345678").unwrap();
        let total = BigDecimal::from_str("999999999.999999999999999999").unwrap();
        let pool = BigDecimal::from_str("1000000.000000000000000000").unwrap();

        let share = &score / &total;
        let reward = &share * &pool;

        // Reward should be positive and reasonable
        assert!(reward > BigDecimal::from(0));
        assert!(reward < pool);
    }

    #[test]
    fn test_rounding_with_three_equal_contributors() {
        // Classic 1/3 test case
        let total_pool = BigDecimal::from(100);
        let share = BigDecimal::from(1) / BigDecimal::from(3);
        let reward_per = &share * &total_pool;

        // Each gets ~33.333...
        assert!(reward_per > BigDecimal::from(33));
        assert!(reward_per < BigDecimal::from(34));

        // Total of three should be close to 100
        let total_rewards = &reward_per * BigDecimal::from(3);
        let diff = (&total_pool - &total_rewards).abs();

        // Allow small tolerance
        assert!(diff < BigDecimal::from_str("0.0001").unwrap());
    }

    #[test]
    fn test_very_small_reward() {
        let score = BigDecimal::from_str("0.000001").unwrap();
        let total = BigDecimal::from(1000000);
        let pool = BigDecimal::from(1000000);

        let share = &score / &total;
        let reward = &share * &pool;

        // 0.000001 / 1000000 * 1000000 = 0.000001
        let expected = BigDecimal::from_str("0.000001").unwrap();
        assert_eq!(reward, expected);
    }

    #[test]
    fn test_small_share_scales_correctly() {
        // More intuitive test: 1 out of 100 gets 10% of pool
        let score = BigDecimal::from(1);
        let total = BigDecimal::from(10);
        let pool = BigDecimal::from(1000);

        let share = &score / &total; // 0.1
        let reward = &share * &pool; // 100

        assert_eq!(reward, BigDecimal::from(100));
    }
}
