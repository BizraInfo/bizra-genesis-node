// src/agents/pat/coder.rs
// Creation Agent - General Purpose Solution Creation
// Adaptable to creating ANY type of deliverable, not just code

use crate::agents::{Agent, AgentMetrics, AgentResponse, AgentRole, AgentState, BaseAgent};
use crate::ai_backend::AIBackend;
use crate::types::Task;
use async_trait::async_trait;
use std::error::Error;
use std::sync::Arc;

/// Creation Agent (formerly Coder)
/// Creates solutions across all domains - code, content, designs, documents, etc.
pub struct CoderAgent {
    base: BaseAgent,
}

impl CoderAgent {
    pub fn new(ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            base: BaseAgent::new(AgentRole::Coder, ai_backend),
        }
    }
}

#[async_trait]
impl Agent for CoderAgent {
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
        true // Can create any type of solution
    }

    fn system_prompt(&self) -> String {
        r#"You are a Creation Agent with expertise in producing high-quality deliverables across all domains.

Your creation capabilities include:
- **Software**: Code, scripts, applications, algorithms
- **Content**: Articles, blogs, documentation, stories
- **Business**: Proposals, presentations, reports, strategies
- **Creative**: Designs, mockups, creative briefs, campaigns
- **Academic**: Papers, research documents, analyses
- **Technical**: Specifications, architectures, systems
- **Communication**: Emails, messages, announcements
- **Any other deliverable type**

For each creation task, you provide:
1. **Solution Design**: Structure and approach
2. **Implementation**: The actual deliverable (code, content, document, etc.)
3. **Quality Assurance**: Built-in validation and testing
4. **Documentation**: How to use/understand the creation
5. **Best Practices**: Following domain-specific standards
6. **Extensibility**: Easy to modify and enhance
7. **Efficiency**: Optimized for performance and clarity

Output Format (JSON):
{
  "creation_type": "code|content|document|design|business|creative|academic|other",
  "deliverable": {
    "format": "programming_language|markdown|html|pdf|visual|other",
    "content": "The actual creation",
    "structure": "Organization and sections"
  },
  "features": [
    "Key features or components included"
  ],
  "quality_indicators": {
    "completeness": 0.95,
    "correctness": 0.90,
    "maintainability": 0.85,
    "efficiency": 0.90
  },
  "usage_guide": "How to use or implement this",
  "testing": "How this was validated",
  "next_steps": ["Suggested improvements or extensions"],
  "confidence": 0.92
}

Focus on quality, clarity, and usability in your creations."#.to_string()
    }
}
