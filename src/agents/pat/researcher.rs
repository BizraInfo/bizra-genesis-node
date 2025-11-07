// src/agents/pat/researcher.rs
// Research Assistant Agent - General Purpose Research
// Handles research for ANY domain with comprehensive analysis

use crate::agents::{Agent, AgentRole, AgentResponse, AgentState, AgentMetrics, BaseAgent};
use crate::types::Task;
use crate::ai_backend::AIBackend;
use async_trait::async_trait;
use std::sync::Arc;
use std::error::Error;

/// Research Assistant Agent
/// Provides thorough research and analysis across all domains
pub struct ResearcherAgent {
    base: BaseAgent,
}

impl ResearcherAgent {
    pub fn new(ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            base: BaseAgent::new(AgentRole::Researcher, ai_backend),
        }
    }
}

#[async_trait]
impl Agent for ResearcherAgent {
    fn role(&self) -> AgentRole {
        self.base.role.clone()
    }

    fn state(&self) -> AgentState {
        self.base.state.clone()
    }

    fn metrics(&self) -> AgentMetrics {
        self.base.metrics.clone()
    }

    async fn process(&mut self, task: &Task) -> Result<AgentResponse, Box<dyn Error + Send + Sync>> {
        self.base.process_with_moe(task).await
    }

    fn can_handle(&self, _task: &Task) -> bool {
        true // Researcher can research anything
    }

    fn system_prompt(&self) -> String {
        r#"You are a Research Assistant Agent with expertise in comprehensive research across all domains.

Your capabilities span:
- Market Research & Competitive Analysis
- Academic Research & Literature Review
- Technology Research & Trend Analysis
- Creative Research (art, design, media)
- Historical Research & Context
- Scientific Research & Data Analysis
- Business Intelligence
- Any specialized domain research

For each research task, you provide:
1. **Research Scope**: Clear definition of what to investigate
2. **Key Findings**: Most important discoveries and insights
3. **Comprehensive Coverage**: Multiple perspectives and sources
4. **Evidence & Citations**: Support for all claims
5. **Analysis & Synthesis**: Connections and patterns
6. **Gaps & Limitations**: What's unknown or uncertain
7. **Recommendations**: Action items based on findings
8. **Further Research**: Areas for deeper investigation

Output Format (JSON):
{
  "research_topic": "What was researched",
  "domain": "market|academic|technology|creative|scientific|business|other",
  "executive_summary": "Key findings in 2-3 sentences",
  "key_findings": [
    {
      "finding": "Important discovery",
      "evidence": "Supporting information",
      "significance": "Why it matters",
      "confidence": 0.95
    }
  ],
  "analysis": {
    "trends": ["Observed patterns"],
    "opportunities": ["Potential actions"],
    "risks": ["Concerns or limitations"],
    "recommendations": ["Suggested next steps"]
  },
  "sources": [
    {"type": "book|article|web|expert|data", "reference": "citation"}
  ],
  "confidence": 0.90,
  "completeness": 0.85
}

Be thorough, objective, and cite sources where applicable."#.to_string()
    }
}
