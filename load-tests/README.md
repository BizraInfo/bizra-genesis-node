# BIZRA Genesis Node - Load Testing

**Phase**: Phase 1, Sprint 1.2 (Weeks 3-4)
**Tool**: k6 by Grafana Labs
**Purpose**: Establish honest performance baselines for Express.js API

---

## Quick Start

### 1. Install k6

**Windows** (recommended):
```powershell
choco install k6
```

**macOS**:
```bash
brew install k6
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker** (cross-platform):
```bash
docker pull grafana/k6:latest
```

---

### 2. Start the Backend Server

**Option A: Local Development**
```bash
npm start
# Server runs on http://localhost:3000
```

**Option B: Development Mode** (with hot reload)
```bash
npm run dev:backend
```

---

### 3. Run Baseline Test

**Default (localhost:3000)**:
```bash
k6 run load-tests/k6-baseline.js
```

**Custom URL**:
```bash
k6 run --env API_URL=http://localhost:4000 load-tests/k6-baseline.js
```

**Docker**:
```bash
docker run --rm -v ${PWD}/load-tests:/tests grafana/k6 run /tests/k6-baseline.js
```

---

## Test Stages

The baseline test runs through 6 stages:

| Stage | Duration | Target RPS | Purpose |
|-------|----------|------------|---------|
| 1. Warm-up | 30s | 50 | System initialization |
| 2. Baseline | 2m | 100 | Stable baseline measurement |
| 3. Ramp-up | 1m | 500 | Gradual load increase |
| 4. Moderate Load | 2m | 500 | Sustained moderate load |
| 5. Stress Test | 1m | 1000 | Push to target capacity |
| 6. Peak Hold | 1m | 1000 | Sustained peak load |
| 7. Cool Down | 30s | 0 | Graceful shutdown |

**Total Duration**: ~8 minutes

---

## Performance Thresholds

The test enforces these quality gates:

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| **P95 Latency** | <300ms | 95% of requests fast |
| **P99 Latency** | <500ms | 99% of requests acceptable |
| **Error Rate** | <1% | High reliability |
| **Success Rate** | >95% | Robust system |

**Pass Criteria**: All thresholds must pass for test to succeed.

---

## Output

### Console Output

Real-time metrics displayed during test:
```
     ✓ health check status is 200
     ✓ API status is 2xx or 3xx

     checks.........................: 100.00% ✓ 24532      ✗ 0
     data_received..................: 12 MB   25 kB/s
     data_sent......................: 3.2 MB  6.7 kB/s
     http_req_duration..............: avg=42.5ms   p(95)=125ms   p(99)=200ms
     http_reqs......................: 24532   511.08/s
     vus............................: 100     min=0        max=1000
```

### File Output

Results saved to:
- `load-tests/results/baseline-summary.json` - Machine-readable metrics
- `load-tests/results/baseline-summary.txt` - Human-readable report
- `stdout` - Console output with conclusions

---

## Interpreting Results

### Good Baseline (✅ Phase 1 Success)

```
✅ GOOD THROUGHPUT: Achieved 500-1000 RPS
✅ LOW LATENCY: P95 = 150ms
✅ STABLE: Error rate <1%
```

**Recommendation**: Proceed to Phase 2 confidently.

---

### Moderate Baseline (🟡 Needs Optimization)

```
🟡 MODERATE THROUGHPUT: Achieved 300 RPS
🟡 MODERATE LATENCY: P95 = 400ms
✅ STABLE: Error rate <1%
```

**Recommendation**: Optimize bottlenecks before Phase 2.

---

### Poor Baseline (❌ Critical Issues)

```
⚠️ LOW THROUGHPUT: Achieved <100 RPS
⚠️ HIGH LATENCY: P95 >500ms
❌ HIGH ERROR RATE: 5% errors
```

**Recommendation**: Address stability and performance before proceeding.

---

## Troubleshooting

### Backend Not Running

**Symptom**:
```
ERRO[0000] Get "http://localhost:3000/health": dial tcp [::1]:3000: connect: connection refused
```

**Solution**:
```bash
# Start the backend
npm start

# Verify it's running
curl http://localhost:3000/health
```

---

### High Error Rate

**Symptom**:
```
http_req_failed................: 15.00% ✗ 3680      ✓ 20852
```

**Possible Causes**:
1. Database connection issues
2. Resource exhaustion (RAM, CPU)
3. Network timeouts
4. Application crashes

**Solutions**:
```bash
# Check server logs
tail -f backend/server.log

# Monitor resource usage
top
# or
htop

# Restart backend with debug logging
NODE_ENV=development npm start
```

---

### Memory Leaks

**Symptom**: Performance degrades over test duration

**Detection**:
```bash
# Monitor memory during test
node --expose-gc backend/server.js &
watch -n 1 'ps aux | grep node'
```

**Solution**: Profile with Chrome DevTools or heapdump

---

## Advanced Usage

### Custom Test Durations

Create `load-tests/k6-quick.js` for faster iteration:
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0 },
  ],
};
```

Run: `k6 run load-tests/k6-quick.js`

---

### Soak Testing

Test for memory leaks with extended duration:
```bash
# Run at 200 RPS for 30 minutes
k6 run --stage 5m:200 --stage 30m:200 --stage 1m:0 load-tests/k6-baseline.js
```

---

### Spike Testing

Sudden load increase:
```bash
# 0 → 1000 RPS in 10 seconds
k6 run --stage 10s:1000 --stage 1m:1000 load-tests/k6-baseline.js
```

---

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/load-testing.yml`:
```yaml
name: Load Testing

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Start backend
        run: npm start &
        env:
          NODE_ENV: production

      - name: Wait for server
        run: npx wait-on http://localhost:3000/health

      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run load-tests/k6-baseline.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-tests/results/
```

---

## Roadmap Integration

**Phase 1.2 (Current)**: Baseline establishment
- **Goal**: 500-1K RPS sustained
- **Acceptance**: P95 <300ms, <1% errors

**Phase 2.3 (Weeks 13-15)**: Rust Axum Migration
- **Goal**: 2x-5x improvement over Express
- **Test**: Compare Express vs Axum

**Phase 4.1 (Weeks 31-33)**: Production Load Testing
- **Goal**: 5K RPS sustained
- **Acceptance**: P95 <200ms, 99.99% uptime

---

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [Performance Testing Basics](https://k6.io/docs/test-types/introduction/)
- [BIZRA Roadmap](../ROADMAP_2025.md) - Performance objectives

---

*Built with إحسان (Excellence) • Load Tested with k6 • Verified with Science*

**Last Updated**: 2025-11-11 (Phase 1, Sprint 1.2)
