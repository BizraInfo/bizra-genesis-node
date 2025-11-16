#!/usr/bin/env node

/**
 * BIZRA Genesis Node - Professional Performance Monitoring Suite
 *
 * Features:
 * - Real-time performance metrics collection
 * - Automated regression detection
 * - Performance baseline comparisons
 * - Comprehensive benchmarking
 * - Alert generation for performance anomalies
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class PerformanceMonitor {
    constructor() {
        this.baselines = {};
        this.currentMetrics = {};
        this.alerts = [];
        this.baselineFile = path.join(__dirname, '..', 'performance-baselines.json');
        this.metricsHistory = [];
    }

    async initialize() {
        console.log('🚀 Initializing BIZRA Performance Monitoring Suite...');

        // Load existing baselines
        await this.loadBaselines();

        // Setup monitoring directories
        await this.setupDirectories();

        // Initialize metrics collectors
        this.setupMetricsCollectors();

        console.log('✅ Performance monitoring initialized');
    }

    async loadBaselines() {
        try {
            const data = await fs.readFile(this.baselineFile, 'utf8');
            this.baselines = JSON.parse(data);
            console.log(`📊 Loaded ${Object.keys(this.baselines).length} performance baselines`);
        } catch (error) {
            console.log('📝 No existing baselines found, starting fresh');
            this.baselines = {};
        }
    }

    async setupDirectories() {
        const dirs = [
            'performance-reports',
            'benchmark-results',
            'metrics-history'
        ];

        for (const dir of dirs) {
            const dirPath = path.join(__dirname, '..', dir);
            try {
                await fs.mkdir(dirPath, { recursive: true });
            } catch (error) {
                // Directory might already exist
            }
        }
    }

    setupMetricsCollectors() {
        // System metrics
        this.systemMetrics = {
            cpu: () => os.loadavg()[0],
            memory: () => {
                const total = os.totalmem();
                const free = os.freemem();
                return {
                    total,
                    free,
                    used: total - free,
                    usagePercent: ((total - free) / total) * 100
                };
            },
            uptime: () => os.uptime()
        };

        // Process metrics (if available)
        this.processMetrics = {
            pid: process.pid,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
        };
    }

    async runComprehensiveBenchmark() {
        console.log('🏃 Running comprehensive performance benchmark...');

        const results = {
            timestamp: new Date().toISOString(),
            system: this.collectSystemMetrics(),
            benchmarks: {}
        };

        try {
            // Rust benchmarks
            console.log('🔧 Running Rust benchmarks...');
            const rustBenchmarks = await this.runRustBenchmarks();
            results.benchmarks.rust = rustBenchmarks;

            // Node.js benchmarks (if applicable)
            console.log('📦 Running Node.js benchmarks...');
            const nodeBenchmarks = await this.runNodeBenchmarks();
            results.benchmarks.nodejs = nodeBenchmarks;

            // Integration benchmarks
            console.log('🔗 Running integration benchmarks...');
            const integrationBenchmarks = await this.runIntegrationBenchmarks();
            results.benchmarks.integration = integrationBenchmarks;

        } catch (error) {
            console.error('❌ Benchmark execution failed:', error.message);
            results.error = error.message;
        }

        // Save results
        await this.saveBenchmarkResults(results);

        // Analyze results
        await this.analyzeBenchmarkResults(results);

        return results;
    }

    collectSystemMetrics() {
        return {
            cpu: this.systemMetrics.cpu(),
            memory: this.systemMetrics.memory(),
            uptime: this.systemMetrics.uptime(),
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem()
        };
    }

    async runRustBenchmarks() {
        const results = {};

        try {
            // Run cargo bench
            const output = execSync('cargo bench --all-features -- --verbose', {
                cwd: path.join(__dirname, '..'),
                encoding: 'utf8',
                timeout: 300000 // 5 minutes
            });

            // Parse benchmark results
            results.raw = output;
            results.parsed = this.parseCargoBenchOutput(output);

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    async runNodeBenchmarks() {
        const results = {};

        try {
            // Check if there are Node.js benchmarks
            const packageJson = path.join(__dirname, '..', 'package.json');
            const exists = await fs.access(packageJson).then(() => true).catch(() => false);

            if (exists) {
                const output = execSync('npm run bench', {
                    cwd: path.join(__dirname, '..'),
                    encoding: 'utf8',
                    timeout: 120000 // 2 minutes
                });

                results.raw = output;
                results.parsed = this.parseNodeBenchOutput(output);
            } else {
                results.message = 'No Node.js benchmarks found';
            }

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    async runIntegrationBenchmarks() {
        const results = {};

        try {
            // Run k6 load tests
            const k6Dir = path.join(__dirname, '..', 'k6');
            const exists = await fs.access(k6Dir).then(() => true).catch(() => false);

            if (exists) {
                const scenarios = await fs.readdir(path.join(k6Dir, 'scenarios'));

                for (const scenario of scenarios) {
                    if (scenario.endsWith('.js')) {
                        console.log(`Running k6 scenario: ${scenario}`);
                        const output = execSync(`k6 run ${scenario}`, {
                            cwd: path.join(k6Dir, 'scenarios'),
                            encoding: 'utf8',
                            timeout: 180000 // 3 minutes
                        });

                        results[scenario] = this.parseK6Output(output);
                    }
                }
            } else {
                results.message = 'No k6 integration tests found';
            }

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    parseCargoBenchOutput(output) {
        const lines = output.split('\n');
        const results = {};

        for (const line of lines) {
            // Parse benchmark results
            const match = line.match(/test (\w+)\s+...\s+bench:\s+([0-9,]+) ns\/iter/);
            if (match) {
                const [, name, time] = match;
                results[name] = {
                    time_ns: parseInt(time.replace(/,/g, '')),
                    time_ms: parseInt(time.replace(/,/g, '')) / 1_000_000
                };
            }
        }

        return results;
    }

    parseNodeBenchOutput(output) {
        // Basic parsing for Node.js benchmark output
        return { raw: output };
    }

    parseK6Output(output) {
        const results = {};

        // Parse k6 summary
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('http_req_duration')) {
                const match = line.match(/http_req_duration.*?avg=([0-9.]+)/);
                if (match) {
                    results.avgResponseTime = parseFloat(match[1]);
                }
            }
            if (line.includes('http_req_failed')) {
                const match = line.match(/http_req_failed.*?([0-9.]+)%/);
                if (match) {
                    results.errorRate = parseFloat(match[1]);
                }
            }
        }

        return results;
    }

    async saveBenchmarkResults(results) {
        const filename = `benchmark-${Date.now()}.json`;
        const filepath = path.join(__dirname, '..', 'benchmark-results', filename);

        await fs.writeFile(filepath, JSON.stringify(results, null, 2));
        console.log(`💾 Benchmark results saved to ${filepath}`);
    }

    async analyzeBenchmarkResults(results) {
        console.log('🔍 Analyzing benchmark results...');

        const analysis = {
            timestamp: results.timestamp,
            summary: {},
            regressions: [],
            improvements: [],
            alerts: []
        };

        // Compare with baselines
        for (const [category, benchmarks] of Object.entries(results.benchmarks)) {
            if (benchmarks.parsed) {
                for (const [name, metrics] of Object.entries(benchmarks.parsed)) {
                    const baselineKey = `${category}.${name}`;

                    if (this.baselines[baselineKey]) {
                        const baseline = this.baselines[baselineKey];
                        const current = metrics.time_ms || metrics.avgResponseTime || 0;

                        const changePercent = ((current - baseline.avg) / baseline.avg) * 100;

                        if (Math.abs(changePercent) > 5) { // 5% threshold
                            if (changePercent > 0) {
                                analysis.regressions.push({
                                    benchmark: baselineKey,
                                    change: changePercent,
                                    baseline: baseline.avg,
                                    current
                                });
                            } else {
                                analysis.improvements.push({
                                    benchmark: baselineKey,
                                    change: Math.abs(changePercent),
                                    baseline: baseline.avg,
                                    current
                                });
                            }
                        }
                    }
                }
            }
        }

        // Generate alerts for significant regressions
        for (const regression of analysis.regressions) {
            if (regression.change > 10) { // 10% regression threshold
                analysis.alerts.push({
                    level: 'CRITICAL',
                    message: `Performance regression detected: ${regression.benchmark} degraded by ${regression.change.toFixed(2)}%`,
                    details: regression
                });
            }
        }

        // Save analysis
        const filename = `analysis-${Date.now()}.json`;
        const filepath = path.join(__dirname, '..', 'performance-reports', filename);
        await fs.writeFile(filepath, JSON.stringify(analysis, null, 2));

        // Update baselines if this is a good run
        if (analysis.regressions.length === 0) {
            await this.updateBaselines(results);
        }

        // Report results
        this.reportAnalysis(analysis);

        return analysis;
    }

    async updateBaselines(results) {
        console.log('📊 Updating performance baselines...');

        for (const [category, benchmarks] of Object.entries(results.benchmarks)) {
            if (benchmarks.parsed) {
                for (const [name, metrics] of Object.entries(benchmarks.parsed)) {
                    const key = `${category}.${name}`;
                    const value = metrics.time_ms || metrics.avgResponseTime || 0;

                    if (!this.baselines[key]) {
                        this.baselines[key] = {
                            avg: value,
                            min: value,
                            max: value,
                            samples: 1,
                            lastUpdated: results.timestamp
                        };
                    } else {
                        const baseline = this.baselines[key];
                        baseline.samples += 1;
                        baseline.avg = (baseline.avg * (baseline.samples - 1) + value) / baseline.samples;
                        baseline.min = Math.min(baseline.min, value);
                        baseline.max = Math.max(baseline.max, value);
                        baseline.lastUpdated = results.timestamp;
                    }
                }
            }
        }

        await fs.writeFile(this.baselineFile, JSON.stringify(this.baselines, null, 2));
        console.log('✅ Baselines updated');
    }

    reportAnalysis(analysis) {
        console.log('\n📈 Performance Analysis Report');
        console.log('================================');

        if (analysis.regressions.length > 0) {
            console.log('\n⚠️  Performance Regressions:');
            for (const reg of analysis.regressions) {
                console.log(`  - ${reg.benchmark}: +${reg.change.toFixed(2)}% (${reg.baseline.toFixed(2)}ms → ${reg.current.toFixed(2)}ms)`);
            }
        }

        if (analysis.improvements.length > 0) {
            console.log('\n✅ Performance Improvements:');
            for (const imp of analysis.improvements) {
                console.log(`  - ${imp.benchmark}: -${imp.change.toFixed(2)}% (${imp.baseline.toFixed(2)}ms → ${imp.current.toFixed(2)}ms)`);
            }
        }

        if (analysis.alerts.length > 0) {
            console.log('\n🚨 Critical Alerts:');
            for (const alert of analysis.alerts) {
                console.log(`  ${alert.level}: ${alert.message}`);
            }
        }

        if (analysis.regressions.length === 0 && analysis.improvements.length === 0) {
            console.log('\n✅ No significant performance changes detected');
        }
    }

    async startRealTimeMonitoring(intervalMs = 5000) {
        console.log(`🔍 Starting real-time performance monitoring (interval: ${intervalMs}ms)...`);

        this.monitoringInterval = setInterval(async () => {
            const metrics = {
                timestamp: new Date().toISOString(),
                system: this.collectSystemMetrics(),
                process: this.collectProcessMetrics()
            };

            this.metricsHistory.push(metrics);

            // Keep only last 1000 entries
            if (this.metricsHistory.length > 1000) {
                this.metricsHistory.shift();
            }

            // Check for anomalies
            await this.checkAnomalies(metrics);

        }, intervalMs);
    }

    collectProcessMetrics() {
        return {
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage()
        };
    }

    async checkAnomalies(currentMetrics) {
        if (this.metricsHistory.length < 10) return; // Need some history

        const recent = this.metricsHistory.slice(-10);
        const avgMemory = recent.reduce((sum, m) => sum + m.process.memory.heapUsed, 0) / recent.length;

        const memoryThreshold = avgMemory * 1.5; // 50% above average

        if (currentMetrics.process.memory.heapUsed > memoryThreshold) {
            const alert = {
                timestamp: currentMetrics.timestamp,
                type: 'MEMORY_SPIKE',
                message: `Memory usage spike detected: ${currentMetrics.process.memory.heapUsed} bytes`,
                threshold: memoryThreshold,
                current: currentMetrics.process.memory.heapUsed
            };

            this.alerts.push(alert);
            console.log(`🚨 ${alert.message}`);
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            period: {
                start: this.metricsHistory[0]?.timestamp,
                end: this.metricsHistory[this.metricsHistory.length - 1]?.timestamp
            },
            summary: {
                totalSamples: this.metricsHistory.length,
                alertsGenerated: this.alerts.length,
                baselinesCount: Object.keys(this.baselines).length
            },
            system: this.collectSystemMetrics(),
            alerts: this.alerts.slice(-10), // Last 10 alerts
            recommendations: this.generateRecommendations()
        };

        const filename = `performance-report-${Date.now()}.json`;
        const filepath = path.join(__dirname, '..', 'performance-reports', filename);

        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        console.log(`📋 Performance report generated: ${filepath}`);

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        // Analyze recent performance
        if (this.alerts.length > 5) {
            recommendations.push({
                priority: 'HIGH',
                category: 'MEMORY',
                message: 'High frequency of memory alerts detected. Consider memory optimization.',
                action: 'Review memory usage patterns and implement memory pooling if applicable.'
            });
        }

        // Check system resources
        const system = this.collectSystemMetrics();
        if (system.memory.usagePercent > 80) {
            recommendations.push({
                priority: 'HIGH',
                category: 'SYSTEM',
                message: 'High memory usage detected on host system.',
                action: 'Consider scaling resources or optimizing memory allocation.'
            });
        }

        if (system.cpu > os.cpus().length * 0.8) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'SYSTEM',
                message: 'High CPU usage detected.',
                action: 'Monitor CPU-intensive operations and consider optimization.'
            });
        }

        return recommendations;
    }

    async cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        console.log('🧹 Performance monitoring cleanup completed');
    }
}

// CLI Interface
async function main() {
    const monitor = new PerformanceMonitor();

    try {
        await monitor.initialize();

        const args = process.argv.slice(2);
        const command = args[0] || 'benchmark';

        switch (command) {
            case 'benchmark':
                await monitor.runComprehensiveBenchmark();
                break;

            case 'monitor':
                const interval = parseInt(args[1]) || 5000;
                await monitor.startRealTimeMonitoring(interval);

                // Run for specified duration or indefinitely
                const duration = parseInt(args[2]);
                if (duration) {
                    setTimeout(async () => {
                        await monitor.generateReport();
                        await monitor.cleanup();
                        process.exit(0);
                    }, duration * 1000);
                } else {
                    // Handle graceful shutdown
                    process.on('SIGINT', async () => {
                        console.log('\n⏹️  Stopping performance monitoring...');
                        await monitor.generateReport();
                        await monitor.cleanup();
                        process.exit(0);
                    });
                }
                break;

            case 'report':
                await monitor.generateReport();
                break;

            default:
                console.log('Usage: node performance-monitoring.js [benchmark|monitor|report]');
                console.log('  benchmark: Run comprehensive performance benchmarks');
                console.log('  monitor [interval_ms] [duration_sec]: Start real-time monitoring');
                console.log('  report: Generate performance report');
                process.exit(1);
        }

    } catch (error) {
        console.error('❌ Performance monitoring failed:', error.message);
        await monitor.cleanup();
        process.exit(1);
    }
}

// Export for use as module
module.exports = { PerformanceMonitor };

// Run CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}
