// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SOVEREIGN MOE BRIDGE                               ║
// ║                                                                           ║
// ║  Bridges sovereign_stack.rs configuration to bizra-moe OllamaClient      ║
// ║                                                                           ║
// ║  This module ensures that the PAT/SAT agents use YOUR sovereign models   ║
// ║  (bizra-planner:latest, qwen2.5:7b, etc.) instead of generic defaults.   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::ai_backend::{AIBackend, MoeBackend};
use crate::sovereign_stack::{ModelRole, SovereignModelStack};
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn};

/// Creates a MoeBackend configured with the sovereign model stack
pub fn create_sovereign_backend() -> Arc<dyn AIBackend> {
    // Load sovereign model stack configuration
    let stack = match SovereignModelStack::load_default() {
        Ok(s) => {
            s.print_summary();
            s
        }
        Err(e) => {
            warn!(
                "Failed to load sovereign stack config: {}. Using defaults.",
                e
            );
            SovereignModelStack::default_stack()
        }
    };

    // Extract model names for the MoE ensemble
    let models: Vec<String> = stack
        .models
        .values()
        .map(|m| m.model_name.clone())
        .collect();

    // Get the base URL (all models use same Ollama instance)
    let base_url = stack
        .models
        .values()
        .next()
        .map(|m| m.base_url.clone())
        .unwrap_or_else(|| "http://localhost:11434".to_string());

    info!("🧠 Configuring sovereign MOE with {} models", models.len());
    info!("   Base URL: {}", base_url);
    for model in &models {
        info!("   • {}", model);
    }

    // Create OllamaConfig with sovereign models
    let config = bizra_moe::OllamaConfig {
        base_url,
        timeout: Duration::from_secs(30), // Longer timeout for larger models
        models,
        min_healthy_models: 1, // Start with 1 for single-node Genesis Zero
        health_check_interval: Duration::from_secs(60),
        ihsan_threshold: 0.85, // 85% quality floor (adjustable per task)
    };

    Arc::new(MoeBackend::with_config(config))
}

/// Creates a backend specifically for SAT-LAB operations
pub fn create_sat_lab_backend(stack: &SovereignModelStack) -> Arc<dyn AIBackend> {
    let sat_lab_model = stack.get_sat_lab_model();

    info!("📢 Configuring SAT-LAB backend with: {}", sat_lab_model);

    // SAT-LAB uses single model (the brain) for consistency
    let config = bizra_moe::OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(60), // Longer for content generation
        models: vec![sat_lab_model],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(120),
        ihsan_threshold: 0.80, // Slightly lower for creative content
    };

    Arc::new(MoeBackend::with_config(config))
}

/// Creates a backend configured for a specific task type
pub fn create_task_backend(stack: &SovereignModelStack, task: &str) -> Arc<dyn AIBackend> {
    let model_name = stack.get_model_for_task(task);

    info!("🎯 Configuring backend for task '{}': {}", task, model_name);

    let config = bizra_moe::OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: vec![model_name],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(60),
        ihsan_threshold: 0.85,
    };

    Arc::new(MoeBackend::with_config(config))
}

/// Creates a backend that uses all available models in ensemble mode
pub fn create_ensemble_backend(stack: &SovereignModelStack) -> Arc<dyn AIBackend> {
    let models: Vec<String> = stack
        .models
        .values()
        .map(|m| m.model_name.clone())
        .collect();

    info!(
        "🌐 Configuring full ensemble backend with {} models",
        models.len()
    );

    let config = bizra_moe::OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(45),
        models,
        min_healthy_models: 2, // Need at least 2 for meaningful ensemble
        health_check_interval: Duration::from_secs(60),
        ihsan_threshold: 0.90, // Higher bar for ensemble consensus
    };

    Arc::new(MoeBackend::with_config(config))
}

/// Get the primary brain model for direct queries
pub fn get_brain_model(stack: &SovereignModelStack) -> Option<String> {
    stack
        .get_by_role(ModelRole::Brain)
        .map(|m| m.model_name.clone())
}

/// Get model for a specific role
pub fn get_model_by_role(stack: &SovereignModelStack, role: ModelRole) -> Option<String> {
    stack.get_by_role(role).map(|m| m.model_name.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_stack_models() {
        let stack = SovereignModelStack::default_stack();

        // Brain should be bizra-planner
        let brain = get_brain_model(&stack);
        assert!(brain.is_some());
        assert!(brain.unwrap().contains("bizra-planner"));
    }

    #[test]
    fn test_task_routing() {
        let stack = SovereignModelStack::default_stack();

        // SAT-LAB should use brain
        let sat_model = stack.get_sat_lab_model();
        assert!(sat_model.contains("bizra-planner"));

        // Code tasks should use deepseek
        let code_model = stack.get_model_for_task("code");
        assert!(code_model.contains("deepseek"));
    }

    #[tokio::test]
    async fn test_create_sovereign_backend() {
        let backend = create_sovereign_backend();
        assert_eq!(backend.name(), "moe");
    }
}
