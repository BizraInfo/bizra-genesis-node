-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - E2E Rewards Validation Script                      ║
-- ║  Run AFTER distribution to verify economic invariants                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'POST-DISTRIBUTION VALIDATION'
\echo '════════════════════════════════════════════════════════════════════════'

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 1: Epoch Status
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '1️⃣  EPOCH STATUS'
SELECT
    id,
    status,
    total_pool,
    closed_at,
    distributed_at,
    CASE
        WHEN status = 'distributed' THEN '✅ PASS'
        ELSE '❌ FAIL - Expected status: distributed'
    END AS validation
FROM poi_reward_epoch
WHERE total_pool = 10000.0;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 2: Contributor Scores
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '2️⃣  CONTRIBUTOR SCORES'
SELECT
    pcs.contributor_id,
    u.email,
    pcs.total_score,
    pcs.normalized_share,
    CASE
        WHEN pcs.normalized_share >= 0 AND pcs.normalized_share <= 1 THEN '✅'
        ELSE '❌'
    END AS share_valid
FROM poi_contributor_scores pcs
JOIN users u ON u.id = pcs.contributor_id
WHERE pcs.epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)
ORDER BY pcs.normalized_share DESC;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 3: Rewards Allocated
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '3️⃣  REWARDS ALLOCATED'
SELECT
    pr.contributor_id,
    u.email,
    pr.amount,
    pcs.normalized_share,
    pr.settlement_status,
    CASE
        WHEN pr.settlement_status = 'pending' THEN '✅'
        ELSE '❌'
    END AS settlement_valid
FROM poi_rewards pr
JOIN users u ON u.id = pr.contributor_id
JOIN poi_contributor_scores pcs ON pcs.epoch_id = pr.epoch_id AND pcs.contributor_id = pr.contributor_id
WHERE pr.epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)
ORDER BY pr.amount DESC;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 4: Economic Conservation (CRITICAL INVARIANT)
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '4️⃣  ECONOMIC CONSERVATION (CRITICAL)'
WITH epoch_data AS (
    SELECT
        e.id,
        e.total_pool,
        COALESCE(SUM(pr.amount), 0) AS total_distributed,
        e.total_pool - COALESCE(SUM(pr.amount), 0) AS difference,
        ABS(e.total_pool - COALESCE(SUM(pr.amount), 0)) AS abs_difference
    FROM poi_reward_epoch e
    LEFT JOIN poi_rewards pr ON pr.epoch_id = e.id
    WHERE e.total_pool = 10000.0
    GROUP BY e.id, e.total_pool
)
SELECT
    total_pool,
    total_distributed,
    difference,
    abs_difference,
    CASE
        WHEN abs_difference < 0.01 THEN '✅ PASS - Conservation holds'
        WHEN abs_difference < 0.1 THEN '⚠️  WARN - Acceptable rounding error'
        ELSE '❌ FAIL - Conservation violated!'
    END AS validation
FROM epoch_data;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 5: Normalized Shares Sum to 1.0
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '5️⃣  NORMALIZED SHARES SUM'
WITH share_sum AS (
    SELECT
        epoch_id,
        SUM(normalized_share) AS total_shares,
        ABS(1.0 - SUM(normalized_share)) AS difference
    FROM poi_contributor_scores
    WHERE epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)
    GROUP BY epoch_id
)
SELECT
    total_shares,
    difference,
    CASE
        WHEN difference < 0.000001 THEN '✅ PASS - Shares sum to 1.0'
        WHEN difference < 0.001 THEN '⚠️  WARN - Minor rounding error'
        ELSE '❌ FAIL - Shares do not sum to 1.0'
    END AS validation
FROM share_sum;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK 6: Idempotency - No Duplicate Rewards
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '6️⃣  IDEMPOTENCY CHECK'
WITH duplicate_check AS (
    SELECT
        epoch_id,
        contributor_id,
        COUNT(*) AS reward_count
    FROM poi_rewards
    WHERE epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)
    GROUP BY epoch_id, contributor_id
    HAVING COUNT(*) > 1
)
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM duplicate_check) THEN '✅ PASS - No duplicate rewards'
        ELSE '❌ FAIL - Duplicate rewards detected!'
    END AS validation,
    COALESCE((SELECT COUNT(*) FROM duplicate_check), 0) AS duplicate_count;

-- ════════════════════════════════════════════════════════════════════════════
-- SUMMARY REPORT
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'VALIDATION SUMMARY'
\echo '════════════════════════════════════════════════════════════════════════'

WITH validation_results AS (
    SELECT
        'Epoch Status' AS check_name,
        CASE WHEN status = 'distributed' THEN 1 ELSE 0 END AS passed
    FROM poi_reward_epoch WHERE total_pool = 10000.0

    UNION ALL

    SELECT
        'Economic Conservation',
        CASE WHEN ABS(e.total_pool - COALESCE(SUM(pr.amount), 0)) < 0.01 THEN 1 ELSE 0 END
    FROM poi_reward_epoch e
    LEFT JOIN poi_rewards pr ON pr.epoch_id = e.id
    WHERE e.total_pool = 10000.0
    GROUP BY e.total_pool

    UNION ALL

    SELECT
        'Shares Sum to 1.0',
        CASE WHEN ABS(1.0 - SUM(normalized_share)) < 0.000001 THEN 1 ELSE 0 END
    FROM poi_contributor_scores
    WHERE epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)

    UNION ALL

    SELECT
        'No Duplicate Rewards',
        CASE WHEN COUNT(*) = (SELECT COUNT(DISTINCT contributor_id) FROM poi_rewards WHERE epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)) THEN 1 ELSE 0 END
    FROM poi_rewards
    WHERE epoch_id IN (SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0)
)
SELECT
    check_name,
    CASE WHEN passed = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM validation_results;

\echo ''
\echo 'Next step: Test settlement workflow'
\echo 'POST /api/poi/rewards/epochs/{epoch_id}/settlement/submit'
\echo '════════════════════════════════════════════════════════════════════════'
