-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - E2E Rewards Test Script                            ║
-- ║  Complete PoI → Rewards → Settlement validation flow                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
-- SETUP: Clean previous test data (if exists)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Delete test rewards
    DELETE FROM poi_rewards WHERE epoch_id IN (
        SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0
    );

    -- Delete test contributor scores
    DELETE FROM poi_contributor_scores WHERE epoch_id IN (
        SELECT id FROM poi_reward_epoch WHERE total_pool = 10000.0
    );

    -- Delete test epochs
    DELETE FROM poi_reward_epoch WHERE total_pool = 10000.0;

    RAISE NOTICE 'Cleaned previous test data';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Create Test Epoch
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO poi_reward_epoch (
    start_timestamp,
    end_timestamp,
    total_pool,
    status
)
VALUES (
    NOW() - INTERVAL '2 hours',  -- Started 2 hours ago
    NOW() + INTERVAL '5 days',   -- Ends in 5 days
    10000.0,                     -- Pool of 10,000 units
    'active'
)
RETURNING
    id AS epoch_id,
    start_timestamp,
    end_timestamp,
    total_pool,
    status,
    created_at;

-- Save the epoch_id for subsequent operations
\gset

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Verify Test Users Exist (or create them)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users LIMIT 1;

    IF user_count = 0 THEN
        -- Create test users if none exist
        INSERT INTO users (email, password_hash, roles, verification_token, email_verified)
        VALUES
            ('test-alice@bizra.ai', '$argon2id$v=19$m=19456,t=2,p=1$test$test', ARRAY['user'], NULL, TRUE),
            ('test-bob@bizra.ai', '$argon2id$v=19$m=19456,t=2,p=1$test$test', ARRAY['user'], NULL, TRUE),
            ('test-charlie@bizra.ai', '$argon2id$v=19$m=19456,t=2,p=1$test$test', ARRAY['user'], NULL, TRUE);

        RAISE NOTICE 'Created 3 test users';
    ELSE
        RAISE NOTICE 'Using existing users';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Create Test PoI Attestations (3 contributors with different scores)
-- ════════════════════════════════════════════════════════════════════════════

-- Get 3 user IDs for testing
WITH test_users AS (
    SELECT id, email FROM users LIMIT 3
),
attestations AS (
    INSERT INTO poi_attestations (
        contributor_id,
        impact_domain,
        raw_score,
        weight,
        normalized_score,
        payload_hash,
        signature,
        status,
        created_at
    )
    SELECT
        u.id,
        'education',
        CASE
            WHEN row_number() OVER (ORDER BY u.email) = 1 THEN 90.0
            WHEN row_number() OVER (ORDER BY u.email) = 2 THEN 60.0
            ELSE 60.0
        END,
        CASE
            WHEN row_number() OVER (ORDER BY u.email) = 3 THEN 0.5
            ELSE 1.0
        END,
        CASE
            WHEN row_number() OVER (ORDER BY u.email) = 1 THEN 0.90
            WHEN row_number() OVER (ORDER BY u.email) = 2 THEN 0.60
            ELSE 0.30
        END,
        'hash-' || u.id::text || '-' || NOW()::text,
        'sig-' || u.id::text || '-' || NOW()::text,
        'verified',
        NOW() - INTERVAL '1 hour'  -- Within epoch window
    FROM test_users u
    RETURNING contributor_id, impact_domain, normalized_score
)
SELECT
    contributor_id,
    impact_domain,
    normalized_score,
    'Expected reward: ' || (normalized_score::numeric / 1.8 * 10000.0)::text AS expected_amount
FROM attestations
ORDER BY normalized_score DESC;

-- ════════════════════════════════════════════════════════════════════════════
-- PRE-DISTRIBUTION VALIDATION
-- ════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'PRE-DISTRIBUTION STATE'
\echo '════════════════════════════════════════════════════════════════════════'

-- Check epoch status
SELECT
    id,
    status,
    total_pool,
    start_timestamp::date AS start_date,
    end_timestamp::date AS end_date
FROM poi_reward_epoch
WHERE total_pool = 10000.0;

-- Check attestations
SELECT
    COUNT(*) AS total_attestations,
    COUNT(DISTINCT contributor_id) AS unique_contributors,
    SUM(normalized_score) AS total_normalized_score
FROM poi_attestations
WHERE status = 'verified'
  AND created_at >= (SELECT start_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0 LIMIT 1)
  AND created_at < (SELECT end_timestamp FROM poi_reward_epoch WHERE total_pool = 10000.0 LIMIT 1);

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'EXPECTED DISTRIBUTION RESULTS'
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'Contributor 1 (score 0.90): Expected share = 0.5000, Amount = 5000.00'
\echo 'Contributor 2 (score 0.60): Expected share = 0.3333, Amount = 3333.33'
\echo 'Contributor 3 (score 0.30): Expected share = 0.1667, Amount = 1666.67'
\echo 'Total: 10000.00'
\echo ''
\echo 'Now run the distribution via Admin UI or API:'
\echo 'POST /api/poi/rewards/epochs/{epoch_id}/distribute'
\echo ''
\echo 'Then run: psql -d bizra_genesis -f scripts/e2e-rewards-validate.sql'
\echo '════════════════════════════════════════════════════════════════════════'
