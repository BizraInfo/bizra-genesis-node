// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RBAC MIDDLEWARE TESTS                               ║
// ║  Role-Based Access Control Security Tests                                  ║
// ║  Compliance: SOC 2 CC6.1, CC6.3 | PCI DSS 6.5.10 | OWASP A01              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
    middleware,
    response::IntoResponse,
    routing::get,
    Router,
};
use bizra_genesis_node::middleware::rbac::{
    rbac_middleware, require_min_role, require_roles, AuthorizationError, Permission, RbacChecker,
    Role,
};
use tower::ServiceExt;

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/// Handler that returns OK for authorized requests
async fn protected_handler() -> impl IntoResponse {
    (StatusCode::OK, "Access granted")
}

/// Create a request with roles in extensions (simulates JWT middleware)
fn create_request_with_roles(path: &str, roles: Vec<String>) -> Request<Body> {
    let mut req = Request::builder()
        .method(Method::GET)
        .uri(path)
        .body(Body::empty())
        .unwrap();
    req.extensions_mut().insert(roles);
    req
}

/// Create a router with RBAC middleware requiring specific roles
fn create_protected_router(required_roles: Vec<Role>) -> Router {
    Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn(move |req, next| {
            let roles = required_roles.clone();
            async move {
                let mw = require_roles(roles);
                mw(req, next).await
            }
        }))
}

/// Create a router with minimum role level middleware
fn create_min_role_router(min_role: Role) -> Router {
    Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn(move |req, next| {
            let role = min_role;
            async move {
                let mw = require_min_role(role);
                mw(req, next).await
            }
        }))
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE HIERARCHY TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod role_hierarchy_tests {
    use super::*;

    #[test]
    fn test_role_priority_hierarchy() {
        // Verify strict priority hierarchy
        assert!(
            Role::SuperAdmin.priority() > Role::Admin.priority(),
            "SuperAdmin must outrank Admin"
        );
        assert!(
            Role::Admin.priority() > Role::Operator.priority(),
            "Admin must outrank Operator"
        );
        assert!(
            Role::Operator.priority() > Role::Service.priority(),
            "Operator must outrank Service"
        );
        assert!(
            Role::Service.priority() > Role::Alpha100.priority(),
            "Service must outrank Alpha100"
        );
        assert!(
            Role::Alpha100.priority() > Role::User.priority(),
            "Alpha100 must outrank User"
        );
        assert!(
            Role::User.priority() > Role::ReadOnly.priority(),
            "User must outrank ReadOnly"
        );
    }

    #[test]
    fn test_min_role_level_enforcement() {
        // SuperAdmin should satisfy all minimum role requirements
        let super_admin = RbacChecker::new([Role::SuperAdmin]);
        assert!(super_admin.has_min_role_level(Role::ReadOnly));
        assert!(super_admin.has_min_role_level(Role::User));
        assert!(super_admin.has_min_role_level(Role::Admin));
        assert!(super_admin.has_min_role_level(Role::SuperAdmin));

        // User should NOT satisfy Admin minimum role
        let user = RbacChecker::new([Role::User]);
        assert!(user.has_min_role_level(Role::User));
        assert!(user.has_min_role_level(Role::ReadOnly));
        assert!(!user.has_min_role_level(Role::Operator));
        assert!(!user.has_min_role_level(Role::Admin));
    }

    #[test]
    fn test_highest_role_selection() {
        // Multiple roles should return highest
        let checker = RbacChecker::new([Role::User, Role::Operator, Role::ReadOnly]);
        assert_eq!(checker.highest_role(), Some(Role::Operator));

        let checker2 = RbacChecker::new([Role::SuperAdmin, Role::Admin]);
        assert_eq!(checker2.highest_role(), Some(Role::SuperAdmin));

        // Empty roles returns None
        let empty = RbacChecker::new([]);
        assert_eq!(empty.highest_role(), None);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIVILEGE ESCALATION PREVENTION TESTS (SOC 2 CC6.1)
// ═══════════════════════════════════════════════════════════════════════════

mod escalation_prevention_tests {
    use super::*;

    #[test]
    fn test_user_cannot_access_admin_permissions() {
        let user = RbacChecker::new([Role::User]);

        // User should NOT have admin-level permissions
        assert!(
            !user.has_permission(Permission::UserWrite),
            "User should not have UserWrite"
        );
        assert!(
            !user.has_permission(Permission::UserDelete),
            "User should not have UserDelete"
        );
        assert!(
            !user.has_permission(Permission::SatApprove),
            "User should not have SatApprove"
        );
        assert!(
            !user.has_permission(Permission::SatPublish),
            "User should not have SatPublish"
        );
        assert!(
            !user.has_permission(Permission::SystemWrite),
            "User should not have SystemWrite"
        );
        assert!(
            !user.has_permission(Permission::SystemAdmin),
            "User should not have SystemAdmin"
        );
    }

    #[test]
    fn test_admin_cannot_access_superadmin_permissions() {
        let admin = RbacChecker::new([Role::Admin]);

        // Admin should NOT have SuperAdmin-only permissions
        assert!(
            !admin.has_permission(Permission::SystemAdmin),
            "Admin should not have SystemAdmin"
        );
        assert!(
            !admin.has_permission(Permission::AlphaManage),
            "Admin should not have AlphaManage"
        );
    }

    #[test]
    fn test_operator_cannot_publish_sat() {
        let operator = RbacChecker::new([Role::Operator]);

        // Operator can read and approve, but NOT publish
        assert!(
            operator.has_permission(Permission::SatRead),
            "Operator should have SatRead"
        );
        assert!(
            operator.has_permission(Permission::SatApprove),
            "Operator should have SatApprove"
        );
        assert!(
            !operator.has_permission(Permission::SatPublish),
            "Operator should NOT have SatPublish"
        );
    }

    #[test]
    fn test_readonly_cannot_modify_anything() {
        let readonly = RbacChecker::new([Role::ReadOnly]);

        // ReadOnly should only have read permissions
        assert!(
            readonly.has_permission(Permission::UserRead),
            "ReadOnly should have UserRead"
        );
        assert!(
            readonly.has_permission(Permission::MetricsRead),
            "ReadOnly should have MetricsRead"
        );
        assert!(
            readonly.has_permission(Permission::SystemRead),
            "ReadOnly should have SystemRead"
        );

        // ReadOnly should NOT have any write permissions
        assert!(!readonly.has_permission(Permission::UserWrite));
        assert!(!readonly.has_permission(Permission::UserDelete));
        assert!(!readonly.has_permission(Permission::SatApprove));
        assert!(!readonly.has_permission(Permission::SatPublish));
        assert!(!readonly.has_permission(Permission::PoiAttest));
        assert!(!readonly.has_permission(Permission::AgentWrite));
        assert!(!readonly.has_permission(Permission::SystemWrite));
    }

    #[test]
    fn test_service_account_restricted_permissions() {
        let service = RbacChecker::new([Role::Service]);

        // Service accounts have specific operational permissions
        assert!(service.has_permission(Permission::AgentRead));
        assert!(service.has_permission(Permission::AgentExecute));

        // Service accounts should NOT have admin permissions
        assert!(!service.has_permission(Permission::UserWrite));
        assert!(!service.has_permission(Permission::UserDelete));
        assert!(!service.has_permission(Permission::SystemAdmin));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERADMIN OMNIPOTENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod superadmin_tests {
    use super::*;

    #[test]
    fn test_superadmin_has_all_permissions() {
        let superadmin = RbacChecker::new([Role::SuperAdmin]);

        // SuperAdmin must have EVERY permission
        let all_permissions = [
            Permission::UserRead,
            Permission::UserWrite,
            Permission::UserDelete,
            Permission::SatRead,
            Permission::SatApprove,
            Permission::SatPublish,
            Permission::PoiRead,
            Permission::PoiAttest,
            Permission::PoiReward,
            Permission::AgentRead,
            Permission::AgentWrite,
            Permission::AgentExecute,
            Permission::SystemRead,
            Permission::SystemWrite,
            Permission::SystemAdmin,
            Permission::AlphaRead,
            Permission::AlphaInvite,
            Permission::AlphaManage,
            Permission::MetricsRead,
            Permission::MetricsExport,
        ];

        for permission in all_permissions {
            assert!(
                superadmin.has_permission(permission),
                "SuperAdmin missing permission: {:?}",
                permission
            );
        }
    }

    #[test]
    fn test_superadmin_exclusive_permissions() {
        // Only SuperAdmin should have these permissions
        let exclusive_permissions = [Permission::SystemAdmin, Permission::AlphaManage];

        let non_superadmin_roles = [
            Role::Admin,
            Role::Operator,
            Role::Alpha100,
            Role::User,
            Role::Service,
            Role::ReadOnly,
        ];

        for permission in exclusive_permissions {
            for role in non_superadmin_roles {
                let checker = RbacChecker::new([role]);
                assert!(
                    !checker.has_permission(permission),
                    "{:?} should not have {:?}",
                    role,
                    permission
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE PARSING SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod role_parsing_tests {
    use super::*;

    #[test]
    fn test_case_insensitive_role_parsing() {
        // All case variations should parse correctly
        assert_eq!(Role::parse("admin"), Some(Role::Admin));
        assert_eq!(Role::parse("ADMIN"), Some(Role::Admin));
        assert_eq!(Role::parse("Admin"), Some(Role::Admin));
        assert_eq!(Role::parse("aDmIn"), Some(Role::Admin));
    }

    #[test]
    fn test_alternative_role_formats() {
        // Super admin variations
        assert_eq!(Role::parse("super_admin"), Some(Role::SuperAdmin));
        assert_eq!(Role::parse("superadmin"), Some(Role::SuperAdmin));

        // Alpha100 variations
        assert_eq!(Role::parse("alpha_100"), Some(Role::Alpha100));
        assert_eq!(Role::parse("alpha100"), Some(Role::Alpha100));
        assert_eq!(Role::parse("alpha-100"), Some(Role::Alpha100));

        // ReadOnly variations
        assert_eq!(Role::parse("read_only"), Some(Role::ReadOnly));
        assert_eq!(Role::parse("readonly"), Some(Role::ReadOnly));
    }

    #[test]
    fn test_invalid_role_rejection() {
        // Invalid roles should return None, not panic or default
        assert_eq!(Role::parse(""), None);
        assert_eq!(Role::parse("invalid"), None);
        assert_eq!(Role::parse("root"), None);
        assert_eq!(Role::parse("administrator"), None);
        assert_eq!(Role::parse("super"), None);
        assert_eq!(Role::parse("god"), None);
        assert_eq!(Role::parse("system"), None);
    }

    #[test]
    fn test_injection_attempt_rejection() {
        // SQL/command injection attempts should be rejected
        assert_eq!(Role::parse("admin; DROP TABLE users"), None);
        assert_eq!(Role::parse("admin' OR '1'='1"), None);
        assert_eq!(Role::parse("admin\n\roperator"), None);
        assert_eq!(Role::parse("admin\0operator"), None);
    }

    #[test]
    fn test_from_strings_filters_invalid() {
        let checker = RbacChecker::from_strings(&[
            "admin".to_string(),
            "invalid_role".to_string(),
            "user".to_string(),
            "".to_string(),
            "hacker".to_string(),
        ]);

        // Only valid roles should be present
        assert!(checker.has_role(Role::Admin));
        assert!(checker.has_role(Role::User));

        // Invalid strings should be filtered out
        assert!(!checker.has_role(Role::SuperAdmin));
        assert!(!checker.has_role(Role::Operator));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANONYMOUS / NO-ROLES TESTS (OWASP A01 Broken Access Control)
// ═══════════════════════════════════════════════════════════════════════════

mod anonymous_access_tests {
    use super::*;

    #[test]
    fn test_no_roles_has_no_permissions() {
        let empty = RbacChecker::new([]);

        // Empty roles should have NO permissions
        assert!(!empty.has_permission(Permission::UserRead));
        assert!(!empty.has_permission(Permission::PoiRead));
        assert!(!empty.has_permission(Permission::MetricsRead));
        assert!(!empty.has_permission(Permission::AlphaRead));
    }

    #[test]
    fn test_no_roles_fails_min_level_check() {
        let empty = RbacChecker::new([]);

        // Should fail even the lowest role level check
        assert!(!empty.has_min_role_level(Role::ReadOnly));
    }

    #[test]
    fn test_no_roles_has_no_role() {
        let empty = RbacChecker::new([]);

        // Should not have any role
        assert!(!empty.has_role(Role::ReadOnly));
        assert!(!empty.has_role(Role::User));
        assert!(!empty.has_role(Role::SuperAdmin));
    }

    #[tokio::test]
    async fn test_middleware_rejects_anonymous() {
        let router = create_protected_router(vec![Role::User]);

        // Request with no roles
        let req = create_request_with_roles("/protected", vec![]);

        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod middleware_tests {
    use super::*;

    #[tokio::test]
    async fn test_require_roles_allows_matching_role() {
        let router = create_protected_router(vec![Role::Admin]);

        let req = create_request_with_roles("/protected", vec!["admin".to_string()]);

        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_roles_denies_insufficient_role() {
        let router = create_protected_router(vec![Role::Admin]);

        let req = create_request_with_roles("/protected", vec!["user".to_string()]);

        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_roles_any_of_multiple() {
        let router = create_protected_router(vec![Role::Admin, Role::Operator]);

        // Operator should pass (one of the allowed roles)
        let req = create_request_with_roles("/protected", vec!["operator".to_string()]);
        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_min_role_allows_higher() {
        let router = create_min_role_router(Role::Operator);

        // Admin (higher than Operator) should pass
        let req = create_request_with_roles("/protected", vec!["admin".to_string()]);
        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_min_role_denies_lower() {
        let router = create_min_role_router(Role::Operator);

        // User (lower than Operator) should be denied
        let req = create_request_with_roles("/protected", vec!["user".to_string()]);
        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-ROLE COMBINATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod multi_role_tests {
    use super::*;

    #[test]
    fn test_has_all_roles_requirement() {
        let checker = RbacChecker::new([Role::Operator, Role::Alpha100]);

        assert!(checker.has_all_roles(&[Role::Operator, Role::Alpha100]));
        assert!(!checker.has_all_roles(&[Role::Operator, Role::Admin]));
    }

    #[test]
    fn test_has_any_role_requirement() {
        let checker = RbacChecker::new([Role::User]);

        assert!(checker.has_any_role(&[Role::User, Role::Admin]));
        assert!(!checker.has_any_role(&[Role::Admin, Role::SuperAdmin]));
    }

    #[test]
    fn test_combined_roles_grant_union_of_permissions() {
        // User + Operator should have permissions from both
        let combined = RbacChecker::new([Role::User, Role::Operator]);

        // User permissions
        assert!(combined.has_permission(Permission::PoiRead));
        assert!(combined.has_permission(Permission::PoiAttest));

        // Operator permissions
        assert!(combined.has_permission(Permission::SatRead));
        assert!(combined.has_permission(Permission::SatApprove));
        assert!(combined.has_permission(Permission::AgentRead));
    }

    #[tokio::test]
    async fn test_middleware_checks_highest_role() {
        let router = create_min_role_router(Role::Operator);

        // User with multiple roles, including one meeting minimum
        let req = create_request_with_roles(
            "/protected",
            vec!["user".to_string(), "operator".to_string()],
        );

        let response = router.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION MATRIX VALIDATION TESTS (PCI DSS 6.5.10)
// ═══════════════════════════════════════════════════════════════════════════

mod permission_matrix_tests {
    use super::*;

    /// Test that each permission has correct role requirements
    #[test]
    fn test_user_management_permission_matrix() {
        // UserRead - User, ReadOnly can read
        let user_required = Permission::UserRead.required_roles();
        assert!(user_required.contains(&Role::User));
        assert!(user_required.contains(&Role::ReadOnly));

        // UserWrite - Admin only
        let write_required = Permission::UserWrite.required_roles();
        assert!(write_required.contains(&Role::Admin));
        assert!(!write_required.contains(&Role::User));

        // UserDelete - SuperAdmin only
        let delete_required = Permission::UserDelete.required_roles();
        assert!(delete_required.contains(&Role::SuperAdmin));
        assert!(!delete_required.contains(&Role::Admin));
    }

    #[test]
    fn test_sat_permission_matrix() {
        // SatRead - Operator, Admin
        let read = Permission::SatRead.required_roles();
        assert!(read.contains(&Role::Operator));
        assert!(read.contains(&Role::Admin));

        // SatApprove - Operator, Admin
        let approve = Permission::SatApprove.required_roles();
        assert!(approve.contains(&Role::Operator));
        assert!(approve.contains(&Role::Admin));

        // SatPublish - Admin only
        let publish = Permission::SatPublish.required_roles();
        assert!(publish.contains(&Role::Admin));
        assert!(!publish.contains(&Role::Operator));
    }

    #[test]
    fn test_poi_permission_matrix() {
        // PoiRead, PoiAttest - User level
        let poi_read = Permission::PoiRead.required_roles();
        let poi_attest = Permission::PoiAttest.required_roles();
        assert!(poi_read.contains(&Role::User));
        assert!(poi_attest.contains(&Role::User));

        // PoiReward - Admin only
        let poi_reward = Permission::PoiReward.required_roles();
        assert!(poi_reward.contains(&Role::Admin));
        assert!(!poi_reward.contains(&Role::User));
    }

    #[test]
    fn test_system_permission_matrix() {
        // SystemRead - Operator, ReadOnly
        let sys_read = Permission::SystemRead.required_roles();
        assert!(sys_read.contains(&Role::Operator));
        assert!(sys_read.contains(&Role::ReadOnly));

        // SystemWrite - Admin
        let sys_write = Permission::SystemWrite.required_roles();
        assert!(sys_write.contains(&Role::Admin));

        // SystemAdmin - SuperAdmin only
        let sys_admin = Permission::SystemAdmin.required_roles();
        assert!(sys_admin.contains(&Role::SuperAdmin));
        assert!(!sys_admin.contains(&Role::Admin));
    }

    #[test]
    fn test_alpha_permission_matrix() {
        // AlphaRead - Alpha100, User
        let alpha_read = Permission::AlphaRead.required_roles();
        assert!(alpha_read.contains(&Role::Alpha100));
        assert!(alpha_read.contains(&Role::User));

        // AlphaInvite - Admin
        let alpha_invite = Permission::AlphaInvite.required_roles();
        assert!(alpha_invite.contains(&Role::Admin));

        // AlphaManage - SuperAdmin only
        let alpha_manage = Permission::AlphaManage.required_roles();
        assert!(alpha_manage.contains(&Role::SuperAdmin));
        assert!(!alpha_manage.contains(&Role::Admin));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod error_response_tests {
    use super::*;

    #[test]
    fn test_authorization_error_serialization() {
        let error = AuthorizationError {
            success: false,
            error: "Insufficient permissions".to_string(),
            code: "FORBIDDEN".to_string(),
            required_roles: vec!["admin".to_string()],
        };

        // Should serialize to JSON correctly
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"FORBIDDEN\""));
        assert!(json.contains("\"required_roles\":[\"admin\"]"));
    }

    #[test]
    fn test_role_display_format() {
        assert_eq!(Role::SuperAdmin.to_string(), "super_admin");
        assert_eq!(Role::Admin.to_string(), "admin");
        assert_eq!(Role::Operator.to_string(), "operator");
        assert_eq!(Role::Alpha100.to_string(), "alpha_100");
        assert_eq!(Role::User.to_string(), "user");
        assert_eq!(Role::Service.to_string(), "service");
        assert_eq!(Role::ReadOnly.to_string(), "read_only");
    }
}
