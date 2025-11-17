//! Example: Using the SecretManager for Vault/KMS Integration
//!
//! This example demonstrates how to integrate the enterprise secrets management
//! system into a BIZRA Genesis Node application.

use std::sync::Arc;
use tokio::sync::RwLock;
use bizra_genesis_node::secrets::{
    SecretManager,
    manager::{SecretConfig, SecretError, BackendType}
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔐 BIZRA SecretManager Integration Example");
    println!("==========================================");

    // Example 1: Development Configuration with Vault
    println!("\n📝 Example 1: Development Configuration");
    println!("---------------------------------------");

    let dev_config = SecretManager::development_config();
    println!("✅ Development config created: {:?}", dev_config.backend);

    // Initialize the secret manager
    let secret_manager = Arc::new(RwLock::new(
        SecretManager::new(dev_config).await
            .expect("Failed to initialize SecretManager")
    ));

    // Example 2: Application Startup with Secrets Retrieval
    println!("\n🚀 Example 2: Application Secrets Access");
    println!("----------------------------------------");

    {
        let manager = secret_manager.read().await;

        // Get database URL
        match manager.get_database_url().await {
            Ok(url) => println!("✅ Database URL retrieved: [SECURED]"),
            Err(e) => println!("⚠️  Database URL: {} (fallback to env)", e),
        }

        // Get Redis URL
        match manager.get_redis_url().await {
            Ok(url) => println!("✅ Redis URL retrieved: [SECURED]"),
            Err(e) => println!("⚠️  Redis URL: {} (fallback to env)", e),
        }

        // Get JWT secret
        match manager.get_jwt_secret().await {
            Ok(secret) => println!("✅ JWT Secret retrieved: [SECURED]"),
            Err(e) => println!("⚠️  JWT Secret: {} (fallback to env)", e),
        }

        // Get API keys
        match manager.get_openai_key().await {
            Ok(key) => println!("✅ OpenAI API Key retrieved: [SECURED]"),
            Err(e) => println!("⚠️  OpenAI Key: {} (fallback to env)", e),
        }

        match manager.get_anthropic_key().await {
            Ok(key) => println!("✅ Anthropic API Key retrieved: [SECURED]"),
            Err(e) => println!("⚠️  Anthropic Key: {} (fallback to env)", e),
        }
    }

    // Example 3: Production Configuration with AppRole
    println!("\n🏭 Example 3: Production Configuration");
    println!("-----------------------------------");

    // Set environment variables (normally done via vault-setup.ps1)
    std::env::set_var("VAULT_ROLE_ID", "test-role-id");
    std::env::set_var("VAULT_SECRET_ID", "test-secret-id");

    let prod_config = SecretManager::production_vault_config();
    println!("✅ Production vault config created");
    println!("   - Address: {}", prod_config.vault.as_ref().unwrap().address);
    println!("   - Mount Path: {}", prod_config.vault.as_ref().unwrap().mount_path);
    println!("   - Cache Keys: {} keys configured", prod_config.cache_keys.len());

    // Example 4: Google Cloud KMS Configuration
    println!("\n☁️  Example 4: Google Cloud KMS Configuration");
    println!("-------------------------------------------");

    let kms_config = SecretManager::google_kms_config("my-project-123");
    println!("✅ Google KMS config created:");
    println!("   - Project: {}", kms_config.kms.as_ref().unwrap().project_id);
    println!("   - Location: {}", kms_config.kms.as_ref().unwrap().location);
    println!("   - Key Ring: {}", kms_config.kms.as_ref().unwrap().key_ring);
    println!("   - Key ID: {}", kms_config.kms.as_ref().unwrap().key_id);
    println!("   - Service Account Path: {:?}", kms_config.kms.as_ref().unwrap().service_account_path);

    // Example 5: Hybrid Configuration (Vault + KMS)
    println!("\n🔗 Example 5: Hybrid Configuration");
    println!("-------------------------------");

    let mut hybrid_config = SecretConfig {
        backend: BackendType::Hybrid,
        vault: Some(prod_config.vault.unwrap()),
        kms: Some(kms_config.kms.unwrap()),
        cache_keys: vec![
            "database/url".to_string(),
            "redis/url".to_string(),
            "auth/jwt_secret".to_string(),
        ],
        renewal_interval: 600,
        env_fallback: true,
    };

    println!("✅ Hybrid config created (Vault + KMS)");
    println!("   - Primary Backend: Vault for secrets");
    println!("   - KMS Backend: Ready for encryption");
    println!("   - Environment Fallback: Enabled");
    println!("   - Cache Keys: {} cached", hybrid_config.cache_keys.len());

    println!("\n🎉 SecretManager Integration Examples Complete!");
    println!("=============================================");
    println!("");
    println!("To run with actual Vault backend:");
    println!("1. ./vault-setup.ps1 (start vault with test secrets)");
    println!("2. cargo run --bin api_server (application will use vault automatically)");
    println!("3. Check logs for '✅ SecretManager initialized' message");
    println!("");
    println!("For production deployment:");
    println!("1. Configure Vault/KMS in production environment");
    println!("2. Update configuration in vault-setup.ps1");
    println!("3. Set proper VAULT_ROLE_ID and VAULT_SECRET_ID");
    println!("4. Deploy application with Production configuration");

    Ok(())
}

/// Struct demonstrating how to integrate SecretManager into an application
#[derive(Clone)]
pub struct ApplicationWithSecrets {
    secret_manager: Arc<RwLock<SecretManager>>,
}

impl ApplicationWithSecrets {
    /// Create a new application with secrets management
    pub async fn new(config: SecretConfig) -> Result<Self, SecretError> {
        let secret_manager = Arc::new(RwLock::new(
            SecretManager::new(config).await?
        ));

        Ok(Self { secret_manager })
    }

    /// Initialize application components using secrets
    pub async fn initialize(&self) -> Result<(), SecretError> {
        // Get database connection
        let db_url = {
            let manager = self.secret_manager.read().await;
            manager.get_database_url().await?
        };

        println!("🔌 Connecting to database: [SECURED]");

        // Get Redis connection
        let redis_url = {
            let manager = self.secret_manager.read().await;
            manager.get_redis_url().await?
        };

        println!("🔸 Connecting to Redis: [SECURED]");

        // Get JWT secret for auth
        let jwt_secret = {
            let manager = self.secret_manager.read().await;
            manager.get_jwt_secret().await?
        };

        println!("🔐 JWT secret loaded: [SECURED]");

        Ok(())
    }

    /// Handle API request that needs secret access
    pub async fn handle_api_request(&self) -> Result<(), SecretError> {
        let api_key = {
            let manager = self.secret_manager.read().await;
            manager.get_openai_key().await?
        };

        println!("🤖 Making AI API call with secure key");

        Ok(())
    }

    /// Refresh cached secrets (call periodically)
    pub async fn refresh_secrets(&self) -> Result<(), SecretError> {
        let mut manager = self.secret_manager.write().await;
        manager.refresh_cache().await?;
        println!("🔄 Secrets cache refreshed");
        Ok(())
    }
}
