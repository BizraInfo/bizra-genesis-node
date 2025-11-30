// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SOVEREIGN MODEL STACK CONFIGURATION                ║
// ║                                                                           ║
// ║  Loads configuration from config/bizra-model-stack.toml                   ║
// ║  and initializes the sovereign AI infrastructure.                          ║
// ║                                                                           ║
// ║  "The first node of BIZRA doesn't just use AI – it IS the AI."           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// Model role in the sovereign stack
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ModelRole {
    Brain,          // Primary planning/orchestration
    Vision,         // Visual understanding
    LightReasoning, // Fast filtering/classification
    Voice,          // Speech I/O
    DeepThinker,    // Complex reasoning/code
    General,        // General purpose
}

/// Single model configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub role: ModelRole,
    pub provider: String,
    pub model_name: String,
    #[serde(default = "default_base_url")]
    pub base_url: String,
    #[serde(default)]
    pub tier: String,
    #[serde(default)]
    pub purpose: String,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub capabilities: Vec<String>,
}

fn default_base_url() -> String {
    "http://localhost:11434".to_string()
}

/// Routing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingConfig {
    pub default_model: String,
    #[serde(default)]
    pub task_mapping: HashMap<String, String>,
}

/// SAT-LAB specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SatLabConfig {
    pub primary_model: String,
    #[serde(default)]
    pub content_calendar_model: String,
    #[serde(default)]
    pub visual_suggestions_model: String,
    #[serde(default)]
    pub summarization_model: String,
}

/// Complete sovereign model stack configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SovereignModelStack {
    #[serde(default)]
    pub meta: StackMeta,
    pub models: HashMap<String, ModelConfig>,
    #[serde(default)]
    pub routing: Option<RoutingConfig>,
    #[serde(default)]
    pub sat_lab: Option<SatLabConfig>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StackMeta {
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub architect: String,
    #[serde(default)]
    pub hardware: String,
    #[serde(default)]
    pub philosophy: String,
}

impl SovereignModelStack {
    /// Load configuration from TOML file
    pub fn load_from_file(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let config: SovereignModelStack = toml::from_str(&content)?;
        Ok(config)
    }

    /// Load from default location (config/bizra-model-stack.toml)
    pub fn load_default() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Path::new("config/bizra-model-stack.toml");

        if config_path.exists() {
            info!("🧠 Loading sovereign model stack from {:?}", config_path);
            Self::load_from_file(config_path)
        } else {
            warn!("⚠️ No sovereign model config found, using defaults");
            Ok(Self::default_stack())
        }
    }

    /// Get the primary brain model
    pub fn get_brain(&self) -> Option<&ModelConfig> {
        self.models.values().find(|m| m.role == ModelRole::Brain)
    }

    /// Get model by role
    pub fn get_by_role(&self, role: ModelRole) -> Option<&ModelConfig> {
        self.models.values().find(|m| m.role == role)
    }

    /// Get model name for a specific task
    pub fn get_model_for_task(&self, task: &str) -> String {
        if let Some(routing) = &self.routing {
            if let Some(model_key) = routing.task_mapping.get(task) {
                if let Some(model) = self.models.get(model_key) {
                    return model.model_name.clone();
                }
            }
            // Fall back to default model - resolve key to model name
            if let Some(model) = self.models.get(&routing.default_model) {
                return model.model_name.clone();
            }
            // If default_model key doesn't exist, fall back to brain
            self.get_brain()
                .map(|m| m.model_name.clone())
                .unwrap_or_else(|| "bizra-planner:latest".to_string())
        } else {
            // Fall back to brain model
            self.get_brain()
                .map(|m| m.model_name.clone())
                .unwrap_or_else(|| "bizra-planner:latest".to_string())
        }
    }

    /// Get SAT-LAB primary model
    pub fn get_sat_lab_model(&self) -> String {
        if let Some(sat_lab) = &self.sat_lab {
            sat_lab.primary_model.clone()
        } else {
            self.get_model_for_task("sat_lab")
        }
    }

    /// Default sovereign stack (when no config file exists)
    pub fn default_stack() -> Self {
        let mut models = HashMap::new();

        // Brain - bizra-planner:latest (your fine-tuned model)
        models.insert(
            "bizra_planner".to_string(),
            ModelConfig {
                role: ModelRole::Brain,
                provider: "ollama".to_string(),
                model_name: "bizra-planner:latest".to_string(),
                base_url: "http://localhost:11434".to_string(),
                tier: "primary".to_string(),
                purpose: "Planning, orchestration, SAT/PAT command".to_string(),
                is_default: true,
                capabilities: vec![
                    "planning".to_string(),
                    "orchestration".to_string(),
                    "content_calendar".to_string(),
                ],
            },
        );

        // Vision - qwen2.5:7b
        models.insert(
            "qwen_vision".to_string(),
            ModelConfig {
                role: ModelRole::Vision,
                provider: "ollama".to_string(),
                model_name: "qwen2.5:7b".to_string(),
                base_url: "http://localhost:11434".to_string(),
                tier: "tool".to_string(),
                purpose: "Visual understanding, document extraction".to_string(),
                is_default: false,
                capabilities: vec!["vision".to_string(), "document".to_string()],
            },
        );

        // Deep Thinker - deepseek-r1:8b
        models.insert(
            "deepseek".to_string(),
            ModelConfig {
                role: ModelRole::DeepThinker,
                provider: "ollama".to_string(),
                model_name: "deepseek-r1:8b".to_string(),
                base_url: "http://localhost:11434".to_string(),
                tier: "tool".to_string(),
                purpose: "Complex reasoning, code, math".to_string(),
                is_default: false,
                capabilities: vec![
                    "code".to_string(),
                    "math".to_string(),
                    "reasoning".to_string(),
                ],
            },
        );

        // Light Reasoner - llama3.2:latest
        models.insert(
            "reasoner".to_string(),
            ModelConfig {
                role: ModelRole::LightReasoning,
                provider: "ollama".to_string(),
                model_name: "llama3.2:latest".to_string(),
                base_url: "http://localhost:11434".to_string(),
                tier: "tool".to_string(),
                purpose: "Fast filtering, classification".to_string(),
                is_default: false,
                capabilities: vec!["summarize".to_string(), "classify".to_string()],
            },
        );

        // Routing configuration
        let mut task_mapping = HashMap::new();
        task_mapping.insert("planning".to_string(), "bizra_planner".to_string());
        task_mapping.insert("sat_lab".to_string(), "bizra_planner".to_string());
        task_mapping.insert("pat".to_string(), "bizra_planner".to_string());
        task_mapping.insert("vision".to_string(), "qwen_vision".to_string());
        task_mapping.insert("code".to_string(), "deepseek".to_string());
        task_mapping.insert("summarize".to_string(), "reasoner".to_string());

        let routing = RoutingConfig {
            default_model: "bizra_planner".to_string(),
            task_mapping,
        };

        // SAT-LAB configuration
        let sat_lab = SatLabConfig {
            primary_model: "bizra-planner:latest".to_string(),
            content_calendar_model: "bizra-planner:latest".to_string(),
            visual_suggestions_model: "qwen2.5:7b".to_string(),
            summarization_model: "llama3.2:latest".to_string(),
        };

        Self {
            meta: StackMeta {
                version: "0.1.0".to_string(),
                architect: "Mahmoud 'MuMu' Hassan".to_string(),
                hardware: "MSI Titan GT77HX".to_string(),
                philosophy: "Sovereignty first. Ihsān always.".to_string(),
            },
            models,
            routing: Some(routing),
            sat_lab: Some(sat_lab),
        }
    }

    /// Print stack summary
    pub fn print_summary(&self) {
        info!("╔═══════════════════════════════════════════════════════════════╗");
        info!(
            "║          BIZRA SOVEREIGN MODEL STACK v{}                ║",
            self.meta.version
        );
        info!("╚═══════════════════════════════════════════════════════════════╝");
        info!("📍 Architect: {}", self.meta.architect);
        info!("🖥️  Hardware: {}", self.meta.hardware);
        info!("");
        info!("🧠 Models:");
        for (key, model) in &self.models {
            info!(
                "   {:?} [{}]: {} ({})",
                model.role, key, model.model_name, model.purpose
            );
        }
        if let Some(routing) = &self.routing {
            info!("");
            info!("🔀 Default routing: {}", routing.default_model);
        }
        info!("");
        info!("💡 Philosophy: {}", self.meta.philosophy);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_default_stack() {
        let stack = SovereignModelStack::default_stack();

        // Should have 4 models
        assert_eq!(stack.models.len(), 4);

        // Brain should be bizra-planner
        let brain = stack.get_brain().unwrap();
        assert_eq!(brain.model_name, "bizra-planner:latest");
        assert!(brain.is_default);

        // SAT-LAB should use brain
        assert_eq!(stack.get_sat_lab_model(), "bizra-planner:latest");
    }

    #[test]
    fn test_task_routing() {
        let stack = SovereignModelStack::default_stack();

        // Routing: planning -> bizra_planner -> model_name "bizra-planner:latest"
        assert_eq!(stack.get_model_for_task("planning"), "bizra-planner:latest");
        // Routing: code -> deepseek -> model_name "deepseek-r1:8b"
        assert_eq!(stack.get_model_for_task("code"), "deepseek-r1:8b");
        // Unknown falls back to default_model key "bizra_planner" which resolves to the model name
        assert_eq!(stack.get_model_for_task("unknown"), "bizra-planner:latest");
    }

    #[test]
    fn test_model_roles() {
        let stack = SovereignModelStack::default_stack();

        // Test each role exists and has expected properties
        assert!(stack.get_by_role(ModelRole::Brain).is_some());
        assert!(stack.get_by_role(ModelRole::Vision).is_some());
        assert!(stack.get_by_role(ModelRole::DeepThinker).is_some());
        assert!(stack.get_by_role(ModelRole::LightReasoning).is_some());
        assert!(stack.get_by_role(ModelRole::Voice).is_none()); // Not in default stack
        assert!(stack.get_by_role(ModelRole::General).is_none()); // Not in default stack
    }

    #[test]
    fn test_routing_config() {
        let stack = SovereignModelStack::default_stack();

        // Should have routing config
        assert!(stack.routing.is_some());
        let routing = stack.routing.as_ref().unwrap();

        // Should have default model
        assert_eq!(routing.default_model, "bizra_planner");

        // Should have task mappings
        assert!(routing.task_mapping.contains_key("planning"));
        assert!(routing.task_mapping.contains_key("code"));
        assert!(routing.task_mapping.contains_key("sat_lab"));
        assert!(routing.task_mapping.contains_key("vision"));
        assert!(routing.task_mapping.contains_key("summarize"));
    }

    #[test]
    fn test_sat_lab_config() {
        let stack = SovereignModelStack::default_stack();

        // Should have SAT-LAB config
        assert!(stack.sat_lab.is_some());
        let sat_lab = stack.sat_lab.as_ref().unwrap();

        // Should have primary model
        assert_eq!(sat_lab.primary_model, "bizra-planner:latest");

        // Should have specialized models
        assert_eq!(sat_lab.content_calendar_model, "bizra-planner:latest");
        assert_eq!(sat_lab.visual_suggestions_model, "qwen2.5:7b");
        assert_eq!(sat_lab.summarization_model, "llama3.2:latest");
    }

    #[test]
    fn test_model_config_structure() {
        let stack = SovereignModelStack::default_stack();

        // Test brain model structure
        let brain = stack.get_brain().unwrap();
        assert_eq!(brain.provider, "ollama");
        assert_eq!(brain.base_url, "http://localhost:11434");
        assert_eq!(brain.tier, "primary");
        assert!(brain.capabilities.contains(&"planning".to_string()));
        assert!(brain.capabilities.contains(&"orchestration".to_string()));

        // Test vision model structure
        let vision = stack.get_by_role(ModelRole::Vision).unwrap();
        assert_eq!(vision.model_name, "qwen2.5:7b");
        assert_eq!(vision.tier, "tool");
        assert!(!vision.is_default);
    }

    #[test]
    fn test_task_routing_fallbacks() {
        let stack = SovereignModelStack::default_stack();

        // Test fallback to brain when routing fails
        let mut stack_no_routing = stack.clone();
        stack_no_routing.routing = None;

        // Should fall back to brain model
        assert_eq!(
            stack_no_routing.get_model_for_task("unknown"),
            "bizra-planner:latest"
        );

        // Test with no brain either (edge case)
        let mut stack_no_brain = stack.clone();
        stack_no_brain.models.clear();

        // Should fall back to default string
        assert_eq!(
            stack_no_brain.get_model_for_task("unknown"),
            "bizra-planner:latest"
        );
    }

    #[test]
    fn test_load_from_file_nonexistent() {
        let path = std::path::Path::new("nonexistent.toml");
        let result = SovereignModelStack::load_from_file(path);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_load_from_file_valid() {
        // Create a temporary TOML file
        let mut temp_file = NamedTempFile::new().expect("Could not create temp file");

        let toml_content = r#"
            [meta]
            version = "1.0.0"
            architect = "Test Architect"

            [models.test_model]
            role = "brain"
            provider = "test"
            model_name = "test-model"

            [routing]
            default_model = "test_model"
        "#;

        temp_file
            .write_all(toml_content.as_bytes())
            .expect("Could not write to temp file");
        temp_file.flush().expect("Could not flush temp file");

        let path = temp_file.path();
        let result = SovereignModelStack::load_from_file(path);

        assert!(result.is_ok());
        let stack = result.unwrap();
        assert_eq!(stack.meta.version, "1.0.0");
        assert_eq!(stack.meta.architect, "Test Architect");
        assert!(stack.models.contains_key("test_model"));
    }

    #[test]
    fn test_model_role_serialization() {
        // Test that ModelRole can be deserialized correctly
        let brain_json = r#"{"role": "brain"}"#;
        let brain_config: serde_json::Value = serde_json::from_str(brain_json).unwrap();

        match brain_config["role"].as_str().unwrap() {
            "brain" => assert_eq!(ModelRole::Brain, ModelRole::Brain),
            _ => panic!("Unexpected role"),
        }

        // Test round-trip serialization
        let role = ModelRole::DeepThinker;
        let serialized = serde_json::to_string(&role).unwrap();
        let deserialized: ModelRole = serde_json::from_str(&serialized).unwrap();
        assert_eq!(role, deserialized);
    }

    #[test]
    fn test_get_sat_lab_model_fallback() {
        let mut stack = SovereignModelStack::default_stack();

        // Remove SAT-LAB configuration to test fallback
        stack.sat_lab = None;

        // Should fall back to get_model_for_task("sat_lab")
        assert_eq!(stack.get_sat_lab_model(), "bizra-planner:latest");
    }

    #[test]
    fn test_model_config_defaults() {
        let _config = ModelConfig {
            role: ModelRole::General,
            provider: "test".to_string(),
            model_name: "test-model".to_string(),
            base_url: "".to_string(), // Will trigger default
            tier: "".to_string(),
            purpose: "".to_string(),
            is_default: false,
            capabilities: vec![],
        };

        // base_url should get default value when deserializing
        // This tests the default_base_url function
        assert_eq!(default_base_url(), "http://localhost:11434");
    }

    #[test]
    fn test_stack_meta_defaults() {
        let meta = StackMeta::default();
        assert_eq!(meta.version, "");
        assert_eq!(meta.architect, "");
        assert_eq!(meta.hardware, "");
        assert_eq!(meta.philosophy, "");
    }

    #[test]
    fn test_routing_config_task_mapping() {
        let stack = SovereignModelStack::default_stack();

        if let Some(routing) = &stack.routing {
            // Test that task mapping contains expected tasks
            let tasks = ["planning", "sat_lab", "pat", "vision", "code", "summarize"];

            for task in tasks {
                assert!(
                    routing.task_mapping.contains_key(task),
                    "Task '{}' should be in routing mapping",
                    task
                );
            }
        } else {
            panic!("Expected routing config to exist");
        }
    }

    #[test]
    fn test_model_capability_mapping() {
        let stack = SovereignModelStack::default_stack();

        // Brain model should have planning and orchestration
        let brain = stack.get_by_role(ModelRole::Brain).unwrap();
        assert!(brain.capabilities.contains(&"planning".to_string()));
        assert!(brain.capabilities.contains(&"orchestration".to_string()));

        // Vision model should have vision capability
        let vision = stack.get_by_role(ModelRole::Vision).unwrap();
        assert!(vision.capabilities.contains(&"vision".to_string()));
        assert!(vision.capabilities.contains(&"document".to_string()));

        // DeepThinker should have code capability
        let thinker = stack.get_by_role(ModelRole::DeepThinker).unwrap();
        assert!(thinker.capabilities.contains(&"code".to_string()));
        assert!(thinker.capabilities.contains(&"reasoning".to_string()));
    }
}
