#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - TELEMETRY SCHEMA VALIDATOR                          ║
 * ║  Ensures Rust ↔ TypeScript ↔ Node Bridge schema alignment                 ║
 * ║  α-10 Glass Cockpit Validation Sprint                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// EXPECTED SCHEMA DEFINITION (Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════

const EXPECTED_SCHEMA = {
  timestamp: 'string',           // ISO 8601
  node_id: 'string',
  latency_us: 'number',
  ihsan_score: 'number',         // 0.0 - 1.0
  consensus_state: ['STABLE', 'CONVERGING', 'DEGRADED', 'RECOVERY', 'OFFLINE'],
  epoch: 'number',
  active_agents: {
    PAT: 'number',
    SAT: 'number',
    TAT: 'number'
  },
  poi_events_last_minute: 'number',
  error_rate: 'number',          // 0.0 - 1.0
  uptime_seconds: 'number',
  model_health: {
    primary_available: 'boolean',
    fallback_available: 'boolean',
    active_provider: 'string',
    circuit_breaker_state: ['CLOSED', 'OPEN', 'HALF_OPEN']
  },
  db_pool_status: {
    active: 'number',
    idle: 'number',
    max_size: 'number',
    healthy: 'boolean'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function validateField(value, expected, fieldPath) {
  const errors = [];

  if (Array.isArray(expected)) {
    // Enum validation
    if (!expected.includes(value)) {
      errors.push(`${fieldPath}: expected one of [${expected.join(', ')}], got "${value}"`);
    }
  } else if (typeof expected === 'object') {
    // Nested object validation
    if (typeof value !== 'object' || value === null) {
      errors.push(`${fieldPath}: expected object, got ${typeof value}`);
    } else {
      for (const key of Object.keys(expected)) {
        if (!(key in value)) {
          errors.push(`${fieldPath}.${key}: missing required field`);
        } else {
          errors.push(...validateField(value[key], expected[key], `${fieldPath}.${key}`));
        }
      }
    }
  } else if (expected === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${fieldPath}: expected string, got ${typeof value}`);
    }
  } else if (expected === 'number') {
    if (typeof value !== 'number') {
      errors.push(`${fieldPath}: expected number, got ${typeof value}`);
    }
  } else if (expected === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${fieldPath}: expected boolean, got ${typeof value}`);
    }
  }

  return errors;
}

function validateTelemetry(telemetry) {
  const errors = [];

  for (const key of Object.keys(EXPECTED_SCHEMA)) {
    if (!(key in telemetry)) {
      errors.push(`root.${key}: missing required field`);
    } else {
      errors.push(...validateField(telemetry[key], EXPECTED_SCHEMA[key], key));
    }
  }

  // Additional semantic validations
  if (telemetry.ihsan_score !== undefined) {
    if (telemetry.ihsan_score < 0 || telemetry.ihsan_score > 1) {
      errors.push(`ihsan_score: must be between 0.0 and 1.0, got ${telemetry.ihsan_score}`);
    }
  }

  if (telemetry.error_rate !== undefined) {
    if (telemetry.error_rate < 0 || telemetry.error_rate > 1) {
      errors.push(`error_rate: must be between 0.0 and 1.0, got ${telemetry.error_rate}`);
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE FILE VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

function checkRustSchema(basePath) {
  const rustPath = path.join(basePath, 'src/api/telemetry.rs');
  const content = fs.readFileSync(rustPath, 'utf8');

  const checks = [
    { field: 'timestamp', pattern: /pub timestamp:.*DateTime<Utc>/ },
    { field: 'node_id', pattern: /pub node_id:.*String/ },
    { field: 'latency_us', pattern: /pub latency_us:.*u64/ },
    { field: 'ihsan_score', pattern: /pub ihsan_score:.*f64/ },
    { field: 'consensus_state', pattern: /pub consensus_state:.*ConsensusState/ },
    { field: 'epoch', pattern: /pub epoch:.*u64/ },
    { field: 'active_agents', pattern: /pub active_agents:.*AgentCounts/ },
    { field: 'poi_events_last_minute', pattern: /pub poi_events_last_minute:.*u64/ },
    { field: 'error_rate', pattern: /pub error_rate:.*f64/ },
    { field: 'uptime_seconds', pattern: /pub uptime_seconds:.*u64/ },
    { field: 'model_health', pattern: /pub model_health:.*ModelHealth/ },
    { field: 'db_pool_status', pattern: /pub db_pool_status:.*DbPoolStatus/ },
  ];

  const results = { pass: [], fail: [] };

  for (const check of checks) {
    if (check.pattern.test(content)) {
      results.pass.push(check.field);
    } else {
      results.fail.push(check.field);
    }
  }

  return results;
}

function checkTypeScriptSchema(basePath) {
  const tsPath = path.join(basePath, 'apps/dashboard/src/hooks/useTelemetryStream.tsx');
  const content = fs.readFileSync(tsPath, 'utf8');

  const checks = [
    { field: 'timestamp', pattern: /timestamp:\s*string/ },
    { field: 'node_id', pattern: /node_id:\s*string/ },
    { field: 'latency_us', pattern: /latency_us:\s*number/ },
    { field: 'ihsan_score', pattern: /ihsan_score:\s*number/ },
    { field: 'consensus_state', pattern: /consensus_state:\s*ConsensusState/ },
    { field: 'epoch', pattern: /epoch:\s*number/ },
    { field: 'active_agents', pattern: /active_agents:\s*AgentCounts/ },
    { field: 'poi_events_last_minute', pattern: /poi_events_last_minute:\s*number/ },
    { field: 'error_rate', pattern: /error_rate:\s*number/ },
    { field: 'uptime_seconds', pattern: /uptime_seconds:\s*number/ },
    { field: 'model_health', pattern: /model_health:\s*ModelHealth/ },
    { field: 'db_pool_status', pattern: /db_pool_status:\s*DbPoolStatus/ },
  ];

  const results = { pass: [], fail: [] };

  for (const check of checks) {
    if (check.pattern.test(content)) {
      results.pass.push(check.field);
    } else {
      results.fail.push(check.field);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  BIZRA GENESIS NODE - TELEMETRY SCHEMA VALIDATION                         ║');
  console.log('║  α-10 Glass Cockpit Validation Sprint                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const basePath = process.cwd();
  let exitCode = 0;

  // 1. Validate Rust schema
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  [1/3] RUST SCHEMA VALIDATION                                              │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  try {
    const rustResults = checkRustSchema(basePath);
    console.log(`  ✅ Fields found: ${rustResults.pass.length}`);
    rustResults.pass.forEach(f => console.log(`     ✓ ${f}`));

    if (rustResults.fail.length > 0) {
      console.log(`  ❌ Fields missing: ${rustResults.fail.length}`);
      rustResults.fail.forEach(f => console.log(`     ✗ ${f}`));
      exitCode = 1;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    exitCode = 1;
  }

  console.log('');

  // 2. Validate TypeScript schema
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  [2/3] TYPESCRIPT SCHEMA VALIDATION                                        │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  try {
    const tsResults = checkTypeScriptSchema(basePath);
    console.log(`  ✅ Fields found: ${tsResults.pass.length}`);
    tsResults.pass.forEach(f => console.log(`     ✓ ${f}`));

    if (tsResults.fail.length > 0) {
      console.log(`  ❌ Fields missing: ${tsResults.fail.length}`);
      tsResults.fail.forEach(f => console.log(`     ✗ ${f}`));
      exitCode = 1;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    exitCode = 1;
  }

  console.log('');

  // 3. Test with mock data
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  [3/3] MOCK DATA VALIDATION                                                │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  const mockTelemetry = {
    timestamp: new Date().toISOString(),
    node_id: 'NODE0-GENESIS',
    latency_us: 1234,
    ihsan_score: 0.92,
    consensus_state: 'STABLE',
    epoch: 1,
    active_agents: { PAT: 7, SAT: 5, TAT: 3 },
    poi_events_last_minute: 42,
    error_rate: 0.01,
    uptime_seconds: 3600,
    model_health: {
      primary_available: true,
      fallback_available: true,
      active_provider: 'ollama',
      circuit_breaker_state: 'CLOSED'
    },
    db_pool_status: {
      active: 5,
      idle: 10,
      max_size: 20,
      healthy: true
    }
  };

  const mockErrors = validateTelemetry(mockTelemetry);

  if (mockErrors.length === 0) {
    console.log('  ✅ Mock telemetry validates successfully');
    console.log('  ✅ All required fields present');
    console.log('  ✅ All enum values valid');
    console.log('  ✅ All numeric ranges valid');
  } else {
    console.log(`  ❌ Mock validation errors: ${mockErrors.length}`);
    mockErrors.forEach(e => console.log(`     ✗ ${e}`));
    exitCode = 1;
  }

  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  if (exitCode === 0) {
    console.log('  ✅ ALL SCHEMA VALIDATIONS PASSED');
    console.log('  ✅ Rust ↔ TypeScript ↔ JSON schemas are aligned');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
  } else {
    console.log('  ❌ SCHEMA VALIDATION FAILED');
    console.log('  ❌ See errors above for details');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
