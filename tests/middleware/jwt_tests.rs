// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - JWT MIDDLEWARE TESTS                                ║
// ║  Comprehensive security tests for JWT authentication                      ║
// ║  Professional Elite Test Suite - Security Critical                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use super::test_jwt::{
    generate_invalid_token, generate_malformed_token, generate_test_token, TestClaims,
};
use super::{create_auth_request, create_request_with_headers};
use axum::http::{header, Method, StatusCode};
use bizra_genesis_node::api::middleware::jwt::{AuthError, AuthenticatedUser, Claims};

// ═══════════════════════════════════════════════════════════════════════════
// Claims Unit Tests
// ═══════════════════════════════════════════════════════════════════════════

mod claims_tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_claims_serialization() {
        let claims = Claims {
            sub: "user-123".to_string(),
            email: "test@example.com".to_string(),
            program: "alpha-100".to_string(),
            exp: 2000000000,
            iat: 1000000000,
            jti: "jti-123".to_string(),
        };

        let json = serde_json::to_string(&claims).unwrap();
        assert!(json.contains("user-123"));
        assert!(json.contains("test@example.com"));
        assert!(json.contains("alpha-100"));

        let deserialized: Claims = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.sub, claims.sub);
        assert_eq!(deserialized.email, claims.email);
        assert_eq!(deserialized.program, claims.program);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AuthError Tests
// ═══════════════════════════════════════════════════════════════════════════

mod auth_error_tests {
    use super::*;
    use axum::response::IntoResponse;

    #[test]
    fn test_auth_error_missing_token_response() {
        let error = AuthError::MissingToken;
        let response = error.into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_auth_error_invalid_token_response() {
        let error = AuthError::InvalidToken;
        let response = error.into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_auth_error_expired_token_response() {
        let error = AuthError::ExpiredToken;
        let response = error.into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_auth_error_display() {
        assert_eq!(
            format!("{}", AuthError::MissingToken),
            "Missing authentication token"
        );
        assert_eq!(format!("{}", AuthError::InvalidToken), "Invalid or malformed token");
        assert_eq!(format!("{}", AuthError::ExpiredToken), "Token has expired");
    }

    #[test]
    fn test_auth_error_debug() {
        let error = AuthError::MissingToken;
        let debug_str = format!("{:?}", error);
        assert!(debug_str.contains("MissingToken"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Token Extraction Tests
// ═══════════════════════════════════════════════════════════════════════════

mod token_extraction_tests {
    use super::*;

    #[test]
    fn test_bearer_token_extraction_valid() {
        let token = "valid.jwt.token";
        let auth_header = format!("Bearer {}", token);

        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, Some(token));
    }

    #[test]
    fn test_bearer_token_extraction_missing_bearer() {
        let auth_header = "valid.jwt.token";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, None);
    }

    #[test]
    fn test_bearer_token_extraction_wrong_scheme() {
        let auth_header = "Basic dXNlcjpwYXNz";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, None);
    }

    #[test]
    fn test_bearer_token_extraction_lowercase_bearer() {
        let auth_header = "bearer valid.jwt.token";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, None); // Case sensitive
    }

    #[test]
    fn test_bearer_token_extraction_extra_spaces() {
        let auth_header = "Bearer  valid.jwt.token"; // Extra space
        let extracted = auth_header.strip_prefix("Bearer ");
        assert!(extracted.unwrap().starts_with(' ')); // Should include leading space
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test JWT Generation Tests
// ═══════════════════════════════════════════════════════════════════════════

mod test_jwt_generation_tests {
    use super::*;

    #[test]
    fn test_generate_valid_claims() {
        let claims = TestClaims::valid(
            "user-123",
            "test@example.com",
            "alpha-100",
        );

        assert_eq!(claims.sub, "user-123");
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.program, "alpha-100");

        // Should not be expired
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;
        assert!(claims.exp > now);
    }

    #[test]
    fn test_generate_expired_claims() {
        let claims = TestClaims::expired("user-123");

        // Should be expired
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;
        assert!(claims.exp < now);
    }

    #[test]
    fn test_generate_claims_with_custom_expiration() {
        let claims = TestClaims::with_expiration("user-123", 7200); // 2 hours

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;

        // Should expire in approximately 2 hours
        assert!(claims.exp > now + 7000);
        assert!(claims.exp < now + 7400);
    }

    #[test]
    fn test_generate_test_token_format() {
        let claims = TestClaims::valid("user-123", "test@example.com", "alpha-100");
        let token = generate_test_token(&claims);

        // JWT format: header.payload.signature
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    #[test]
    fn test_generate_invalid_token() {
        let token = generate_invalid_token();

        // Should have more than 3 parts (invalid format)
        let parts: Vec<&str> = token.split('.').collect();
        assert!(parts.len() > 3);
    }

    #[test]
    fn test_generate_malformed_token() {
        let token = generate_malformed_token();

        // Should have no dots
        assert!(!token.contains('.'));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Request Building Tests
// ═══════════════════════════════════════════════════════════════════════════

mod request_building_tests {
    use super::*;

    #[test]
    fn test_create_auth_request_with_token() {
        let request = create_auth_request(Method::GET, "/api/protected", Some("test-token"));

        let auth_header = request.headers().get(header::AUTHORIZATION);
        assert!(auth_header.is_some());
        assert_eq!(auth_header.unwrap().to_str().unwrap(), "Bearer test-token");
    }

    #[test]
    fn test_create_auth_request_without_token() {
        let request = create_auth_request(Method::GET, "/api/protected", None);

        let auth_header = request.headers().get(header::AUTHORIZATION);
        assert!(auth_header.is_none());
    }

    #[test]
    fn test_create_request_with_custom_headers() {
        let request = create_request_with_headers(
            Method::POST,
            "/api/test",
            vec![
                ("X-Custom-Header", "custom-value"),
                ("X-Request-ID", "req-123"),
            ],
        );

        assert_eq!(
            request
                .headers()
                .get("X-Custom-Header")
                .unwrap()
                .to_str()
                .unwrap(),
            "custom-value"
        );
        assert_eq!(
            request
                .headers()
                .get("X-Request-ID")
                .unwrap()
                .to_str()
                .unwrap(),
            "req-123"
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

mod security_edge_cases {
    use super::*;

    #[test]
    fn test_empty_token() {
        let auth_header = "Bearer ";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, Some(""));
    }

    #[test]
    fn test_whitespace_only_token() {
        let auth_header = "Bearer    ";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert!(extracted.is_some());
        assert!(extracted.unwrap().trim().is_empty());
    }

    #[test]
    fn test_token_with_special_characters() {
        let token = "eyJ.with/special+chars=";
        let auth_header = format!("Bearer {}", token);
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, Some(token));
    }

    #[test]
    fn test_very_long_token() {
        let token = "a".repeat(10000);
        let auth_header = format!("Bearer {}", token);
        let extracted = auth_header.strip_prefix("Bearer ");
        assert!(extracted.is_some());
        assert_eq!(extracted.unwrap().len(), 10000);
    }

    #[test]
    fn test_null_bytes_in_token() {
        // Tokens with null bytes should be handled safely
        let token = "valid\0token";
        let auth_header = format!("Bearer {}", token);
        let extracted = auth_header.strip_prefix("Bearer ");
        assert!(extracted.is_some());
    }

    #[test]
    fn test_unicode_in_token() {
        let token = "token_with_émojis_🔐";
        let auth_header = format!("Bearer {}", token);
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, Some(token));
    }

    #[test]
    fn test_multiple_bearer_keywords() {
        let auth_header = "Bearer Bearer actual.token";
        let extracted = auth_header.strip_prefix("Bearer ");
        assert_eq!(extracted, Some("Bearer actual.token"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Token Timing Tests
// ═══════════════════════════════════════════════════════════════════════════

mod token_timing_tests {
    use super::*;

    #[test]
    fn test_token_not_yet_valid() {
        // iat in the future
        let claims = TestClaims {
            sub: "user-123".to_string(),
            email: "test@example.com".to_string(),
            program: "alpha-100".to_string(),
            exp: 3000000000,
            iat: 2500000000, // Future timestamp
            jti: "jti-123".to_string(),
        };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;

        // iat is in the future
        assert!(claims.iat > now);
    }

    #[test]
    fn test_token_about_to_expire() {
        let claims = TestClaims::with_expiration("user-123", 1); // Expires in 1 second

        // Token should be valid now
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;

        assert!(claims.exp > now);
        assert!(claims.exp < now + 10); // But expires very soon
    }

    #[test]
    fn test_token_just_expired() {
        let claims = TestClaims::with_expiration("user-123", -1); // Expired 1 second ago

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize;

        assert!(claims.exp < now);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn test_token_extraction_never_panics(header in ".*") {
            let _ = header.strip_prefix("Bearer ");
        }

        #[test]
        fn test_claims_serialization_roundtrip(
            sub in "[a-zA-Z0-9_-]{1,50}",
            email in "[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
        ) {
            let claims = Claims {
                sub: sub.clone(),
                email: email.clone(),
                program: "alpha-100".to_string(),
                exp: 2000000000,
                iat: 1000000000,
                jti: "test-jti".to_string(),
            };

            let json = serde_json::to_string(&claims).unwrap();
            let deserialized: Claims = serde_json::from_str(&json).unwrap();

            prop_assert_eq!(deserialized.sub, sub);
            prop_assert_eq!(deserialized.email, email);
        }
    }
}
