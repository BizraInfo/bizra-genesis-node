//! BIZRA Node0 - PAT (Personal Agent Team) Orchestrator
//!
//! PAT agents work exclusively for the user, optimizing for growth, goals, and wellbeing.
//! Integrates with Hypergraph RAG for knowledge-enriched responses.

use serde::{Deserialize, Serialize};
use std::time::Instant;
use crate::lib::services::knowledge::knowledge_client;

/// PAT Agent roles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PatRole {
    MasterReasoner,
    MemoryArchitect,
    CreativeSynthesizer,
    DataAnalyzer,
    Communicator,
    ExecutionPlanner,
    EthicsGuardian,
}

impl PatRole {
    /// Get the model for this agent (may use Ollama or LM Studio)
    pub fn model(&self) -> &'static str {
        match self {
            Self::MasterReasoner => "deepseek-r1:7b",
            // ExecutionPlanner uses AgentFlow 7B via LM Studio for superior planning
            Self::ExecutionPlanner => "agentflow-7b",
            Self::MemoryArchitect | Self::CreativeSynthesizer | Self::EthicsGuardian => "qwen2.5:7b",
            Self::DataAnalyzer | Self::Communicator => "mistral:7b",
        }
    }
    
    /// Check if this agent uses LM Studio backend
    pub fn uses_lmstudio(&self) -> bool {
        matches!(self, Self::ExecutionPlanner)
    }

    /// Get the system prompt for this agent
    pub fn system_prompt(&self) -> &'static str {
        match self {
            Self::MasterReasoner => {
                "You are BIZRA Master Reasoner, an expert strategic thinker and problem solver. \
                 Your role is to help users with complex analysis, planning, and decision-making. \
                 Think deeply about problems. Consider multiple perspectives. Provide thorough, \
                 well-reasoned insights. When appropriate, create structured plans with clear steps."
            }
            Self::MemoryArchitect => {
                "You are BIZRA Memory Architect, a specialist in knowledge organization. \
                 Your role is to help users structure information, find connections between ideas, \
                 organize notes, and improve recall. Create clear mental models and frameworks. \
                 Help users build their personal knowledge base."
            }
            Self::CreativeSynthesizer => {
                "You are BIZRA Creative Synthesizer, an expert in creative thinking and content creation. \
                 Your role is to help users with writing, brainstorming, ideation, and creative problem-solving. \
                 Be imaginative, inspiring, and push boundaries while remaining practical and actionable."
            }
            Self::DataAnalyzer => {
                "You are BIZRA Data Analyzer, a specialist in extracting insights from information. \
                 Your role is to help users analyze data, recognize patterns, and make data-driven decisions. \
                 Present findings clearly with visualizations suggestions when helpful."
            }
            Self::Communicator => {
                "You are BIZRA Communicator, an expert in effective messaging and presentation. \
                 Your role is to help users craft clear, compelling communications including emails, \
                 presentations, reports, and messages. Adapt tone and style to the audience and purpose."
            }
            Self::ExecutionPlanner => {
                "You are BIZRA Execution Planner powered by AgentFlow 7B, a specialist in turning goals into actionable plans. \
                 Your role is to help users break down tasks, create schedules, build checklists, \
                 and sequence activities. You have advanced planning architecture that excels at: \
                 1) Multi-step task decomposition 2) Intelligent dependency mapping 3) Resource optimization \
                 4) Adaptive timeline estimation 5) Agent workflow orchestration. \
                 Focus on realistic, achievable steps with clear deliverables and measurable outcomes."
            }
            Self::EthicsGuardian => {
                "You are BIZRA Ethics Guardian, responsible for ensuring outputs are safe and ethical. \
                 Your role is to review content for potential harm, bias, misinformation, or ethical violations. \
                 Provide constructive feedback on how to improve problematic content while maintaining \
                 respect for the user's intentions."
            }
        }
    }

    /// Get description for this agent
    pub fn description(&self) -> &'static str {
        match self {
            Self::MasterReasoner => "Strategic thinking, complex analysis, planning",
            Self::MemoryArchitect => "Knowledge organization, finding connections, recall",
            Self::CreativeSynthesizer => "Writing, brainstorming, ideation",
            Self::DataAnalyzer => "Data analysis, pattern recognition, insights",
            Self::Communicator => "Email drafts, presentations, messaging",
            Self::ExecutionPlanner => "Schedules, checklists, task sequencing",
            Self::EthicsGuardian => "Safety compliance, bias detection, ethical review",
        }
    }

    /// Parse role from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "MasterReasoner" => Some(Self::MasterReasoner),
            "MemoryArchitect" => Some(Self::MemoryArchitect),
            "CreativeSynthesizer" => Some(Self::CreativeSynthesizer),
            "DataAnalyzer" => Some(Self::DataAnalyzer),
            "Communicator" => Some(Self::Communicator),
            "ExecutionPlanner" => Some(Self::ExecutionPlanner),
            "EthicsGuardian" => Some(Self::EthicsGuardian),
            _ => None,
        }
    }

    /// Get all available roles
    pub fn all() -> Vec<Self> {
        vec![
            Self::MasterReasoner,
            Self::MemoryArchitect,
            Self::CreativeSynthesizer,
            Self::DataAnalyzer,
            Self::Communicator,
            Self::ExecutionPlanner,
            Self::EthicsGuardian,
        ]
    }
}

impl std::fmt::Display for PatRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::MasterReasoner => "MasterReasoner",
            Self::MemoryArchitect => "MemoryArchitect",
            Self::CreativeSynthesizer => "CreativeSynthesizer",
            Self::DataAnalyzer => "DataAnalyzer",
            Self::Communicator => "Communicator",
            Self::ExecutionPlanner => "ExecutionPlanner",
            Self::EthicsGuardian => "EthicsGuardian",
        };
        write!(f, "{}", s)
    }
}

/// PAT Agent information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatAgent {
    pub role: String,
    pub model: String,
    pub description: String,
    pub available: bool,
}

impl From<PatRole> for PatAgent {
    fn from(role: PatRole) -> Self {
        Self {
            role: role.to_string(),
            model: role.model().to_string(),
            description: role.description().to_string(),
            available: true,
        }
    }
}

/// Chat message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,  // "user" or "assistant"
    pub content: String,
    pub agent: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Chat response from PAT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatResponse {
    pub response: String,
    pub agent: String,
    pub model: String,
    pub latency_ms: u64,
    pub ihsan_score: f64,
    pub tokens_used: Option<i32>,
}

/// PAT Orchestrator
pub struct PatOrchestrator {
    ollama_url: String,
    lmstudio_url: String,
    client: reqwest::Client,
    knowledge_enabled: bool,
}

impl PatOrchestrator {
    /// Create new PAT Orchestrator
    pub fn new(ollama_url: String) -> Self {
        let lmstudio_url = std::env::var("LMSTUDIO_URL")
            .unwrap_or_else(|_| "http://localhost:1234".to_string());
        let knowledge_enabled = std::env::var("KNOWLEDGE_ENRICHMENT")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(true); // Enabled by default
        Self {
            ollama_url,
            lmstudio_url,
            client: reqwest::Client::new(),
            knowledge_enabled,
        }
    }

    /// Get all available agents
    pub fn get_agents(&self) -> Vec<PatAgent> {
        PatRole::all().into_iter().map(PatAgent::from).collect()
    }

    /// Chat with a specific agent (with knowledge enrichment)
    pub async fn chat(
        &self,
        message: &str,
        role: PatRole,
        context: Option<Vec<ChatMessage>>,
    ) -> anyhow::Result<PatResponse> {
        let start = Instant::now();

        // Optionally enrich message with knowledge context
        let enriched_message = if self.knowledge_enabled && self.should_enrich(role) {
            self.enrich_with_knowledge(message).await
        } else {
            message.to_string()
        };

        // Build conversation context
        let mut messages = Vec::new();
        
        // Add system prompt
        messages.push(serde_json::json!({
            "role": "system",
            "content": role.system_prompt()
        }));

        // Add conversation history if provided
        if let Some(history) = context {
            for msg in history {
                messages.push(serde_json::json!({
                    "role": msg.role,
                    "content": msg.content
                }));
            }
        }

        // Add current message (potentially enriched)
        messages.push(serde_json::json!({
            "role": "user",
            "content": enriched_message
        }));

        // Route to appropriate backend
        let (response_text, tokens_used) = if role.uses_lmstudio() {
            self.call_lmstudio(&messages, role.model()).await?
        } else {
            self.call_ollama(&messages, role.model()).await?
        };

        let latency_ms = start.elapsed().as_millis() as u64;

        // Calculate Ihsan score based on response quality heuristics
        let ihsan_score = self.calculate_ihsan_score(&response_text, latency_ms);

        Ok(PatResponse {
            response: response_text,
            agent: role.to_string(),
            model: role.model().to_string(),
            latency_ms,
            ihsan_score,
            tokens_used,
        })
    }

    /// Determine if a role should use knowledge enrichment
    fn should_enrich(&self, role: PatRole) -> bool {
        matches!(
            role,
            PatRole::MasterReasoner 
            | PatRole::MemoryArchitect 
            | PatRole::DataAnalyzer
            | PatRole::ExecutionPlanner
        )
    }

    /// Enrich a message with knowledge context from Hypergraph RAG
    async fn enrich_with_knowledge(&self, message: &str) -> String {
        match knowledge_client().await.enrich_prompt(message, 2000).await {
            enriched if enriched.len() > message.len() => enriched,
            _ => message.to_string(),
        }
    }

    /// Call Ollama API for inference
    async fn call_ollama(
        &self,
        messages: &[serde_json::Value],
        model: &str,
    ) -> anyhow::Result<(String, Option<i32>)> {
        let request = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": false,
            "options": {
                "temperature": 0.7,
                "num_predict": 1024
            }
        });

        let response = self.client
            .post(format!("{}/api/chat", self.ollama_url))
            .json(&request)
            .send()
            .await?;

        let json: serde_json::Value = response.json().await?;

        let response_text = json["message"]["content"]
            .as_str()
            .unwrap_or("I apologize, but I couldn't generate a response.")
            .to_string();

        let tokens_used = json["eval_count"].as_i64().map(|n| n as i32);

        Ok((response_text, tokens_used))
    }

    /// Call LM Studio API for inference (OpenAI-compatible)
    async fn call_lmstudio(
        &self,
        messages: &[serde_json::Value],
        model: &str,
    ) -> anyhow::Result<(String, Option<i32>)> {
        let request = serde_json::json!({
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": false
        });

        let response = self.client
            .post(format!("{}/v1/chat/completions", self.lmstudio_url))
            .json(&request)
            .send()
            .await?;

        let json: serde_json::Value = response.json().await?;

        let response_text = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("I apologize, but I couldn't generate a response.")
            .to_string();

        let tokens_used = json["usage"]["completion_tokens"].as_i64().map(|n| n as i32);

        Ok((response_text, tokens_used))
    }

    /// Calculate Ihsan (excellence) score for a response
    fn calculate_ihsan_score(&self, response: &str, latency_ms: u64) -> f64 {
        // Base score
        let mut score: f64 = 0.80;

        // Length factor (reasonable responses are better)
        let word_count = response.split_whitespace().count();
        if word_count >= 50 && word_count <= 500 {
            score += 0.05;
        } else if word_count >= 20 && word_count < 50 {
            score += 0.02;
        }

        // Structure factor (presence of structure indicates thoughtfulness)
        if response.contains('\n') || response.contains("1.") || response.contains("- ") {
            score += 0.03;
        }

        // Latency factor (faster is slightly better, but not too fast)
        if latency_ms >= 1000 && latency_ms <= 10000 {
            score += 0.02;
        }

        // Ensure score is in valid range
        score.min(1.0).max(0.0)
    }

    /// Generate a 7-day plan using ExecutionPlanner (AgentFlow 7B)
    pub async fn generate_plan(&self, goal: &str) -> anyhow::Result<serde_json::Value> {
        let prompt = format!(
            r#"Create a realistic 7-day plan to achieve the following goal:

Goal: {}

Use your advanced planning capabilities to create an optimized, actionable plan.

Respond with a JSON object containing:
{{
  "goal": "The main goal restated clearly",
  "steps": ["Step 1", "Step 2", ...],
  "daily_tasks": [
    {{
      "day": 1,
      "task": "Task description",
      "bizra_helps": "How BIZRA assists",
      "user_does": "What user does in real world",
      "time_minutes": 30,
      "dependencies": [],
      "priority": "high|medium|low"
    }},
    ...
  ],
  "milestones": ["Milestone 1 at Day 3", "Final milestone at Day 7"],
  "risk_factors": ["Potential risk 1", "Potential risk 2"]
}}

Be realistic and actionable. Each daily task should take 15-60 minutes. 
Consider task dependencies and optimal sequencing."#,
            goal
        );

        // Use ExecutionPlanner (AgentFlow 7B) for superior planning
        let response = self.chat(&prompt, PatRole::ExecutionPlanner, None).await?;

        // Try to parse JSON from response
        let plan: serde_json::Value = serde_json::from_str(&response.response)
            .unwrap_or_else(|_| {
                // If parsing fails, return structured error
                serde_json::json!({
                    "goal": goal,
                    "steps": ["Plan generation requires refinement"],
                    "daily_tasks": [],
                    "raw_response": response.response
                })
            });

        Ok(plan)
    }

    /// Get recommendation for primary agent based on user preferences
    pub fn recommend_primary_agent(
        &self,
        wants_income: bool,
        wants_learning: bool,
        wants_creativity: bool,
        wants_organization: bool,
    ) -> PatRole {
        // Simple scoring system
        let mut scores: Vec<(PatRole, i32)> = vec![
            (PatRole::MasterReasoner, 0),
            (PatRole::ExecutionPlanner, 0),
            (PatRole::MemoryArchitect, 0),
            (PatRole::CreativeSynthesizer, 0),
        ];

        if wants_income {
            scores[1].1 += 2; // ExecutionPlanner
            scores[0].1 += 1; // MasterReasoner
        }
        if wants_learning {
            scores[0].1 += 2; // MasterReasoner
            scores[2].1 += 1; // MemoryArchitect
        }
        if wants_creativity {
            scores[3].1 += 2; // CreativeSynthesizer
            scores[0].1 += 1; // MasterReasoner
        }
        if wants_organization {
            scores[2].1 += 2; // MemoryArchitect
            scores[1].1 += 1; // ExecutionPlanner
        }

        scores.sort_by(|a, b| b.1.cmp(&a.1));
        scores[0].0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pat_role_model() {
        assert_eq!(PatRole::MasterReasoner.model(), "deepseek-r1:7b");
        assert_eq!(PatRole::CreativeSynthesizer.model(), "qwen2.5:7b");
        assert_eq!(PatRole::Communicator.model(), "mistral:7b");
    }

    #[test]
    fn test_pat_role_from_str() {
        assert_eq!(PatRole::from_str("MasterReasoner"), Some(PatRole::MasterReasoner));
        assert_eq!(PatRole::from_str("Unknown"), None);
    }

    #[test]
    fn test_recommend_primary_agent() {
        let orchestrator = PatOrchestrator::new("http://localhost:11434".into());
        
        // Income + Builder = ExecutionPlanner
        let agent = orchestrator.recommend_primary_agent(true, false, false, false);
        assert_eq!(agent, PatRole::ExecutionPlanner);
        
        // Learning = MasterReasoner
        let agent = orchestrator.recommend_primary_agent(false, true, false, false);
        assert_eq!(agent, PatRole::MasterReasoner);
    }
}
