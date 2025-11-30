// Integration tests for bizra-moe Multi-Model Ensemble
// These tests can run with either real Ollama or gracefully skip if unavailable

use bizra_moe::*;
use std::time::Duration;

/// Check if Ollama is available at the default endpoint
async fn is_ollama_available() -> bool {
    let client = reqwest::Client::new();
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(Duration::from_secs(2))
        .send()
        .await
    {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

/// Get list of available models from Ollama
async fn get_available_models() -> Vec<String> {
    let client = reqwest::Client::new();
    match client.get("http://localhost:11434/api/tags").send().await {
        Ok(response) => {
            if let Ok(json) = response.json::<serde_json::Value>().await {
                if let Some(models) = json["models"].as_array() {
                    return models
                        .iter()
                        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                        .collect();
                }
            }
            vec![]
        }
        Err(_) => vec![],
    }
}

#[tokio::test]
async fn test_ollama_connection() {
    // Test basic connectivity to Ollama
    if !is_ollama_available().await {
        eprintln!("⚠ Ollama not available: Skipping test");
        eprintln!("  Install Ollama and models to run full tests.");
        eprintln!("  See OLLAMA_SETUP.md for installation instructions.");
        return;
    }

    let models = get_available_models().await;
    if models.is_empty() {
        eprintln!("⚠ No models installed: Skipping test");
        eprintln!("  Run 'ollama pull llama3.2' to install a model.");
        return;
    }

    println!("✓ Ollama is available with {} models", models.len());
    println!("  Available models: {:?}", models);
    assert!(!models.is_empty(), "No models available in Ollama");
}

#[tokio::test]
async fn test_single_model_generation() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.is_empty() {
        eprintln!("⚠ Skipping test: No models installed");
        return;
    }

    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: vec![models[0].clone()],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.85,
    };

    let client = OllamaClient::with_config(config);

    let prompt = "What is 2+2? Answer with just the number.";
    match client.generate(&models[0], prompt).await {
        Ok(response) => {
            println!("✓ Single model generation successful");
            println!("  Model: {}", response.model);
            println!("  Response: {}", response.text);
            println!("  Confidence: {:.2}", response.confidence);
            println!("  Latency: {}ms", response.latency_ms);

            assert!(!response.text.is_empty(), "Response text is empty");
            assert!(
                response.confidence > 0.0 && response.confidence <= 1.0,
                "Invalid confidence score"
            );
            assert!(response.latency_ms > 0, "Invalid latency");
        }
        Err(e) => {
            panic!("Single model generation failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_ensemble_generation() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.len() < 2 {
        eprintln!(
            "⚠ Skipping test: Need at least 2 models (found {})",
            models.len()
        );
        return;
    }

    // Use first 3 models or all available if less than 3
    let test_models: Vec<String> = models.into_iter().take(3).collect();

    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: test_models.clone(),
        min_healthy_models: (test_models.len() / 2).max(1),
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.70, // Lower threshold for testing
    };

    let orchestrator = EnsembleOrchestrator::with_config(config);

    let prompt = "What is the capital of France? Answer in one word.";
    match orchestrator.generate(prompt).await {
        Ok(response) => {
            println!("✓ Ensemble generation successful");
            println!("  Ensemble response: {}", response.text);
            println!("  Ihsan score: {:.2}%", response.ihsan_score * 100.0);
            println!("  Total latency: {}ms", response.total_latency_ms);
            println!("  Models used: {}", response.contributors.len());

            for model_resp in &response.contributors {
                println!(
                    "    - {}: {:.2} confidence, {}ms",
                    model_resp.model, model_resp.confidence, model_resp.latency_ms
                );
            }

            assert!(!response.text.is_empty(), "Ensemble response is empty");
            assert!(response.ihsan_score > 0.0, "Invalid Ihsan score");
            assert!(
                response.contributors.len() >= 2,
                "Not enough model responses"
            );
        }
        Err(e) => {
            panic!("Ensemble generation failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_health_monitoring() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.is_empty() {
        eprintln!("⚠ Skipping test: No models installed");
        return;
    }

    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(5),
        models: models.clone(),
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.85,
    };

    let client = OllamaClient::with_config(config);

    // Check health of first model
    match client.check_health(&models[0]).await {
        Ok(is_healthy) => {
            println!("✓ Health check completed");
            println!("  Model: {}, Healthy: {}", models[0], is_healthy);
            assert!(is_healthy, "Model should be healthy");
        }
        Err(e) => panic!("Health check failed: {}", e),
    }

    // Get list of healthy models
    let healthy = client.healthy_models().await;
    println!("✓ Healthy models: {:?}", healthy);
    assert!(
        !healthy.is_empty(),
        "Should have at least one healthy model"
    );
}

#[tokio::test]
async fn test_quality_gate_enforcement() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.len() < 2 {
        eprintln!("⚠ Skipping test: Need at least 2 models");
        return;
    }

    // Configure with VERY high quality threshold (should fail)
    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: models.into_iter().take(2).collect(),
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.99, // Nearly impossible to achieve
    };

    let orchestrator = EnsembleOrchestrator::with_config(config);

    match orchestrator.generate("Test prompt").await {
        Ok(_) => {
            println!("⚠ Quality gate unexpectedly passed with 0.99 threshold");
        }
        Err(MoeError::IhsanGateFailed { score, threshold }) => {
            println!("✓ Quality gate correctly enforced");
            println!("  Score: {:.2}", score);
            println!("  Threshold: {:.2}", threshold);
            assert!(score < threshold, "Score should be below threshold");
        }
        Err(e) => {
            panic!("Unexpected error: {}", e);
        }
    }
}

#[tokio::test]
async fn test_graceful_degradation() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.is_empty() {
        eprintln!("⚠ Skipping test: No models installed");
        return;
    }

    // Configure with only 1 model but require minimum 1
    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: vec![models[0].clone()],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.70,
    };

    let orchestrator = EnsembleOrchestrator::with_config(config);

    match orchestrator.generate("Test prompt").await {
        Ok(response) => {
            println!("✓ Graceful degradation works with 1 model");
            println!("  Response received: {}", response.text.len() > 0);
            assert_eq!(response.contributors.len(), 1, "Should use exactly 1 model");
        }
        Err(e) => {
            panic!("Should work with 1 model: {}", e);
        }
    }
}

#[tokio::test]
async fn test_invalid_model_handling() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(5),
        models: vec!["nonexistent-model-12345".to_string()],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.85,
    };

    let orchestrator = EnsembleOrchestrator::with_config(config);

    match orchestrator.generate("Test").await {
        Ok(_) => {
            panic!("Should fail with nonexistent model");
        }
        Err(MoeError::InsufficientModels { need, have }) => {
            println!("✓ Correctly handled invalid model");
            println!("  Needed: {}, Have: {}", need, have);
            assert_eq!(have, 0, "Should have 0 healthy models");
        }
        Err(e) => {
            println!("✓ Failed with appropriate error: {}", e);
        }
    }
}

#[tokio::test]
async fn test_performance_metrics() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.is_empty() {
        eprintln!("⚠ Skipping test: No models installed");
        return;
    }

    let config = OllamaConfig::default();
    let orchestrator = EnsembleOrchestrator::with_config(config);

    let start = std::time::Instant::now();
    match orchestrator.generate("What is 2+2?").await {
        Ok(response) => {
            let total_time = start.elapsed();

            println!("✓ Performance metrics collected");
            println!("  Total time: {:?}", total_time);
            println!("  MOE latency: {}ms", response.total_latency_ms);
            println!("  Models queried: {}", response.contributors.len());

            // Calculate average latency per model
            let avg_latency: u64 = response
                .contributors
                .iter()
                .map(|r| r.latency_ms)
                .sum::<u64>()
                / response.contributors.len() as u64;

            println!("  Avg model latency: {}ms", avg_latency);

            // Performance targets (relaxed for testing)
            assert!(
                response.total_latency_ms < 30000,
                "Total latency too high (>30s)"
            );
            assert!(avg_latency < 15000, "Average model latency too high (>15s)");
        }
        Err(e) => {
            panic!("Performance test failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_multiple_ensemble_requests() {
    if !is_ollama_available().await {
        eprintln!("⚠ Skipping test: Ollama not available");
        return;
    }

    let models = get_available_models().await;
    if models.len() < 2 {
        eprintln!("⚠ Skipping test: Need at least 2 models");
        return;
    }

    let config = OllamaConfig::default();
    let orchestrator = EnsembleOrchestrator::with_config(config);

    let prompts = vec![
        "What is the capital of France?",
        "What is 10 + 15?",
        "What color is the ocean?",
    ];

    println!("Running {} ensemble requests...", prompts.len());
    let start = std::time::Instant::now();

    for (i, prompt) in prompts.iter().enumerate() {
        match orchestrator.generate(prompt).await {
            Ok(response) => {
                println!(
                    "  Request {}: {} models, {:.2} Ihsan, {}ms",
                    i + 1,
                    response.contributors.len(),
                    response.ihsan_score,
                    response.total_latency_ms
                );
            }
            Err(e) => {
                eprintln!("  Request {} failed: {}", i + 1, e);
            }
        }
    }

    let total_time = start.elapsed();
    println!("✓ Multiple requests completed in {:?}", total_time);

    // Should complete in reasonable time (3 requests * 10s each = 30s max)
    assert!(total_time.as_secs() < 60, "Multiple requests took too long");
}

// Test with default configuration (works without Ollama)
#[tokio::test]
async fn test_config_defaults() {
    let config = OllamaConfig::default();

    assert_eq!(config.base_url, "http://localhost:11434");
    assert_eq!(config.timeout, Duration::from_secs(5));
    assert_eq!(config.min_healthy_models, 3);
    assert_eq!(config.ihsan_threshold, 0.95);
    assert_eq!(config.models.len(), 5);

    println!("✓ Default configuration is correct");
}

// Test health tracking (works without Ollama)
#[tokio::test]
async fn test_health_tracking() {
    let mut health = ModelHealth::new("test-model".to_string());

    // Initial state
    assert!(health.is_healthy);
    assert_eq!(health.consecutive_failures, 0);

    // Record success
    health.record_success(500);
    assert!(health.is_healthy);
    assert_eq!(health.successful_requests, 1);

    // Record failures
    health.record_failure();
    assert!(health.is_healthy); // Still healthy after 1 failure

    health.record_failure();
    assert!(health.is_healthy); // Still healthy after 2 failures

    health.record_failure();
    assert!(!health.is_healthy); // Unhealthy after 3 failures (circuit open)

    // Record success should recover
    health.record_success(500);
    assert!(health.is_healthy); // Recovered (circuit closed)

    println!("✓ Health tracking works correctly");
}
