# HIPAA Security Controls

> Evidence for: SEC-003

## Overview

While BIZRA Genesis Node does not currently process Protected Health Information (PHI) as its primary function, the infrastructure is designed to support HIPAA-compliant workloads if needed. This document describes the security controls in place.

## Status: Framework Ready

**Current State:** Controls implemented, not yet certified
**Certification Path:** Will pursue BAA capability when healthcare customers require

## Administrative Safeguards (§164.308)

### Security Management Process

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Risk Analysis | Annual security assessment | Implemented |
| Risk Management | Remediation tracking | Implemented |
| Sanction Policy | Employee handbook | Documented |
| Information System Activity Review | Audit log monitoring | Implemented |

### Workforce Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Authorization/Supervision | RBAC system | Implemented |
| Workforce Clearance | Background checks | Process defined |
| Termination Procedures | Automated deprovisioning | Implemented |

### Information Access Management

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Access Authorization | Approval workflow | Implemented |
| Access Establishment | Automated provisioning | Implemented |
| Access Modification | Change request process | Implemented |

### Security Awareness Training

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Security Reminders | Quarterly communications | Planned |
| Malware Protection | Endpoint protection | N/A (cloud native) |
| Login Monitoring | Failed login alerts | Implemented |
| Password Management | Policy enforcement | Implemented |

### Security Incident Procedures

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Response and Reporting | Incident runbook | Implemented |
| Documentation | Incident database | Implemented |

### Contingency Plan

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Data Backup Plan | Automated backups | Implemented |
| Disaster Recovery | Multi-region capability | Implemented |
| Emergency Mode | Failover procedures | Documented |
| Testing | Quarterly DR tests | Scheduled |

## Physical Safeguards (§164.310)

### Facility Access Controls

**Note:** BIZRA uses cloud infrastructure (AWS/GCP) which maintains SOC 2 Type II and HIPAA compliance for physical facilities.

| Requirement | Implementation |
|-------------|----------------|
| Facility Security Plan | Cloud provider responsibility |
| Access Control/Validation | Cloud provider + IAM |
| Maintenance Records | Cloud provider |

### Workstation and Device Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Workstation Use | Remote work policy | Documented |
| Workstation Security | MDM requirements | Planned |
| Device Media Controls | Encryption required | Enforced |

## Technical Safeguards (§164.312)

### Access Control

```rust
// Implementation in src/middleware/rbac.rs
pub struct HIPAAAccessControl {
    pub user_id: Uuid,
    pub role: HIPAARole,
    pub phi_access_level: PHIAccessLevel,
    pub break_glass_enabled: bool,
}

pub enum PHIAccessLevel {
    None,           // No PHI access
    ReadOnly,       // View only
    ReadWrite,      // Full access
    Emergency,      // Break-glass access
}

// All PHI access logged
pub fn check_phi_access(user: &User, resource: &Resource) -> Result<bool> {
    let decision = evaluate_access(user, resource);

    audit_log::record(AuditEvent {
        event_type: AuditEventType::PHIAccessAttempt,
        user_id: user.id,
        resource_id: resource.id,
        decision: decision.clone(),
        timestamp: Utc::now(),
    });

    decision
}
```

### Audit Controls

| Control | Implementation |
|---------|----------------|
| Audit Log Generation | All access logged |
| Audit Log Protection | Immutable storage |
| Audit Log Retention | 6 years minimum |
| Audit Review | Weekly automated |

### Integrity Controls

```rust
// Integrity verification for PHI
pub struct PHIRecord {
    pub id: Uuid,
    pub data: EncryptedField<serde_json::Value>,
    pub integrity_hash: [u8; 32],  // BLAKE3
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub modified_by: Uuid,
}

impl PHIRecord {
    pub fn verify_integrity(&self) -> bool {
        let computed = blake3::hash(&self.data.ciphertext);
        constant_time_eq(&computed.as_bytes(), &self.integrity_hash)
    }
}
```

### Transmission Security

| Layer | Protection |
|-------|------------|
| External | TLS 1.3 (required) |
| Internal | mTLS between services |
| Database | TLS + encrypted storage |
| Backups | AES-256 encryption |

### Authentication

| Method | Implementation |
|--------|----------------|
| Password | Argon2id hashing |
| MFA | TOTP/WebAuthn required for PHI access |
| Session | JWT with 30-min expiry |
| Emergency | Break-glass with audit |

## Encryption Specifications

### At Rest

```yaml
encryption:
  algorithm: AES-256-GCM
  key_management: AWS KMS
  key_rotation: 90 days
  phi_fields:
    - patient_name
    - ssn
    - medical_record_number
    - diagnosis_codes
    - treatment_data
```

### In Transit

```yaml
tls:
  version: "1.3"
  ciphers:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
  certificate_authority: "Let's Encrypt"
  hsts: true
  hsts_max_age: 31536000
```

## Break-Glass Access

For emergency PHI access when normal channels are unavailable:

1. **Activation:** Requires documented emergency
2. **Authentication:** MFA + manager approval code
3. **Duration:** Maximum 4 hours
4. **Logging:** All actions recorded in detail
5. **Review:** Mandatory post-access audit

```rust
pub struct BreakGlassSession {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub activated_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub reason: String,
    pub approver_code: String,
    pub actions: Vec<BreakGlassAction>,
}
```

## Business Associate Agreement (BAA) Readiness

When entering BAA with covered entities:

**Required Elements:**
- [ ] Permitted uses and disclosures defined
- [ ] Safeguards documentation provided
- [ ] Breach notification procedures agreed
- [ ] Subcontractor requirements flowed down
- [ ] Termination procedures documented

## Gap Analysis

| Requirement | Status | Gap | Remediation |
|-------------|--------|-----|-------------|
| Risk Analysis | Complete | None | - |
| Workforce Training | Partial | Need formal program | Q1 2026 |
| Business Associate Management | Ready | No active BAAs | As needed |
| Audit Log Review | Automated | Need manual review process | Q1 2026 |
| Contingency Testing | Scheduled | Need first test | Q1 2026 |

## Evidence Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| Security Policies | Internal wiki | Complete |
| Risk Assessment | `artifacts/risk_assessment.pdf` | Annual |
| Training Records | HR system | Pending |
| Audit Logs | Grafana Loki | Active |
| Incident Reports | Incident database | As needed |
