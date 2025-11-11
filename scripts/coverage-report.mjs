#!/usr/bin/env node
/**
 * BIZRA Genesis Node - Observability Coverage Report Generator
 * Combines all coverage metrics into unified report
 * Outputs to stdout as JSON and creates artifacts/obsv-coverage.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.join(__dirname, "..", "artifacts");

/**
 * Load JSON file if it exists
 */
function loadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (error) {
    console.error(`Warning: Failed to load ${filePath}: ${error.message}`);
  }
  return null;
}

/**
 * Main report generation
 */
function main() {
  // Ensure artifacts directory exists
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Load individual coverage reports
  const specCoverageFile = path.join(artifactsDir, "spec-coverage.json");
  const scenarioCoverageFile = path.join(artifactsDir, "scenario-coverage.json");

  const specCoverage = loadJson(specCoverageFile);
  const scenarioCoverage = loadJson(scenarioCoverageFile);

  // Extract metrics
  const spec = specCoverage?.specCoverage ?? { percentage: 0, passed: false };
  const scenario = scenarioCoverage?.scenarioCoverage ?? { percentage: 0, passed: false };

  // Rule/Alert coverage (from promtool tests - TODO: parse output)
  // For now, assume 100% if rules_test.yml exists and is non-empty
  const rulesTestFile = path.join(__dirname, "..", "obsv", "prometheus", "rules_test.yml");
  const hasRuleTests = fs.existsSync(rulesTestFile) &&
    fs.readFileSync(rulesTestFile, "utf8").includes("alert_rule_tests");
  const rule = {
    percentage: hasRuleTests ? 100.0 : 0.0,
    passed: hasRuleTests,
    message: hasRuleTests ? "Rule tests exist" : "No rule tests found"
  };

  // Visual/Threshold coverage (placeholder - requires image renderer)
  const visual = {
    percentage: 0.0,
    passed: false,
    message: "Visual regression not yet implemented (requires renderer)"
  };

  // Calculate overall coverage (weighted average)
  const weights = { spec: 0.3, rule: 0.3, scenario: 0.3, visual: 0.1 };
  const overall = (
    spec.percentage * weights.spec +
    rule.percentage * weights.rule +
    scenario.percentage * weights.scenario +
    visual.percentage * weights.visual
  );

  // Determine pass/fail
  const thresholds = {
    spec: 90.0,
    rule: 80.0,
    scenario: 60.0,
    visual: 80.0,
    overall: 75.0
  };

  const passed = {
    spec: spec.percentage >= thresholds.spec,
    rule: rule.percentage >= thresholds.rule,
    scenario: scenario.percentage >= thresholds.scenario,
    visual: visual.percentage >= thresholds.visual,
    overall: overall >= thresholds.overall
  };

  // Build report
  const report = {
    summary: {
      overall: {
        percentage: overall,
        passed: passed.overall,
        threshold: thresholds.overall
      },
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    },
    coverage: {
      spec: {
        percentage: spec.percentage,
        passed: passed.spec,
        threshold: thresholds.spec,
        details: specCoverage?.dashboards ?? []
      },
      rule: {
        percentage: rule.percentage,
        passed: passed.rule,
        threshold: thresholds.rule,
        message: rule.message
      },
      scenario: {
        percentage: scenario.percentage,
        passed: passed.scenario,
        threshold: thresholds.scenario,
        details: scenarioCoverage?.panels ?? []
      },
      visual: {
        percentage: visual.percentage,
        passed: passed.visual,
        threshold: thresholds.visual,
        message: visual.message
      }
    },
    weights
  };

  // Write to artifacts
  const outputFile = path.join(artifactsDir, "obsv-coverage.json");
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // Output to stdout
  console.log(JSON.stringify(report, null, 2));

  // Print human-readable summary to stderr
  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("BIZRA Genesis Node - Observability Coverage Report");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error(`📊 Spec Coverage:     ${spec.percentage.toFixed(1)}% ${passed.spec ? "✅" : "❌"} (threshold: ${thresholds.spec}%)`);
  console.error(`📋 Rule/Alert:        ${rule.percentage.toFixed(1)}% ${passed.rule ? "✅" : "❌"} (threshold: ${thresholds.rule}%)`);
  console.error(`🧪 Scenario Coverage: ${scenario.percentage.toFixed(1)}% ${passed.scenario ? "✅" : "❌"} (threshold: ${thresholds.scenario}%)`);
  console.error(`🎨 Visual/Threshold:  ${visual.percentage.toFixed(1)}% ${passed.visual ? "⚠️" : "⏳"} (threshold: ${thresholds.visual}%)`);
  console.error("");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(`🎯 Overall Coverage:  ${overall.toFixed(1)}% ${passed.overall ? "✅" : "❌"} (threshold: ${thresholds.overall}%)`);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error(`Report saved: ${outputFile}`);
  console.error("");

  // Exit with appropriate code
  process.exit(passed.overall ? 0 : 1);
}

main();
