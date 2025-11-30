// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MESSAGE ENCRYPTION                                 ║
// ║  AES-256-GCM encryption for WebSocket messages                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use aes_gcm::{
    aead::{rand_core::RngCore, Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};

/// Message encryption handler
pub struct MessageEncryption {
    cipher: Aes256Gcm,
}

impl MessageEncryption {
    /// Create new encryption handler with random key
    pub fn new() -> Self {
        let key = Aes256Gcm::generate_key(&mut OsRng);
        let cipher = Aes256Gcm::new(&key);
        Self { cipher }
    }

    /// Create encryption handler with specific key
    pub fn with_key(key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new(key.into());
        Self { cipher }
    }

    /// Encrypt message
    pub fn encrypt(&self, plaintext: &str) -> Result<String, String> {
        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Combine nonce + ciphertext and encode as base64
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(general_purpose::STANDARD.encode(&result))
    }

    /// Decrypt message
    pub fn decrypt(&self, ciphertext_b64: &str) -> Result<String, String> {
        // Decode base64
        let data = general_purpose::STANDARD
            .decode(ciphertext_b64)
            .map_err(|e| format!("Base64 decode failed: {}", e))?;

        if data.len() < 12 {
            return Err("Invalid ciphertext: too short".to_string());
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode failed: {}", e))
    }
}

impl Default for MessageEncryption {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let encryption = MessageEncryption::new();
        let plaintext = "Hello, BIZRA!";

        let encrypted = encryption.encrypt(plaintext).unwrap();
        let decrypted = encryption.decrypt(&encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encryption_with_key() {
        let key = [0u8; 32]; // Test key
        let encryption = MessageEncryption::with_key(&key);

        let plaintext = "Test message";
        let encrypted = encryption.encrypt(plaintext).unwrap();
        let decrypted = encryption.decrypt(&encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_nonces() {
        let encryption = MessageEncryption::new();
        let plaintext = "Same message";

        let encrypted1 = encryption.encrypt(plaintext).unwrap();
        let encrypted2 = encryption.encrypt(plaintext).unwrap();

        // Different nonces should produce different ciphertexts
        assert_ne!(encrypted1, encrypted2);

        // But both should decrypt correctly
        assert_eq!(encryption.decrypt(&encrypted1).unwrap(), plaintext);
        assert_eq!(encryption.decrypt(&encrypted2).unwrap(), plaintext);
    }

    #[test]
    fn test_invalid_ciphertext() {
        let encryption = MessageEncryption::new();

        // Invalid base64
        let result = encryption.decrypt("not-valid-base64!!!");
        assert!(result.is_err());

        // Too short
        let result = encryption.decrypt(&general_purpose::STANDARD.encode(b"short"));
        assert!(result.is_err());
    }

    #[test]
    fn test_long_message() {
        let encryption = MessageEncryption::new();
        let plaintext = "A".repeat(10000);

        let encrypted = encryption.encrypt(&plaintext).unwrap();
        let decrypted = encryption.decrypt(&encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
