use blake3::Hash;
use std::sync::Arc;

/// Immutable task definition for 1000+ parallel execution
#[derive(Debug, Clone)]
pub struct Task {
    /// Unique task identifier (BLAKE3 hash)
    pub task_id: Hash,
    /// Task payload (Arc for zero-copy sharing)
    pub payload: Arc<serde_json::Value>,
    /// Timeout in milliseconds (Φ-optimization parameter)
    pub timeout_ms: u64,
    /// Required agent capabilities
    pub required_capabilities: Vec<Capability>,
    /// Impact weight for PoI attestation
    pub impact_weight: f64,
    /// Task description
    pub description: String,
    /// Task priority
    pub priority: crate::types::Priority,
    /// Creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Additional metadata
    pub metadata: std::collections::HashMap<String, serde_json::Value>,
    /// Optional example inputs/outputs for few-shot learning
    pub examples: Option<Vec<serde_json::Value>>,
}

/// Task capabilities for agent routing
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Capability {
    CodeGeneration,
    SecurityAudit,
    EthicalReasoning,
    PerformanceOptimization,
    Research,
    Debugging,
}

impl Task {
    /// Create new task with Φ-optimization defaults
    pub fn new(payload: serde_json::Value, timeout_ms: u64, impact_weight: f64) -> Self {
        let payload_arc = Arc::new(payload);
        let task_hash = blake3::hash(&serde_json::to_vec(&*payload_arc).unwrap());

        Self {
            task_id: task_hash,
            payload: payload_arc,
            timeout_ms,
            required_capabilities: Vec::new(),
            impact_weight,
            description: String::new(),
            priority: crate::types::Priority::Medium,
            created_at: chrono::Utc::now(),
            metadata: std::collections::HashMap::new(),
            examples: None,
        }
    }

    /// Builder pattern for adding capabilities (fluent API)
    pub fn with_capabilities(mut self, capabilities: Vec<Capability>) -> Self {
        self.required_capabilities = capabilities;
        self
    }

    /// Calculate SEED reward based on impact weight and Φ-optimization
    pub fn calculate_seed_reward(&self, phi_convergence: f64) -> u64 {
        let base_reward = 100;
        let impact_bonus = (self.impact_weight * 10.0) as u64;
        let phi_bonus = (phi_convergence * 50.0) as u64;

        base_reward + impact_bonus + phi_bonus
    }

    /// Serialize for BlockGraph attestation
    pub fn to_attestation_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(self.task_id.as_bytes());
        bytes.extend_from_slice(&self.timeout_ms.to_le_bytes());
        bytes.extend_from_slice(&self.impact_weight.to_le_bytes());
        bytes
    }
}

// Example: Proper initialization for parallel execution
// Commented out due to type mismatch - aegis::types::Task is a unit struct
// pub async fn spawn_massive_parallel_task() -> AegisResult<ConsensusResult> {
//     // Implementation would go here with proper task types
//     todo!("Implement with correct task types")
// }

// Placeholder imports - these need to be properly imported
// Removed unused imports - keeping file clean for elite standards
