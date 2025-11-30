// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT TEST FRAMEWORK                                ║
// ║  Comprehensive unit tests for PAT/SAT agent system                        ║
// ║  Professional Elite Test Infrastructure                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod mocks;
pub mod pat_tests;
pub mod sat_tests;
pub mod integration;

use bizra_genesis_node::agents::{Agent, AgentMetrics, AgentResponse, AgentRole, AgentState};
use bizra_genesis_node::ai_backend::{AIBackend, SimulatedBackend};
use bizra_genesis_node::types::{Candidate, CandidateScores, Priority, Task};
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════════════════════
// Test Utilities
// ═══════════════════════════════════════════════════════════════════════════

/// Create a test task with default values
pub fn create_test_task(description: &str) -> Task {
    Task {
        id: uuid::Uuid::new_v4(),
        description: description.to_string(),
        priority: Priority::Medium,
        created_at: chrono::Utc::now(),
        metadata: std::collections::HashMap::new(),
        examples: None,
    }
}

/// Create a test task with examples
pub fn create_test_task_with_examples(description: &str, examples: Vec<serde_json::Value>) -> Task {
    Task {
        id: uuid::Uuid::new_v4(),
        description: description.to_string(),
        priority: Priority::High,
        created_at: chrono::Utc::now(),
        metadata: std::collections::HashMap::new(),
        examples: Some(examples),
    }
}

/// Create simulated backend for testing
pub fn create_test_backend() -> Arc<dyn AIBackend> {
    Arc::new(SimulatedBackend)
}

/// Verify agent response meets quality thresholds
pub fn verify_response_quality(response: &AgentResponse, min_ihsan: f32) -> bool {
    response.ihsan_score >= min_ihsan && response.confidence >= 0.0 && response.confidence <= 1.0
}

/// Assert agent is in expected state
pub fn assert_agent_state(agent: &dyn Agent, expected: AgentState) {
    match (&agent.state(), &expected) {
        (AgentState::Idle, AgentState::Idle) => (),
        (AgentState::Processing { task_id: a }, AgentState::Processing { task_id: b }) => {
            assert_eq!(a, b);
        }
        (AgentState::Error { message: a }, AgentState::Error { message: b }) => {
            assert!(a.contains(b) || b.contains(a));
        }
        _ => panic!(
            "Agent state mismatch: expected {:?}, got {:?}",
            expected,
            agent.state()
        ),
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Test Helpers (using proptest)
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
pub mod prop_helpers {
    use proptest::prelude::*;

    /// Generate random priority
    pub fn arb_priority() -> impl Strategy<Value = super::Priority> {
        prop_oneof![
            Just(super::Priority::Low),
            Just(super::Priority::Medium),
            Just(super::Priority::High),
            Just(super::Priority::Critical),
        ]
    }

    /// Generate bounded confidence score
    pub fn arb_confidence() -> impl Strategy<Value = f32> {
        (0.0f32..=1.0f32)
    }

    /// Generate bounded ihsan score
    pub fn arb_ihsan_score() -> impl Strategy<Value = f32> {
        (0.0f32..=1.0f32)
    }

    /// Generate task description
    pub fn arb_task_description() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9 ]{10,100}".prop_map(|s| s)
    }
}
