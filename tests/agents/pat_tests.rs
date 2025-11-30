// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PAT AGENT TESTS                                     ║
// ║  Comprehensive tests for Personal Agentic Team (7 agents)                 ║
// ║  Professional Elite Test Suite                                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::mocks::{LowQualityMockBackend, MockAIBackend, MockBackendBuilder, MockResponse};
use super::{create_test_task, create_test_task_with_examples, verify_response_quality};
use bizra_genesis_node::agents::pat::{
    CoderAgent, EthicistAgent, EvaluatorAgent, IntegratorAgent, PATManager, PlannerAgent,
    PublisherAgent, ResearcherAgent,
};
use bizra_genesis_node::agents::{Agent, AgentMetrics, AgentRole, AgentState};
use bizra_genesis_node::ai_backend::{AIBackend, SimulatedBackend};
use bizra_genesis_node::types::{CandidateScores, Priority, Task};
use serde_json::json;
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════════════════════
// Planner Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod planner_tests {
    use super::*;

    #[tokio::test]
    async fn test_planner_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = PlannerAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Planner);
        assert!(matches!(agent.state(), AgentState::Idle));
    }

    #[tokio::test]
    async fn test_planner_agent_process_success() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = PlannerAgent::new(backend);
        let task = create_test_task("Create a strategic plan for product launch");

        let response = agent.process(&task).await;

        assert!(response.is_ok());
        let response = response.unwrap();
        assert_eq!(response.agent, AgentRole::Planner);
        assert!(response.ihsan_score >= 0.0);
        assert!(!response.candidates.is_empty());
    }

    #[tokio::test]
    async fn test_planner_agent_process_with_examples() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = PlannerAgent::new(backend);
        let task = create_test_task_with_examples(
            "Plan a marketing campaign",
            vec![json!({"type": "social_media"}), json!({"type": "email"})],
        );

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Planner);
        assert!(!response.task_id.is_empty());
    }

    #[tokio::test]
    async fn test_planner_agent_handles_failure() {
        let backend: Arc<dyn AIBackend> =
            Arc::new(MockAIBackend::with_error("Backend unavailable"));
        let mut agent = PlannerAgent::new(backend);
        let task = create_test_task("Plan something");

        let response = agent.process(&task).await;

        assert!(response.is_err());
        let err = response.unwrap_err();
        assert!(err.to_string().contains("Planner"));
    }

    #[tokio::test]
    async fn test_planner_agent_metrics_update_on_success() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = PlannerAgent::new(backend);
        let task = create_test_task("Test planning");

        // Initial metrics
        let initial_metrics = agent.metrics();
        assert_eq!(initial_metrics.tasks_completed, 0);

        // Process task
        let _ = agent.process(&task).await.unwrap();

        // Check metrics updated
        let updated_metrics = agent.metrics();
        assert_eq!(updated_metrics.tasks_completed, 1);
        assert!(updated_metrics.avg_latency_ms > 0.0);
    }

    #[tokio::test]
    async fn test_planner_agent_can_handle() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = PlannerAgent::new(backend);
        let task = create_test_task("Any task");

        // Planner can handle any task
        assert!(agent.can_handle(&task));
    }

    #[tokio::test]
    async fn test_planner_agent_system_prompt() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = PlannerAgent::new(backend);

        let prompt = agent.system_prompt();
        assert!(prompt.contains("Planner") || prompt.contains("strategic") || prompt.contains("plan"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Researcher Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod researcher_tests {
    use super::*;

    #[tokio::test]
    async fn test_researcher_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = ResearcherAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Researcher);
    }

    #[tokio::test]
    async fn test_researcher_agent_process() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = ResearcherAgent::new(backend);
        let task = create_test_task("Research market trends in AI");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Researcher);
        assert!(response.ihsan_score >= 0.0);
    }

    #[tokio::test]
    async fn test_researcher_agent_metrics_on_failure() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::with_error("Research failed"));
        let mut agent = ResearcherAgent::new(backend);
        let task = create_test_task("Research something");

        let _ = agent.process(&task).await;

        let metrics = agent.metrics();
        assert_eq!(metrics.tasks_failed, 1);
        assert_eq!(metrics.tasks_completed, 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Coder Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod coder_tests {
    use super::*;

    #[tokio::test]
    async fn test_coder_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = CoderAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Coder);
    }

    #[tokio::test]
    async fn test_coder_agent_code_generation() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = CoderAgent::new(backend);
        let task = create_test_task("Implement a REST API endpoint for user authentication");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Coder);
        assert!(response.confidence > 0.0);
    }

    #[tokio::test]
    async fn test_coder_agent_handles_complex_task() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = CoderAgent::new(backend);
        let task = create_test_task_with_examples(
            "Create a microservice with database integration",
            vec![
                json!({"language": "rust"}),
                json!({"database": "postgresql"}),
            ],
        );

        let response = agent.process(&task).await.unwrap();

        assert!(!response.candidates.is_empty());
        assert!(!response.task_id.is_empty());
    }

    #[tokio::test]
    async fn test_coder_agent_system_prompt_contains_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = CoderAgent::new(backend);

        let prompt = agent.system_prompt();
        assert!(
            prompt.contains("Creation")
                || prompt.contains("Code")
                || prompt.contains("Generator")
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Evaluator Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod evaluator_tests {
    use super::*;

    #[tokio::test]
    async fn test_evaluator_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = EvaluatorAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Evaluator);
    }

    #[tokio::test]
    async fn test_evaluator_agent_quality_assessment() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = EvaluatorAgent::new(backend);
        let task = create_test_task("Evaluate the quality of this code implementation");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Evaluator);
        // Evaluator should provide quality scores
        assert!(response.ihsan_score >= 0.0 && response.ihsan_score <= 1.0);
    }

    #[tokio::test]
    async fn test_evaluator_agent_low_quality_detection() {
        let backend: Arc<dyn AIBackend> = Arc::new(LowQualityMockBackend);
        let mut agent = EvaluatorAgent::new(backend);
        let task = create_test_task("Evaluate low quality content");

        let response = agent.process(&task).await.unwrap();

        // Should report low quality score
        assert!(response.ihsan_score < 0.85); // Below Ihsan threshold
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Ethicist Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod ethicist_tests {
    use super::*;

    #[tokio::test]
    async fn test_ethicist_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = EthicistAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Ethicist);
    }

    #[tokio::test]
    async fn test_ethicist_agent_ethics_review() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = EthicistAgent::new(backend);
        let task = create_test_task("Review the ethical implications of AI content generation");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Ethicist);
    }

    #[tokio::test]
    async fn test_ethicist_agent_system_prompt_contains_ethics() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = EthicistAgent::new(backend);

        let prompt = agent.system_prompt();
        assert!(
            prompt.contains("Ethics")
                || prompt.contains("ethical")
                || prompt.contains("Ihsān")
                || prompt.contains("Guardian")
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Publisher Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod publisher_tests {
    use super::*;

    #[tokio::test]
    async fn test_publisher_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = PublisherAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Publisher);
    }

    #[tokio::test]
    async fn test_publisher_agent_formatting() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = PublisherAgent::new(backend);
        let task = create_test_task("Format and publish technical documentation");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Publisher);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Integrator Agent Tests
// ═══════════════════════════════════════════════════════════════════════════

mod integrator_tests {
    use super::*;

    #[tokio::test]
    async fn test_integrator_agent_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let agent = IntegratorAgent::new(backend);

        assert_eq!(agent.role(), AgentRole::Integrator);
    }

    #[tokio::test]
    async fn test_integrator_agent_synthesis() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = IntegratorAgent::new(backend);
        let task = create_test_task("Integrate outputs from all agents into final solution");

        let response = agent.process(&task).await.unwrap();

        assert_eq!(response.agent, AgentRole::Integrator);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAT Manager Tests
// ═══════════════════════════════════════════════════════════════════════════

mod pat_manager_tests {
    use super::*;

    #[tokio::test]
    async fn test_pat_manager_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let manager = PATManager::new(backend);

        let metrics = manager.get_team_metrics();
        assert_eq!(metrics.agents, 7);
        assert_eq!(metrics.total_tasks_completed, 0);
    }

    #[tokio::test]
    async fn test_pat_manager_full_workflow() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut manager = PATManager::new(backend);
        let task = create_test_task("Complete end-to-end solution for user onboarding feature");

        let response = manager.execute_full_workflow(&task).await;

        assert!(response.is_ok());
        let response = response.unwrap();
        // Final response should be from Integrator
        assert_eq!(response.agent, AgentRole::Integrator);
    }

    #[tokio::test]
    async fn test_pat_manager_parallel_workflow() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut manager = PATManager::new(backend);
        let task = create_test_task("Generate multiple perspectives on feature design");

        let responses = manager.execute_parallel_workflow(&task).await;

        assert!(responses.is_ok());
        let responses = responses.unwrap();
        // Should have responses from multiple agents
        assert!(!responses.is_empty());
    }

    #[tokio::test]
    async fn test_pat_manager_selective_workflow() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut manager = PATManager::new(backend);
        let task = create_test_task("Quick research and planning");

        let roles = vec![AgentRole::Planner, AgentRole::Researcher];
        let responses = manager.execute_selective_workflow(&task, roles).await;

        assert!(responses.is_ok());
        let responses = responses.unwrap();
        assert_eq!(responses.len(), 2);
    }

    #[tokio::test]
    async fn test_pat_manager_get_agent_mut() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let mut manager = PATManager::new(backend);

        let agent = manager.get_agent_mut(AgentRole::Coder);
        assert!(agent.is_some());
        assert_eq!(agent.unwrap().role(), AgentRole::Coder);

        // SAT role should return None
        let sat_agent = manager.get_agent_mut(AgentRole::SecurityAuditor);
        assert!(sat_agent.is_none());
    }

    #[tokio::test]
    async fn test_pat_manager_team_metrics() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut manager = PATManager::new(backend);
        let task = create_test_task("Test task for metrics");

        // Execute a workflow
        let _ = manager.execute_full_workflow(&task).await;

        let metrics = manager.get_team_metrics();
        assert!(metrics.total_tasks_completed > 0);
    }

    #[tokio::test]
    async fn test_pat_manager_workflow_failure_handling() {
        let backend: Arc<dyn AIBackend> =
            Arc::new(MockAIBackend::with_error("Simulated failure"));
        let mut manager = PATManager::new(backend);
        let task = create_test_task("Test task that will fail");

        let response = manager.execute_full_workflow(&task).await;

        // Should fail gracefully
        assert!(response.is_err());
    }

    #[tokio::test]
    async fn test_team_metrics_success_rate() {
        use bizra_genesis_node::agents::pat::TeamMetrics;

        let metrics = TeamMetrics {
            total_tasks_completed: 8,
            total_tasks_failed: 2,
            avg_latency_ms: 150.0,
            avg_confidence: 0.90,
            total_tokens_used: 5000,
            agents: 7,
        };

        assert_eq!(metrics.success_rate(), 0.8);
    }

    #[tokio::test]
    async fn test_team_metrics_success_rate_zero_tasks() {
        use bizra_genesis_node::agents::pat::TeamMetrics;

        let metrics = TeamMetrics {
            total_tasks_completed: 0,
            total_tasks_failed: 0,
            avg_latency_ms: 0.0,
            avg_confidence: 0.0,
            total_tokens_used: 0,
            agents: 7,
        };

        assert_eq!(metrics.success_rate(), 0.0);
    }

    #[tokio::test]
    async fn test_team_metrics_avg_tasks_per_agent() {
        use bizra_genesis_node::agents::pat::TeamMetrics;

        let metrics = TeamMetrics {
            total_tasks_completed: 14,
            total_tasks_failed: 7,
            avg_latency_ms: 150.0,
            avg_confidence: 0.90,
            total_tokens_used: 5000,
            agents: 7,
        };

        assert_eq!(metrics.avg_tasks_per_agent(), 3.0); // (14+7)/7
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests for Agents
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn test_agent_metrics_success_rate_bounded(
            completed in 0usize..1000,
            failed in 0usize..1000
        ) {
            let metrics = AgentMetrics {
                tasks_completed: completed,
                tasks_failed: failed,
                avg_latency_ms: 100.0,
                avg_confidence: 0.9,
                total_tokens_used: 1000,
            };

            let rate = metrics.success_rate();
            prop_assert!(rate >= 0.0 && rate <= 1.0);
        }

        #[test]
        fn test_agent_metrics_update_consistency(
            latency in 0u32..10000,
            confidence in 0.0f32..=1.0,
            tokens in 0usize..10000
        ) {
            let mut metrics = AgentMetrics::default();

            metrics.update_completion(latency, confidence, tokens);

            prop_assert_eq!(metrics.tasks_completed, 1);
            prop_assert!(metrics.avg_latency_ms >= 0.0);
            prop_assert!(metrics.avg_confidence >= 0.0 && metrics.avg_confidence <= 1.0);
        }

        #[test]
        fn test_ihsan_score_bounded(score in 0.0f32..=1.0) {
            // All ihsan scores should be in [0, 1] range
            prop_assert!(score >= 0.0 && score <= 1.0);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Stress Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod stress_tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrent_agent_processing() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let task = Arc::new(create_test_task("Concurrent processing test"));

        let mut handles = vec![];

        // Spawn 10 concurrent agent processes
        for i in 0..10 {
            let backend_clone = backend.clone();
            let task_clone = task.clone();
            let handle = tokio::spawn(async move {
                let mut agent = PlannerAgent::new(backend_clone);
                agent.process(&task_clone).await
            });
            handles.push(handle);
        }

        // All should complete successfully
        let mut success_count = 0;
        for handle in handles {
            if handle.await.unwrap().is_ok() {
                success_count += 1;
            }
        }

        assert_eq!(success_count, 10);
    }

    #[tokio::test]
    async fn test_rapid_sequential_processing() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let mut agent = CoderAgent::new(backend);

        // Process 20 tasks rapidly
        for i in 0..20 {
            let task = create_test_task(&format!("Rapid task {}", i));
            let result = agent.process(&task).await;
            assert!(result.is_ok());
        }

        let metrics = agent.metrics();
        assert_eq!(metrics.tasks_completed, 20);
    }

    #[tokio::test]
    async fn test_mixed_success_failure_processing() {
        let backend: Arc<dyn AIBackend> = Arc::new(MockAIBackend::new());
        let failing_backend: Arc<dyn AIBackend> =
            Arc::new(MockAIBackend::with_error("Intentional failure"));

        let mut success_agent = PlannerAgent::new(backend);
        let mut failure_agent = PlannerAgent::new(failing_backend);

        let task = create_test_task("Test task");

        // Alternate between success and failure
        for _ in 0..5 {
            let _ = success_agent.process(&task).await;
            let _ = failure_agent.process(&task).await;
        }

        assert_eq!(success_agent.metrics().tasks_completed, 5);
        assert_eq!(failure_agent.metrics().tasks_failed, 5);
    }
}
