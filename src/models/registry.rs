// BIZRA Genesis Node - Professional Elite Implementation
// Model Provider Registry
//
// Central registry for managing multiple AI model providers.
// Supports dynamic model discovery, health monitoring, and intelligent routing.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use super::errors::{ModelError, ModelResult};
use super::traits::ModelProvider;
use super::types::{CompletionOptions, CompletionResponse, ModelInfo, ProviderHealth, StreamChunk};
use futures::stream::Stream;
use std::pin::Pin;

// ============================================================================
// Registry Types
// ============================================================================

/// Registered provider with metadata
#[derive(Clone)]
#[allow(dead_code)] // Fields used for provider management
struct RegisteredProvider {
    /// Provider instance
    provider: Arc<dyn ModelProvider>,
    /// Provider priority (higher = preferred)
    priority: u32,
    /// Whether provider is enabled
    enabled: bool,
    /// Last known health status
    last_health: Option<ProviderHealth>,
}

/// Model selection strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SelectionStrategy {
    /// Select cheapest model that meets requirements
    CostOptimized,
    /// Select fastest model (lowest latency)
    LatencyOptimized,
    /// Select highest quality model
    QualityOptimized,
    /// Round-robin across providers
    RoundRobin,
    /// Prefer local models first
    LocalFirst,
}

/// Model requirements for selection
#[derive(Debug, Clone)]
pub struct ModelRequirements {
    /// Minimum context length needed
    pub min_context_length: Option<usize>,
    /// Maximum acceptable cost per 1K tokens
    pub max_cost_per_1k: Option<f64>,
    /// Required capabilities (e.g., "chat", "code", "reasoning")
    pub required_capabilities: Vec<String>,
    /// Preferred model families (e.g., "gpt-4", "claude-3")
    pub preferred_families: Vec<String>,
    /// Selection strategy
    pub strategy: SelectionStrategy,
}

impl Default for ModelRequirements {
    fn default() -> Self {
        Self {
            min_context_length: None,
            max_cost_per_1k: None,
            required_capabilities: Vec::new(),
            preferred_families: Vec::new(),
            strategy: SelectionStrategy::QualityOptimized,
        }
    }
}

/// Selected model with provider information
#[derive(Debug, Clone)]
pub struct SelectedModel {
    /// Model name
    pub model_name: String,
    /// Provider name
    pub provider_name: String,
    /// Model information
    pub model_info: ModelInfo,
}

// ============================================================================
// Provider Registry
// ============================================================================

/// Central registry for managing multiple AI model providers
///
/// # Example
///
/// ```rust,no_run
/// use bizra_genesis_node::models::{
///     ProviderRegistry, OllamaProvider, OpenAIProvider, OpenAIConfig
/// };
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let mut registry = ProviderRegistry::new();
///
///     // Register providers
///     registry.register("ollama", OllamaProvider::new("http://localhost:11434"), 5);
///     registry.register("openai", OpenAIProvider::from_api_key("sk-..."), 10);
///
///     // Discover all models
///     let models = registry.list_all_models().await?;
///     println!("Found {} models across all providers", models.len());
///
///     // Select best model
///     let selected = registry.select_model(&Default::default()).await?;
///     println!("Selected: {} from {}", selected.model_name, selected.provider_name);
///
///     Ok(())
/// }
/// ```
pub struct ProviderRegistry {
    /// Registered providers
    providers: Arc<RwLock<HashMap<String, RegisteredProvider>>>,
    /// Round-robin counter
    round_robin_index: Arc<RwLock<usize>>,
}

impl ProviderRegistry {
    /// Create a new provider registry
    pub fn new() -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            round_robin_index: Arc::new(RwLock::new(0)),
        }
    }

    /// Register a new provider
    ///
    /// # Arguments
    /// * `name` - Unique provider identifier
    /// * `provider` - Provider implementation
    /// * `priority` - Provider priority (higher = preferred), 0-100
    pub fn register<P>(&self, name: impl Into<String>, provider: P, priority: u32)
    where
        P: ModelProvider + 'static,
    {
        let name = name.into();
        let provider = Arc::new(provider) as Arc<dyn ModelProvider>;

        let registered = RegisteredProvider {
            provider,
            priority,
            enabled: true,
            last_health: None,
        };

        let providers = self.providers.clone();
        tokio::spawn(async move {
            let mut providers = providers.write().await;
            providers.insert(name.clone(), registered);
            info!(provider = %name, priority = priority, "Provider registered");
        });
    }

    /// Enable a provider
    pub async fn enable_provider(&self, name: &str) -> ModelResult<()> {
        let mut providers = self.providers.write().await;
        if let Some(provider) = providers.get_mut(name) {
            provider.enabled = true;
            info!(provider = name, "Provider enabled");
            Ok(())
        } else {
            Err(ModelError::ProviderError {
                provider: name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    /// Disable a provider
    pub async fn disable_provider(&self, name: &str) -> ModelResult<()> {
        let mut providers = self.providers.write().await;
        if let Some(provider) = providers.get_mut(name) {
            provider.enabled = false;
            warn!(provider = name, "Provider disabled");
            Ok(())
        } else {
            Err(ModelError::ProviderError {
                provider: name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    /// List all providers
    pub async fn list_providers(&self) -> Vec<String> {
        let providers = self.providers.read().await;
        providers.keys().cloned().collect()
    }

    /// Get provider health status
    pub async fn get_provider_health(&self, name: &str) -> ModelResult<ProviderHealth> {
        let providers = self.providers.read().await;
        if let Some(registered) = providers.get(name) {
            registered.provider.health_check().await
        } else {
            Err(ModelError::ProviderError {
                provider: name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    /// Check health of all providers
    pub async fn check_all_health(&self) -> HashMap<String, ProviderHealth> {
        let providers = self.providers.read().await;
        let mut health_results = HashMap::new();

        for (name, registered) in providers.iter() {
            if let Ok(health) = registered.provider.health_check().await {
                health_results.insert(name.clone(), health);
            }
        }

        health_results
    }

    /// List all models across all providers
    pub async fn list_all_models(&self) -> ModelResult<Vec<ModelInfo>> {
        let providers = self.providers.read().await;
        let mut all_models = Vec::new();

        for (name, registered) in providers.iter() {
            if !registered.enabled {
                continue;
            }

            match registered.provider.list_models().await {
                Ok(models) => {
                    debug!(provider = name, count = models.len(), "Listed models");
                    all_models.extend(models);
                }
                Err(e) => {
                    warn!(provider = name, error = ?e, "Failed to list models");
                }
            }
        }

        Ok(all_models)
    }

    /// Select best model based on requirements
    pub async fn select_model(
        &self,
        requirements: &ModelRequirements,
    ) -> ModelResult<SelectedModel> {
        let all_models = self.list_all_models().await?;

        if all_models.is_empty() {
            return Err(ModelError::Internal {
                message: "No models available from any provider".to_string(),
            });
        }

        // Filter models by requirements
        let mut candidates: Vec<_> = all_models
            .into_iter()
            .filter(|m| self.meets_requirements(m, requirements))
            .collect();

        if candidates.is_empty() {
            return Err(ModelError::Internal {
                message: "No models meet the specified requirements".to_string(),
            });
        }

        // Sort by strategy
        match requirements.strategy {
            SelectionStrategy::CostOptimized => {
                candidates.sort_by(|a, b| {
                    let cost_a = a.cost_per_1k_input + a.cost_per_1k_output;
                    let cost_b = b.cost_per_1k_input + b.cost_per_1k_output;
                    cost_a.partial_cmp(&cost_b).unwrap()
                });
            }
            SelectionStrategy::QualityOptimized => {
                // Prefer GPT-4, then Claude, then others
                candidates.sort_by(|a, b| {
                    let score_a = self.quality_score(&a.name);
                    let score_b = self.quality_score(&b.name);
                    score_b.partial_cmp(&score_a).unwrap()
                });
            }
            SelectionStrategy::LocalFirst => {
                candidates.sort_by(|a, b| {
                    let local_a = a.provider == "ollama";
                    let local_b = b.provider == "ollama";
                    local_b.cmp(&local_a)
                });
            }
            SelectionStrategy::LatencyOptimized => {
                // Prefer local models (Ollama) for lowest latency
                candidates.sort_by(|a, b| {
                    let local_a = a.provider == "ollama";
                    let local_b = b.provider == "ollama";
                    local_b.cmp(&local_a)
                });
            }
            SelectionStrategy::RoundRobin => {
                // Use round-robin across providers
                let mut rr_index = self.round_robin_index.write().await;
                *rr_index = (*rr_index + 1) % candidates.len();
                let selected = candidates.swap_remove(*rr_index);
                return Ok(SelectedModel {
                    model_name: selected.name.clone(),
                    provider_name: selected.provider.clone(),
                    model_info: selected,
                });
            }
        }

        // Return top candidate
        let selected = candidates.swap_remove(0);
        Ok(SelectedModel {
            model_name: selected.name.clone(),
            provider_name: selected.provider.clone(),
            model_info: selected,
        })
    }

    /// Complete using a specific provider
    pub async fn complete_with_provider(
        &self,
        provider_name: &str,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        let providers = self.providers.read().await;
        if let Some(registered) = providers.get(provider_name) {
            if !registered.enabled {
                return Err(ModelError::ProviderError {
                    provider: provider_name.to_string(),
                    code: None,
                    message: "Provider is disabled".to_string(),
                });
            }
            registered.provider.complete(model, prompt, options).await
        } else {
            Err(ModelError::ProviderError {
                provider: provider_name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    /// Complete using auto-selected model
    pub async fn complete(
        &self,
        prompt: &str,
        requirements: &ModelRequirements,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        let selected = self.select_model(requirements).await?;

        info!(
            model = %selected.model_name,
            provider = %selected.provider_name,
            "Auto-selected model for completion"
        );

        self.complete_with_provider(
            &selected.provider_name,
            &selected.model_name,
            prompt,
            options,
        )
        .await
    }

    /// Streaming complete using a specific provider
    pub async fn complete_stream_with_provider(
        &self,
        provider_name: &str,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>> {
        let providers = self.providers.read().await;
        if let Some(registered) = providers.get(provider_name) {
            if !registered.enabled {
                return Err(ModelError::ProviderError {
                    provider: provider_name.to_string(),
                    code: None,
                    message: "Provider is disabled".to_string(),
                });
            }
            registered
                .provider
                .complete_stream(model, prompt, options)
                .await
        } else {
            Err(ModelError::ProviderError {
                provider: provider_name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    /// Calculate cost across providers
    pub async fn calculate_cost(
        &self,
        provider_name: &str,
        model: &str,
        input_tokens: usize,
        output_tokens: usize,
    ) -> ModelResult<f64> {
        let providers = self.providers.read().await;
        if let Some(registered) = providers.get(provider_name) {
            registered
                .provider
                .calculate_cost(model, input_tokens, output_tokens)
                .await
        } else {
            Err(ModelError::ProviderError {
                provider: provider_name.to_string(),
                code: None,
                message: "Provider not found".to_string(),
            })
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /// Check if model meets requirements
    fn meets_requirements(&self, model: &ModelInfo, requirements: &ModelRequirements) -> bool {
        // Check context length
        if let Some(min_context) = requirements.min_context_length {
            if model.context_length < min_context {
                return false;
            }
        }

        // Check cost
        if let Some(max_cost) = requirements.max_cost_per_1k {
            let total_cost = model.cost_per_1k_input + model.cost_per_1k_output;
            if total_cost > max_cost {
                return false;
            }
        }

        // Check capabilities
        for required_cap in &requirements.required_capabilities {
            if !model.capabilities.contains(required_cap) {
                return false;
            }
        }

        // Check preferred families
        if !requirements.preferred_families.is_empty() {
            if let Some(ref family) = model.family {
                if !requirements
                    .preferred_families
                    .iter()
                    .any(|pref| family.contains(pref))
                {
                    return false;
                }
            } else {
                return false;
            }
        }

        true
    }

    /// Quality score for model ranking
    fn quality_score(&self, model_name: &str) -> f64 {
        // Simple heuristic: GPT-4 > Claude-3 > GPT-3.5 > Others
        if model_name.contains("gpt-4") {
            100.0
        } else if model_name.contains("claude-3-opus") {
            95.0
        } else if model_name.contains("claude-3-sonnet") {
            90.0
        } else if model_name.contains("claude") {
            85.0
        } else if model_name.contains("gpt-3.5") {
            80.0
        } else if model_name.contains("llama-3") || model_name.contains("llama3") {
            75.0
        } else if model_name.contains("mistral") {
            70.0
        } else {
            50.0
        }
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// ModelProvider Trait Implementation for Sovereign Routing
// ============================================================================

#[async_trait::async_trait]
impl ModelProvider for Arc<ProviderRegistry> {
    fn provider_name(&self) -> &str {
        "bizra-registry"
    }

    async fn complete(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        // Sovereign routing: All BIZRA models go through Ollama
        debug!(model = %model, "Routing sovereign model through Ollama provider");
        self.complete_with_provider("ollama", model, prompt, options)
            .await
    }

    async fn complete_stream(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>> {
        // Sovereign routing: All BIZRA models go through Ollama
        debug!(model = %model, "Routing sovereign streaming model through Ollama provider");
        self.complete_stream_with_provider("ollama", model, prompt, options)
            .await
    }

    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
        // Return all sovereign BIZRA models across providers
        self.list_all_models().await
    }

    async fn model_info(&self, model: &str) -> ModelResult<ModelInfo> {
        // Find model info from all providers
        let all_models = self.list_all_models().await?;
        all_models
            .into_iter()
            .find(|m| m.name == model)
            .ok_or_else(|| ModelError::Internal {
                message: format!("Model {} not found in sovereign registry", model),
            })
    }

    async fn health_check(&self) -> ModelResult<ProviderHealth> {
        use super::types::HealthStatus;

        // Aggregate health from all sovereign providers
        let health_results = self.check_all_health().await;

        // For sovereign operation, all providers must be healthy
        let overall_status = if health_results
            .values()
            .all(|h| matches!(h.status, HealthStatus::Healthy))
        {
            HealthStatus::Healthy
        } else if health_results
            .values()
            .any(|h| matches!(h.status, HealthStatus::Healthy))
        {
            HealthStatus::Degraded
        } else {
            HealthStatus::Unhealthy
        };

        let avg_latency = if health_results.is_empty() {
            0
        } else {
            health_results.values().map(|h| h.latency_ms).sum::<u64>() / health_results.len() as u64
        };

        Ok(ProviderHealth {
            status: overall_status,
            provider: "bizra-registry".to_string(),
            latency_ms: avg_latency,
            models_available: health_results.values().map(|h| h.models_available).sum(),
            error: None,
            details: std::collections::HashMap::new(),
        })
    }

    async fn calculate_cost(
        &self,
        model: &str,
        input_tokens: usize,
        output_tokens: usize,
    ) -> ModelResult<f64> {
        // For sovereign BIZRA, cost is $0 (no API fees)
        // We could route to appropriate provider for external models if needed
        if model.contains("bizra-")
            || model.contains("llama")
            || model.contains("deepseek")
            || model.contains("qwen")
            || model.contains("mistral")
        {
            Ok(0.0) // Sovereign: No cost for our models
        } else {
            // Route external models through their providers if registered
            let model_info = self.model_info(model).await?;
            Ok(model_info.calculate_cost(input_tokens, output_tokens))
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_creation() {
        let registry = ProviderRegistry::new();
        assert_eq!(registry.providers.try_read().unwrap().len(), 0);
    }

    #[test]
    fn test_model_requirements_default() {
        let req = ModelRequirements::default();
        assert_eq!(req.strategy, SelectionStrategy::QualityOptimized);
        assert!(req.required_capabilities.is_empty());
    }

    #[test]
    fn test_quality_scoring() {
        let registry = ProviderRegistry::new();

        assert!(registry.quality_score("gpt-4-turbo") > registry.quality_score("gpt-3.5-turbo"));
        assert!(
            registry.quality_score("claude-3-opus") > registry.quality_score("claude-3-sonnet")
        );
        assert!(registry.quality_score("gpt-3.5-turbo") > registry.quality_score("llama3"));
    }

    #[tokio::test]
    async fn test_provider_list() {
        let registry = ProviderRegistry::new();
        let providers = registry.list_providers().await;
        assert_eq!(providers.len(), 0);
    }
}
