// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUDIT LOGGING MIDDLEWARE                           ║
// ║  Security audit logging for authentication and authorization events      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::Request,
    http::{Method, StatusCode},
    middleware::Next,
    response::Response,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/// Types of auditable security events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    Authentication,
    Authorization,
    ConfigurationChange,
    SecurityIncident,
    ComplianceViolation,
    AdministrativeAction,
    DataAccess,
    NetworkActivity,
}

/// Audit event severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuditSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Security audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub timestamp: DateTime<Utc>,
    pub event_type: AuditEventType,
    pub user_id: Option<String>,
    pub system_component: String,
    pub action_taken: String,
    pub resource_affected: String,
    pub details: HashMap<String, String>,
    pub severity: AuditSeverity,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
    pub session_id: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/// Audit logging middleware for security-critical operations
///
/// This middleware logs authentication, authorization, and other security
/// events to provide comprehensive audit trails for compliance and security monitoring.
pub async fn audit_middleware(req: Request, next: Next) -> Response {
    let start_time = Utc::now();
    let method = req.method().clone();
    let uri = req.uri().clone();
    let headers = req.headers().clone();

    // Extract request context
    let ip_address = extract_ip_address(&headers);
    let user_agent = extract_user_agent(&headers);
    let request_id = extract_request_id(&headers);
    let user_id = extract_user_id_from_request(&req);

    // Check if this is a security-critical operation
    let is_security_critical = is_security_critical_operation(&method, &uri);

    let response = next.run(req).await;
    let end_time = Utc::now();
    let status = response.status();

    // Log security-critical operations or failed requests
    if is_security_critical || !status.is_success() {
        let event_type = determine_event_type(&method, &uri, status);
        let severity = determine_severity(status, is_security_critical);

        let audit_entry = AuditLogEntry {
            timestamp: start_time,
            event_type,
            user_id: user_id.clone(),
            system_component: "API_GATEWAY".to_string(),
            action_taken: format!("{} {}", method, uri.path()),
            resource_affected: uri.path().to_string(),
            details: create_audit_details(&method, &uri, status, &start_time, &end_time),
            severity,
            ip_address,
            user_agent,
            request_id,
            session_id: extract_session_id(&headers),
        };

        // Log the audit entry
        log_audit_entry(&audit_entry);
    }

    response
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Determine if an operation is security-critical
fn is_security_critical_operation(method: &Method, uri: &axum::http::Uri) -> bool {
    let path = uri.path();

    // Authentication endpoints
    if path.starts_with("/auth/") {
        return true;
    }

    // Administrative operations
    if path.contains("/admin/") || path.contains("/manage") {
        return true;
    }

    // User management
    if method == Method::POST && path.contains("/users") {
        return true;
    }
    if method == Method::PUT && path.contains("/users/") {
        return true;
    }
    if method == Method::DELETE && path.contains("/users/") {
        return true;
    }

    // Sensitive data access
    if path.contains("/sensitive/") || path.contains("/private/") {
        return true;
    }

    // Configuration changes
    if method != Method::GET && (path.contains("/config") || path.contains("/settings")) {
        return true;
    }

    false
}

/// Determine the audit event type based on the request
fn determine_event_type(
    method: &Method,
    uri: &axum::http::Uri,
    status: StatusCode,
) -> AuditEventType {
    let path = uri.path();

    if path.starts_with("/auth/") {
        if status.is_success() {
            AuditEventType::Authentication
        } else {
            AuditEventType::SecurityIncident
        }
    } else if status == StatusCode::FORBIDDEN || status == StatusCode::UNAUTHORIZED {
        AuditEventType::Authorization
    } else if method != Method::GET && (path.contains("/config") || path.contains("/settings")) {
        AuditEventType::ConfigurationChange
    } else if path.contains("/admin/") {
        AuditEventType::AdministrativeAction
    } else if status.is_server_error() {
        AuditEventType::SecurityIncident
    } else {
        AuditEventType::DataAccess
    }
}

/// Determine audit severity based on response status and operation type
fn determine_severity(status: StatusCode, is_security_critical: bool) -> AuditSeverity {
    if status.is_server_error() {
        AuditSeverity::Error
    } else if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        AuditSeverity::Warning
    } else if is_security_critical && status.is_success() {
        AuditSeverity::Info
    } else if status.is_client_error() {
        AuditSeverity::Warning
    } else {
        AuditSeverity::Info
    }
}

/// Create detailed audit information
fn create_audit_details(
    method: &Method,
    uri: &axum::http::Uri,
    status: StatusCode,
    start_time: &DateTime<Utc>,
    end_time: &DateTime<Utc>,
) -> HashMap<String, String> {
    let mut details = HashMap::new();

    details.insert("http_method".to_string(), method.to_string());
    details.insert("request_path".to_string(), uri.path().to_string());
    details.insert(
        "query_string".to_string(),
        uri.query().unwrap_or("").to_string(),
    );
    details.insert("response_status".to_string(), status.as_u16().to_string());
    details.insert("request_start".to_string(), start_time.to_rfc3339());
    details.insert("request_end".to_string(), end_time.to_rfc3339());
    details.insert(
        "duration_ms".to_string(),
        (end_time.timestamp_millis() - start_time.timestamp_millis()).to_string(),
    );

    details
}

/// Extract IP address from request headers
fn extract_ip_address(headers: &axum::http::HeaderMap) -> Option<String> {
    // Try X-Forwarded-For header (from load balancer)
    if let Some(forwarded_for) = headers.get("X-Forwarded-For") {
        if let Ok(forwarded_for_str) = forwarded_for.to_str() {
            if let Some(first_ip) = forwarded_for_str.split(',').next() {
                return Some(first_ip.trim().to_string());
            }
        }
    }

    // Try X-Real-IP header
    if let Some(real_ip) = headers.get("X-Real-IP") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            return Some(real_ip_str.to_string());
        }
    }

    None
}

/// Extract User-Agent from request headers
fn extract_user_agent(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("User-Agent")
        .and_then(|ua| ua.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract request ID from headers
fn extract_request_id(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("X-Request-ID")
        .or_else(|| headers.get("X-Correlation-ID"))
        .and_then(|id| id.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract session ID from headers
fn extract_session_id(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("X-Session-ID")
        .and_then(|id| id.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract user ID from authenticated request
fn extract_user_id_from_request(req: &Request) -> Option<String> {
    // Try to get user ID from JWT claims in extensions
    req.extensions()
        .get::<crate::middleware::jwt::Claims>()
        .map(|claims| claims.sub.clone())
}

/// Log the audit entry using structured logging
fn log_audit_entry(entry: &AuditLogEntry) {
    use tracing::{error, info, warn};

    let log_message = format!(
        "AUDIT: {} | {} | {} | {} | {} | user:{} | ip:{} | req:{}",
        entry.event_type,
        entry.severity,
        entry.action_taken,
        entry.resource_affected,
        entry.system_component,
        entry.user_id.as_deref().unwrap_or("unknown"),
        entry.ip_address.as_deref().unwrap_or("unknown"),
        entry.request_id.as_deref().unwrap_or("unknown")
    );

    // Log based on severity
    match entry.severity {
        AuditSeverity::Critical | AuditSeverity::Error => {
            error!("{}", log_message);
        }
        AuditSeverity::Warning => {
            warn!("{}", log_message);
        }
        AuditSeverity::Info => {
            info!("{}", log_message);
        }
    }

    // Also log structured audit data for compliance systems
    tracing::info!(
        audit_event = ?entry,
        "Security audit event"
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERIALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

impl std::fmt::Display for AuditEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditEventType::Authentication => write!(f, "authentication"),
            AuditEventType::Authorization => write!(f, "authorization"),
            AuditEventType::ConfigurationChange => write!(f, "configuration_change"),
            AuditEventType::SecurityIncident => write!(f, "security_incident"),
            AuditEventType::ComplianceViolation => write!(f, "compliance_violation"),
            AuditEventType::AdministrativeAction => write!(f, "administrative_action"),
            AuditEventType::DataAccess => write!(f, "data_access"),
            AuditEventType::NetworkActivity => write!(f, "network_activity"),
        }
    }
}

impl std::fmt::Display for AuditSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditSeverity::Info => write!(f, "info"),
            AuditSeverity::Warning => write!(f, "warning"),
            AuditSeverity::Error => write!(f, "error"),
            AuditSeverity::Critical => write!(f, "critical"),
        }
    }
}
