//! Core Secret Manager Implementation
//!
//! Provides unified interface for secrets management with multiple backends:
//! - Vault for development and enterprise deployments
//! - KMS for cloud-native Google Cloud deployments

use std::sync::Arc;
use tokio::sync::RwLock;
use crate::secrets::{vault::VaultClient, kms::KmsClient};

#[derive(Debug, thiserror::Error)]
pub enum SecretError {
    #[error("Vault client error: {0}")]
    Vault(String),

    #[error("KMS client error: {0}")]
    Kms(String),

    #[error("Environment variable not found: {0}")]
    EnvVarNotFound(String),

    #[error("Backend not configured")]
    BackendNotConfigured,

    #[error("Secret rotation failed: {0}")]
    RotationFailed(String),

    #[error("Initialization failed: {0}")]
    InitFailed(String),
}

/// Configuration for the Secret Manager
#[derive(Debug, Clone)]
pub struct SecretConfig {
    /// Backend to use for secrets
    pub backend: BackendType,

    /// Vault configuration (if using Vault)
    pub vault: Option<VaultConfig>,

    /// KMS configuration (if using KMS)
    pub kms: Option<KmsConfig>,

    /// Secrets to cache locally (improves performance)
    pub cache_keys: Vec<String>,

    /// Secret renewal interval in seconds
    pub renewal_interval: u64,

    /// Enable fallback to environment variables
    pub env_fallback: bool,
}

#[derive(Debug, Clone)]
pub enum BackendType {
    Vault,
    Kms,
    Hybrid,
}

#[derive(Debug, Clone)]
pub struct VaultConfig {
    pub address: String,
    pub token: Option<String>,
    pub role_id: Option<String>,
    pub secret_id: Option<String>,
    pub mount_path: String,
    pub timeout: u64,
}

#[derive(Debug, Clone)]
pub struct KmsConfig {
    pub project_id: String,
    pub location: String,
    pub key_ring: String,
    pub key_id: String,
    pub service_account_path: Option<String>,
}

/// Core Secret Manager
pub struct SecretManager {
    config: SecretConfig,
    vault_client: Option<Arc<RwLock<VaultClient>>>,
    kms_client: Option<Arc<RwLock<KmsClient>>>,
    cache: Arc<RwLock<std::collections::HashMap<String, String>>>,
    last_refresh: Arc<RwLock<std::time::Instant>>,
}

impl SecretManager {
    /// Create new Secret Manager instance
    pub async fn new(config: SecretConfig) -> Result<Self, SecretError> {
        let mut manager = Self {
            config,
            vault_client: None,
            kms_client: None,
            cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
            last_refresh: Arc::new(RwLock::new(std::time::Instant::now())),
        };

        // Initialize the appropriate backends
        match manager.config.backend {
            BackendType::Vault => {
                if let Some(vault_config) = &manager.config.vault {
                    let client = VaultClient::new(vault_config.clone())
                        .await
                        .map_err(|e| SecretError::InitFailed(format!("Vault client: {}", e)))?;
                    manager.vault_client = Some(Arc::new(RwLock::new(client)));
                } else {
                    return Err(SecretError::InitFailed("Vault config missing".to_string()));
                }
            }
            BackendType::Kms => {
                if let Some(kms_config) = &manager.config.kms {
                    let client = KmsClient::new(kms_config.clone())
                        .await
                        .map_err(|e| SecretError::InitFailed(format!("KMS client: {}", e)))?;
                    manager.kms_client = Some(Arc::new(RwLock::new(client)));
                } else {
                    return Err(SecretError::InitFailed("KMS config missing".to_string()));
                }
            }
            BackendType::Hybrid => {
                // Initialize both backends
                if let Some(vault_config) = &manager.config.vault {
                    let client = VaultClient::new(vault_config.clone())
                        .await
                        .map_err(|e| SecretError::InitFailed(format!("Vault client: {}", e)))?;
                    manager.vault_client = Some(Arc::new(RwLock::new(client)));
                }
                if let Some(kms_config) = &manager.config.kms {
                    let client = KmsClient::new(kms_config.clone())
                        .await
                        .map_err(|e| SecretError::InitFailed(format!("KMS client: {}", e)))?;
                    manager.kms_client = Some(Arc::new(RwLock::new(client)));
                }
                if manager.vault_client.is_none() && manager.kms_client.is_none() {
                    return Err(SecretError::InitFailed("No backends configured for hybrid mode".to_string()));
                }
            }
        }

        // Initial cache population
        manager.refresh_cache().await?;

        Ok(manager)
    }

    /// Get a secret value by key
    pub async fn get(&self, key: &str) -> Result<String, SecretError> {
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(value) = cache.get(key) {
                return Ok(value.clone());
            }
        }

        // Fetch from backend
        let value = self.fetch_from_backend(key).await?;
        Ok(value)
    }

    /// Get database connection URL
    pub async fn get_database_url(&self) -> Result<String, SecretError> {
        self.get("database/url").await
    }

    /// Get Redis connection URL
    pub async fn get_redis_url(&self) -> Result<String, SecretError> {
        self.get("redis/url").await
    }

    /// Get JWT secret key
    pub async fn get_jwt_secret(&self) -> Result<String, SecretError> {
        self.get("auth/jwt_secret").await
    }

    /// Get OpenAI API key
    pub async fn get_openai_key(&self) -> Result<String, SecretError> {
        self.get("api_keys/openai").await
    }

    /// Get Anthropic API key
    pub async fn get_anthropic_key(&self) -> Result<String, SecretError> {
        self.get("api_keys/anthropic").await
    }

    /// Encrypt data using KMS (if available)
    pub async fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, SecretError> {
        match &self.kms_client {
            Some(client) => {
                let mut kms = client.write().await;
                kms.encrypt(data).await
                    .map_err(|e| SecretError::Kms(e.to_string()))
            }
            None => Err(SecretError::BackendNotConfigured),
        }
    }

    /// Decrypt data using KMS (if available)
    pub async fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, SecretError> {
        match &self.kms_client {
            Some(client) => {
                let mut kms = client.write().await;
                kms.decrypt(data).await
                    .map_err(|e| SecretError::Kms(e.to_string()))
            }
            None => Err(SecretError::BackendNotConfigured),
        }
    }

    /// Refresh cached secrets
    pub async fn refresh_cache(&self) -> Result<(), SecretError> {
        let mut cache = self.cache.write().await;

        for key in &self.config.cache_keys {
            if let Ok(value) = self.fetch_from_backend(key).await {
                cache.insert(key.clone(), value);
            }
        }

        // Update last refresh time
        let mut last_refresh = self.last_refresh.write().await;
        *last_refresh = std::time::Instant::now();

        Ok(())
    }

    /// Check if cache needs refresh
    pub async fn needs_refresh(&self) -> bool {
        let last_refresh = self.last_refresh.read().await;
        last_refresh.elapsed().as_secs() > self.config.renewal_interval
    }

    /// Fetch a secret from the appropriate backend
    async fn fetch_from_backend(&self, key: &str) -> Result<String, SecretError> {
        // Try primary backend first
        let result = match self.config.backend {
            BackendType::Vault | BackendType::Hybrid => {
                if let Some(client) = &self.vault_client {
                    let mut vault = client.write().await;
                    vault.get_secret(key).await
                } else {
                    Err(SecretError::BackendNotConfigured)
                }
            }
            BackendType::Kms => {
                // For KMS, we might not store all secrets there
                // Fall back to environment variable
                Err(SecretError::BackendNotConfigured)
            }
        };

        match result {
            Ok(value) => Ok(value),
            Err(_) if self.config.env_fallback => {
                // Fallback to environment variables
                std::env::var(key.replace("/", "_").to_uppercase())
                    .map_err(|_| SecretError::EnvVarNotFound(key.to_string()))
            }
            Err(e) => Err(e),
        }
    }

    /// Create default development configuration
    pub fn development_config() -> SecretConfig {
        SecretConfig {
            backend: BackendType::Vault,
            vault: Some(VaultConfig {
                address: "http://localhost:8200".to_string(),
                token: Some("dev-root-token-bizra".to_string()),
                role_id: None,
                secret_id: None,
                mount_path: "secret".to_string(),
                timeout: 30,
            }),
            kms: None,
            cache_keys: vec![
                "database/url".to_string(),
                "redis/url".to_string(),
                "auth/jwt_secret".to_string(),
            ],
            renewal_interval: 300, // 5 minutes
            env_fallback: true,
        }
    }

    /// Create production Vault configuration
    pub fn production_vault_config() -> SecretConfig {
        SecretConfig {
            backend: BackendType::Vault,
            vault: Some(VaultConfig {
                address: std::env::var("VAULT_ADDR")
                    .unwrap_or_else(|_| "https://vault.bizra.ai".to_string()),
                token: None, // Use AppRole authentication
                role_id: std::env::var("VAULT_ROLE_ID").ok(),
                secret_id: std::env::var("VAULT_SECRET_ID").ok(),
                mount_path: "secret".to_string(),
                timeout: 60,
            }),
            kms: None,
            cache_keys: vec![
                "database/url".to_string(),
                "redis/url".to_string(),
                "auth/jwt_secret".to_string(),
                "api_keys/openai".to_string(),
                "api_keys/anthropic".to_string(),
            ],
            renewal_interval: 600, // 10 minutes
            env_fallback: false,
        }
    }

    /// Create Google Cloud KMS configuration
    pub fn google_kms_config(project_id: &str) -> SecretConfig {
        SecretConfig {
            backend: BackendType::Kms,
            vault: None,
            kms: Some(KmsConfig {
                project_id: project_id.to_string(),
                location: "us-central1".to_string(),
                key_ring: "bizra-secrets".to_string(),
                key_id: "main-key".to_string(),
                service_account_path: Some("/secrets/service-account.json".to_string()),
            }),
            cache_keys: vec![],
            renewal_interval: 3600, // 1 hour
            env_fallback: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_development_config_creation() {
        let config = SecretManager::development_config();
        assert!(matches!(config.backend, BackendType::Vault));
        assert!(config.vault.is_some());
    }

    #[tokio::test]
    async fn test_config_validation() {
        // Test with no backend config
        let config = SecretConfig {
            backend: BackendType::Vault,
            vault: None,
            kms: None,
            cache_keys: vec![],
            renewal_interval: 300,
            env_fallback: false,
        };

        let result = SecretManager::new(config).await;
        assert!(result.is_err());
    }

    // NOTE: Integration tests would require actual Vault/KMS instances
    // and are better suited for separate test files with test-specific setup
}
