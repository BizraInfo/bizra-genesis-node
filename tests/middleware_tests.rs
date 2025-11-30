// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MIDDLEWARE TEST ENTRY POINT                         ║
// ║  Integration test runner for all middleware tests                          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

mod middleware;

// Re-export all middleware test modules so they run as integration tests
pub use middleware::jwt_tests;
pub use middleware::rate_limit_tests;
pub use middleware::rbac_tests;
// Note: security_tests temporarily excluded due to html_escape dependency issue
// pub use middleware::security_tests;
