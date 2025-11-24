#!/usr/bin/env node
/**
 * BIZRA Genesis Node - Dashboard Spec Coverage Validator
 * Validates dashboard JSON files for required fields and security compliance
 * Target: ≥90% spec coverage
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardsDir = path.join(__dirname, "..", "obsv", "grafana", "dashboards");

// Critical fields required for valid dashboard
const REQUIRED_FIELDS = [
  "uid",
  "title",
  "panels",
  "schemaVersion",
  "tags",
  "timezone"
];

// Security checks
const SECURITY_CHECKS = {
  signed_plugins: (dashboard) => {
    const inputs = dashboard.__inputs ?? [];
    const requires = dashboard.__requires ?? [];
    const allPlugins = [...inputs, ...requires];

    // Check for unsigned or dev plugins
    return allPlugins.every(plugin => {
      const id = plugin?.pluginId || plugin?.id || "";
      return !/unsigned|dev|test/i.test(id);
    });
  },

  no_external_datasources: (dashboard) => {
    const panels = dashboard.panels ?? [];
    return panels.every(panel => {
      const datasource = panel.datasource;
      if (!datasource) return true;

      // Ensure datasource is internal (not external URL)
      const url = datasource.url ?? "";
      return !url.startsWith("http://") && !url.startsWith("https://");
    });
  },

  has_stable_uid: (dashboard) => {
    return typeof dashboard.uid === "string" && dashboard.uid.length > 0;
  }
};

/**
 * Validate a single dashboard
 */
function validateDashboard(filePath) {
  const fileName = path.basename(filePath);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const dashboard = JSON.parse(content);

    const issues = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in dashboard)) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Run security checks
    for (const [checkName, checkFn] of Object.entries(SECURITY_CHECKS)) {
      if (!checkFn(dashboard)) {
        issues.push(`Security check failed: ${checkName}`);
      }
    }

    // Validate panels
    const panels = dashboard.panels ?? [];
    if (panels.length === 0) {
      issues.push("Dashboard has no panels");
    }

    panels.forEach((panel, idx) => {
      if (!panel.id) {
        issues.push(`Panel ${idx} missing id`);
      }
      if (!panel.type) {
        issues.push(`Panel ${idx} missing type`);
      }
      if (!panel.datasource) {
        issues.push(`Panel ${idx} missing datasource`);
      }
    });

    return {
      file: fileName,
      valid: issues.length === 0,
      issues,
      uid: dashboard.uid,
      title: dashboard.title,
      panelCount: panels.length
    };

  } catch (error) {
    return {
      file: fileName,
      valid: false,
      issues: [`Parse error: ${error.message}`],
      uid: null,
      title: null,
      panelCount: 0
    };
  }
}

/**
 * Main validation logic
 */
function main() {
  console.error("🔍 BIZRA Dashboard Spec Coverage Validator\n");

  // Check if dashboards directory exists
  if (!fs.existsSync(dashboardsDir)) {
    console.error(`❌ Dashboards directory not found: ${dashboardsDir}`);
    process.exit(1);
  }

  // Find all dashboard JSON files
  const files = fs.readdirSync(dashboardsDir)
    .filter(f => f.endsWith(".json"))
    .map(f => path.join(dashboardsDir, f));

  if (files.length === 0) {
    console.error("⚠️  No dashboard JSON files found");
    process.exit(1);
  }

  console.error(`📊 Found ${files.length} dashboard(s)\n`);

  // Validate each dashboard
  const results = files.map(validateDashboard);

  // Calculate coverage
  const total = results.length;
  const valid = results.filter(r => r.valid).length;
  const coverage = (valid / Math.max(1, total)) * 100;

  // Print results
  console.error("Results:\n");
  results.forEach(result => {
    const status = result.valid ? "✅ PASS" : "❌ FAIL";
    console.error(`${status} ${result.file}`);
    console.error(`   UID: ${result.uid ?? "N/A"}`);
    console.error(`   Title: ${result.title ?? "N/A"}`);
    console.error(`   Panels: ${result.panelCount}`);

    if (result.issues.length > 0) {
      console.error(`   Issues:`);
      result.issues.forEach(issue => {
        console.error(`     - ${issue}`);
      });
    }
    console.error("");
  });

  // Summary
  console.error("━".repeat(60));
  console.error(`Spec Coverage: ${valid}/${total} (${coverage.toFixed(1)}%)`);
  console.error("━".repeat(60));

  // Output JSON for CI
  const output = {
    specCoverage: {
      valid,
      total,
      percentage: coverage,
      threshold: 90.0,
      passed: coverage >= 90.0
    },
    dashboards: results.map(r => ({
      file: r.file,
      uid: r.uid,
      title: r.title,
      valid: r.valid,
      panelCount: r.panelCount,
      issues: r.issues
    })),
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(output, null, 2));

  // Exit code
  if (coverage >= 90.0) {
    console.error("\n✅ Spec coverage ≥90% - PASSED");
    process.exit(0);
  } else {
    console.error(`\n❌ Spec coverage ${coverage.toFixed(1)}% < 90% - FAILED`);
    process.exit(1);
  }
}

main();
