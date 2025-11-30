// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - JWT MIDDLEWARE                                      ║
// ║  Authentication middleware for protected routes                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use async_trait::async_trait;
use axum::{
    extract::{FromRequestParts, Request},
    http::{header, request::Parts, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::Serialize;
use std::env;
use std::fmt;

// Re-export the main Claims type from auth module
pub use crate::api::auth::types::Claims;

#[derive(Debug)]
pub struct AuthenticatedUser(pub Claims);

impl Claims {
    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "));

        let token = auth_header.ok_or(AuthError::MissingCredentials)?;

        // Get JWT secret from environment
        let secret = env::var("JWT_SECRET").map_err(|_| AuthError::InvalidToken)?;

        // Create validation configuration
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_required_spec_claims(&["exp", "iat"]);

        // Decode and validate the JWT
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &validation,
        )
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::InvalidToken => AuthError::InvalidToken,
            jsonwebtoken::errors::ErrorKind::InvalidSignature => AuthError::InvalidSignature,
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::ExpiredToken,
            _ => AuthError::InvalidToken,
        })?;

        Ok(AuthenticatedUser(token_data.claims))
    }
}

impl Claims {
    /// Create a new JWT token with the given claims
    pub fn create_token(&self) -> Result<String, AuthError> {
        let secret = env::var("JWT_SECRET").map_err(|_| AuthError::InvalidSignature)?;

        jsonwebtoken::encode(
            &jsonwebtoken::Header::new(Algorithm::HS256),
            self,
            &jsonwebtoken::EncodingKey::from_secret(secret.as_ref()),
        )
        .map_err(|_| AuthError::InvalidToken)
    }
}

#[derive(Debug)]
pub enum AuthError {
    MissingCredentials,
    InvalidToken,
    InvalidSignature,
    ExpiredToken,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingCredentials => (StatusCode::UNAUTHORIZED, "Missing credentials"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            AuthError::InvalidSignature => (StatusCode::UNAUTHORIZED, "Invalid signature"),
            AuthError::ExpiredToken => (StatusCode::UNAUTHORIZED, "Token expired"),
        };

        (status, message).into_response()
    }
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            AuthError::MissingCredentials => "Missing credentials",
            AuthError::InvalidToken => "Invalid token",
            AuthError::InvalidSignature => "Invalid signature",
            AuthError::ExpiredToken => "Token expired",
        };
        write!(f, "{}", message)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/// JWT Authentication middleware response
#[derive(Debug, Serialize)]
pub struct AuthMiddlewareError {
    pub success: bool,
    pub error: String,
    pub code: String,
}

/// JWT Authentication middleware
///
/// This middleware validates JWT tokens from the Authorization header
/// and extracts user roles, making them available to downstream middleware
/// and handlers via request extensions.
///
/// For protected routes, authentication is REQUIRED.
/// Public routes (auth endpoints) allow optional authentication.
pub async fn jwt_auth_middleware(
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let path = req.uri().path();

    // Define public routes that don't require authentication
    let is_public_route = path.starts_with("/auth/register")
        || path.starts_with("/auth/login")
        || path.starts_with("/auth/refresh")
        || path == "/health"
        || path.starts_with("/health/")
        || path == "/metrics"
        || path.starts_with("/telemetry")
        || path.starts_with("/alpha/");

    // Extract Authorization header
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(token) => token,
        None => {
            if is_public_route {
                // No token provided for public route - this is acceptable
                return Ok(next.run(req).await);
            } else {
                // No token provided for protected route - authentication required
                return Err((
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "success": false,
                        "error": "Authentication required",
                        "code": "AUTH_REQUIRED"
                    })),
                ));
            }
        }
    };

    // Get JWT secret from environment
    let secret = match std::env::var("JWT_SECRET") {
        Ok(secret) => secret,
        Err(_) => {
            tracing::error!("JWT_SECRET environment variable not set");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": "Authentication service unavailable",
                    "code": "AUTH_SERVICE_ERROR"
                })),
            ));
        }
    };

    // Create validation configuration
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_required_spec_claims(&["exp", "iat"]);

    // Decode and validate the JWT
    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    ) {
        Ok(data) => data,
        Err(e) => {
            let (status, code, message) = match e.kind() {
                jsonwebtoken::errors::ErrorKind::InvalidToken => (
                    StatusCode::UNAUTHORIZED,
                    "INVALID_TOKEN",
                    "Invalid authentication token",
                ),
                jsonwebtoken::errors::ErrorKind::InvalidSignature => (
                    StatusCode::UNAUTHORIZED,
                    "INVALID_SIGNATURE",
                    "Token signature verification failed",
                ),
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => (
                    StatusCode::UNAUTHORIZED,
                    "TOKEN_EXPIRED",
                    "Authentication token has expired",
                ),
                _ => (
                    StatusCode::UNAUTHORIZED,
                    "TOKEN_ERROR",
                    "Authentication token validation failed",
                ),
            };

            tracing::warn!(
                "JWT validation failed: {} (token: {})",
                e,
                &token[..std::cmp::min(token.len(), 20)] // Log first 20 chars for debugging
            );

            return Err((
                status,
                Json(serde_json::json!({
                    "success": false,
                    "error": message,
                    "code": code
                })),
            ));
        }
    };

    // Extract role from claims
    let role = token_data.claims.role.clone();

    // Store role in request extensions for downstream use
    req.extensions_mut().insert(vec![role]);

    // Also store the full claims for handlers that need user info
    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}
