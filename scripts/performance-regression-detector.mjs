#!/usr/bin/env node

/**
 * Performance Regression Detector
 * A+ Quality Assurance Tool for BIZRA Genesis Node
 *
 * This script analyzes performance benchmarks and detects regressions
 * that would impact the A+ quality standards.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class PerformanceRegressionDetector {
    constructor() {
        this.baselineFile = join(process.cwd(), '.performance-baselines.json');
        this.regressionThreshold = 0.05; // 5% regression threshold
        this.improvementThreshold = 0.02; // 2% improvement threshold
    }

    /**
     * Load performance baseline data
     */
    loadBaseline() {
        if (!existsSync(this.baselineFile)) {
            console.log('📊 No baseline file found. Creating initial baseline...');
            return {};
        }

        try {
            const data = readFileSync(this.baselineFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Error loading baseline file:', error.message);
            return {};
        }
    }

    /**
     * Save performance baseline data
     */
    saveBaseline(data) {
        try {
            writeFileSync(this.baselineFile, JSON.stringify(data, null, 2));
            console.log('💾 Baseline updated successfully');
        } catch (error) {
            console.error('❌ Error saving baseline:', error.message);
        }
    }

    /**
     * Parse Criterion benchmark results
     */
    parseCriterionResults(resultsPath) {
        const results = {};

        try {
            // Read Criterion output files
            const fs = require('fs');
            const path = require('path');

            // Look for criterion results in target/criterion
            const criterionDir = join(process.cwd(), 'target', 'criterion');

            if (!fs.existsSync(criterionDir)) {
                console.log('⚠️  No Criterion results found');
                return results;
            }

            // Parse each benchmark group
            const groups = fs.readdirSync(criterionDir);
            for (const group of groups) {
                const groupPath = path.join(criterionDir, group);
                if (fs.statSync(groupPath).isDirectory()) {
                    const estimatesFile = path.join(groupPath, 'estimates.json');
                    if (fs.existsSync(estimatesFile)) {
                        const estimates = JSON.parse(fs.readFileSync(estimatesFile, 'utf8'));
                        results[group] = {
                            mean: estimates.mean.point_estimate,
                            std_dev: estimates.mean.standard_error,
                            slope: estimates.slope?.point_estimate || null,
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error parsing Criterion results:', error.message);
        }

        return results;
    }

    /**
     * Detect performance regressions
     */
    detectRegressions(currentResults, baselineResults) {
        const regressions = [];
        const improvements = [];

        for (const [benchmark, current] of Object.entries(currentResults)) {
            const baseline = baselineResults[benchmark];

            if (!baseline) {
                console.log(`📊 New benchmark detected: ${benchmark}`);
                continue;
            }

            const regression = (current.mean - baseline.mean) / baseline.mean;

            if (regression > this.regressionThreshold) {
                regressions.push({
                    benchmark,
                    regression: (regression * 100).toFixed(2),
                    current: current.mean,
                    baseline: baseline.mean,
                    severity: regression > 0.10 ? 'CRITICAL' : 'WARNING'
                });
            } else if (regression < -this.improvementThreshold) {
                improvements.push({
                    benchmark,
                    improvement: Math.abs(regression * 100).toFixed(2),
                    current: current.mean,
                    baseline: baseline.mean
                });
            }
        }

        return { regressions, improvements };
    }

    /**
     * Generate performance report
     */
    generateReport(currentResults, baselineResults, regressions, improvements) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalBenchmarks: Object.keys(currentResults).length,
                regressions: regressions.length,
                improvements: improvements.length,
                criticalRegressions: regressions.filter(r => r.severity === 'CRITICAL').length
            },
            regressions,
            improvements,
            recommendations: []
        };

        // Generate recommendations
        if (regressions.length > 0) {
            report.recommendations.push('🚨 Performance regressions detected - review code changes');
            if (regressions.some(r => r.severity === 'CRITICAL')) {
                report.recommendations.push('🚨 CRITICAL regressions found - immediate investigation required');
            }
        }

        if (improvements.length > 0) {
            report.recommendations.push('✅ Performance improvements detected - consider updating baselines');
        }

        return report;
    }

    /**
     * Main execution function
     */
    async run() {
        console.log('🚀 BIZRA Performance Regression Detector');
        console.log('=====================================');

        // Load baseline
        const baselineResults = this.loadBaseline();

        // Parse current results
        const currentResults = this.parseCriterionResults();

        if (Object.keys(currentResults).length === 0) {
            console.log('⚠️  No performance results found to analyze');
            return 1;
        }

        // Detect regressions
        const { regressions, improvements } = this.detectRegressions(currentResults, baselineResults);

        // Generate report
        const report = this.generateReport(currentResults, baselineResults, regressions, improvements);

        // Display results
        console.log(`\n📊 Analysis Results:`);
        console.log(`   Benchmarks: ${report.summary.totalBenchmarks}`);
        console.log(`   Regressions: ${report.summary.regressions}`);
        console.log(`   Improvements: ${report.summary.improvements}`);

        if (regressions.length > 0) {
            console.log('\n❌ Performance Regressions:');
            regressions.forEach(r => {
                console.log(`   ${r.severity}: ${r.benchmark} (+${r.regression}%)`);
            });
        }

        if (improvements.length > 0) {
            console.log('\n✅ Performance Improvements:');
            improvements.forEach(i => {
                console.log(`   ${i.benchmark} (-${i.improvement}%)`);
            });
        }

        // Save updated baseline if no critical regressions
        const hasCriticalRegressions = regressions.some(r => r.severity === 'CRITICAL');
        if (!hasCriticalRegressions) {
            const updatedBaseline = { ...baselineResults, ...currentResults };
            this.saveBaseline(updatedBaseline);
        }

        // Save report
        const reportFile = join(process.cwd(), 'performance-report.json');
        writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report saved to: ${reportFile}`);

        // Exit with error code if regressions found
        if (regressions.length > 0) {
            console.log('\n❌ Performance regression detected - failing CI/CD pipeline');
            return 1;
        }

        console.log('\n✅ No performance regressions detected');
        return 0;
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const detector = new PerformanceRegressionDetector();
    detector.run().then(code => {
        process.exit(code);
    }).catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default PerformanceRegressionDetector;
