# GENESIS 100 — REWARDS QUICK START

**For**: First 100 Alpha Users  
**Purpose**: How to view and claim your impact rewards  
**Status**: Alpha v0.1  
**Updated**: 23 Nov 2025

---

## FOR CONTRIBUTORS: View Your Rewards (Coming in 48hrs)

**STATUS**: Admin-only in v0.1 → User view shipping in next sprint

### Current Process (Temporary)
1. Make impact contributions (complete tasks, create content, verify others)
2. System automatically creates PoI attestations
3. Admin distributes rewards weekly
4. **Admin will notify you** via email/Discord when rewards are ready
5. Future: Self-service dashboard at `/rewards/me`

### What You'll See (Soon)
- Your total verified impact score
- Your share of the reward pool
- Settlement status (pending/confirmed)
- Transaction hash for on-chain proof

---

## FOR ADMINS: Distribute Rewards

### Step 1: Access Dashboard
```
URL: https://alpha.bizra.ai/admin/rewards
Requires: Admin login credentials
```

### Step 2: View Active Epochs
- Dashboard loads automatically
- Shows all epochs with status
- Filter by `active`, `closed`, or `distributed`

### Step 3: Distribute Rewards
```
1. Locate the active epoch (green "ACTIVE" badge)
2. Click "Distribute" button in Actions column
3. Wait for processing (typically <2 seconds)
4. Verify: Status changes to "DISTRIBUTED"
5. Check: Contributors count and total distributed amount
```

### Step 4: Submit Settlement
```
1. Locate the distributed epoch (blue "DISTRIBUTED" badge)
2. Click "Submit Settlement" button
3. System creates settlement batch
4. Note the batch ID for tracking
5. Confirm settlement in external ledger (manual step for now)
```

### Step 5: Confirm Settlement
```
1. After external ledger processes batch
2. Click "Confirm Settlement" (appears after submission)
3. Marks all rewards as settled
4. Contributors can now claim tokens
```

---

## EPOCH LIFECYCLE

```
┌──────────┐     ┌────────┐     ┌─────────────┐     ┌──────────┐
│  ACTIVE  │ --> │ CLOSED │ --> │ DISTRIBUTED │ --> │ SETTLED  │
└──────────┘     └────────┘     └─────────────┘     └──────────┘
   7 days         Automatic      Admin clicks        Ledger confirms
   window         at end         "Distribute"        "Confirm"
```

**ACTIVE**: Collecting attestations  
**CLOSED**: Window ended, computing scores  
**DISTRIBUTED**: Rewards allocated to contributors  
**SETTLED**: Tokens sent to external ledger

---

## REWARD CALCULATION

### Formula
```
Your Reward = (Your Normalized Score / Total Scores) × Epoch Pool
```

### Example
```
Epoch Pool: 10,000 BIZRA
Your Score: 12.5 (sum of all your verified attestations)
Total Scores: 250 (all contributors combined)

Your Share: 12.5 / 250 = 0.05 (5%)
Your Reward: 0.05 × 10,000 = 500 BIZRA
```

### Score Components
Each attestation contributes:
```
Normalized Score = (Raw Score / 100) × Weight
```

- **Raw Score**: 0-100 (quality of contribution)
- **Weight**: 0-10 (impact domain multiplier)
- **Normalized**: Capped at 1.0 per attestation

Only **VERIFIED** attestations count toward rewards.

---

## COMMON SCENARIOS

### Scenario 1: First Week Distribution
```
Day 1:  Epoch created (pool: 10,000 BIZRA, 7-day window)
Day 1-7: Contributors submit work → PoI attestations generated
Day 7:  Epoch automatically closes
Day 8:  Admin distributes → 42 contributors get rewards
Day 8:  Admin submits settlement → Batch sent to ledger
Day 9:  Ledger confirms → Contributors can claim tokens
```

### Scenario 2: Multiple Contributors
```
Alice: 20 attestations, avg score 0.8 → Total: 16.0
Bob:   10 attestations, avg score 0.9 → Total: 9.0  
Carol: 5 attestations, avg score 1.0 → Total: 5.0
Total Scores: 30.0

Pool: 1,000 BIZRA
Alice: (16/30) × 1000 = 533.33 BIZRA
Bob:   (9/30) × 1000 = 300.00 BIZRA
Carol: (5/30) × 1000 = 166.67 BIZRA
```

### Scenario 3: Failed Settlement (Retry)
```
1. Distribution completes successfully
2. Settlement submission fails (network error)
3. Admin clicks "Submit Settlement" again
4. System creates new batch with same rewards
5. Settlement succeeds, rewards confirmed
```

---

## TROUBLESHOOTING

### "I don't see any rewards"
- Check: Have you made verified contributions?
- Check: Has the epoch closed and been distributed?
- Ask: Admin to verify your contributor ID in system

### "My reward amount seems wrong"
- Remember: Rewards are proportional to ALL contributors
- Higher total scores = smaller individual shares
- Only verified attestations count

### "Settlement is stuck"
- Admin can re-submit settlement if it fails
- Settlement status tracked separately from rewards
- Your reward amount never changes, only settlement status

### "Can I see my attestations?"
- Yes: Navigate to `/admin/poi` (if you have access)
- Filter by your contributor ID
- Shows all attestations with scores and status

---

## SECURITY & PRIVACY

### What We Store
- Your contributor UUID (not personally identifiable)
- Your impact scores and rewards
- Timestamps of contributions
- Settlement status

### What We Don't Store
- Your personal identity (unless you provide it)
- Your wallet address (until you claim)
- Your location or device info

### How to Verify
- All reward calculations are transparent
- Database schema is open-source
- Conservation invariant: `Σ rewards == epoch pool` (always)

---

## ROADMAP

### v0.2 (Next 2 weeks)
- [ ] Self-service `/rewards/me` dashboard
- [ ] Email notifications when rewards ready
- [ ] CSV export of your contribution history
- [ ] Real-time WebSocket updates for epoch status

### v0.3 (Next month)
- [ ] On-chain settlement automation
- [ ] Multi-currency support (BIZRA + stablecoins)
- [ ] Advanced analytics (your impact over time)
- [ ] Leaderboards and achievement badges

### v1.0 (Q1 2026)
- [ ] Quadratic funding formulas
- [ ] DAO governance for epoch parameters
- [ ] Cross-chain settlement bridges
- [ ] Zero-knowledge proofs for privacy

---

## SUPPORT

### Get Help
- **Discord**: #genesis-100-support channel
- **Email**: alpha@bizra.ai
- **Docs**: https://docs.bizra.ai/rewards

### Report Issues
- **Bug Tracker**: https://github.com/bizra/genesis-node/issues
- **Security**: security@bizra.ai (PGP key available)

### Share Feedback
- **Survey**: https://forms.bizra.ai/genesis-100-feedback
- **Office Hours**: Fridays 2-4pm GMT+4 (Dubai time)

---

## FAQ

**Q: When do epochs start/end?**  
A: Weekly on Sundays 00:00 UTC → next Saturday 23:59 UTC

**Q: What if I miss an epoch?**  
A: No problem! New epochs start every week. Your past rewards stay.

**Q: Can I transfer my rewards?**  
A: Once settled, rewards are claimable to any wallet you control.

**Q: What's the maximum reward per epoch?**  
A: Depends on pool size and your share. No per-user cap in v0.1.

**Q: How long does settlement take?**  
A: Typically 24-48 hours (manual process in alpha)

**Q: What if the admin makes a mistake?**  
A: Distribution is atomic and idempotent — can be re-run safely.

---

**Welcome to Genesis 100!** 🚀

You're building the future of impact-driven economics.

---

*This guide will be updated as features ship. Last updated: 23 Nov 2025*
