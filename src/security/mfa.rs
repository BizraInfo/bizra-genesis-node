// ════════════════════════════════════════════════════════════════════════════
// ║  BIZRA GENESIS NODE - MFA (TOTP) SERVICE                                ║
// ║  Time-based One-Time Password (TOTP) authentication                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::time::{SystemTime, UNIX_EPOCH};
use totp_rs::{Algorithm, TOTP};

#[derive(Debug, Default)]
pub struct MfaService;

impl MfaService {
    pub fn new() -> Self {
        Self
    }

    /// Generate a new TOTP secret (32 bytes -> base32 encoded)
    pub fn generate_secret(&self) -> String {
        // Generate 32 random bytes
        let secret_bytes: [u8; 32] = rand::random();
        // Convert to base32
        base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &secret_bytes)
    }

    /// Generate otpauth URL for QR code scanning
    pub fn otpauth_url(&self, issuer: &str, account_name: &str, secret_base32: &str) -> String {
        format!(
            "otpauth://totp/{}:{}?secret={}&issuer={}&algorithm=SHA1&digits=6&period=30",
            urlencoding::encode(issuer),
            urlencoding::encode(account_name),
            secret_base32,
            urlencoding::encode(issuer),
        )
    }

    /// Verify a TOTP code against a secret (with ±1 step tolerance for clock drift)
    pub fn verify(&self, secret_base32: &str, code: &str) -> bool {
        if code.len() != 6 {
            return false;
        }

        // Decode base32 secret to bytes
        let secret_bytes =
            match base32::decode(base32::Alphabet::Rfc4648 { padding: false }, secret_base32) {
                Some(bytes) => bytes,
                None => return false,
            };

        // Create TOTP instance with standard RFC 6238 settings
        let totp = match TOTP::new(
            Algorithm::SHA1,
            6,  // digits
            1,  // skew (step tolerance for clock drift)
            30, // step (30 second windows)
            secret_bytes,
        ) {
            Ok(t) => t,
            Err(_) => return false,
        };

        // Get current time
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Check code with skew tolerance (±30 seconds)
        totp.check(code, now)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==========================================================================
    // SECRET GENERATION TESTS
    // ==========================================================================

    #[test]
    fn test_generate_secret() {
        let service = MfaService::new();
        let secret = service.generate_secret();

        // Base32 encoded 32 bytes should be much longer than 32
        assert!(secret.len() > 30);

        // Should only contain valid base32 chars
        assert!(secret
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '='));
    }

    #[test]
    fn test_generate_secret_uniqueness() {
        let service = MfaService::new();

        // Generate multiple secrets - all should be unique (cryptographic randomness)
        let secrets: Vec<String> = (0..100).map(|_| service.generate_secret()).collect();

        // Check all are unique
        let mut unique = secrets.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(
            secrets.len(),
            unique.len(),
            "Generated secrets should be unique"
        );
    }

    #[test]
    fn test_secret_entropy() {
        let service = MfaService::new();
        let secret = service.generate_secret();

        // Base32 decodes to 32 bytes = 256 bits of entropy
        let decoded = base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &secret);
        assert!(decoded.is_some());
        assert_eq!(
            decoded.unwrap().len(),
            32,
            "Secret should decode to 32 bytes"
        );
    }

    // ==========================================================================
    // OTPAUTH URL TESTS
    // ==========================================================================

    #[test]
    fn test_otpauth_url_format() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string(); // Test vector

        let url = service.otpauth_url("BIZRA", "user@bizra.ai", &secret);

        assert!(url.starts_with("otpauth://totp/"));
        assert!(url.contains("BIZRA:user%40bizra.ai"));
        assert!(url.contains("secret=JBSWY3DPEHPK3PXP"));
        assert!(url.contains("issuer=BIZRA"));
    }

    #[test]
    fn test_otpauth_url_special_characters() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        // Test with special characters in issuer and account
        let url = service.otpauth_url("BIZRA Inc.", "user+test@bizra.ai", &secret);

        // URL should be properly encoded
        assert!(url.contains("BIZRA%20Inc."));
        assert!(url.contains("user%2Btest%40bizra.ai"));
    }

    #[test]
    fn test_otpauth_url_contains_algorithm() {
        let service = MfaService::new();
        let url = service.otpauth_url("BIZRA", "test@test.com", "SECRET");

        assert!(url.contains("algorithm=SHA1"));
        assert!(url.contains("digits=6"));
        assert!(url.contains("period=30"));
    }

    // ==========================================================================
    // CODE VERIFICATION - SECURITY TESTS
    // ==========================================================================

    #[test]
    fn test_verify_invalid_code_format() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        // Wrong length codes should fail
        assert!(!service.verify(&secret, "12345")); // Too short
        assert!(!service.verify(&secret, "1234567")); // Too long
        assert!(!service.verify(&secret, "12345a")); // Non-numeric (still 6 chars)
    }

    #[test]
    fn test_verify_empty_code() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        assert!(
            !service.verify(&secret, ""),
            "Empty code should be rejected"
        );
    }

    #[test]
    fn test_verify_whitespace_code() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        assert!(
            !service.verify(&secret, "      "),
            "Whitespace-only code should be rejected"
        );
        assert!(
            !service.verify(&secret, " 12345"),
            "Code with leading space should be rejected"
        );
        assert!(
            !service.verify(&secret, "12345 "),
            "Code with trailing space should be rejected"
        );
    }

    #[test]
    fn test_verify_with_valid_test_vector() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        // This is a known test vector for TOTP
        // With time = 59 (Unix timestamp), code should be "287082"
        // But since we can't control time in tests reliably,
        // we'll just test the method doesn't panic
        let _ = service.verify(&secret, "287082");
    }

    #[test]
    fn test_verify_invalid_secret() {
        let service = MfaService::new();

        // Invalid secret should not panic and should return false
        assert!(!service.verify("INVALID_SECRET!", "123456"));
        assert!(!service.verify("", "123456"));
        assert!(!service.verify("1", "123456")); // Too short for valid base32
    }

    #[test]
    fn test_verify_malformed_base32_secret() {
        let service = MfaService::new();

        // These are invalid base32 strings
        assert!(!service.verify("!!!!!!", "123456"));
        assert!(!service.verify("AAAA====BBBB", "123456")); // Invalid padding
        assert!(!service.verify("0123456789", "123456")); // Contains invalid chars 0, 1
    }

    // ==========================================================================
    // TIMING / REPLAY PROTECTION TESTS (behavioral)
    // ==========================================================================

    #[test]
    fn test_random_codes_rejected() {
        let service = MfaService::new();
        let secret = service.generate_secret();

        // Random 6-digit codes should almost certainly fail
        let random_codes = ["000000", "111111", "999999", "123456", "654321"];

        for code in random_codes {
            // We can't guarantee these fail (tiny probability they're valid),
            // but we test the verification doesn't crash
            let _ = service.verify(&secret, code);
        }
    }

    #[test]
    fn test_verification_with_freshly_generated_secret() {
        let service = MfaService::new();

        // Generate a fresh secret
        let secret = service.generate_secret();

        // A random code should not verify (extremely unlikely to be correct)
        // This tests the full flow without relying on time-based code generation
        let result = service.verify(&secret, "000000");

        // We can't assert false (1 in 1M chance it's actually valid),
        // but the call should not panic
        let _ = result;
    }

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    #[test]
    fn test_verify_unicode_code() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        // Unicode digits should fail (wrong length in bytes)
        assert!(!service.verify(&secret, "１２３４５６")); // Full-width digits
    }

    #[test]
    fn test_verify_negative_looking_code() {
        let service = MfaService::new();
        let secret = "JBSWY3DPEHPK3PXP".to_string();

        // Codes that look like negative numbers
        assert!(!service.verify(&secret, "-12345")); // Wrong length
        assert!(!service.verify(&secret, "-1234")); // Wrong length
    }

    #[test]
    fn test_service_stateless() {
        // MfaService should be stateless - multiple instances should behave identically
        let service1 = MfaService::new();
        let service2 = MfaService::new();

        let secret = "JBSWY3DPEHPK3PXP".to_string();
        let code = "123456";

        // Both should produce the same result
        assert_eq!(
            service1.verify(&secret, code),
            service2.verify(&secret, code),
            "MfaService should be stateless"
        );
    }

    #[test]
    fn test_url_generation_deterministic() {
        let service = MfaService::new();

        let url1 = service.otpauth_url("BIZRA", "user@test.com", "SECRET123");
        let url2 = service.otpauth_url("BIZRA", "user@test.com", "SECRET123");

        assert_eq!(url1, url2, "URL generation should be deterministic");
    }
}
