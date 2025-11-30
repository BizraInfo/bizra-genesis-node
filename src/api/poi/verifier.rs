// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PoI SIGNATURE VERIFIER                              ║
// ║  Cryptographic verification for Proof-of-Impact attestations                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use async_trait::async_trait;
use ring::signature::{UnparsedPublicKey, ED25519};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum PoiVerificationError {
    #[error("Contributor not found")]
    ContributorNotFound,

    #[error("Invalid public key format")]
    InvalidPublicKey,

    #[error("Signature verification failed")]
    SignatureVerificationFailed,

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

/// Trait for verifying PoI attestation signatures
///
/// Supports different verification strategies:
/// - Database-backed (current implementation)
/// - Certificate Authority-based
/// - Blockchain-based anchor verification
///
#[async_trait]
pub trait PoiSignatureVerifier: Send + Sync {
    async fn verify(
        &self,
        canonical_payload: &[u8],
        signature_b64: &str,
        contributor_id: &Uuid,
    ) -> Result<(), PoiVerificationError>;
}

// ╔══════════════════════════════════════════════════════════════════════════
// DATABASE-BACKED VERIFIER
// ╔══════════════════════════════════════════════════════════════════════════

/// Database-backed signature verifier
///
/// Looks up contributor's public key in the users table
/// and verifies Ed25519 signature against canonical payload.
///
pub struct DatabasePoiVerifier {
    pub pool: Arc<PgPool>,
}

#[async_trait]
impl PoiSignatureVerifier for DatabasePoiVerifier {
    async fn verify(
        &self,
        canonical_payload: &[u8],
        signature_b64: &str,
        contributor_id: &Uuid,
    ) -> Result<(), PoiVerificationError> {
        // 1. Look up contributor's public key from database
        let contributor = sqlx::query!(
            r#"
            SELECT public_key
            FROM users
            WHERE id = $1
            "#,
            contributor_id
        )
        .fetch_optional(&*self.pool)
        .await?
        .ok_or(PoiVerificationError::ContributorNotFound)?;

        let public_key_b64 = contributor
            .public_key
            .ok_or(PoiVerificationError::InvalidPublicKey)?;

        // 2. Decode base64 signature
        let signature_bytes = base64::decode(signature_b64)
            .map_err(|_| PoiVerificationError::SignatureVerificationFailed)?;

        // 3. Decode base64 public key
        let public_key_bytes = base64::decode(public_key_b64)
            .map_err(|_| PoiVerificationError::InvalidPublicKey)?;

        // 4. Verify Ed25519 signature
        if signature_bytes.len() != 64 {
            return Err(PoiVerificationError::SignatureVerificationFailed);
        }

        if public_key_bytes.len() != 32 {
            return Err(PoiVerificationError::InvalidPublicKey);
        }

        // 5. Perform actual Ed25519 signature verification using ring
        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);

        public_key
            .verify(canonical_payload, &signature_bytes)
            .map_err(|_| PoiVerificationError::SignatureVerificationFailed)?;

        Ok(())
    }
}

// ╔══════════════════════════════════════════════════════════════════════════
// MOCK VERIFIER (FOR TESTING)
// ╔══════════════════════════════════════════════════════════════════════════

/// Mock verifier that accepts all signatures (for testing/development)
pub struct MockPoiVerifier;

#[async_trait]
impl PoiSignatureVerifier for MockPoiVerifier {
    async fn verify(
        &self,
        _canonical_payload: &[u8],
        signature: &str,
        _contributor_id: &Uuid,
    ) -> Result<(), PoiVerificationError> {
        // Accept any non-empty signature for testing
        if signature.len() >= 10 {
            Ok(())
        } else {
            Err(PoiVerificationError::SignatureVerificationFailed)
        }
    }
}

// ╔══════════════════════════════════════════════════════════════════════════
// MIGRATION SCRIPT REFERENCE
// ╔══════════════════════════════════════════════════════════════════════════

/// Add public_key column to users table if not exists
///
/// Run this migration to support PoI signature verification:
///
/// ```sql
/// ALTER TABLE users
/// ADD COLUMN IF NOT EXISTS public_key TEXT;
///
/// -- Create index for fast lookup
/// CREATE INDEX IF NOT EXISTS idx_users_public_key
/// ON users (public_key) WHERE public_key IS NOT NULL;
/// ```
///

// ╔══════════════════════════════════════════════════════════════════════════
// TESTS
// ╔══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use ring::rand::SystemRandom;
    use ring::signature::{Ed25519KeyPair, KeyPair};

    /// Test helper: Creates a valid Ed25519 key pair and returns (private_key, public_key_bytes)
    fn generate_test_keypair() -> (Ed25519KeyPair, Vec<u8>) {
        let rng = SystemRandom::new();
        let pkcs8 = Ed25519KeyPair::generate_pkcs8(&rng).unwrap();
        let key_pair = Ed25519KeyPair::from_pkcs8(pkcs8.as_ref()).unwrap();
        let public_key_bytes = key_pair.public_key().as_ref().to_vec();
        (key_pair, public_key_bytes)
    }

    /// Test helper: Signs data and returns base64-encoded signature
    fn sign_payload(key_pair: &Ed25519KeyPair, payload: &[u8]) -> String {
        let signature = key_pair.sign(payload);
        base64::encode(signature.as_ref())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MOCK VERIFIER TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    #[tokio::test]
    async fn test_mock_verifier_accepts_valid_signature() {
        let verifier = MockPoiVerifier;
        let contributor_id = Uuid::new_v4();
        let payload = b"test payload";
        let valid_signature = "valid_test_signature_string_that_is_long_enough";

        let result = verifier
            .verify(payload, valid_signature, &contributor_id)
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_mock_verifier_rejects_short_signature() {
        let verifier = MockPoiVerifier;
        let contributor_id = Uuid::new_v4();
        let payload = b"test payload";
        let short_signature = "short";

        let result = verifier
            .verify(payload, short_signature, &contributor_id)
            .await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            PoiVerificationError::SignatureVerificationFailed
        ));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ED25519 SIGNATURE VERIFICATION TESTS (Security-Critical)
    // ═══════════════════════════════════════════════════════════════════════════

    /// Tests that a valid Ed25519 signature is correctly verified
    #[test]
    fn test_ed25519_valid_signature_verification() {
        let (key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"test attestation payload";
        let signature = key_pair.sign(payload);

        // Verify using ring directly (same as DatabasePoiVerifier implementation)
        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(payload, signature.as_ref());

        assert!(result.is_ok(), "Valid signature should verify successfully");
    }

    /// Tests that an invalid signature is rejected
    #[test]
    fn test_ed25519_invalid_signature_rejected() {
        let (_key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"test attestation payload";

        // Create a fake signature (64 bytes of zeros)
        let fake_signature = vec![0u8; 64];

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(payload, &fake_signature);

        assert!(result.is_err(), "Invalid signature should be rejected");
    }

    /// Tests that a signature from a different key pair is rejected
    #[test]
    fn test_ed25519_wrong_key_rejected() {
        let (key_pair_a, _public_key_a) = generate_test_keypair();
        let (_key_pair_b, public_key_b) = generate_test_keypair();

        let payload = b"test attestation payload";
        let signature_from_a = key_pair_a.sign(payload);

        // Try to verify signature from A using public key B
        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_b);
        let result = public_key.verify(payload, signature_from_a.as_ref());

        assert!(result.is_err(), "Signature from different key should be rejected");
    }

    /// Tests that a tampered payload fails verification
    #[test]
    fn test_ed25519_tampered_payload_rejected() {
        let (key_pair, public_key_bytes) = generate_test_keypair();
        let original_payload = b"original payload";
        let tampered_payload = b"tampered payload";

        let signature = key_pair.sign(original_payload);

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(tampered_payload, signature.as_ref());

        assert!(result.is_err(), "Tampered payload should fail verification");
    }

    /// Tests that an empty payload can be signed and verified
    #[test]
    fn test_ed25519_empty_payload() {
        let (key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"";
        let signature = key_pair.sign(payload);

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(payload, signature.as_ref());

        assert!(result.is_ok(), "Empty payload should be verifiable");
    }

    /// Tests that a large payload can be signed and verified
    #[test]
    fn test_ed25519_large_payload() {
        let (key_pair, public_key_bytes) = generate_test_keypair();
        let payload = vec![0xAB; 1_000_000]; // 1MB payload
        let signature = key_pair.sign(&payload);

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(&payload, signature.as_ref());

        assert!(result.is_ok(), "Large payload should be verifiable");
    }

    /// Tests that signature length validation works
    #[test]
    fn test_ed25519_signature_length_validation() {
        let (_key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"test payload";

        // Test with wrong-length signatures
        let short_sig = vec![0u8; 63];
        let long_sig = vec![0u8; 65];

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);

        // ring should reject wrong-length signatures
        assert!(public_key.verify(payload, &short_sig).is_err());

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        assert!(public_key.verify(payload, &long_sig).is_err());
    }

    /// Tests that public key length validation works
    #[test]
    fn test_ed25519_public_key_length_validation() {
        let (key_pair, _) = generate_test_keypair();
        let payload = b"test payload";
        let signature = key_pair.sign(payload);

        // Test with wrong-length public keys
        let short_pk = vec![0u8; 31];
        let long_pk = vec![0u8; 33];

        let public_key = UnparsedPublicKey::new(&ED25519, &short_pk);
        assert!(public_key.verify(payload, signature.as_ref()).is_err());

        let public_key = UnparsedPublicKey::new(&ED25519, &long_pk);
        assert!(public_key.verify(payload, signature.as_ref()).is_err());
    }

    /// Tests that base64 encoding/decoding works correctly with signatures
    #[test]
    fn test_base64_signature_roundtrip() {
        let (key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"test attestation payload";

        // Sign and encode to base64
        let signature = key_pair.sign(payload);
        let signature_b64 = base64::encode(signature.as_ref());
        let public_key_b64 = base64::encode(&public_key_bytes);

        // Decode from base64
        let decoded_sig = base64::decode(&signature_b64).unwrap();
        let decoded_pk = base64::decode(&public_key_b64).unwrap();

        // Verify with decoded values
        let public_key = UnparsedPublicKey::new(&ED25519, &decoded_pk);
        let result = public_key.verify(payload, &decoded_sig);

        assert!(result.is_ok(), "Base64 roundtrip should preserve signature validity");
    }

    /// Security test: Verifies that a 44+ char random string is NOT accepted as valid
    /// (This was the previous vulnerability - accepting any string >= 44 chars)
    #[test]
    fn test_arbitrary_string_not_accepted_as_signature() {
        let (_key_pair, public_key_bytes) = generate_test_keypair();
        let payload = b"test payload";

        // This is what the old vulnerable code would have accepted
        let fake_signature_b64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        let fake_signature = base64::decode(fake_signature_b64).unwrap();

        let public_key = UnparsedPublicKey::new(&ED25519, &public_key_bytes);
        let result = public_key.verify(payload, &fake_signature);

        assert!(result.is_err(), "Arbitrary 64-byte string should NOT be accepted as valid signature");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERROR TYPE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_verification_error_display() {
        let error = PoiVerificationError::ContributorNotFound;
        assert_eq!(error.to_string(), "Contributor not found");

        let error = PoiVerificationError::SignatureVerificationFailed;
        assert_eq!(error.to_string(), "Signature verification failed");

        let error = PoiVerificationError::InvalidPublicKey;
        assert_eq!(error.to_string(), "Invalid public key format");

        let error = PoiVerificationError::Internal("Test error".to_string());
        assert_eq!(error.to_string(), "Internal error: Test error");
    }

    // Note: DatabasePoiVerifier integration tests require:
    // - Test database with users table
    // - Pre-populated user records with public keys
    // See tests/poi_integration.rs for full integration tests
}
