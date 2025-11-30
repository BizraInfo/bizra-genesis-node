// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RBAC MIDDLEWARE                                   ║
// ║  Role-based access control for API authorization                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

// ═══════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/// System roles for BIZRA Genesis Node
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    /// Super administrator - full system access
    SuperAdmin,
    /// Administrator - most management operations
    Admin,
    /// Operator - operational tasks (SAT approval, monitoring)
    Operator,
    /// Alpha-100 program member - early access features
    Alpha100,
    /// Standard authenticated user
    User,
    /// Service account for internal systems
    Service,
    /// Read-only access for monitoring/auditing
    ReadOnly,
}

impl Role {
    /// Parse role from string representation
    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "super_admin" | "superadmin" => Some(Role::SuperAdmin),
            "admin" => Some(Role::Admin),
            "operator" => Some(Role::Operator),
            "alpha_100" | "alpha100" | "alpha-100" => Some(Role::Alpha100),
            "user" => Some(Role::User),
            "service" => Some(Role::Service),
            "read_only" | "readonly" => Some(Role::ReadOnly),
            _ => None,
        }
    }

    /// Get role priority (higher = more privileges)
    pub fn priority(&self) -> u8 {
        match self {
            Role::SuperAdmin => 100,
            Role::Admin => 90,
            Role::Operator => 70,
            Role::Service => 60,
            Role::Alpha100 => 50,
            Role::User => 30,
            Role::ReadOnly => 10,
        }
    }
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::SuperAdmin => write!(f, "super_admin"),
            Role::Admin => write!(f, "admin"),
            Role::Operator => write!(f, "operator"),
            Role::Alpha100 => write!(f, "alpha_100"),
            Role::User => write!(f, "user"),
            Role::Service => write!(f, "service"),
            Role::ReadOnly => write!(f, "read_only"),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Permissions for specific operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Permission {
    // User management
    UserRead,
    UserWrite,
    UserDelete,

    // SAT operations
    SatRead,
    SatApprove,
    SatPublish,

    // POI operations
    PoiRead,
    PoiAttest,
    PoiReward,

    // Agent operations
    AgentRead,
    AgentWrite,
    AgentExecute,

    // System operations
    SystemRead,
    SystemWrite,
    SystemAdmin,

    // Alpha program
    AlphaRead,
    AlphaInvite,
    AlphaManage,

    // Metrics & monitoring
    MetricsRead,
    MetricsExport,
}

impl Permission {
    /// Get required roles for this permission
    pub fn required_roles(&self) -> Vec<Role> {
        match self {
            // User management
            Permission::UserRead => vec![Role::User, Role::ReadOnly],
            Permission::UserWrite => vec![Role::Admin],
            Permission::UserDelete => vec![Role::SuperAdmin],

            // SAT operations
            Permission::SatRead => vec![Role::Operator, Role::Admin],
            Permission::SatApprove => vec![Role::Operator, Role::Admin],
            Permission::SatPublish => vec![Role::Admin],

            // POI operations
            Permission::PoiRead => vec![Role::User],
            Permission::PoiAttest => vec![Role::User],
            Permission::PoiReward => vec![Role::Admin],

            // Agent operations
            Permission::AgentRead => vec![Role::Operator, Role::Service],
            Permission::AgentWrite => vec![Role::Admin],
            Permission::AgentExecute => vec![Role::Service, Role::Admin],

            // System operations
            Permission::SystemRead => vec![Role::Operator, Role::ReadOnly],
            Permission::SystemWrite => vec![Role::Admin],
            Permission::SystemAdmin => vec![Role::SuperAdmin],

            // Alpha program
            Permission::AlphaRead => vec![Role::Alpha100, Role::User],
            Permission::AlphaInvite => vec![Role::Admin],
            Permission::AlphaManage => vec![Role::SuperAdmin],

            // Metrics
            Permission::MetricsRead => vec![Role::ReadOnly, Role::Operator],
            Permission::MetricsExport => vec![Role::Admin],
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RBAC CHECKER
// ═══════════════════════════════════════════════════════════════════════════

/// Role-based access control checker
#[derive(Debug, Clone)]
pub struct RbacChecker {
    /// User's roles
    roles: HashSet<Role>,
}

impl RbacChecker {
    /// Create new RBAC checker with given roles
    pub fn new(roles: impl IntoIterator<Item = Role>) -> Self {
        Self {
            roles: roles.into_iter().collect(),
        }
    }

    /// Create from role strings (e.g., from JWT claims)
    pub fn from_strings(role_strings: &[String]) -> Self {
        let roles = role_strings.iter().filter_map(|s| Role::parse(s)).collect();
        Self { roles }
    }

    /// Check if user has a specific role
    pub fn has_role(&self, role: Role) -> bool {
        self.roles.contains(&role)
    }

    /// Check if user has any of the specified roles
    pub fn has_any_role(&self, roles: &[Role]) -> bool {
        roles.iter().any(|r| self.roles.contains(r))
    }

    /// Check if user has all of the specified roles
    pub fn has_all_roles(&self, roles: &[Role]) -> bool {
        roles.iter().all(|r| self.roles.contains(r))
    }

    /// Check if user has permission (based on role requirements)
    pub fn has_permission(&self, permission: Permission) -> bool {
        let required = permission.required_roles();

        // SuperAdmin has all permissions
        if self.has_role(Role::SuperAdmin) {
            return true;
        }

        // Admin has most permissions (except SuperAdmin-only)
        if self.has_role(Role::Admin) {
            return !matches!(
                permission,
                Permission::SystemAdmin | Permission::AlphaManage
            );
        }

        // Check if user has any of the required roles
        self.has_any_role(&required)
    }

    /// Check minimum role level
    pub fn has_min_role_level(&self, min_role: Role) -> bool {
        let min_priority = min_role.priority();
        self.roles.iter().any(|r| r.priority() >= min_priority)
    }

    /// Get highest priority role
    pub fn highest_role(&self) -> Option<Role> {
        self.roles.iter().max_by_key(|r| r.priority()).copied()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// Error response for authorization failures
#[derive(Debug, Serialize)]
pub struct AuthorizationError {
    pub success: bool,
    pub error: String,
    pub code: String,
    pub required_roles: Vec<String>,
}

impl IntoResponse for AuthorizationError {
    fn into_response(self) -> Response {
        (StatusCode::FORBIDDEN, Json(self)).into_response()
    }
}

/// RBAC middleware that checks for required roles
///
/// This is a generic middleware that passes through requests.
/// For specific role requirements, use `require_role` or `require_permission`.
pub async fn rbac_middleware(req: Request, next: Next) -> Response {
    // Extract user roles from request extensions (set by JWT middleware)
    let roles = req
        .extensions()
        .get::<Vec<String>>()
        .cloned()
        .unwrap_or_default();

    // Create RBAC checker and store in extensions for handlers to use
    let checker = RbacChecker::from_strings(&roles);

    // Store checker in request extensions for downstream use
    let mut req = req;
    req.extensions_mut().insert(checker);

    next.run(req).await
}

/// Create a middleware that requires specific roles
pub fn require_roles(
    required_roles: Vec<Role>,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send {
    move |req: Request, next: Next| {
        let roles = required_roles.clone();
        Box::pin(async move {
            // Extract user roles from JWT claims in extensions
            let user_roles = req
                .extensions()
                .get::<Vec<String>>()
                .cloned()
                .unwrap_or_default();

            let checker = RbacChecker::from_strings(&user_roles);

            // Check if user has any of the required roles
            if !checker.has_any_role(&roles) {
                tracing::warn!(
                    "Authorization denied: user roles {:?} missing required {:?}",
                    user_roles,
                    roles
                );

                return AuthorizationError {
                    success: false,
                    error: "Insufficient permissions".to_string(),
                    code: "FORBIDDEN".to_string(),
                    required_roles: roles.iter().map(|r| r.to_string()).collect(),
                }
                .into_response();
            }

            next.run(req).await
        })
    }
}

/// Create a middleware that requires a minimum role level
pub fn require_min_role(
    min_role: Role,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send {
    move |req: Request, next: Next| {
        let role = min_role;
        Box::pin(async move {
            let user_roles = req
                .extensions()
                .get::<Vec<String>>()
                .cloned()
                .unwrap_or_default();

            let checker = RbacChecker::from_strings(&user_roles);

            if !checker.has_min_role_level(role) {
                tracing::warn!(
                    "Authorization denied: insufficient role level (required: {}, user: {:?})",
                    role,
                    user_roles
                );

                return AuthorizationError {
                    success: false,
                    error: format!("Minimum role '{}' required", role),
                    code: "INSUFFICIENT_ROLE".to_string(),
                    required_roles: vec![role.to_string()],
                }
                .into_response();
            }

            next.run(req).await
        })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_parsing() {
        assert_eq!(Role::parse("admin"), Some(Role::Admin));
        assert_eq!(Role::parse("ADMIN"), Some(Role::Admin));
        assert_eq!(Role::parse("super_admin"), Some(Role::SuperAdmin));
        assert_eq!(Role::parse("alpha-100"), Some(Role::Alpha100));
        assert_eq!(Role::parse("unknown"), None);
    }

    #[test]
    fn test_role_priority() {
        assert!(Role::SuperAdmin.priority() > Role::Admin.priority());
        assert!(Role::Admin.priority() > Role::Operator.priority());
        assert!(Role::Operator.priority() > Role::User.priority());
        assert!(Role::User.priority() > Role::ReadOnly.priority());
    }

    #[test]
    fn test_rbac_checker_has_role() {
        let checker = RbacChecker::new([Role::Admin, Role::Operator]);

        assert!(checker.has_role(Role::Admin));
        assert!(checker.has_role(Role::Operator));
        assert!(!checker.has_role(Role::SuperAdmin));
        assert!(!checker.has_role(Role::User));
    }

    #[test]
    fn test_rbac_checker_has_any_role() {
        let checker = RbacChecker::new([Role::Operator]);

        assert!(checker.has_any_role(&[Role::Operator, Role::Admin]));
        assert!(!checker.has_any_role(&[Role::Admin, Role::SuperAdmin]));
    }

    #[test]
    fn test_rbac_checker_from_strings() {
        let checker = RbacChecker::from_strings(&[
            "admin".to_string(),
            "operator".to_string(),
            "invalid".to_string(),
        ]);

        assert!(checker.has_role(Role::Admin));
        assert!(checker.has_role(Role::Operator));
        assert!(!checker.has_role(Role::User));
    }

    #[test]
    fn test_super_admin_has_all_permissions() {
        let checker = RbacChecker::new([Role::SuperAdmin]);

        assert!(checker.has_permission(Permission::UserRead));
        assert!(checker.has_permission(Permission::UserDelete));
        assert!(checker.has_permission(Permission::SystemAdmin));
        assert!(checker.has_permission(Permission::AlphaManage));
    }

    #[test]
    fn test_admin_permissions() {
        let checker = RbacChecker::new([Role::Admin]);

        assert!(checker.has_permission(Permission::UserRead));
        assert!(checker.has_permission(Permission::UserWrite));
        assert!(checker.has_permission(Permission::SatPublish));

        // Admin doesn't have SuperAdmin-only permissions
        assert!(!checker.has_permission(Permission::SystemAdmin));
        assert!(!checker.has_permission(Permission::AlphaManage));
    }

    #[test]
    fn test_user_permissions() {
        let checker = RbacChecker::new([Role::User]);

        assert!(checker.has_permission(Permission::UserRead));
        assert!(checker.has_permission(Permission::PoiRead));
        assert!(checker.has_permission(Permission::PoiAttest));

        // User doesn't have admin permissions
        assert!(!checker.has_permission(Permission::UserWrite));
        assert!(!checker.has_permission(Permission::SatApprove));
    }

    #[test]
    fn test_min_role_level() {
        let admin_checker = RbacChecker::new([Role::Admin]);
        let user_checker = RbacChecker::new([Role::User]);

        assert!(admin_checker.has_min_role_level(Role::User));
        assert!(admin_checker.has_min_role_level(Role::Operator));
        assert!(admin_checker.has_min_role_level(Role::Admin));
        assert!(!admin_checker.has_min_role_level(Role::SuperAdmin));

        assert!(user_checker.has_min_role_level(Role::User));
        assert!(!user_checker.has_min_role_level(Role::Operator));
    }

    #[test]
    fn test_highest_role() {
        let checker = RbacChecker::new([Role::User, Role::Operator, Role::Admin]);
        assert_eq!(checker.highest_role(), Some(Role::Admin));

        let empty_checker = RbacChecker::new([]);
        assert_eq!(empty_checker.highest_role(), None);
    }
}
