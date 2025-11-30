# SOX Controls Automation

> Evidence for: SEC-001

## Overview

The BIZRA Genesis Node implements automated controls for Sarbanes-Oxley (SOX) compliance, focusing on IT General Controls (ITGCs) relevant to financial reporting systems.

## Control Categories

### 1. Access Control (AC)

| Control ID | Description | Automation Status |
|------------|-------------|-------------------|
| AC-001 | User provisioning requires approval | Automated via RBAC |
| AC-002 | Quarterly access reviews | Scheduled script |
| AC-003 | Privileged access monitoring | Real-time audit log |
| AC-004 | MFA enforcement | Enforced in middleware |
| AC-005 | Session timeout (30 min) | Configured in JWT |

#### Implementation Details

```rust
// src/middleware/rbac.rs - Role-Based Access Control
pub enum Permission {
    Read,
    Write,
    Admin,
    FinancialReport,  // SOX-specific
    AuditView,        // SOX-specific
}

// Privileged actions require additional verification
#[derive(Debug)]
pub struct PrivilegedAction {
    pub action: String,
    pub user_id: Uuid,
    pub justification: String,
    pub approver_id: Option<Uuid>,
    pub timestamp: DateTime<Utc>,
}
```

### 2. Change Management (CM)

| Control ID | Description | Automation Status |
|------------|-------------|-------------------|
| CM-001 | All changes via approved PRs | GitHub branch protection |
| CM-002 | Separation of duties | Required reviewers |
| CM-003 | Change approval workflow | GitHub CODEOWNERS |
| CM-004 | Rollback capability | Automated in pipeline |
| CM-005 | Change audit trail | Git history + deploy logs |

#### Enforcement

```yaml
# .github/branch-protection.yml
protection_rules:
  main:
    required_reviews: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    required_status_checks:
      - "quality-gate"
      - "security-scan"
      - "unit-tests"
    restrict_pushes:
      - "release-team"
```

### 3. Data Integrity (DI)

| Control ID | Description | Automation Status |
|------------|-------------|-------------------|
| DI-001 | Input validation | Compile-time SQL checks |
| DI-002 | Transaction logging | Immutable audit log |
| DI-003 | Backup verification | Automated restore tests |
| DI-004 | Data encryption at rest | AES-256-GCM |
| DI-005 | Data encryption in transit | TLS 1.3 enforced |

#### Cryptographic Implementation

```rust
// src/trust.rs - Cryptographic Trust Bridge
pub struct TrustReceipt {
    pub id: Uuid,
    pub payload_hash: [u8; 32],  // BLAKE3
    pub signature: Signature,     // Ed25519
    pub timestamp: DateTime<Utc>,
    pub signer_id: PublicKey,
}

// All financial data changes produce signed receipts
impl TrustBridge {
    pub fn sign_financial_record(&self, record: &FinancialRecord) -> TrustReceipt {
        let payload = bincode::serialize(record).unwrap();
        let hash = blake3::hash(&payload);
        let signature = self.signing_key.sign(&hash.as_bytes());

        TrustReceipt {
            id: Uuid::new_v4(),
            payload_hash: *hash.as_bytes(),
            signature,
            timestamp: Utc::now(),
            signer_id: self.signing_key.verifying_key(),
        }
    }
}
```

### 4. Operations Security (OS)

| Control ID | Description | Automation Status |
|------------|-------------|-------------------|
| OS-001 | Incident detection | Prometheus alerts |
| OS-002 | Incident response | Automated runbooks |
| OS-003 | Vulnerability scanning | Weekly Trivy scans |
| OS-004 | Patch management | Dependabot + review |
| OS-005 | Log retention (7 years) | S3 lifecycle policy |

### 5. Audit Trail (AT)

| Control ID | Description | Automation Status |
|------------|-------------|-------------------|
| AT-001 | All actions logged | Tracing middleware |
| AT-002 | Logs tamper-evident | Append-only + checksums |
| AT-003 | Log access restricted | IAM policies |
| AT-004 | Log search capability | Grafana Loki |
| AT-005 | Audit report generation | Scheduled exports |

#### Audit Log Structure

```rust
// src/security/audit/mod.rs
#[derive(Serialize)]
pub struct AuditEvent {
    pub event_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub event_type: AuditEventType,
    pub actor: AuditActor,
    pub resource: String,
    pub action: String,
    pub outcome: AuditOutcome,
    pub ip_address: IpAddr,
    pub user_agent: String,
    pub request_id: String,
    pub details: serde_json::Value,
    pub checksum: String,  // For tamper detection
}

pub enum AuditEventType {
    Authentication,
    Authorization,
    DataAccess,
    DataModification,
    ConfigurationChange,
    PrivilegedAction,
    SecurityEvent,
}
```

## Automated Compliance Checks

### Daily Checks

```bash
#!/bin/bash
# sox_daily_check.sh

# Check 1: No direct database modifications
echo "Checking for direct DB access..."
grep -r "raw SQL" src/ && exit 1

# Check 2: All secrets in vault
echo "Checking for hardcoded secrets..."
gitleaks detect --source . --verbose

# Check 3: MFA enabled for all admins
echo "Checking MFA status..."
curl -s $API_URL/admin/mfa-status | jq '.all_enabled'
```

### Quarterly Reviews

1. **Access Review**
   - Export all user permissions
   - Manager certification via approval workflow
   - Automatic deprovisioning of uncertified access

2. **Change Review**
   - Sample 10% of production changes
   - Verify approval chain
   - Document exceptions

3. **Security Assessment**
   - Vulnerability scan results
   - Penetration test findings
   - Remediation status

## Evidence Artifacts

| Artifact | Location | Retention |
|----------|----------|-----------|
| Audit logs | S3 + Loki | 7 years |
| Change records | GitHub | Permanent |
| Access reviews | `artifacts/audit_evidence/` | 7 years |
| Security scans | `artifacts/audit_evidence/` | 3 years |
| Approval records | GitHub PRs | Permanent |

## Auditor Access

External auditors can access:

1. **Read-only dashboard:** `https://audit.bizra.ai`
2. **Log search:** Grafana with auditor role
3. **Export API:** `/api/audit/export` (authenticated)

## Exceptions Process

All control exceptions require:

1. Risk assessment document
2. Compensating control description
3. Approval from:
   - Control owner
   - Security team
   - CFO (for financial controls)
4. Documented expiration date
5. Quarterly review for renewal
