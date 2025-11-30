# GDPR Privacy by Design Implementation

> Evidence for: SEC-002

## Overview

BIZRA Genesis Node implements privacy by design principles as required by GDPR Article 25. This document describes the technical and organizational measures in place.

## Privacy by Design Principles

### 1. Proactive Not Reactive

**Implementation:**
- Privacy impact assessments (PIA) required for new features
- Security review gate in CI/CD pipeline
- Threat modeling for data flows

### 2. Privacy as Default Setting

**Implementation:**
- Minimal data collection by default
- Opt-in for enhanced data processing
- Automatic data minimization

```rust
// Default user creation - minimal data
pub struct UserCreateRequest {
    pub email: String,           // Required for account
    pub password_hash: String,   // Required for auth
    // All other fields optional and not collected by default
}

// Extended profile - explicit opt-in required
pub struct ExtendedProfile {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    // Requires explicit consent flag
    pub analytics_consent: bool,
}
```

### 3. Privacy Embedded into Design

**Data Classification:**

| Classification | Examples | Storage | Retention |
|----------------|----------|---------|-----------|
| Public | Username (if shared) | Standard | Indefinite |
| Internal | Email | Encrypted | Account lifetime |
| Confidential | API keys | Encrypted + HSM | Until rotated |
| Restricted | Payment data | Not stored | N/A (external processor) |

**Data Flow Controls:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│   Backend   │
│             │     │  (TLS 1.3)  │     │ (Encrypted) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ Data        │
                    │ Minimization│
                    │ Filter      │
                    └─────────────┘
```

### 4. Full Functionality

Privacy controls do not degrade user experience:

- Users can use the platform without sharing unnecessary data
- Features work with minimal data requirements
- No "privacy tax" on functionality

### 5. End-to-End Security

**Encryption:**

| Layer | Method | Key Management |
|-------|--------|----------------|
| Transit | TLS 1.3 | Let's Encrypt |
| At Rest | AES-256-GCM | AWS KMS |
| Application | Field-level | Vault |
| Backup | AES-256 | Offline keys |

**Implementation:**

```rust
// src/secrets/kms.rs
pub struct EncryptedField<T> {
    ciphertext: Vec<u8>,
    nonce: [u8; 12],
    _marker: PhantomData<T>,
}

impl<T: Serialize + DeserializeOwned> EncryptedField<T> {
    pub fn encrypt(value: &T, key: &Key) -> Result<Self> {
        let plaintext = serde_json::to_vec(value)?;
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(&generate_nonce());
        let ciphertext = cipher.encrypt(nonce, plaintext.as_ref())?;

        Ok(Self {
            ciphertext,
            nonce: *nonce.as_ref(),
            _marker: PhantomData,
        })
    }
}
```

### 6. Visibility and Transparency

**User Dashboard:**
- View all stored personal data
- See processing activities
- Download data in portable format
- Delete account and data

**Privacy Policy:**
- Plain language explanations
- Specific purposes documented
- Third-party sharing disclosed

### 7. Respect for User Privacy

**Consent Management:**

```rust
pub struct ConsentRecord {
    pub user_id: Uuid,
    pub consent_type: ConsentType,
    pub granted: bool,
    pub granted_at: Option<DateTime<Utc>>,
    pub withdrawn_at: Option<DateTime<Utc>>,
    pub ip_address: IpAddr,
    pub user_agent: String,
}

pub enum ConsentType {
    Essential,         // Required for service
    Analytics,         // Usage analytics
    Marketing,         // Marketing communications
    ThirdPartySharing, // Data sharing
}
```

## Data Subject Rights Implementation

### Right to Access (Article 15)

```http
GET /api/privacy/my-data
Authorization: Bearer <token>

Response:
{
  "user_data": { ... },
  "processing_activities": [ ... ],
  "third_party_sharing": [ ... ],
  "export_url": "https://..."
}
```

### Right to Rectification (Article 16)

```http
PATCH /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "new@email.com"
}
```

### Right to Erasure (Article 17)

```http
DELETE /api/privacy/my-data
Authorization: Bearer <token>

Response:
{
  "deletion_scheduled": true,
  "completion_date": "2025-12-27T00:00:00Z",
  "confirmation_id": "DEL-2025-123"
}
```

**Deletion Process:**
1. Verify identity (re-authentication required)
2. Schedule deletion (30-day grace period)
3. Remove from active systems
4. Anonymize in analytics
5. Remove from backups (next rotation)
6. Send confirmation email

### Right to Data Portability (Article 20)

```http
POST /api/privacy/export
Authorization: Bearer <token>

Response:
{
  "export_id": "EXP-2025-456",
  "status": "processing",
  "format": "json",
  "download_url": null,
  "expires_at": "2025-12-04T00:00:00Z"
}
```

Export includes:
- All personal data in structured JSON
- Processing history
- Consent records
- Activity logs

### Right to Object (Article 21)

```http
POST /api/privacy/object
Authorization: Bearer <token>
Content-Type: application/json

{
  "processing_type": "analytics",
  "reason": "No longer want analytics tracking"
}
```

## Data Protection Impact Assessment (DPIA)

Required for:
- New features processing personal data
- Changes to data flows
- New third-party integrations
- Cross-border transfers

Template location: `artifacts/dpia_template.md`

## International Transfers

**Safeguards:**
- Standard Contractual Clauses (SCCs) with cloud providers
- Data residency options (EU-only mode)
- Transfer impact assessments

## Breach Response

**Timeline:**
1. Detection: Automated monitoring
2. Assessment: Within 4 hours
3. Authority notification: Within 72 hours (if required)
4. User notification: Without undue delay (if high risk)

**Response Team:**
- Security Lead (coordinator)
- Legal Counsel
- Communications
- Engineering

## Audit Trail

All privacy-related actions are logged:

```rust
pub struct PrivacyAuditEvent {
    pub event_type: PrivacyEventType,
    pub user_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub details: serde_json::Value,
}

pub enum PrivacyEventType {
    ConsentGranted,
    ConsentWithdrawn,
    DataAccessed,
    DataExported,
    DataDeleted,
    DataRectified,
    BreachDetected,
}
```

## Evidence Artifacts

| Artifact | Location |
|----------|----------|
| Privacy Policy | `https://bizra.ai/privacy` |
| Cookie Policy | `https://bizra.ai/cookies` |
| DPIA Templates | `artifacts/dpia_template.md` |
| Consent Records | Database (encrypted) |
| Processing Register | `artifacts/processing_register.xlsx` |
