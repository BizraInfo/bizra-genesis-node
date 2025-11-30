//! Key Management Service (KMS) Client Implementation
//!
//! Provides encryption/decryption for data-at-rest protection.
//!
//! This implementation supports two modes:
//! - **Mock Mode** (default): Uses local AES-256-GCM encryption for testing
//! - **GCP Mode**: Would connect to Google Cloud KMS (requires credentials)
//!
//! The mock mode provides real encryption with key rotation support,
//! making it suitable for comprehensive testing without cloud dependencies.

use crate::secrets::manager::{KmsConfig, SecretError};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};

/// Encryption key with version tracking
#[derive(Clone)]
struct VersionedKey {
    key: [u8; 32],
    version: u32,
}

/// KMS Client for encryption/decryption operations
///
/// Provides a unified interface for key management operations.
/// In mock mode, uses AES-256-GCM with local key storage.
/// Supports key rotation and version tracking.
pub struct KmsClient {
    config: KmsConfig,
    /// Current encryption key (mock mode)
    current_key: VersionedKey,
    /// Historical keys for decryption (version -> key)
    key_history: HashMap<u32, [u8; 32]>,
    /// Current key version counter
    key_version: AtomicU32,
    /// Health status
    is_healthy: bool,
}

impl KmsClient {
    /// Create new KMS client instance
    ///
    /// In mock mode, generates a random AES-256 key for encryption.
    /// In production GCP mode, would authenticate with service account.
    pub async fn new(config: KmsConfig) -> Result<Self, SecretError> {
        // Validate configuration
        if config.project_id.trim().is_empty() {
            return Err(SecretError::InitFailed(
                "Project ID cannot be empty".to_string(),
            ));
        }

        // Generate initial encryption key (mock mode)
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);

        let initial_version = 1u32;
        let mut key_history = HashMap::new();
        key_history.insert(initial_version, key);

        tracing::info!(
            project_id = %config.project_id,
            location = %config.location,
            key_ring = %config.key_ring,
            key_id = %config.key_id,
            "KMS client initialized in mock mode with AES-256-GCM"
        );

        Ok(KmsClient {
            config,
            current_key: VersionedKey {
                key,
                version: initial_version,
            },
            key_history,
            key_version: AtomicU32::new(initial_version),
            is_healthy: true,
        })
    }

    /// Encrypt data using AES-256-GCM
    ///
    /// Returns ciphertext with format: [version(4 bytes)][nonce(12 bytes)][ciphertext]
    ///
    /// # Arguments
    /// * `plaintext` - Data to encrypt
    ///
    /// # Returns
    /// * `Ok(Vec<u8>)` - Encrypted data with version and nonce prepended
    /// * `Err(SecretError)` - If encryption fails
    pub async fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, SecretError> {
        if !self.is_healthy {
            return Err(SecretError::Kms("KMS client is unhealthy".to_string()));
        }

        // Create cipher from current key
        let cipher = Aes256Gcm::new_from_slice(&self.current_key.key)
            .map_err(|e| SecretError::Kms(format!("Failed to create cipher: {}", e)))?;

        // Generate random 96-bit nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| SecretError::Kms(format!("Encryption failed: {}", e)))?;

        // Build output: version (4 bytes) + nonce (12 bytes) + ciphertext
        let version_bytes = self.current_key.version.to_be_bytes();
        let mut result = Vec::with_capacity(4 + 12 + ciphertext.len());
        result.extend_from_slice(&version_bytes);
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        tracing::debug!(
            plaintext_len = plaintext.len(),
            ciphertext_len = result.len(),
            key_version = self.current_key.version,
            "Data encrypted successfully"
        );

        Ok(result)
    }

    /// Decrypt data using AES-256-GCM
    ///
    /// Supports decryption with historical keys for key rotation.
    ///
    /// # Arguments
    /// * `ciphertext` - Encrypted data with format: [version(4 bytes)][nonce(12 bytes)][ciphertext]
    ///
    /// # Returns
    /// * `Ok(Vec<u8>)` - Decrypted plaintext
    /// * `Err(SecretError)` - If decryption fails or data is malformed
    pub async fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, SecretError> {
        if !self.is_healthy {
            return Err(SecretError::Kms("KMS client is unhealthy".to_string()));
        }

        // Minimum size: version (4) + nonce (12) + tag (16) = 32 bytes
        if ciphertext.len() < 32 {
            return Err(SecretError::Kms(
                "Ciphertext too short (minimum 32 bytes)".to_string(),
            ));
        }

        // Extract version
        let version_bytes: [u8; 4] = ciphertext[0..4]
            .try_into()
            .map_err(|_| SecretError::Kms("Failed to extract version".to_string()))?;
        let version = u32::from_be_bytes(version_bytes);

        // Extract nonce
        let nonce_bytes: [u8; 12] = ciphertext[4..16]
            .try_into()
            .map_err(|_| SecretError::Kms("Failed to extract nonce".to_string()))?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Extract actual ciphertext
        let encrypted_data = &ciphertext[16..];

        // Get key for this version
        let key = self
            .key_history
            .get(&version)
            .ok_or_else(|| SecretError::Kms(format!("Unknown key version: {}", version)))?;

        // Create cipher and decrypt
        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| SecretError::Kms(format!("Failed to create cipher: {}", e)))?;

        let plaintext = cipher
            .decrypt(nonce, encrypted_data)
            .map_err(|e| SecretError::Kms(format!("Decryption failed: {}", e)))?;

        tracing::debug!(
            ciphertext_len = ciphertext.len(),
            plaintext_len = plaintext.len(),
            key_version = version,
            "Data decrypted successfully"
        );

        Ok(plaintext)
    }

    /// Get the current KMS key version
    pub async fn get_key_version(&self) -> Result<String, SecretError> {
        if !self.is_healthy {
            return Err(SecretError::Kms("KMS client is unhealthy".to_string()));
        }

        let version = self.key_version.load(Ordering::SeqCst);
        Ok(format!("v{}", version))
    }

    /// Rotate to a new encryption key
    ///
    /// Generates a new random key and increments the version.
    /// Old keys are retained for decryption of existing data.
    ///
    /// # Returns
    /// * `Ok(String)` - New key version string (e.g., "v2")
    pub async fn rotate_key(&mut self) -> Result<String, SecretError> {
        if !self.is_healthy {
            return Err(SecretError::Kms("KMS client is unhealthy".to_string()));
        }

        // Generate new key
        let mut new_key = [0u8; 32];
        OsRng.fill_bytes(&mut new_key);

        // Increment version
        let new_version = self.key_version.fetch_add(1, Ordering::SeqCst) + 1;

        // Store new key in history
        self.key_history.insert(new_version, new_key);

        // Update current key
        self.current_key = VersionedKey {
            key: new_key,
            version: new_version,
        };

        tracing::info!(
            new_version = new_version,
            total_versions = self.key_history.len(),
            "KMS key rotated successfully"
        );

        Ok(format!("v{}", new_version))
    }

    /// Health check for KMS connectivity
    ///
    /// In mock mode, always returns Ok unless explicitly set to unhealthy.
    /// In GCP mode, would test connectivity to Cloud KMS.
    pub async fn health_check(&self) -> Result<(), SecretError> {
        if self.is_healthy {
            Ok(())
        } else {
            Err(SecretError::Kms("KMS health check failed".to_string()))
        }
    }

    /// Set health status (for testing failure scenarios)
    pub fn set_healthy(&mut self, healthy: bool) {
        self.is_healthy = healthy;
    }

    /// Get configuration info (safe to log - no secrets)
    pub fn get_config_info(&self) -> String {
        format!(
            "KMS: project={}, location={}, key_ring={}, key_id={}, version=v{}",
            self.config.project_id,
            self.config.location,
            self.config.key_ring,
            self.config.key_id,
            self.key_version.load(Ordering::SeqCst)
        )
    }

    /// Get total number of key versions stored
    pub fn key_version_count(&self) -> usize {
        self.key_history.len()
    }
}

impl std::fmt::Debug for KmsClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "KmsClient {{ {} }}", self.get_config_info())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> KmsConfig {
        KmsConfig {
            project_id: "test-project".to_string(),
            location: "us-central1".to_string(),
            key_ring: "test-ring".to_string(),
            key_id: "test-key".to_string(),
            service_account_path: None,
        }
    }

    #[tokio::test]
    async fn test_kms_config_validation() {
        let config = test_config();
        let client = KmsClient::new(config).await;
        assert!(client.is_ok());

        let client = client.unwrap();
        let info = client.get_config_info();
        assert!(info.contains("test-project"));
        assert!(info.contains("version=v1"));
    }

    #[tokio::test]
    async fn test_kms_invalid_config() {
        let config = KmsConfig {
            project_id: "".to_string(),
            location: "us-central1".to_string(),
            key_ring: "test-ring".to_string(),
            key_id: "test-key".to_string(),
            service_account_path: None,
        };

        let client = KmsClient::new(config).await;
        assert!(client.is_err());
    }

    #[tokio::test]
    async fn test_encrypt_decrypt_roundtrip() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        let plaintext = b"Hello, World! This is a secret message.";
        let ciphertext = client.encrypt(plaintext).await.unwrap();

        // Ciphertext should be different from plaintext
        assert_ne!(&ciphertext[16..], plaintext);

        // Should be able to decrypt
        let decrypted = client.decrypt(&ciphertext).await.unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[tokio::test]
    async fn test_encrypt_decrypt_empty_data() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        let plaintext = b"";
        let ciphertext = client.encrypt(plaintext).await.unwrap();
        let decrypted = client.decrypt(&ciphertext).await.unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[tokio::test]
    async fn test_encrypt_decrypt_large_data() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        // 1MB of data
        let plaintext: Vec<u8> = (0..1_000_000).map(|i| (i % 256) as u8).collect();
        let ciphertext = client.encrypt(&plaintext).await.unwrap();
        let decrypted = client.decrypt(&ciphertext).await.unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[tokio::test]
    async fn test_key_rotation() {
        let config = test_config();
        let mut client = KmsClient::new(config).await.unwrap();

        // Get initial version
        let v1 = client.get_key_version().await.unwrap();
        assert_eq!(v1, "v1");

        // Encrypt with v1
        let plaintext = b"Secret data";
        let ciphertext_v1 = client.encrypt(plaintext).await.unwrap();

        // Rotate key
        let v2 = client.rotate_key().await.unwrap();
        assert_eq!(v2, "v2");

        // Current version should be v2
        let current = client.get_key_version().await.unwrap();
        assert_eq!(current, "v2");

        // Should still be able to decrypt data encrypted with v1
        let decrypted = client.decrypt(&ciphertext_v1).await.unwrap();
        assert_eq!(decrypted, plaintext);

        // New encryptions should use v2
        let ciphertext_v2 = client.encrypt(plaintext).await.unwrap();

        // Extract version from ciphertext (first 4 bytes)
        let version_bytes: [u8; 4] = ciphertext_v2[0..4].try_into().unwrap();
        let version = u32::from_be_bytes(version_bytes);
        assert_eq!(version, 2);
    }

    #[tokio::test]
    async fn test_decrypt_invalid_ciphertext() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        // Too short
        let result = client.decrypt(&[0u8; 10]).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("too short"));

        // Invalid version
        let mut invalid_ciphertext = vec![0u8; 50];
        invalid_ciphertext[0..4].copy_from_slice(&99u32.to_be_bytes()); // Unknown version
        let result = client.decrypt(&invalid_ciphertext).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Unknown key version"));
    }

    #[tokio::test]
    async fn test_decrypt_tampered_ciphertext() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        let plaintext = b"Secret message";
        let mut ciphertext = client.encrypt(plaintext).await.unwrap();

        // Tamper with the ciphertext (after version and nonce)
        if ciphertext.len() > 20 {
            ciphertext[20] ^= 0xFF;
        }

        let result = client.decrypt(&ciphertext).await;
        assert!(result.is_err(), "Tampered ciphertext should fail decryption");
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = test_config();
        let mut client = KmsClient::new(config).await.unwrap();

        // Should be healthy by default
        assert!(client.health_check().await.is_ok());

        // Set unhealthy
        client.set_healthy(false);
        assert!(client.health_check().await.is_err());

        // Operations should fail when unhealthy
        let result = client.encrypt(b"test").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("unhealthy"));
    }

    #[tokio::test]
    async fn test_nonce_uniqueness() {
        let config = test_config();
        let client = KmsClient::new(config).await.unwrap();

        let plaintext = b"Same message";

        // Encrypt the same message multiple times
        let ct1 = client.encrypt(plaintext).await.unwrap();
        let ct2 = client.encrypt(plaintext).await.unwrap();
        let ct3 = client.encrypt(plaintext).await.unwrap();

        // Extract nonces (bytes 4-16)
        let nonce1 = &ct1[4..16];
        let nonce2 = &ct2[4..16];
        let nonce3 = &ct3[4..16];

        // Nonces should be unique
        assert_ne!(nonce1, nonce2, "Nonces should be unique");
        assert_ne!(nonce2, nonce3, "Nonces should be unique");
        assert_ne!(nonce1, nonce3, "Nonces should be unique");
    }

    #[tokio::test]
    async fn test_key_version_count() {
        let config = test_config();
        let mut client = KmsClient::new(config).await.unwrap();

        assert_eq!(client.key_version_count(), 1);

        client.rotate_key().await.unwrap();
        assert_eq!(client.key_version_count(), 2);

        client.rotate_key().await.unwrap();
        assert_eq!(client.key_version_count(), 3);
    }

    #[tokio::test]
    async fn test_multiple_key_rotations_maintain_decryption() {
        let config = test_config();
        let mut client = KmsClient::new(config).await.unwrap();

        let plaintext = b"Original secret";

        // Encrypt with v1
        let ct_v1 = client.encrypt(plaintext).await.unwrap();

        // Rotate and encrypt with v2
        client.rotate_key().await.unwrap();
        let ct_v2 = client.encrypt(plaintext).await.unwrap();

        // Rotate and encrypt with v3
        client.rotate_key().await.unwrap();
        let ct_v3 = client.encrypt(plaintext).await.unwrap();

        // All versions should still decrypt correctly
        assert_eq!(client.decrypt(&ct_v1).await.unwrap(), plaintext);
        assert_eq!(client.decrypt(&ct_v2).await.unwrap(), plaintext);
        assert_eq!(client.decrypt(&ct_v3).await.unwrap(), plaintext);
    }
}
