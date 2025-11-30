# Genesis 100 Alpha-10 Operator Runbook

**Purpose**: Step-by-step operational procedures for running the first Genesis 100 reward epoch with 10 alpha testers

**Audience**: System operators, admins, Genesis 100 core team

**Timeline**: 7-day epoch cycle

---

## Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Epoch Day 0: Preparation](#epoch-day-0-preparation)
3. [Epoch Day 1: Launch & Onboarding](#epoch-day-1-launch--onboarding)
4. [Epoch Days 2-6: Monitoring](#epoch-days-2-6-monitoring)
5. [Epoch Day 7: Distribution](#epoch-day-7-distribution)
6. [Epoch Day 8+: Settlement & Feedback](#epoch-day-8-settlement--feedback)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Emergency Procedures](#emergency-procedures)

---

## Pre-Launch Checklist

### Infrastructure

- [ ] **Staging Environment Deployed**
  - API server running at `https://api.alpha.bizra.ai`
  - Dashboard deployed at `https://alpha.bizra.ai`
  - PostgreSQL database accessible and backed up
  - Redis cache operational
  - SSL certificates valid

- [ ] **Database Migrations Applied**
  ```bash
  sqlx migrate run
  # Verify with:
  .\scripts\verify-migrations.ps1
  ```

- [ ] **Admin Accounts Created**
  - At least 2 admin users with `admin` role
  - JWT authentication tested
  - MFA enabled (if applicable)

- [ ] **Monitoring Configured**
  - Error tracking (Sentry or equivalent)
  - Performance monitoring (Grafana or equivalent)
  - Database query monitoring
  - Disk space alerts (>80% triggers warning)

### Test Execution

- [ ] **Local E2E Test Passed**
  ```powershell
  .\scripts\run-e2e-rewards-test.ps1
  # Then distribute via UI
  .\scripts\run-e2e-rewards-test.ps1 -Validate
  ```

- [ ] **Staging E2E Test Passed**
  - Same test on staging environment
  - Verified all endpoints accessible
  - Confirmed CORS configured correctly

### Documentation

- [ ] **Operator Runbook Reviewed** (this document)
- [ ] **User Onboarding Guide Ready**
- [ ] **FAQ Document Prepared**
- [ ] **Emergency Contacts List Updated**

---

## Epoch Day 0: Preparation

**Timing**: 24 hours before epoch start

### Step 1: Create Reward Epoch

**Option A: Via SQL** (Recommended for first run)

```sql
-- Connect to staging database
psql $STAGING_DATABASE_URL

-- Create epoch for 7 days, pool of 10,000 units
INSERT INTO poi_reward_epoch (
    start_timestamp,
    end_timestamp,
    total_pool,
    status
)
VALUES (
    '2025-11-24 00:00:00 UTC',  -- Adjust to actual start time
    '2025-12-01 00:00:00 UTC',  -- Exactly 7 days later
    10000.0,                     -- Pool size (adjust as needed)
    'active'
)
RETURNING id, start_timestamp, end_timestamp, total_pool;
```

**Save the epoch ID** — you'll need it throughout the cycle.

**Option B: Via Admin API** (Future implementation)

```bash
curl -X POST https://api.alpha.bizra.ai/api/poi/rewards/epochs \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "startTimestamp": "2025-11-24T00:00:00Z",
    "endTimestamp": "2025-12-01T00:00:00Z",
    "totalPool": "10000.0"
  }'
```

### Step 2: Verify Epoch Visibility

1. Login to admin dashboard: `https://alpha.bizra.ai/admin/rewards`
2. Confirm epoch appears with:
   - Status: `ACTIVE`
   - Correct date range
   - Pool amount: 10,000

### Step 3: Prepare Participant Communications

**Email Template**: Genesis 100 Alpha-10 Welcome

```
Subject: Welcome to Genesis 100 — Your Impact Journey Begins Tomorrow

Dear [Name],

You've been selected as one of the first 10 participants in the Genesis 100 program!

🚀 **What Starts Tomorrow**:
- 7-day impact contribution window (Nov 24 - Dec 1)
- Proof of Impact (PoI) attestation system goes live
- Earn rewards for verified contributions

🎯 **Your Mission**:
1. Log in to https://alpha.bizra.ai
2. Submit at least 1 PoI attestation in the "education" or "healthcare" domain
3. Await verification (typically 24-48 hours)
4. Receive your share of the 10,000-unit reward pool on Dec 2

📚 **Resources**:
- Onboarding Guide: https://alpha.bizra.ai/help/onboarding
- FAQ: https://alpha.bizra.ai/help/faq
- Support: genesis-support@bizra.ai

See you at the starting line!

— The Genesis Team
```

### Step 4: Final System Health Check

```bash
# API health
curl https://api.alpha.bizra.ai/health
# Expected: HTTP 200 OK

# Database connection
curl https://api.alpha.bizra.ai/ready
# Expected: HTTP 200 OK

# Check disk space
df -h
# Ensure >20% free on database volume
```

---

## Epoch Day 1: Launch & Onboarding

**Timing**: Epoch start (e.g., Nov 24, 00:00 UTC)

### Morning (0:00 - 12:00 UTC)

**08:00 UTC**: Send welcome emails to all 10 participants

**09:00 UTC**: Monitor first logins

```sql
-- Check user activity
SELECT
    u.email,
    u.last_login,
    COUNT(pa.id) AS attestations_submitted
FROM users u
LEFT JOIN poi_attestations pa ON pa.contributor_id = u.id
WHERE u.email IN ('alpha1@example.com', 'alpha2@example.com', ...) -- Replace with actual emails
GROUP BY u.id, u.email, u.last_login
ORDER BY u.last_login DESC;
```

**10:00 UTC**: Check for first attestations

```sql
-- Monitor attestation submissions
SELECT
    u.email,
    pa.impact_domain,
    pa.raw_score,
    pa.status,
    pa.created_at
FROM poi_attestations pa
JOIN users u ON u.id = pa.contributor_id
WHERE pa.created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0)
ORDER BY pa.created_at DESC;
```

### Afternoon (12:00 - 18:00 UTC)

**Monitor for Support Requests**:
- Check support@bizra.ai inbox every 2 hours
- Respond within 4 hours (target)
- Common issues:
  - Password reset requests
  - PoI submission guidance
  - "What qualifies as impact?" questions

**Verify Attestation Processing**:

```sql
-- Check attestation verification lag
SELECT
    status,
    COUNT(*) AS count,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)::NUMERIC(10,2) AS avg_hours_old
FROM poi_attestations
WHERE created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0)
GROUP BY status;
```

**Target**: <24 hours for verification (status: pending → verified)

### Evening (18:00 - 23:59 UTC)

**Daily Summary Report**:

```sql
-- Day 1 Summary
SELECT
    'Day 1 Summary' AS report,
    COUNT(DISTINCT u.id) AS active_users,
    COUNT(pa.id) AS attestations_submitted,
    SUM(CASE WHEN pa.status = 'verified' THEN 1 ELSE 0 END) AS attestations_verified,
    AVG(pa.normalized_score) AS avg_score
FROM users u
LEFT JOIN poi_attestations pa ON pa.contributor_id = u.id
    AND pa.created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0);
```

**Send to team**:
- Slack/Discord update with metrics
- Flag any concerning trends (e.g., 0 attestations)

---

## Epoch Days 2-6: Monitoring

### Daily Routine (Repeat Days 2-6)

**09:00 UTC**: Morning health check

```bash
# System health
curl https://api.alpha.bizra.ai/health

# Database performance
psql $DB_URL -c "
SELECT
    COUNT(*) AS active_queries,
    MAX(EXTRACT(EPOCH FROM (NOW() - query_start)))::INT AS longest_query_sec
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';
"
```

**12:00 UTC**: Midday metrics snapshot

```sql
-- Cumulative progress
WITH epoch AS (
    SELECT id, start_timestamp, end_timestamp, total_pool
    FROM poi_reward_epoch
    WHERE total_pool = 10000.0
)
SELECT
    COUNT(DISTINCT pa.contributor_id) AS unique_contributors,
    COUNT(pa.id) AS total_attestations,
    SUM(CASE WHEN pa.status = 'verified' THEN 1 ELSE 0 END) AS verified_count,
    SUM(CASE WHEN pa.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    AVG(pa.normalized_score) FILTER (WHERE pa.status = 'verified') AS avg_verified_score,
    NOW() AS snapshot_time
FROM epoch e
LEFT JOIN poi_attestations pa
    ON pa.created_at >= e.start_timestamp
   AND pa.created_at < e.end_timestamp;
```

**18:00 UTC**: Engagement check

```sql
-- User engagement levels
SELECT
    u.email,
    COUNT(pa.id) AS attestation_count,
    MAX(pa.created_at) AS last_activity,
    CASE
        WHEN COUNT(pa.id) = 0 THEN '🔴 No activity'
        WHEN COUNT(pa.id) < 3 THEN '🟡 Low activity'
        ELSE '🟢 Active'
    END AS engagement_level
FROM users u
LEFT JOIN poi_attestations pa
    ON pa.contributor_id = u.id
   AND pa.created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0)
WHERE u.email IN (...) -- Alpha-10 participant emails
GROUP BY u.id, u.email
ORDER BY attestation_count DESC;
```

### Proactive Engagement

**If a participant has 0 attestations by Day 3**:

Send follow-up email:
```
Subject: Need help getting started with Genesis 100?

Hi [Name],

We noticed you haven't submitted any impact attestations yet. No worries — you have until Dec 1!

Quick guide:
1. Visit https://alpha.bizra.ai/dashboard
2. Click "Submit Impact" (or navigate to PoI section)
3. Fill in your contribution details
4. Submit for verification

Need help? Reply to this email or check our FAQ: https://alpha.bizra.ai/help

— The Genesis Team
```

---

## Epoch Day 7: Distribution

**Timing**: Final day of epoch (e.g., Dec 1, 2025)

### Morning: Final Verification Push (00:00 - 12:00 UTC)

**08:00 UTC**: Process all pending verifications

```sql
-- Check pending attestations
SELECT
    u.email,
    pa.id,
    pa.impact_domain,
    pa.raw_score,
    pa.created_at,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at)) / 3600 AS hours_pending
FROM poi_attestations pa
JOIN users u ON u.id = pa.contributor_id
WHERE pa.status = 'pending'
  AND pa.created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0)
  AND pa.created_at < (SELECT end_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0)
ORDER BY pa.created_at;
```

**Manual verification** (if needed):
- Review each attestation
- Update status: `UPDATE poi_attestations SET status = 'verified' WHERE id = '...'`
- Ensure all legitimate contributions are verified before distribution

### Afternoon: Pre-Distribution Checks (12:00 - 16:00 UTC)

**14:00 UTC**: Final pre-distribution audit

```sql
-- Snapshot before distribution
WITH epoch AS (
    SELECT id, start_timestamp, end_timestamp, total_pool
    FROM poi_reward_epoch
    WHERE total_pool = 10000.0
)
SELECT
    'Pre-Distribution Snapshot' AS report,
    e.id AS epoch_id,
    e.status AS epoch_status,
    COUNT(DISTINCT pa.contributor_id) AS unique_contributors,
    COUNT(pa.id) FILTER (WHERE pa.status = 'verified') AS verified_attestations,
    SUM(pa.normalized_score) FILTER (WHERE pa.status = 'verified') AS total_score,
    e.total_pool AS pool_to_distribute,
    NOW() AS snapshot_time
FROM epoch e
LEFT JOIN poi_attestations pa
    ON pa.created_at >= e.start_timestamp
   AND pa.created_at < e.end_timestamp
GROUP BY e.id, e.status, e.total_pool;
```

**Verify**:
- At least 1 contributor has verified attestations
- Total score > 0 (otherwise distribution will fail)
- Epoch status = `active`

### Evening: Execute Distribution (16:00 - 18:00 UTC)

**16:00 UTC**: Announce distribution window

Send notification to participants:
```
Subject: Genesis 100 Epoch 1 Distribution in Progress

Your contributions are being processed! Rewards will be allocated in the next 2 hours.

Check your dashboard after 18:00 UTC to see your results.
```

**16:30 UTC**: Execute distribution via admin dashboard

1. Login to `https://alpha.bizra.ai/admin/rewards`
2. Locate the active epoch (pool: 10,000)
3. Click **"Distribute"** button
4. Confirm the action in the dialog box
5. Wait for success notification (should take <5 seconds)

**Alternative: API-based distribution**

```bash
curl -X POST https://api.alpha.bizra.ai/api/poi/rewards/epochs/{EPOCH_ID}/distribute \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -b cookies.txt
```

**Expected response**:
```json
{
  "epochId": "uuid-here",
  "status": "distributed",
  "totalPool": "10000.00",
  "contributors": 7,
  "totalScore": "4.50",
  "totalDistributed": "10000.00",
  "closedAt": "2025-12-01T16:30:15Z",
  "distributedAt": "2025-12-01T16:30:15Z"
}
```

**17:00 UTC**: Validate distribution

```bash
# Run validation script
psql $DB_URL -f scripts/e2e-rewards-validate.sql
```

**Critical checks**:
- ✅ Epoch status = `distributed`
- ✅ Conservation: `SUM(rewards) == total_pool`
- ✅ Shares sum to 1.0
- ✅ No duplicate rewards

---

## Epoch Day 8+: Settlement & Feedback

### Day 8 Morning: Settlement Submission (00:00 - 12:00 UTC)

**09:00 UTC**: Submit settlement batch

**Option A: Via Admin Dashboard**
1. Go to `/admin/rewards`
2. Find the distributed epoch
3. Click **"Submit Settlement"**
4. Confirm submission

**Option B: Via API**
```bash
curl -X POST https://api.alpha.bizra.ai/api/poi/rewards/epochs/{EPOCH_ID}/settlement/submit \
  -H "Authorization: Bearer $ADMIN_JWT"
```

**Expected response**:
```json
{
  "batchId": "settlement-uuid",
  "epochId": "epoch-uuid",
  "settlementCount": 7,
  "totalAmount": "10000.00",
  "submittedAt": "2025-12-02T09:15:22Z"
}
```

**10:00 UTC**: Export rewards for participant communication

```sql
-- Generate participant reward report
SELECT
    u.email,
    u.id AS contributor_id,
    pcs.total_score,
    pcs.normalized_share,
    pr.amount AS reward_amount,
    pr.settlement_status,
    pr.settlement_batch_id
FROM poi_rewards pr
JOIN users u ON u.id = pr.contributor_id
JOIN poi_contributor_scores pcs
    ON pcs.epoch_id = pr.epoch_id
   AND pcs.contributor_id = pr.contributor_id
WHERE pr.epoch_id = '...'  -- Replace with actual epoch ID
ORDER BY pr.amount DESC;
```

**Export to CSV**: `\copy (SELECT ...) TO 'epoch1_rewards.csv' CSV HEADER`

### Day 8 Afternoon: Participant Notifications (12:00 - 18:00 UTC)

**14:00 UTC**: Send individualized reward emails

**Email Template**: Reward Allocation Complete

```
Subject: Your Genesis 100 Epoch 1 Rewards

Dear [Name],

Congratulations! Your impact contributions for Genesis 100 Epoch 1 have been verified and rewards allocated.

📊 **Your Results**:
- Verified Attestations: [count]
- Impact Score: [total_score]
- Reward Share: [normalized_share × 100]%
- Reward Amount: [amount] units

🔐 **Settlement Status**: Pending blockchain confirmation
Expected confirmation: [estimated_date]

📈 **Leaderboard Position**: #[rank] of [total_contributors]

🙏 **Thank you** for being part of the first Genesis 100 cohort. Your contributions are helping shape the future of impact economics.

**Next Steps**:
- Check your dashboard: https://alpha.bizra.ai/dashboard
- Review your contribution history
- Prepare for Epoch 2 (starting [next_epoch_date])

Questions? Reply to this email or visit our FAQ.

— The Genesis Team
```

### Day 8-10: Feedback Collection

**Survey Questions** (Google Forms / TypeForm):

1. **Did you understand why you received this reward amount?**
   - [ ] Yes, perfectly clear
   - [ ] Mostly clear
   - [ ] Somewhat confusing
   - [ ] Very confusing

2. **Did the reward allocation feel fair?**
   - [ ] Very fair
   - [ ] Mostly fair
   - [ ] Somewhat unfair
   - [ ] Very unfair

3. **What was the most confusing part of the process?**
   - (Open text)

4. **What would you improve?**
   - (Open text)

5. **How likely are you to participate in Epoch 2?**
   - 1-10 scale

**Send survey link** to all participants with **$10 bonus** for completion.

---

## Troubleshooting Guide

### Issue: Distribution Fails with "Epoch Not Active"

**Cause**: Epoch was already distributed or manually closed

**Solution**:
```sql
-- Check epoch status
SELECT id, status, closed_at, distributed_at
FROM poi_reward_epoch
WHERE id = '...';

-- If status is incorrect but no rewards exist, reset:
UPDATE poi_reward_epoch
SET status = 'active', closed_at = NULL, distributed_at = NULL
WHERE id = '...' AND NOT EXISTS (
    SELECT 1 FROM poi_rewards WHERE epoch_id = '...'
);
```

### Issue: Conservation Violation (SUM ≠ Pool)

**Cause**: Rounding error in BigDecimal calculations or data corruption

**Diagnosis**:
```sql
SELECT
    total_pool,
    SUM(amount) AS distributed,
    total_pool - SUM(amount) AS difference
FROM poi_reward_epoch e
JOIN poi_rewards r ON r.epoch_id = e.id
WHERE e.id = '...'
GROUP BY e.id, e.total_pool;
```

**Solution** (if difference < 0.01):
- Acceptable rounding error, proceed normally

**Solution** (if difference > 0.01):
- **DO NOT PROCEED WITH SETTLEMENT**
- Contact engineering team immediately
- Rollback distribution if possible
- Manual investigation required

### Issue: User Reports Missing Attestation

**Diagnosis**:
```sql
-- Check if attestation exists
SELECT * FROM poi_attestations
WHERE contributor_id = (SELECT id FROM users WHERE email = '...')
  AND created_at >= '...'  -- Epoch start
  AND created_at < '...';  -- Epoch end
```

**Scenarios**:

1. **Attestation exists but status = 'pending'**:
   - Manually verify: `UPDATE poi_attestations SET status = 'verified' WHERE id = '...'`
   - Inform user, but **no re-distribution** (they'll be included in next epoch)

2. **Attestation exists but outside epoch window**:
   - Explain to user (submitted too late / too early)
   - Offer to manually include in next epoch if appropriate

3. **Attestation does not exist**:
   - Check application logs for submission errors
   - If genuine system issue: manually create attestation (with proper audit trail)

### Issue: Settlement Submission Fails

**Error**: `"No pending settlements for this epoch"`

**Cause**: Epoch not yet distributed, or already settled

**Solution**:
```sql
-- Check settlement status
SELECT settlement_status, COUNT(*)
FROM poi_rewards
WHERE epoch_id = '...'
GROUP BY settlement_status;
```

If all rewards show `submitted` or `confirmed`, settlement already happened.

---

## Emergency Procedures

### Emergency Stop (Distribution Freeze)

**When to use**: Critical bug discovered mid-distribution, data corruption detected

**Procedure**:
1. **Stop API server immediately**:
   ```bash
   # On server
   systemctl stop bizra-api
   # Or use process manager (PM2, supervisor, etc.)
   ```

2. **Snapshot database**:
   ```bash
   pg_dump $DB_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Assess damage**:
   ```sql
   -- Check if distribution completed
   SELECT status FROM poi_reward_epoch WHERE id = '...';

   -- Check how many rewards were allocated
   SELECT COUNT(*) FROM poi_rewards WHERE epoch_id = '...';
   ```

4. **Notify stakeholders**:
   - Email participants: "Temporary system maintenance, rewards delayed"
   - Internal team: Incident report with details

5. **Rollback** (if distribution incomplete):
   ```sql
   BEGIN;
   DELETE FROM poi_rewards WHERE epoch_id = '...';
   DELETE FROM poi_contributor_scores WHERE epoch_id = '...';
   UPDATE poi_reward_epoch SET status = 'active', closed_at = NULL, distributed_at = NULL WHERE id = '...';
   COMMIT;
   ```

6. **Fix underlying issue** (engineering team)

7. **Restart and re-execute distribution** when fixed

### Data Loss Recovery

**Scenario**: Database failure, rewards data corrupted

**Recovery**:
1. Restore from most recent backup:
   ```bash
   psql $DB_URL < backup_file.sql
   ```

2. Verify epoch state:
   ```sql
   SELECT * FROM poi_reward_epoch WHERE id = '...';
   ```

3. If distribution happened but data lost:
   - Check application logs for distribution summary
   - Manually reconstruct `poi_rewards` table from logs
   - **Do not re-run distribution** (will create duplicates)

4. If settlement submitted but unconfirmed:
   - Contact blockchain/ledger team with `settlement_batch_id`
   - Confirm transaction status externally
   - Update database to match external state

---

## Success Criteria

At the end of the Alpha-10 cycle, the following must be true:

- [ ] All 10 participants received rewards (or understood why they didn't)
- [ ] Economic conservation holds (variance < 0.01)
- [ ] No duplicate rewards issued
- [ ] Settlement batch submitted successfully
- [ ] Participant satisfaction ≥ 70% ("mostly satisfied" or better)
- [ ] Zero critical system failures
- [ ] All support requests answered within 24 hours
- [ ] Full audit trail documented

---

## Post-Mortem Checklist

After Epoch 1 completes, conduct a team retrospective:

1. What went well?
2. What went poorly?
3. What would we change for Epoch 2?
4. Any technical debt identified?
5. User feedback themes?
6. Performance bottlenecks?
7. Documentation gaps?

**Document findings** in `genesis-100-epoch-1-retrospective.md`

---

## Contact List

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **Lead Operator** | [Name] | operator@bizra.ai | +XXX |
| **Engineering Lead** | [Name] | eng-lead@bizra.ai | +XXX |
| **Database Admin** | [Name] | dba@bizra.ai | +XXX |
| **Support Lead** | [Name] | support@bizra.ai | +XXX |
| **Emergency Escalation** | [Name] | emergency@bizra.ai | +XXX |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Next Review**: After Epoch 1 completion

---

*This runbook is a living document. Update it after each epoch with lessons learned.*
