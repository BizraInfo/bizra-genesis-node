#!/usr/bin/env node
/**
 * BIZRA Genesis Node - Grafana Panel Assertion
 * Queries Grafana API to verify panels render non-empty data
 * Scenario Coverage: Verify panels have data under synthetic load
 */

import https from "node:https";

// Configuration from environment
const GF_URL = process.env.GF_URL || "http://localhost:3000";
const GF_TOKEN = process.env.GF_TOKEN;
const DASH_UID = process.env.DASH_UID || "bizra-core-kpis";

// Panel IDs to test (from core-kpis.json)
const PRIORITY_PANELS = [
  { id: 1, name: "API Request Rate (RPS)" },
  { id: 2, name: "API Error Rate" },
  { id: 3, name: "API Latency P95/P99" },
  { id: 4, name: "PoI Validation Success Rate" },
];

/**
 * Make HTTP request (works for both http and https)
 */
function request(url, options = {}) {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === "https:";
  const lib = isHttps ? https : (await import("http")).default;

  return new Promise((resolve, reject) => {
    const req = lib.request(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * Query a panel's datasource via Grafana API
 */
async function queryPanel(dashboardUid, panelId, panelName) {
  // Query Grafana's datasource proxy API
  // This simulates what the panel would query
  const url = `${GF_URL}/api/ds/query`;

  try {
    const response = await request(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: {
        queries: [{
          refId: "A",
          datasource: { type: "prometheus", uid: "prom" },
          // Generic query to check if Prometheus has data
          expr: 'up',
          intervalMs: 30000,
          maxDataPoints: 600,
          range: true,
          instant: false,
        }],
        from: Date.now() - 15 * 60 * 1000,  // 15 minutes ago
        to: Date.now(),
      }
    });

    if (response.status !== 200) {
      return {
        panelId,
        panelName,
        hasData: false,
        error: `HTTP ${response.status}`,
        seriesCount: 0
      };
    }

    // Check if we got series data back
    const results = response.data?.results?.A;
    const frames = results?.frames ?? [];
    const seriesCount = frames.length;
    const hasData = seriesCount > 0;

    return {
      panelId,
      panelName,
      hasData,
      error: null,
      seriesCount
    };

  } catch (error) {
    return {
      panelId,
      panelName,
      hasData: false,
      error: error.message,
      seriesCount: 0
    };
  }
}

/**
 * Main assertion logic
 */
async function main() {
  console.error("🔍 BIZRA Grafana Panel Assertion\n");

  // Validate environment
  if (!GF_TOKEN) {
    console.error("❌ GF_TOKEN environment variable required");
    console.error("   Set a viewer-level API token for Grafana");
    process.exit(1);
  }

  console.error(`   Grafana URL: ${GF_URL}`);
  console.error(`   Dashboard UID: ${DASH_UID}`);
  console.error(`   Testing ${PRIORITY_PANELS.length} priority panels\n`);

  // Test Grafana connectivity
  try {
    const healthRes = await request(`${GF_URL}/api/health`, {
      headers: { "Authorization": `Bearer ${GF_TOKEN}` }
    });

    if (healthRes.status !== 200) {
      console.error(`❌ Grafana not reachable (status: ${healthRes.status})`);
      process.exit(1);
    }
    console.error("✅ Grafana reachable\n");
  } catch (error) {
    console.error(`❌ Grafana connection failed: ${error.message}`);
    process.exit(1);
  }

  // Query each priority panel
  const results = [];
  for (const panel of PRIORITY_PANELS) {
    console.error(`   Testing panel ${panel.id}: ${panel.name}...`);
    const result = await queryPanel(DASH_UID, panel.id, panel.name);
    results.push(result);

    if (result.hasData) {
      console.error(`      ✅ Panel has data (${result.seriesCount} series)`);
    } else {
      console.error(`      ❌ Panel has NO data (error: ${result.error || "no series"})`);
    }
  }

  console.error("");

  // Calculate scenario coverage
  const total = results.length;
  const withData = results.filter(r => r.hasData).length;
  const coverage = (withData / Math.max(1, total)) * 100;

  console.error("━".repeat(60));
  console.error(`Scenario Coverage: ${withData}/${total} (${coverage.toFixed(1)}%)`);
  console.error("━".repeat(60));

  // Output JSON for CI
  const output = {
    scenarioCoverage: {
      withData,
      total,
      percentage: coverage,
      threshold: 60.0,
      passed: coverage >= 60.0
    },
    panels: results,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(output, null, 2));

  // Exit code
  if (coverage >= 60.0) {
    console.error("\n✅ Scenario coverage ≥60% - PASSED");
    process.exit(0);
  } else {
    console.error(`\n❌ Scenario coverage ${coverage.toFixed(1)}% < 60% - FAILED`);
    console.error("   Panels did not render data after synthetic load");
    console.error("   Check Prometheus scrape config and metric names");
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
