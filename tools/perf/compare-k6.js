#!/usr/bin/env node
const fs = require('fs');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const summaryPath = process.argv[2] || 'k6-summary.json';
  const baselinePath = process.argv[3] || null;
  const maxP95 = parseFloat(process.env.MAX_P95_MS || '500');
  const maxErr = parseFloat(process.env.MAX_ERROR_RATE || '0.01');
  const maxRegressionPct = parseFloat(process.env.MAX_REGRESSION_PCT || '10');

  const s = readJson(summaryPath);
  const p95 = s.metrics.http_req_duration['p(95)'];
  const err = s.metrics.http_req_failed ? s.metrics.http_req_failed.rate : 0;

  console.log(`P95=${p95}ms, ErrorRate=${err}`);
  if (p95 > maxP95) {
    console.error(`::error::P95 ${p95}ms exceeds limit ${maxP95}ms`);
    process.exit(1);
  }
  if (err > maxErr) {
    console.error(`::error::Error rate ${err} exceeds limit ${maxErr}`);
    process.exit(1);
  }

  if (baselinePath && fs.existsSync(baselinePath)) {
    const b = readJson(baselinePath);
    const b95 = b.metrics.http_req_duration['p(95)'];
    const change = ((p95 - b95) / b95) * 100;
    console.log(`Baseline P95=${b95}ms, Change=${change.toFixed(2)}%`);
    if (change > maxRegressionPct) {
      console.error(`::error::P95 regression ${change.toFixed(2)}% exceeds ${maxRegressionPct}%`);
      process.exit(1);
    }
  }
}

main();
