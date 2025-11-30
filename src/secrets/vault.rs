//! HashiCorp Vault Client Implementation
//!
//! Provides secure integration with HashiCorp Vault for secrets management using direct HTTP calls

use serde::{Deserialize, Serialize};
use crate::secrets::manager::{VaultConfig, SecretError};

#[derive(Debug, Deserialize)]
struct VaultSecretResponse {
    data: VaultSecretData,
}

#[derive(Debug, Deserialize)]
struct VaultSecretData {
    data: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct AppRoleResponse {
    auth: AppRoleAuth,
}

#[derive(Debug, Deserialize)]
struct AppRoleAuth {
    client_token: String,
}

/// Vault Client for secrets management
pub struct VaultClient {
    config: VaultConfig,
    client: reqwest::Client,
    token: Option<String>,
}

impl VaultClient {
    /// Create new Vault client instance
    pub async fn new(config: VaultConfig) -> Result<Self, SecretError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout))
            .build()
            .map_err(|e| SecretError::InitFailed(format!("HTTP client: {}", e)))?;

        // Initialize with token if provided
        let token = if let Some(token) = &config.token {
            Some(token.clone())
        } else if let (Some(role_id), Some(secret_id)) = (&config.role_id, &config.secret_id) {
            Some(Self::authenticate_approle(&config, &client, role_id, secret_id).await?)
        } else {
            None // Lazy authentication
        };

        Ok(VaultClient {
            config,
            client,
            token,
        })
    }

    /// Ensure we have a valid token and return a copy
    async fn ensure_token(&mut self) -> Result<String, SecretError> {
        if let Some(token) = &self.token {
            return Ok(token.clone());
        }

        // Need authentication
        if let (Some(role_id), Some(secret_id)) = (&self.config.role_id, &self.config.secret_id) {
            let token = Self::authenticate_approle(&self.config, &self.client, role_id, secret_id).await?;
            self.token = Some(token.clone());
            Ok(token)
        } else {
            Err(SecretError::InitFailed("No authentication method available".to_string()))
        }
    }

    /// Authenticate using AppRole method
    async fn authenticate_approle(
        config: &VaultConfig,
        client: &reqwest::Client,
        role_id: &str,
        secret_id: &str,
    ) -> Result<String, SecretError> {
        let url = format!("{}/v1/auth/approle/login", config.address);

        #[derive(Serialize)]
        struct AppRoleLogin {
            role_id: String,
            secret_id: String,
        }

        let payload = AppRoleLogin {
            role_id: role_id.to_string(),
            secret_id: secret_id.to_string(),
        };

        let response = client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| SecretError::InitFailed(format!("AppRole auth request: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await
                .unwrap_or_else(|_| "Unable to read error response".to_string());
            return Err(SecretError::InitFailed(format!("AppRole auth failed: {} - {}", status, body)));
        }

        let auth_response: AppRoleResponse = response
            .json()
            .await
            .map_err(|e| SecretError::InitFailed(format!("AppRole response parse: {}", e)))?;

        Ok(auth_response.auth.client_token)
    }

    /// Get a secret by key from Vault KV v2
    pub async fn get_secret(&mut self, key: &str) -> Result<String, SecretError> {
        // Collect config values before mutable borrow
        let address = self.config.address.clone();
        let mount_path = self.config.mount_path.clone();

        let token = self.ensure_token().await?;

        // Validate key format for BIZRA secrets
        let path = if key.starts_with("bizra/") {
            key.to_string()
        } else {
            format!("bizra/{}", key)
        };

        let url = format!("{}/v1/{}/data/{}", address, mount_path, path);

        let response = self.client
            .get(&url)
            .header("X-Vault-Token", token)
            .send()
            .await
            .map_err(|e| SecretError::InitFailed(format!("Vault request: {}", e)))?;

        if !response.status().is_success() {
            if response.status() == reqwest::StatusCode::NOT_FOUND {
                return Err(SecretError::EnvVarNotFound(key.to_string()));
            }
            let status = response.status();
            let body = response.text().await
                .unwrap_or_else(|_| "Unable to read error response".to_string());
            return Err(SecretError::InitFailed(format!("Vault request failed: {} - {}", status, body)));
        }

        let secret_response: VaultSecretResponse = response
            .json()
            .await
            .map_err(|e| SecretError::InitFailed(format!("Secret response parse: {}", e)))?;

        // For simple secrets, get the first string value
        if let Some((_, serde_json::Value::String(val))) = secret_response.data.data.iter().next() {
            return Ok(val.clone());
        }

        Err(SecretError::EnvVarNotFound(format!("Key '{}' not found in vault response", key)))
    }

    /// Store a secret (for testing/development use only)
    pub async fn set_secret(&mut self, key: &str, value: &str) -> Result<(), SecretError> {
        // Collect config values before mutable borrow
        let address = self.config.address.clone();
        let mount_path = self.config.mount_path.clone();

        let token = self.ensure_token().await?;

        let path = if key.starts_with("bizra/") {
            key.to_string()
        } else {
            format!("bizra/{}", key)
        };

        let url = format!("{}/v1/{}/data/{}", address, mount_path, path);

        #[derive(Serialize)]
        struct VaultSetPayload {
            data: std::collections::HashMap<String, String>,
        }

        let mut data = std::collections::HashMap::new();
        data.insert("value".to_string(), value.to_string());

        let payload = VaultSetPayload { data };

        let response = self.client
            .post(&url)
            .header("X-Vault-Token", token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| SecretError::InitFailed(format!("Vault write request: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await
                .unwrap_or_else(|_| "Unable to read error response".to_string());
            return Err(SecretError::InitFailed(format!("Vault write failed: {} - {}", status, body)));
        }

        Ok(())
    }

    /// Check if the client is healthy
    pub async fn health_check(&mut self) -> Result<(), SecretError> {
        let url = format!("{}/v1/sys/health", self.config.address);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| SecretError::InitFailed(format!("Health check request: {}", e)))?;

        if !response.status().is_success() {
            return Err(SecretError::InitFailed("Vault health check failed".to_string()));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_vault_client_creation() {
        let config = VaultConfig {
            address: "http://localhost:8200".to_string(),
            token: Some("test-token".to_string()),
            role_id: None,
            secret_id: None,
            mount_path: "secret".to_string(),
            timeout: 30,
        };

        let client = VaultClient::new(config).await;
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_config_validation_no_auth() {
        let config = VaultConfig {
            address: "http://localhost:8200".to_string(),
            token: None,
            role_id: None,
            secret_id: None,
            mount_path: "secret".to_string(),
            timeout: 30,
        };

        let client = VaultClient::new(config).await;
        assert!(client.is_ok()); // Should succeed but fail on first request
    }
}
