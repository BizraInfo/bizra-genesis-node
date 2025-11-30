// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - JWT CLAIMS                                        ║
// ║  Minimal JWT claims structure for authentication                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims structure for authentication
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: Uuid,
    /// Expiration timestamp
    pub exp: i64,
    /// Email address
    pub email: String,
    /// Program membership
    pub program: String,
    /// User role
    pub role: String,
    /// Token version for revocation
    pub token_version: i32,
    /// Issued at time
    pub iat: i64,
    /// JWT ID
    pub jti: String,
    /// Optional roles for authorization
    #[serde(default)]
    pub roles: Vec<String>,
    /// Optional issuer
    pub iss: Option<String>,
    /// Optional audience
    pub aud: Option<String>,
}

impl Claims {
    /// Create new claims for a user
    pub fn new(sub: Uuid, exp: i64) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        Self {
            sub,
            exp,
            email: String::new(),
            program: String::new(),
            role: String::new(),
            token_version: 1,
            iat: now,
            jti: uuid::Uuid::new_v4().to_string(),
            roles: vec![],
            iss: None,
            aud: None,
        }
    }

    /// Check if claims are expired
    pub fn is_expired(&self) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.exp <= now
    }

    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.contains(&role.to_string())
    }

    /// Check if user is admin
    pub fn is_admin(&self) -> bool {
        self.has_role("admin") || self.has_role("super_admin")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_claims_creation() {
        let user_id = Uuid::new_v4();
        let exp = 1732387200; // Some future timestamp

        let claims = Claims::new(user_id, exp);

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.exp, exp);
        assert!(!claims.is_admin());
        assert!(!claims.has_role("user"));
    }

    #[test]
    fn test_claims_roles() {
        let user_id = Uuid::new_v4();
        let mut claims = Claims::new(user_id, 1732387200);
        claims.roles = vec!["admin".to_string(), "user".to_string()];

        assert!(claims.is_admin());
        assert!(claims.has_role("user"));
        assert!(!claims.has_role("moderator"));
    }
}
