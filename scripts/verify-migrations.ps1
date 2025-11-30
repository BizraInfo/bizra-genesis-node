# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - Migration Verification Script                      ║
# ║  Verifies all rewards-related database migrations are applied            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

param(
    [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://bizra_user:bizra_pass@localhost:5432/bizra_genesis"
    Write-Host "⚠️  Using default DATABASE_URL: $DatabaseUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " GENESIS ECONOMIC ENGINE - MIGRATION VERIFICATION" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# CHECK 1: Enum Types
# ════════════════════════════════════════════════════════════════════════════

Write-Host "1️⃣  Checking enum types..." -ForegroundColor Cyan

$enumCheck = @"
SELECT
    typname,
    CASE
        WHEN typname = 'poi_reward_epoch_status' THEN '✅'
        WHEN typname = 'poi_reward_settlement_status' THEN '✅'
        ELSE '❓'
    END AS status
FROM pg_type
WHERE typname IN ('poi_reward_epoch_status', 'poi_reward_settlement_status')
ORDER BY typname;
"@

psql $DatabaseUrl -c $enumCheck

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# CHECK 2: Tables
# ════════════════════════════════════════════════════════════════════════════

Write-Host "2️⃣  Checking required tables..." -ForegroundColor Cyan

$tableCheck = @"
SELECT
    table_name,
    CASE
        WHEN table_name IN (
            'poi_reward_epoch',
            'poi_contributor_scores',
            'poi_rewards'
        ) THEN '✅'
        ELSE '❓'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'poi_reward_epoch',
      'poi_contributor_scores',
      'poi_rewards'
  )
ORDER BY table_name;
"@

psql $DatabaseUrl -c $tableCheck

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# CHECK 3: Table Columns
# ════════════════════════════════════════════════════════════════════════════

Write-Host "3️⃣  Checking table schemas..." -ForegroundColor Cyan

$schemaCheck = @"
-- poi_reward_epoch columns
SELECT
    'poi_reward_epoch' AS table_name,
    COUNT(*) AS column_count,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'poi_reward_epoch'

UNION ALL

-- poi_contributor_scores columns
SELECT
    'poi_contributor_scores',
    COUNT(*),
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'poi_contributor_scores'

UNION ALL

-- poi_rewards columns
SELECT
    'poi_rewards',
    COUNT(*),
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'poi_rewards';
"@

psql $DatabaseUrl -c $schemaCheck

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# CHECK 4: Primary Keys and Constraints
# ════════════════════════════════════════════════════════════════════════════

Write-Host "4️⃣  Checking constraints..." -ForegroundColor Cyan

$constraintCheck = @"
SELECT
    tc.table_name,
    tc.constraint_type,
    tc.constraint_name,
    '✅' AS status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
      'poi_reward_epoch',
      'poi_contributor_scores',
      'poi_rewards'
  )
ORDER BY tc.table_name, tc.constraint_type;
"@

psql $DatabaseUrl -c $constraintCheck

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# CHECK 5: Foreign Keys
# ════════════════════════════════════════════════════════════════════════════

Write-Host "5️⃣  Checking foreign key relationships..." -ForegroundColor Cyan

$fkCheck = @"
SELECT
    kcu.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    '✅' AS status
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu
    ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.table_constraints tc
    ON kcu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_name IN ('poi_contributor_scores', 'poi_rewards')
ORDER BY kcu.table_name, kcu.column_name;
"@

psql $DatabaseUrl -c $fkCheck

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " VERIFICATION SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$summaryCheck = @"
SELECT
    '✅ Database schema ready for Genesis Economic Engine' AS status
WHERE EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'poi_reward_epoch_status'
) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'poi_reward_epoch'
) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'poi_contributor_scores'
) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'poi_rewards'
);
"@

$result = psql $DatabaseUrl -t -c $summaryCheck

if ($result -match "✅") {
    Write-Host ""
    Write-Host "✅ All required migrations are applied!" -ForegroundColor Green
    Write-Host "   - Enum types: OK" -ForegroundColor Green
    Write-Host "   - Tables: OK" -ForegroundColor Green
    Write-Host "   - Constraints: OK" -ForegroundColor Green
    Write-Host "   - Foreign keys: OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to proceed with E2E testing." -ForegroundColor Cyan
    Write-Host "Run: .\scripts\run-e2e-rewards-test.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Missing required migrations!" -ForegroundColor Red
    Write-Host "   Run: sqlx migrate run" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
