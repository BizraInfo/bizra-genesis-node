# BIZRA Evidence Schema Documentation

## Overview

This document defines the schema for evidence artifacts in the BIZRA DevOps Evidence Dossier. Consistent schema ensures artifacts are verifiable, auditable, and machine-readable.

## Evidence Categories

### 1. Policy Documents

**Purpose:** Define standards, procedures, and governance

**Schema:**
```yaml
type: policy
metadata:
  id: string          # Unique identifier (e.g., "POL-SEC-001")
  title: string       # Human-readable title
  version: string     # Semantic version
  author: string      # Document author
  owner: string       # Responsible party
  created: date       # ISO 8601 date
  updated: date       # Last modification date
  review_date: date   # Next scheduled review
  status: enum        # draft | active | deprecated | archived

content:
  purpose: string     # Why this policy exists
  scope: string       # What it covers
  policy: string      # The actual policy content
  exceptions: string  # How to request exceptions
  enforcement: string # How it's enforced

approval:
  approver: string
  date: date
  signature: string   # Digital signature (optional)

revision_history:
  - version: string
    date: date
    author: string
    changes: string
```

### 2. Configuration Files

**Purpose:** Define system configuration with audit trail

**Schema:**
```yaml
type: configuration
metadata:
  id: string
  system: string      # System this configures
  environment: enum   # production | staging | development
  created: date
  updated: date

config:
  # Actual configuration content
  # Schema varies by config type

validation:
  schema_version: string
  validated: boolean
  validation_date: date
```

### 3. Metric Records

**Purpose:** Time-series data for SLO tracking

**Schema (CSV):**
```csv
timestamp,metric_name,value,unit,environment,tags
2025-11-27T10:00:00Z,p95_latency,245,ms,production,"service=api"
```

**Schema (JSON):**
```json
{
  "type": "metric_record",
  "metadata": {
    "id": "MET-2025-11-27-001",
    "collection_date": "2025-11-27",
    "source": "prometheus"
  },
  "metrics": [
    {
      "name": "string",
      "value": "number",
      "unit": "string",
      "timestamp": "ISO8601",
      "labels": {}
    }
  ]
}
```

### 4. Audit Reports

**Purpose:** Document verification activities

**Schema:**
```yaml
type: audit_report
metadata:
  id: string          # AUD-YYYY-MM-DD-XXX
  audit_date: date
  auditor: string
  scope: string

findings:
  - id: string
    category: string
    severity: enum    # critical | high | medium | low | info
    description: string
    evidence: string  # Reference to evidence
    status: enum      # open | remediated | accepted
    remediation: string

summary:
  total_findings: number
  by_severity:
    critical: number
    high: number
    medium: number
    low: number
    info: number
  verification_rate: number
```

### 5. Test Results

**Purpose:** Document test execution outcomes

**Schema:**
```json
{
  "type": "test_results",
  "metadata": {
    "id": "TEST-2025-11-27-001",
    "test_type": "chaos | integration | performance | security",
    "execution_date": "ISO8601",
    "executor": "string",
    "environment": "string"
  },
  "results": {
    "total": "number",
    "passed": "number",
    "failed": "number",
    "skipped": "number",
    "duration_ms": "number"
  },
  "test_cases": [
    {
      "name": "string",
      "status": "passed | failed | skipped",
      "duration_ms": "number",
      "error": "string | null"
    }
  ],
  "artifacts": [
    {
      "name": "string",
      "path": "string",
      "type": "log | screenshot | report"
    }
  ]
}
```

### 6. Decision Records

**Purpose:** Document significant decisions

**Schema:**
```yaml
type: decision_record
metadata:
  id: string          # DEC-YYYY-XXX
  title: string
  date: date
  decision_maker: string
  status: enum        # proposed | accepted | rejected | superseded

context:
  background: string
  constraints: string[]
  drivers: string[]

decision:
  statement: string
  rationale: string
  consequences: string[]

alternatives:
  - option: string
    pros: string[]
    cons: string[]
    why_rejected: string

related:
  - type: string      # RFC | incident | ticket
    id: string
```

## File Naming Conventions

### General Pattern
```
[TYPE]-[CATEGORY]-[DATE]-[SEQUENCE].[EXT]
```

### Examples
```
POL-SEC-001.md                    # Security policy
CFG-SLO-production.yaml           # Production SLO config
MET-availability-2025-11.csv      # November availability metrics
AUD-quarterly-2025-Q4.md          # Q4 audit report
TEST-chaos-2025-11-27-001.json    # Chaos test results
DEC-architecture-2025-042.md      # Architecture decision #42
```

## Directory Structure

```
bizra-devops-evidence/
├── 01-pipelines/
│   ├── workflows/        # Pipeline definitions (CFG-*)
│   ├── docs/            # Pipeline documentation (DOC-*)
│   └── artifacts/       # Run logs, metrics (MET-*, LOG-*)
│
├── 02-sre-and-slos/
│   ├── *.yaml           # SLO configs (CFG-SLO-*)
│   ├── *.md             # Policies (POL-*)
│   └── artifacts/       # Reports (RPT-*)
│
├── 03-security-and-compliance/
│   ├── *.md             # Security policies (POL-SEC-*)
│   └── artifacts/       # Audit evidence (AUD-*)
│
├── 04-resilience-and-chaos/
│   ├── *.yaml           # Chaos configs (CFG-CHAOS-*)
│   ├── *.md             # Runbooks (DOC-*)
│   └── artifacts/       # Test results (TEST-*)
│
├── 05-ai-risk-engine/
│   ├── *.ts             # Implementation
│   ├── *.md             # Specs (SPEC-*)
│   └── artifacts/       # Decision logs (DEC-*)
│
├── 06-governance-and-process/
│   ├── *.md             # Policies (POL-*)
│   └── artifacts/       # RFCs, change records
│
└── 99-meta/
    ├── evidence_schema.md   # This document
    └── audits/              # Meta-level audits (AUD-META-*)
```

## Validation

### Schema Validation

All evidence artifacts can be validated against their schema:

```bash
# Validate a single file
python verification-scripts/validate_schema.py path/to/file.yaml

# Validate all artifacts
python verification-scripts/validate_schema.py --all
```

### Required Fields

Every artifact MUST have:
- Unique identifier
- Creation date
- Last updated date
- Author/owner

### Integrity

For critical artifacts:
- SHA-256 hash stored in manifest
- Digital signatures where required
- Version control (git) provides audit trail

## Retention

| Category | Retention Period | Archive Method |
|----------|------------------|----------------|
| Policies | Until superseded + 7 years | Git archive |
| Configs | Version history indefinite | Git history |
| Metrics | 2 years rolling | S3 Glacier |
| Audit Reports | 7 years | S3 Glacier |
| Test Results | 1 year | S3 Standard |
| Decisions | Indefinite | Git archive |

## Access Control

| Role | Read | Write | Delete |
|------|------|-------|--------|
| Engineering | All | Own artifacts | None |
| Security | All | Security artifacts | None |
| Compliance | All | Audit artifacts | None |
| Admin | All | All | Archive only |
| Auditor (external) | Read-only subset | None | None |

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-27 | Initial schema definition |
