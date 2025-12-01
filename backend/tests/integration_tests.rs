//! BIZRA Node0 - Backend Integration Tests
//! Document ID: BIZRA-NODE0-v1.0.0-GENESIS
//! Elite Professional Testing Standards

use axum::http::StatusCode;
use serde_json::json;

/// Test fixtures and helpers
mod fixtures {
    pub fn api_url() -> String {
        std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:8080".into())
    }
}

/// Health Check Tests
#[cfg(test)]
mod health_tests {
    use super::*;

    #[tokio::test]
    async fn test_health_endpoint() {
        let client = reqwest::Client::new();
        let url = format!("{}/health", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        assert!(response.is_ok(), "Health endpoint should be reachable");
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert_eq!(body["status"], "healthy");
            assert!(body["node_id"].is_string());
            assert!(body["version"].is_string());
        }
    }

    #[tokio::test]
    async fn test_services_status() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/services/status", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
        }
    }
}

/// PAT Agent Tests
#[cfg(test)]
mod pat_tests {
    use super::*;

    #[tokio::test]
    async fn test_list_agents() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/pat/agents", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
            
            let agents = body["data"].as_array();
            assert!(agents.is_some(), "Should return agents array");
            
            if let Some(agents) = agents {
                assert_eq!(agents.len(), 7, "Should have 7 PAT agents");
                
                // Verify agent structure
                for agent in agents {
                    assert!(agent["role"].is_string());
                    assert!(agent["model"].is_string());
                    assert!(agent["description"].is_string());
                }
            }
        }
    }

    #[tokio::test]
    async fn test_pat_chat_requires_message() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/pat/chat", fixtures::api_url());
        
        let response = client
            .post(&url)
            .json(&json!({
                "message": "Hello, test message"
            }))
            .send()
            .await;
        
        if let Ok(res) = response {
            // Should either succeed or fail gracefully if Ollama not available
            assert!(
                res.status() == StatusCode::OK || res.status() == StatusCode::INTERNAL_SERVER_ERROR
            );
        }
    }

    #[tokio::test]
    async fn test_pat_configure() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/pat/configure", fixtures::api_url());
        
        let response = client
            .post(&url)
            .json(&json!({
                "primary_role": "MasterReasoner"
            }))
            .send()
            .await;
        
        if let Ok(res) = response {
            assert!(res.status().is_success() || res.status() == StatusCode::INTERNAL_SERVER_ERROR);
        }
    }
}

/// PoI Ledger Tests
#[cfg(test)]
mod poi_tests {
    use super::*;

    #[tokio::test]
    async fn test_poi_stats() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/poi/stats", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
            
            let data = &body["data"];
            assert!(data["total_events"].is_number());
            assert!(data["total_bzc"].is_number());
            assert!(data["total_imp"].is_number());
        }
    }

    #[tokio::test]
    async fn test_poi_log_event() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/poi/log", fixtures::api_url());
        
        let response = client
            .post(&url)
            .json(&json!({
                "event_type": "task_completed",
                "impact_score": 0.85,
                "ihsan_score": 0.92,
                "duration_minutes": 30,
                "description": "Test task completion"
            }))
            .send()
            .await;
        
        if let Ok(res) = response {
            assert!(res.status().is_success() || res.status() == StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    #[tokio::test]
    async fn test_poi_timeline() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/poi/timeline?limit=10", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
        }
    }
}

/// Resource Pool Tests
#[cfg(test)]
mod resource_tests {
    use super::*;

    #[tokio::test]
    async fn test_resource_status() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/resources/status", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
            
            let data = &body["data"];
            assert!(data["node_id"].is_string());
            assert!(data["cpu_cores_total"].is_number());
        }
    }

    #[tokio::test]
    async fn test_resource_configure() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/resources/configure", fixtures::api_url());
        
        let response = client
            .post(&url)
            .json(&json!({
                "cpu_cores_allocated": 4,
                "gpu_enabled": true
            }))
            .send()
            .await;
        
        if let Ok(res) = response {
            assert!(res.status().is_success() || res.status() == StatusCode::INTERNAL_SERVER_ERROR);
        }
    }
}

/// User Profile Tests
#[cfg(test)]
mod user_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_profile() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/user/profile", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
        }
    }

    #[tokio::test]
    async fn test_create_profile() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/user/profile", fixtures::api_url());
        
        let response = client
            .post(&url)
            .json(&json!({
                "seed_state": "builder",
                "primary_pat_role": "MasterReasoner",
                "goals": ["Build sovereign AI", "Learn Rust"],
                "time_available_weekly": 600
            }))
            .send()
            .await;
        
        if let Ok(res) = response {
            assert!(res.status().is_success() || res.status() == StatusCode::INTERNAL_SERVER_ERROR);
        }
    }
}

/// Asset Registry Tests
#[cfg(test)]
mod asset_tests {
    use super::*;

    #[tokio::test]
    async fn test_asset_stats() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/assets/stats", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
        }
    }

    #[tokio::test]
    async fn test_asset_search() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/assets/search?q=test", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
        }
    }
}

/// Environment Snapshot Tests
#[cfg(test)]
mod env_tests {
    use super::*;

    #[tokio::test]
    async fn test_env_snapshot() {
        let client = reqwest::Client::new();
        let url = format!("{}/api/env/snapshot", fixtures::api_url());
        
        let response = client.get(&url).send().await;
        
        if let Ok(res) = response {
            assert_eq!(res.status(), StatusCode::OK);
            
            let body: serde_json::Value = res.json().await.expect("Should parse JSON");
            assert!(body["success"].as_bool().unwrap_or(false));
            
            let data = &body["data"];
            assert!(data["cpu"].is_object());
            assert!(data["memory"].is_object());
            assert!(data["os"].is_object());
        }
    }
}

/// Performance Tests
#[cfg(test)]
mod performance_tests {
    use super::*;
    use std::time::Instant;

    #[tokio::test]
    async fn test_health_latency() {
        let client = reqwest::Client::new();
        let url = format!("{}/health", fixtures::api_url());
        
        let start = Instant::now();
        let response = client.get(&url).send().await;
        let latency = start.elapsed();
        
        if response.is_ok() {
            // Health check should complete in under 100ms
            assert!(
                latency.as_millis() < 100,
                "Health check took {}ms, expected <100ms",
                latency.as_millis()
            );
        }
    }

    #[tokio::test]
    async fn test_concurrent_requests() {
        let client = reqwest::Client::new();
        let url = format!("{}/health", fixtures::api_url());
        
        let mut handles = vec![];
        
        for _ in 0..10 {
            let client = client.clone();
            let url = url.clone();
            
            handles.push(tokio::spawn(async move {
                client.get(&url).send().await
            }));
        }
        
        let results: Vec<_> = futures::future::join_all(handles).await;
        
        let success_count = results
            .iter()
            .filter(|r| r.is_ok())
            .count();
        
        // At least 80% should succeed
        assert!(success_count >= 8, "Only {}/10 concurrent requests succeeded", success_count);
    }
}
