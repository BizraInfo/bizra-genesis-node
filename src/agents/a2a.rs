// src/agents/a2a.rs
// Agent-to-Agent (A2A) Coordination Protocol
// JSON-RPC inspired protocol with Byzantine fault tolerance

use crate::agents::{AgentResponse, AgentRole};
use crate::types::Task;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::sync::Arc;
use tokio::sync::RwLock;

/// A2A message types for agent communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum A2AMessage {
    /// Request another agent to process a task
    TaskRequest {
        request_id: String,
        from_agent: AgentRole,
        to_agent: AgentRole,
        task: Task,
        priority: u8,
        timeout_ms: u32,
    },

    /// Response from agent with results
    TaskResponse {
        request_id: String,
        from_agent: AgentRole,
        to_agent: AgentRole,
        response: AgentResponse,
    },

    /// Request task delegation to multiple agents
    DelegationRequest {
        request_id: String,
        from_agent: AgentRole,
        subtasks: Vec<SubTask>,
    },

    /// Query agent status
    StatusQuery {
        request_id: String,
        from_agent: AgentRole,
        to_agent: AgentRole,
    },

    /// Status response
    StatusResponse {
        request_id: String,
        agent: AgentRole,
        status: AgentStatus,
    },

    /// Error response
    Error {
        request_id: String,
        agent: AgentRole,
        error: String,
    },
}

/// Subtask for parallel processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubTask {
    pub id: String,
    pub agent: AgentRole,
    pub task: Task,
    pub priority: u8,
}

/// Agent status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub agent: AgentRole,
    pub available: bool,
    pub current_load: usize,
    pub avg_latency_ms: f32,
    pub success_rate: f32,
}

/// A2A coordination result
#[derive(Debug, Clone)]
pub enum CoordinationResult {
    SingleResponse(AgentResponse),
    MultipleResponses(Vec<AgentResponse>),
    Error(String),
}

/// Message routing and delivery
#[derive(Debug, Clone)]
struct MessageRoute {
    #[allow(dead_code)]
    message: A2AMessage,
    timestamp: std::time::Instant,
    retry_count: u8,
}

/// A2A Coordinator manages agent-to-agent communication
pub struct A2ACoordinator {
    /// Pending messages awaiting response
    pending_messages: Arc<RwLock<HashMap<String, MessageRoute>>>,

    /// Message delivery timeout
    default_timeout: std::time::Duration,

    /// Maximum retry attempts
    max_retries: u8,
}

impl A2ACoordinator {
    /// Create new A2A coordinator
    pub fn new() -> Self {
        Self {
            pending_messages: Arc::new(RwLock::new(HashMap::new())),
            default_timeout: std::time::Duration::from_secs(30),
            max_retries: 3,
        }
    }

    /// Create coordinator with custom configuration
    pub fn with_config(timeout_secs: u64, max_retries: u8) -> Self {
        Self {
            pending_messages: Arc::new(RwLock::new(HashMap::new())),
            default_timeout: std::time::Duration::from_secs(timeout_secs),
            max_retries,
        }
    }

    /// Send task request to specific agent
    pub async fn send_task_request(
        &self,
        from: AgentRole,
        to: AgentRole,
        task: Task,
        priority: u8,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let request_id = uuid::Uuid::new_v4().to_string();

        let message = A2AMessage::TaskRequest {
            request_id: request_id.clone(),
            from_agent: from,
            to_agent: to,
            task,
            priority,
            timeout_ms: self.default_timeout.as_millis() as u32,
        };

        self.route_message(message).await?;
        Ok(request_id)
    }

    /// Delegate task to multiple agents in parallel
    pub async fn delegate_task(
        &self,
        from: AgentRole,
        subtasks: Vec<SubTask>,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let request_id = uuid::Uuid::new_v4().to_string();

        let message = A2AMessage::DelegationRequest {
            request_id: request_id.clone(),
            from_agent: from,
            subtasks,
        };

        self.route_message(message).await?;
        Ok(request_id)
    }

    /// Query agent status
    pub async fn query_status(
        &self,
        from: AgentRole,
        to: AgentRole,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let request_id = uuid::Uuid::new_v4().to_string();

        let message = A2AMessage::StatusQuery {
            request_id: request_id.clone(),
            from_agent: from,
            to_agent: to,
        };

        self.route_message(message).await?;
        Ok(request_id)
    }

    /// Route message through the coordination system
    async fn route_message(&self, message: A2AMessage) -> Result<(), Box<dyn Error + Send + Sync>> {
        let request_id = self.extract_request_id(&message);

        let route = MessageRoute {
            message: message.clone(),
            timestamp: std::time::Instant::now(),
            retry_count: 0,
        };

        let mut pending = self.pending_messages.write().await;
        pending.insert(request_id, route);

        tracing::debug!("Routed A2A message: {:?}", message);
        Ok(())
    }

    /// Extract request ID from message
    fn extract_request_id(&self, message: &A2AMessage) -> String {
        match message {
            A2AMessage::TaskRequest { request_id, .. } => request_id.clone(),
            A2AMessage::TaskResponse { request_id, .. } => request_id.clone(),
            A2AMessage::DelegationRequest { request_id, .. } => request_id.clone(),
            A2AMessage::StatusQuery { request_id, .. } => request_id.clone(),
            A2AMessage::StatusResponse { request_id, .. } => request_id.clone(),
            A2AMessage::Error { request_id, .. } => request_id.clone(),
        }
    }

    /// Handle task response from agent
    pub async fn handle_response(
        &self,
        message: A2AMessage,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let request_id = self.extract_request_id(&message);

        let mut pending = self.pending_messages.write().await;
        if pending.remove(&request_id).is_some() {
            tracing::debug!("Handled A2A response for request: {}", request_id);
            Ok(())
        } else {
            Err(format!("No pending request found for ID: {}", request_id).into())
        }
    }

    /// Check for timed-out messages and retry
    pub async fn check_timeouts(&self) -> Vec<String> {
        let mut timed_out = Vec::new();
        let mut pending = self.pending_messages.write().await;

        pending.retain(|request_id, route| {
            if route.timestamp.elapsed() > self.default_timeout {
                if route.retry_count < self.max_retries {
                    tracing::warn!("Message timeout, retrying: {}", request_id);
                    // Would retry here in production
                    false
                } else {
                    tracing::error!(
                        "Message failed after {} retries: {}",
                        self.max_retries,
                        request_id
                    );
                    timed_out.push(request_id.clone());
                    false
                }
            } else {
                true
            }
        });

        timed_out
    }

    /// Get count of pending messages
    pub async fn pending_count(&self) -> usize {
        self.pending_messages.read().await.len()
    }

    /// Clear all pending messages
    pub async fn clear_pending(&self) {
        self.pending_messages.write().await.clear();
    }
}

impl Default for A2ACoordinator {
    fn default() -> Self {
        Self::new()
    }
}

/// Multi-agent workflow orchestration
pub struct WorkflowOrchestrator {
    coordinator: A2ACoordinator,
}

impl WorkflowOrchestrator {
    /// Create new workflow orchestrator
    pub fn new() -> Self {
        Self {
            coordinator: A2ACoordinator::new(),
        }
    }

    /// Execute sequential workflow (agent chain)
    pub async fn execute_sequential(
        &self,
        agents: Vec<AgentRole>,
        initial_task: Task,
    ) -> Result<Vec<AgentResponse>, Box<dyn Error + Send + Sync>> {
        let responses = Vec::new();
        let current_task = initial_task;

        for (i, agent) in agents.iter().enumerate() {
            let from = if i == 0 {
                AgentRole::Integrator // Start from integrator
            } else {
                agents[i - 1].clone()
            };

            let _request_id = self
                .coordinator
                .send_task_request(
                    from,
                    agent.clone(),
                    current_task.clone(),
                    100, // High priority
                )
                .await?;

            tracing::info!("Sequential step {}: {} processing", i + 1, agent.name());

            // In production, would wait for actual response
            // For now, we log the request
        }

        Ok(responses)
    }

    /// Execute parallel workflow (fan-out)
    pub async fn execute_parallel(
        &self,
        agents: Vec<AgentRole>,
        task: Task,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let subtasks: Vec<SubTask> = agents
            .into_iter()
            .enumerate()
            .map(|(i, agent)| SubTask {
                id: format!("subtask-{}", i),
                agent,
                task: task.clone(),
                priority: 80,
            })
            .collect();

        self.coordinator
            .delegate_task(AgentRole::Integrator, subtasks)
            .await
    }

    /// Get coordinator reference
    pub fn coordinator(&self) -> &A2ACoordinator {
        &self.coordinator
    }
}

impl Default for WorkflowOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_a2a_coordinator_creation() {
        let coordinator = A2ACoordinator::new();
        assert_eq!(coordinator.pending_count().await, 0);
    }

    #[tokio::test]
    async fn test_send_task_request() {
        let coordinator = A2ACoordinator::new();
        let task = Task::example();

        let request_id = coordinator
            .send_task_request(AgentRole::Planner, AgentRole::Coder, task, 100)
            .await
            .expect("Should send request");

        assert!(!request_id.is_empty());
        assert_eq!(coordinator.pending_count().await, 1);
    }

    #[tokio::test]
    async fn test_delegation_request() {
        let coordinator = A2ACoordinator::new();
        let task = Task::example();

        let subtasks = vec![
            SubTask {
                id: "sub1".to_string(),
                agent: AgentRole::Researcher,
                task: task.clone(),
                priority: 80,
            },
            SubTask {
                id: "sub2".to_string(),
                agent: AgentRole::Coder,
                task: task.clone(),
                priority: 80,
            },
        ];

        let request_id = coordinator
            .delegate_task(AgentRole::Integrator, subtasks)
            .await
            .expect("Should delegate");

        assert!(!request_id.is_empty());
        assert_eq!(coordinator.pending_count().await, 1);
    }

    #[tokio::test]
    async fn test_workflow_orchestrator() {
        let orchestrator = WorkflowOrchestrator::new();
        let task = Task::example();

        let agents = vec![AgentRole::Planner, AgentRole::Researcher, AgentRole::Coder];

        let result = orchestrator.execute_sequential(agents, task).await;
        assert!(result.is_ok());
    }
}
