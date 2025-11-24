# BIZRA Genesis Node — Secrets & Configuration Security Policy

## 1. What Counts as a Secret

The following are considered **secrets** and MUST NOT appear in the repository:

- API keys (OpenAI, Anthropic, cloud providers, payment gateways, etc.)
- Database credentials (usernames, passwords, DSNs, connection strings)
- JWT secrets, signing keys, encryption keys, HMAC keys
- OAuth client IDs/secrets, SSO credentials
- Private keys, seed phrases, mnemonics, wallet recovery phrases
- Long-lived session tokens, refresh tokens
- Any token or string that grants access to production systems, data, or funds

## 2. Allowed Locations for Secrets

Secrets MAY ONLY appear in:

- Local developer `.env.local`, `.env.development.local`, etc.
- Secrets managers / vault systems (e.g., HashiCorp Vault, cloud key stores)
- CI/CD secret stores (GitHub Actions secrets, etc.)

Secrets MUST NOT appear in:

- Tracked source files (`src/**`, `backend/**`, `frontend/**`, etc.)
- Versioned configuration files committed to git
- Example configs without explicit placeholders

## 3. Patterns & Examples

**Allowed (example with placeholders):**
- `OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"`
- `DATABASE_URL="postgres://user:password@localhost:5432/dbname"` in `.env.example`, but with dummy values.

**Forbidden:**
- Real API keys (e.g., `sk-...`, `ghp_...`, `AKIA...`)
- Real mnemonics or private keys
- Real production URLs/credentials

## 4. Enforcement Mechanisms

1. **Automated Scanning**
   - `gitleaks` is used to scan the codebase for secrets patterns.
   - Scans run:
     - Locally via a pre-commit hook (recommended).
     - In CI on every push and pull request.

2. **False Positives**
   - If a value is flagged but confirmed not to be a secret, it MUST be:
     - Added to the `.gitleaks.toml` allowlist or rules as a false positive, AND
     - Documented in `evidence/SEC-01.2-SECRETS-GUARDRAILS.md` with justification.

3. **Remediation**
   - If a real secret is ever committed:
     - Rotate the key immediately.
     - Remove it from history if necessary (e.g., `git filter-repo`).
     - Update this evidence file with incident details and resolution.

## 5. Review Cadence

- Secrets policy and scanner configuration are reviewed at least **quarterly** or after:
  - Onboarding major new services,
  - Introducing new key types,
  - A security incident related to secrets.

## 6. Responsibility

- **Developers:** Must not commit secrets; must use `.env.local` for local development.
- **Security Team:** Reviews scanner configuration and policy quarterly.
- **DevOps/CI:** Ensures CI gates are active and blocking on secret detection.

## 7. Related Documentation

- Evidence file: `evidence/SEC-01.2-SECRETS-GUARDRAILS.md`
- Scanner config: `.gitleaks.toml`
- Security scorecard: `.security-scorecard.yml`

---

**Last Updated:** November 17, 2025
**Version:** 1.0
**Status:** Active
