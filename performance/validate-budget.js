/**
 * BIZRA Genesis Node - Performance Budget Validator CLI
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * Validates Lighthouse and K6 results against performance budget
 * Usage: node validate-budget.js lighthouse-report.json k6-results.json
 */

const fs = require('fs');
const path = require('path');

// Import performance budget
const { performanceBudget, PerformanceBudgetValidator } = require('./performance-budget.js');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Parse Lighthouse JSON report
 */
function parseLighthouseReport(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const metrics = {
      'first-contentful-paint': data.audits?.['first-contentful-paint']?.numericValue || 0,
      'largest-contentful-paint': data.audits?.['largest-contentful-paint']?.numericValue || 0,
      'cumulative-layout-shift': data.audits?.['cumulative-layout-shift']?.numericValue || 0,
      'first-input-delay': data.audits?.['max-potential-fid']?.numericValue || 0,
      'interaction-to-next-paint': data.audits?.['interactive']?.numericValue || 0,
    };
    
    return {
      coreWebVitals: Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [key, { value }])
      ),
      scores: {
        performance: data.categories?.performance?.score * 100 || 0,
        accessibility: data.categories?.accessibility?.score * 100 || 0,
        bestPractices: data.categories?.['best-practices']?.score * 100 || 0,
        seo: data.categories?.seo?.score * 100 || 0,
      },
    };
  } catch (error) {
    console.error(`${colors.red}Error parsing Lighthouse report: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Parse K6 JSON results
 */
function parseK6Results(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Extract metrics from K6 output
    const metrics = {
      apiPerformance: {},
      aiSovereigntyPerformance: {},
    };
    
    // Parse K6 metrics format
    if (data.metrics) {
      // HTTP request duration
      if (data.metrics.http_req_duration) {
        metrics.apiPerformance['/api/*'] = {
          'p50-response-time': { value: data.metrics.http_req_duration.values.p50 || 0 },
          'p95-response-time': { value: data.metrics.http_req_duration.values.p95 || 0 },
          'p99-response-time': { value: data.metrics.http_req_duration.values.p99 || 0 },
        };
      }
      
      // Custom metrics
      if (data.metrics.api_latency) {
        metrics.apiPerformance['/api/health'] = {
          'p50-response-time': { value: data.metrics.api_latency.values.p50 || 0 },
          'p95-response-time': { value: data.metrics.api_latency.values.p95 || 0 },
        };
      }
      
      if (data.metrics.pat_agent_latency) {
        metrics.aiSovereigntyPerformance['pat-agent-latency'] = {
          value: data.metrics.pat_agent_latency.values.p95 || 0,
        };
      }
      
      if (data.metrics.sovereignty_check_latency) {
        metrics.aiSovereigntyPerformance['sovereignty-verification-time'] = {
          value: data.metrics.sovereignty_check_latency.values.p95 || 0,
        };
      }
      
      // Error rate
      if (data.metrics.errors) {
        metrics.errorRate = data.metrics.errors.values.rate || 0;
      }
    }
    
    return metrics;
  } catch (error) {
    console.error(`${colors.yellow}Warning: Could not parse K6 results: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Print validation summary
 */
function printSummary(results) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.cyan}  BIZRA PERFORMANCE BUDGET VALIDATION REPORT${colors.reset}`);
  console.log('═'.repeat(60) + '\n');
  
  const { summary } = results;
  
  // Overall status
  const status = summary.critical_violations === 0 ? 'PASSED' : 'FAILED';
  const statusColor = status === 'PASSED' ? colors.green : colors.red;
  
  console.log(`${colors.bold}Status: ${statusColor}${status}${colors.reset}\n`);
  
  // Summary metrics
  console.log(`${colors.blue}📊 Summary:${colors.reset}`);
  console.log(`   Total Checks:       ${summary.total_checks}`);
  console.log(`   ${colors.green}✓ Passed:${colors.reset}            ${summary.passed_checks}`);
  console.log(`   ${colors.red}✗ Violations:${colors.reset}        ${summary.violations_count}`);
  console.log(`   ${colors.red}⚠ Critical:${colors.reset}          ${summary.critical_violations}`);
  console.log(`   Success Rate:       ${(summary.success_rate * 100).toFixed(1)}%\n`);
  
  // Detailed violations
  if (summary.violations_count > 0) {
    console.log(`${colors.red}${colors.bold}❌ Violations:${colors.reset}\n`);
    
    Object.entries(results.budget_validation).forEach(([category, endpoints]) => {
      Object.entries(endpoints).forEach(([endpoint, constraints]) => {
        Object.entries(constraints).forEach(([constraint, result]) => {
          if (result.violated) {
            const severityColor = result.severity === 'critical' ? colors.red :
                                  result.severity === 'high' ? colors.yellow : colors.magenta;
            
            console.log(`   ${severityColor}[${result.severity.toUpperCase()}]${colors.reset} ${category} → ${endpoint}`);
            console.log(`      Metric: ${constraint}`);
            console.log(`      Actual: ${result.actual} ${result.unit || ''}`);
            console.log(`      Budget: ${result.threshold} ${result.unit || ''}`);
            console.log('');
          }
        });
      });
    });
  }
  
  // Elite standards notice
  console.log('─'.repeat(60));
  console.log(`${colors.cyan}🚀 BIZRA Elite Performance Standards Applied${colors.reset}`);
  console.log('   Core Web Vitals: FAANG-level targets');
  console.log('   API Latency: p95 < 500ms');
  console.log('   AI Agent Response: < 500ms');
  console.log('   Sovereignty Verification: < 200ms\n');
  
  return status === 'PASSED' ? 0 : 1;
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${colors.cyan}🔍 BIZRA Performance Budget Validator${colors.reset}\n`);
  
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node validate-budget.js <lighthouse-report.json> [k6-results.json]');
    console.log('\nExample:');
    console.log('  node validate-budget.js lighthouse-report.json');
    console.log('  node validate-budget.js lighthouse-report.json k6-results.json');
    process.exit(1);
  }
  
  const lighthousePath = args[0];
  const k6Path = args[1];
  
  // Parse reports
  console.log(`📄 Reading Lighthouse report: ${lighthousePath}`);
  const lighthouseData = parseLighthouseReport(lighthousePath);
  
  let k6Data = null;
  if (k6Path && fs.existsSync(k6Path)) {
    console.log(`📄 Reading K6 report: ${k6Path}`);
    k6Data = parseK6Results(k6Path);
  }
  
  // Merge test results
  const testResults = {
    ...lighthouseData,
    ...(k6Data || {}),
  };
  
  if (!lighthouseData) {
    console.error(`${colors.red}Failed to parse Lighthouse report${colors.reset}`);
    process.exit(1);
  }
  
  // Print Lighthouse scores
  if (lighthouseData.scores) {
    console.log(`\n${colors.blue}📈 Lighthouse Scores:${colors.reset}`);
    Object.entries(lighthouseData.scores).forEach(([category, score]) => {
      const scoreColor = score >= 90 ? colors.green : score >= 50 ? colors.yellow : colors.red;
      console.log(`   ${category}: ${scoreColor}${score.toFixed(0)}${colors.reset}`);
    });
  }
  
  // Validate against budget
  console.log(`\n⚡ Validating against BIZRA Elite Performance Budget...\n`);
  
  const validator = new PerformanceBudgetValidator(performanceBudget);
  const results = await validator.validateSuite(testResults);
  
  // Print summary and exit with appropriate code
  const exitCode = printSummary(results);
  
  // Write HTML report
  const reportPath = path.join(__dirname, 'performance-report.html');
  fs.writeFileSync(reportPath, results.htmlReport);
  console.log(`${colors.green}📊 HTML Report: ${reportPath}${colors.reset}\n`);
  
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { parseLighthouseReport, parseK6Results };
