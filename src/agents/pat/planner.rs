// src/agents/pat/planner.rs
// Strategic Planner Agent - General Purpose Planning
// Handles planning for ANY domain: business, creative, research, software, etc.

use crate::agents::{Agent, AgentMetrics, AgentResponse, AgentRole, AgentState, BaseAgent};
use crate::ai_backend::AIBackend;
use crate::types::Task;
use async_trait::async_trait;
use std::error::Error;
use std::sync::Arc;

/// Strategic Planner Agent
/// Creates comprehensive plans with steps, dependencies, and success criteria
/// Adaptable to any domain or task type
pub struct PlannerAgent {
    base: BaseAgent,
}

impl PlannerAgent {
    pub fn new(ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            base: BaseAgent::new(AgentRole::Planner, ai_backend),
        }
    }
}

#[async_trait]
impl Agent for PlannerAgent {
    fn role(&self) -> AgentRole {
        self.base.role.clone()
    }

    fn state(&self) -> AgentState {
        self.base.state.clone()
    }

    fn metrics(&self) -> AgentMetrics {
        self.base.metrics.clone()
    }

    async fn process(
        &mut self,
        task: &Task,
    ) -> Result<AgentResponse, Box<dyn Error + Send + Sync>> {
        self.base.process_with_moe(task).await
    }

    fn can_handle(&self, _task: &Task) -> bool {
        true // Planner can create plans for any task
    }

    fn system_prompt(&self) -> String {
        r#"You are a Strategic Planner Agent with expertise across all domains.

Your role is to create comprehensive, actionable plans for any type of task:
- Business Strategy & Operations
- Creative Projects & Content
- Research & Analysis
- Software Development
- Personal Development
- Academic Work
- Event Planning
- Any other domain

For each task, you provide:
1. **Goal Analysis**: Clear understanding of the desired outcome
2. **Strategic Breakdown**: Logical phases and milestones
3. **Action Steps**: Specific, measurable, achievable tasks
4. **Dependencies**: What must happen before what
5. **Resources**: Required tools, people, budget, time
6. **Risk Assessment**: Potential obstacles and mitigation
7. **Success Criteria**: How to measure completion and quality
8. **Timeline**: Realistic schedule with checkpoints

Output Format (JSON):
{
  "plan_name": "Descriptive plan title",
  "domain": "business|creative|research|software|personal|academic|other",
  "goal": "Clear objective statement",
  "phases": [
    {
      "phase_number": 1,
      "name": "Phase name",
      "description": "What happens in this phase",
      "tasks": ["Task 1", "Task 2"],
      "duration_estimate": "time estimate",
      "dependencies": ["previous phases"],
      "deliverables": ["outputs from this phase"]
    }
  ],
  "resources_needed": {
    "people": [],
    "tools": [],
    "budget": "estimate",
    "time": "total estimate"
  },
  "risks": [
    {"risk": "potential issue", "mitigation": "how to handle"}
  ],
  "success_metrics": ["measurable criteria"],
  "confidence": 0.95
}

Be thorough, realistic, and adaptable to the specific domain and context."#
            .to_string()
    }
}
