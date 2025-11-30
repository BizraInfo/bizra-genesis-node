# BIZRA Genesis Node - Debugging Playbook

## Document Information

| **Document ID** | DEBUG-PLAYBOOK-001 |
|----------------|-------------------|
| **Version** | 1.0 |
| **Date** | November 29, 2025 |
| **Status** | Approved |
| **Classification** | Internal |

**Approval Authority**: DevOps Engineering Review Board
**Document Owner**: Principal Engineer
**Review Cycle**: Monthly

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Debugging Prerequisites](#2-debugging-prerequisites)
3. [Thompson Sampling Router Debugging](#3-thompson-sampling-router-debugging)
4. [Consensus Algorithm Debugging](#4-consensus-algorithm-debugging)
5. [WebSocket Connection Issues](#5-websocket-connection-issues)
6. [Telemetry & Monitoring Issues](#6-telemetry--monitoring-issues)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Performance Profiling](#8-performance-profiling)
9. [Agent Ecosystem Debugging](#9-agent-ecosystem-debugging)
10. [Economic Engine Debugging](#10-economic-engine-debugging)
11. [Emergency Procedures](#11-emergency-procedures)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This debugging playbook provides systematic troubleshooting procedures for the BIZRA Genesis Node's complex multi-agent consensus system, enabling rapid issue resolution and system stability.

### 1.2 Scope

Covers debugging procedures for:
- Thompson Sampling router performance issues
- Byzantine consensus algorithm failures
- WebSocket connection and real-time telemetry
- Authentication and authorization problems
- Performance profiling and optimization
- Agent ecosystem coordination issues
- Economic engine reward calculations

### 1.3 Key Debugging Principles

- **Isolate Components**: Test individual layers before system-wide debugging
- **Monitor Metrics**: Use observability stack for data-driven debugging
- **Reproduce Issues**: Create minimal test cases for reliable reproduction
- **Log Analysis**: Leverage structured logging for root cause analysis
- **Incremental Fixes**: Apply changes systematically with rollback capability

---

## 2. Debugging Prerequisites

### 2.1 Required Tools

```bash
# Core debugging tools
curl, jq, websocat, grpcurl
docker, kubectl, k9s
prometheus, grafana
wireshark, tcpdump (network debugging)
perf, flamegraph (performance profiling)
```

### 2.2 Environment Setup

```bash
# Enable debug logging
export RUST_LOG=debug,bizra=trace
export GF_LOG_LEVEL=debug

# Start observability stack
make obs-up

# Verify services
curl http://localhost:9090/-/ready
curl http://localhost:3000/api/health
curl http://localhost:3006/health
```

### 2.3 Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== BIZRA Genesis Node Health Check ==="
echo ""

# System services
echo "Core Services:"
kubectl get pods -l app=bizra-genesis
echo ""

# Consensus health
echo "Consensus Engine:"
curl -s http://localhost:50051/health | jq
echo ""

# Agent status
echo "Agent Ecosystem:"
curl -s http://localhost:8080/api/agents/status | jq
echo ""

# Metrics
echo "Key Metrics:"
curl -s 'http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}' | jq '.data.result[0].value[1]'
echo ""

echo "=== Health Check Complete ==="
```

---

## 3. Thompson Sampling Router Debugging

### 3.1 Router Performance Issues

#### Symptom: High routing latency (>3μs P95)

**Step 1: Check router metrics**
```bash
# Query routing performance
curl -s 'http://localhost:9090/api/v1/query?query=bizra_router_latency_bucket' | jq

# Check routing decisions per second
curl -s 'http://localhost:9090/api/v1/query?query=rate(bizra_router_decisions_total[5m])' | jq
```

**Step 2: Analyze routing distribution**
```bash
# Check if routing is balanced across models
curl -s 'http://localhost:9090/api/v1/query?query=bizra_router_model_selections' | jq

# Expected: Even distribution across available models
# Problem: Single model dominance indicates sampling issue
```

**Step 3: Debug Thompson sampling algorithm**
```rust
// Check exploration rate (should be adaptive)
let exploration_rate = router.exploration_rate();
assert!(exploration_rate > 0.0 && exploration_rate < 1.0);

// Verify beta distribution parameters
for model in models {
    let (alpha, beta) = model.beta_params();
    println!("Model {}: α={}, β={}", model.id, alpha, beta);
}
```

#### Symptom: Wrong model selection

**Step 1: Validate model registry**
```bash
# Check available models
curl -s http://localhost:8080/api/models | jq

# Verify model capabilities match request requirements
curl -s http://localhost:8080/api/models/gpt-4/capabilities | jq
```

**Step 2: Inspect routing decision logs**
```bash
# Enable trace logging for router
export RUST_LOG=bizra_router=trace

# Check recent routing decisions
kubectl logs -l app=bizra-router --tail=100 | grep "routing_decision"
```

**Step 3: Test routing logic manually**
```rust
// Simulate routing decision
let request = ConsensusRequest {
    complexity: 0.8,
    domain: "financial".to_string(),
    latency_requirement: Duration::from_millis(100),
};

let selected_model = router.route(request)?;
println!("Selected model: {}", selected_model.id);
```

### 3.2 Router Configuration Issues

#### Symptom: Router not updating model statistics

**Step 1: Check feedback loop**
```bash
# Verify metrics are being collected
curl -s 'http://localhost:9090/api/v1/query?query=bizra_model_success_rate' | jq

# Check if router is consuming metrics
kubectl logs -l app=bizra-router | grep "updating_stats"
```

**Step 2: Validate metric collection**
```rust
// Check metric exporter
let metrics = router.metrics_collector();
assert!(metrics.success_rate_updates() > 0);
assert!(metrics.latency_updates() > 0);
```

**Step 3: Reset router statistics**
```bash
# Force statistics reset (development only)
curl -X POST http://localhost:8080/api/router/reset-stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 4. Consensus Algorithm Debugging

### 4.1 Consensus Formation Failures

#### Symptom: Consensus not reached within timeout

**Step 1: Check agent participation**
```bash
# Query agent health
curl -s http://localhost:8080/api/agents/health | jq

# Check minimum quorum (7 agents for f=3)
curl -s 'http://localhost:9090/api/v1/query?query=bizra_agents_active' | jq '.data.result[0].value[1]'
```

**Step 2: Analyze consensus metrics**
```bash
# Check consensus success rate
curl -s 'http://localhost:9090/api/v1/query?query=rate(bizra_consensus_success_total[5m])' | jq

# Check consensus latency distribution
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(bizra_consensus_latency_bucket[5m]))' | jq
```

**Step 3: Debug consensus algorithm**
```rust
// Check consensus state
let consensus = engine.current_consensus()?;
println!("Phase: {:?}", consensus.phase);
println!("Participants: {}", consensus.participants.len());
println!("Quality threshold: {}", consensus.quality_threshold);

// Validate Pareto frontier
let frontier = consensus.pareto_frontier();
assert!(frontier.len() > 0, "No Pareto optimal solutions found");
```

#### Symptom: Byzantine failures detected

**Step 1: Check fault tolerance status**
```bash
# Query Byzantine failure metrics
curl -s 'http://localhost:9090/api/v1/query?query=bizra_byzantine_failures_total' | jq

# Check current fault tolerance level
curl -s 'http://localhost:9090/api/v1/query?query=bizra_fault_tolerance_level' | jq
```

**Step 2: Identify faulty agents**
```bash
# Get agent failure details
curl -s http://localhost:8080/api/agents/failures | jq

# Check agent signatures
curl -s http://localhost:8080/api/agents/signatures/validate | jq
```

**Step 3: Validate cryptographic proofs**
```rust
// Check signature verification
let proof = consensus.proof_of_impact()?;
let valid = trust_bridge.verify_proof(proof)?;
assert!(valid, "Invalid proof-of-impact");

// Check consensus hash
let consensus_hash = consensus.compute_hash()?;
assert!(consensus_hash.len() == 32, "Invalid consensus hash");
```

### 4.2 Quality Scoring Issues

#### Symptom: Low Ihsan Gate scores (<95)

**Step 1: Analyze quality dimensions**
```bash
# Check individual quality metrics
curl -s 'http://localhost:9090/api/v1/query?query=bizra_ihsan_accuracy' | jq
curl -s 'http://localhost:9090/api/v1/query?query=bizra_ihsan_safety' | jq
curl -s 'http://localhost:9090/api/v1/query?query=bizra_ihsan_efficiency' | jq
```

**Step 2: Debug scoring algorithm**
```rust
// Check scoring weights
let weights = ihsan_gate.weights();
println!("Weights: {:?}", weights);

// Validate scoring function
let test_candidate = ConsensusCandidate::new(/* ... */);
let score = ihsan_gate.score_candidate(test_candidate)?;
assert!(score.total() >= 0.0 && score.total() <= 100.0);
```

**Step 3: Calibrate scoring model**
```bash
# Update scoring parameters
curl -X PUT http://localhost:8080/api/ihsan/calibrate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"accuracy_weight": 0.3, "safety_weight": 0.3, "efficiency_weight": 0.4}'
```

---

## 5. WebSocket Connection Issues

### 5.1 Connection Establishment Failures

#### Symptom: WebSocket handshake fails

**Step 1: Check WebSocket gateway status**
```bash
# Verify gateway is running
kubectl get pods -l app=websocket-gateway

# Check gateway logs
kubectl logs -l app=websocket-gateway --tail=50
```

**Step 2: Test WebSocket handshake**
```bash
# Manual WebSocket connection test
websocat ws://localhost:8081/ws

# Check CORS headers
curl -I -H "Origin: http://localhost:3000" http://localhost:8081/health
```

**Step 3: Debug connection parameters**
```javascript
// Client-side debugging
const ws = new WebSocket('ws://localhost:8081/ws');

ws.onopen = () => console.log('WebSocket opened');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = (event) => console.log('WebSocket closed:', event.code, event.reason);

// Check protocol support
console.log('WebSocket support:', !!window.WebSocket);
console.log('Protocol:', ws.protocol);
```

#### Symptom: Connection drops frequently

**Step 1: Monitor connection stability**
```bash
# Check connection duration metrics
curl -s 'http://localhost:9090/api/v1/query?query=bizra_ws_connection_duration' | jq

# Monitor disconnections
curl -s 'http://localhost:9090/api/v1/query?query=rate(bizra_ws_disconnections_total[5m])' | jq
```

**Step 2: Analyze network conditions**
```bash
# Check network latency
ping -c 10 localhost

# Monitor packet loss
mtr -c 10 localhost

# Check system load
uptime
free -h
```

**Step 3: Debug heartbeat mechanism**
```javascript
// Client heartbeat implementation
function startHeartbeat(ws) {
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000); // 30 second intervals
}

// Server heartbeat validation
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
    }
};
```

### 5.2 Message Delivery Issues

#### Symptom: Real-time updates not received

**Step 1: Verify subscription setup**
```bash
# Check active subscriptions
curl -s http://localhost:8080/api/ws/subscriptions | jq

# Validate subscription parameters
curl -s http://localhost:8080/api/ws/subscriptions/validate | jq
```

**Step 2: Debug message routing**
```rust
// Check message broker
let broker = websocket_gateway.message_broker();
let active_connections = broker.active_connections();
println!("Active connections: {}", active_connections);

// Validate message serialization
let test_message = ConsensusUpdate { /* ... */ };
let serialized = serde_json::to_string(&test_message)?;
assert!(serialized.len() > 0);
```

**Step 3: Test message broadcasting**
```bash
# Send test broadcast
curl -X POST http://localhost:8080/api/ws/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"type": "test", "payload": {"message": "debug"}}'

# Monitor message delivery
kubectl logs -l app=websocket-gateway | grep "broadcast"
```

---

## 6. Telemetry & Monitoring Issues

### 6.1 Metrics Collection Failures

#### Symptom: Missing Prometheus metrics

**Step 1: Check Prometheus targets**
```bash
# List all targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Check target configuration
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job == "bizra-genesis")'
```

**Step 2: Debug metrics export**
```rust
// Check metrics exporter
let exporter = metrics_exporter::new()?;
let metrics_count = exporter.collected_metrics()?;
println!("Collected metrics: {}", metrics_count);

// Test metrics endpoint
curl http://localhost:3006/metrics | head -20
```

**Step 3: Validate metrics format**
```bash
# Check Prometheus metric format
curl -s http://localhost:3006/metrics | grep -E "^#" | head -10

# Validate metric names
curl -s http://localhost:3006/metrics | grep "bizra_" | wc -l

# Test metric parsing
curl -s http://localhost:3006/metrics | promtool check metrics
```

#### Symptom: Grafana panels show no data

**Step 1: Verify data source configuration**
```bash
# Check Grafana data source
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/datasources/uid/prometheus | jq

# Test data source connectivity
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/datasources/uid/prometheus/health | jq
```

**Step 2: Debug query execution**
```bash
# Test PromQL query directly
curl -s 'http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}' | jq

# Check query performance
curl -s 'http://localhost:9090/api/v1/query_range?query=up{job="bizra-genesis"}&start=now-1h&end=now&step=60' | jq
```

**Step 3: Validate dashboard configuration**
```bash
# Export dashboard JSON
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/dashboards/uid/bizra-core-kpis | jq '.dashboard'

# Check panel queries
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/dashboards/uid/bizra-core-kpis | jq '.dashboard.panels[0].targets[0]'
```

### 6.2 Alerting Issues

#### Symptom: Alerts not firing

**Step 1: Check alert rules**
```bash
# List active alerts
curl -s http://localhost:9090/api/v1/alerts | jq

# Check alert rule evaluation
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "bizra-alerts")'
```

**Step 2: Debug alert conditions**
```bash
# Test alert expression manually
curl -s 'http://localhost:9090/api/v1/query?query=ALERTS{alertname="ApiHighErrorRate"}' | jq

# Check alert thresholds
curl -s 'http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05' | jq
```

**Step 3: Validate notification channels**
```bash
# Check alertmanager configuration
curl -s http://localhost:9093/api/v2/status | jq

# Test notification delivery
curl -X POST http://localhost:9093/api/v2/alerts \
  -d '[{"labels": {"alertname": "TestAlert"}, "annotations": {"summary": "Test"}}]'
```

---

## 7. Authentication & Authorization

### 7.1 JWT Token Issues

#### Symptom: Authentication fails

**Step 1: Validate token structure**
```bash
# Decode JWT token
echo $JWT_TOKEN | jq -R 'split(".") | .[0],.[1] | @base64d | fromjson'

# Check token expiration
echo $JWT_TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson | .exp'

# Verify signature
echo $JWT_TOKEN | jq -R 'split(".") | .[0],.[1],.[2] | @base64d'
```

**Step 2: Debug authentication service**
```rust
// Check auth service logs
let auth_logs = auth_service.recent_logs()?;
for log in auth_logs {
    println!("Auth event: {:?}", log);
}

// Validate user credentials
let user = auth_service.authenticate(credentials)?;
assert!(user.is_active);
```

**Step 3: Check token blacklisting**
```bash
# Check if token is revoked
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8080/api/auth/validate

# Clear token cache
curl -X POST http://localhost:8080/api/auth/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Symptom: Authorization denied

**Step 1: Check user roles and permissions**
```bash
# Get user permissions
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8080/api/user/permissions | jq

# Check role assignments
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/api/admin/users/$USER_ID/roles | jq
```

**Step 2: Debug RBAC policies**
```rust
// Check policy evaluation
let policy = rbac_engine.evaluate_policy(user, resource, action)?;
println!("Policy result: {:?}", policy);

// Validate resource hierarchy
let hierarchy = rbac_engine.resource_hierarchy()?;
assert!(hierarchy.contains(resource));
```

**Step 3: Update permissions**
```bash
# Grant missing permissions
curl -X PUT http://localhost:8080/api/admin/users/$USER_ID/permissions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"resource": "consensus", "action": "create", "effect": "allow"}'
```

---

## 8. Performance Profiling

### 8.1 High Latency Issues

#### Symptom: Consensus latency >100μs P95

**Step 1: Profile consensus execution**
```bash
# Enable performance profiling
export RUSTFLAGS="-C target-cpu=native -C opt-level=3"
cargo build --release --features profiling

# Run with perf
perf record -g ./target/release/bizra-consensus-engine

# Generate flamegraph
perf script | stackcollapse-perf.pl | flamegraph.pl > consensus-flamegraph.svg
```

**Step 2: Analyze bottleneck components**
```rust
// Profile individual components
let consensus_timer = metrics::Timer::start("consensus_total");
{
    let agent_timer = metrics::Timer::start("agent_orchestration");
    orchestrator.coordinate_agents()?;
    agent_timer.stop();

    let scoring_timer = metrics::Timer::start("quality_scoring");
    ihsan_gate.score_candidates()?;
    scoring_timer.stop();

    let validation_timer = metrics::Timer::start("byzantine_validation");
    consensus.validate_byzantine()?;
    validation_timer.stop();
}
consensus_timer.stop();
```

**Step 3: Optimize critical paths**
```rust
// SIMD optimization for consensus calculations
#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::*;

pub fn vectorized_consensus_calculation(scores: &[f32]) -> f32 {
    unsafe {
        let mut sum = _mm256_setzero_ps();
        for chunk in scores.chunks(8) {
            let vec = _mm256_loadu_ps(chunk.as_ptr());
            sum = _mm256_add_ps(sum, vec);
        }
        _mm256_reduce_add_ps(sum)
    }
}
```

### 8.2 Memory Usage Issues

#### Symptom: High memory consumption

**Step 1: Monitor memory usage**
```bash
# Check process memory
ps aux | grep bizra | head -5

# Monitor container memory
kubectl top pods -l app=bizra-genesis

# Check memory metrics
curl -s 'http://localhost:9090/api/v1/query?query=process_resident_memory_bytes{job="bizra-genesis"}' | jq
```

**Step 2: Profile memory allocation**
```rust
// Enable memory profiling
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

fn main() {
    let _profiler = dhat::Profiler::new_heap();

    // Application code here

    // Profile will be written to dhat-heap.json on exit
}
```

**Step 3: Optimize memory usage**
```rust
// Use memory pooling for frequent allocations
lazy_static::lazy_static! {
    static ref AGENT_RESPONSE_POOL: Pool<AgentResponse> = Pool::new();
}

pub fn allocate_agent_response() -> Pooled<AgentResponse> {
    AGENT_RESPONSE_POOL.pull(|| AgentResponse::default())
}

// Use arena allocation for consensus state
pub struct ConsensusArena {
    arena: bumpalo::Bump,
}

impl ConsensusArena {
    pub fn allocate_consensus_state(&self) -> &mut ConsensusState {
        self.arena.alloc(ConsensusState::default())
    }
}
```

### 8.3 CPU Usage Optimization

#### Symptom: High CPU utilization

**Step 1: Profile CPU usage**
```bash
# System CPU monitoring
top -p $(pgrep bizra)

# Container CPU metrics
kubectl top pods -l app=bizra-genesis

# Application CPU profiling
perf stat ./target/release/bizra-consensus-engine
```

**Step 2: Identify CPU hotspots**
```rust
// Add CPU profiling instrumentation
#[profiling::function]
pub async fn process_consensus_request(request: ConsensusRequest) -> Result<ConsensusResponse> {
    // Function will be profiled automatically
    let result = consensus_engine.process(request).await?;
    Ok(result)
}
```

**Step 3: Optimize CPU-bound operations**
```rust
// Parallel processing for agent coordination
pub async fn coordinate_agents_parallel(&self, agents: &[AgentId]) -> Result<Vec<AgentResponse>> {
    let tasks: Vec<_> = agents.iter().map(|agent_id| {
        let orchestrator = self.clone();
        tokio::spawn(async move {
            orchestrator.coordinate_single_agent(*agent_id).await
        })
    }).collect();

    let results = futures::future::join_all(tasks).await;
    results.into_iter().collect::<Result<Vec<_>>>()
}
```

---

## 9. Agent Ecosystem Debugging

### 9.1 Agent Coordination Issues

#### Symptom: Agent orchestration fails

**Step 1: Check agent health status**
```bash
# Query agent registry
curl -s http://localhost:8080/api/agents | jq

# Check agent connectivity
curl -s http://localhost:8080/api/agents/health | jq
```

**Step 2: Debug AEGIS coordination**
```rust
// Check orchestration state
let orchestrator = aegis_orchestrator::new()?;
let active_agents = orchestrator.active_agents();
println!("Active agents: {}", active_agents.len());

// Validate agent communication
for agent in orchestrator.agents() {
    let ping_result = agent.ping().await?;
    assert!(ping_result.is_success());
}
```

**Step 3: Test agent failover**
```bash
# Simulate agent failure
curl -X POST http://localhost:8080/api/agents/simulate-failure \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"agent_id": "agent-007", "failure_type": "crash"}'

# Monitor failover process
kubectl logs -l app=agent-orchestrator | grep "failover"
```

### 9.2 Agent Response Quality Issues

#### Symptom: Poor agent responses

**Step 1: Analyze agent performance metrics**
```bash
# Check agent response quality
curl -s 'http://localhost:9090/api/v1/query?query=bizra_agent_response_quality' | jq

# Monitor agent latency
curl -s 'http://localhost:9090/api/v1/query?query=bizra_agent_response_latency' | jq
```

**Step 2: Debug agent selection logic**
```rust
// Check agent scoring
let agent_scores = orchestrator.agent_scores();
for (agent_id, score) in agent_scores {
    println!("Agent {} score: {}", agent_id, score);
}

// Validate selection algorithm
let selected_agents = orchestrator.select_agents_for_task(task)?;
assert!(selected_agents.len() >= 7); // Minimum quorum
```

**Step 3: Update agent configurations**
```bash
# Adjust agent weights
curl -X PUT http://localhost:8080/api/agents/weights \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"agent-001": 0.25, "agent-002": 0.20}'

# Update agent capabilities
curl -X PUT http://localhost:8080/api/agents/capabilities \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"agent-001": ["financial", "risk"], "agent-002": ["technical", "performance"]}'
```

---

## 10. Economic Engine Debugging

### 10.1 Reward Calculation Issues

#### Symptom: Incorrect reward distribution

**Step 1: Validate reward calculations**
```bash
# Check reward pool balance
curl -s http://localhost:8080/api/rewards/pool | jq

# Verify participant contributions
curl -s http://localhost:8080/api/rewards/participants | jq
```

**Step 2: Debug reward algorithm**
```rust
// Check reward calculation
let epoch = reward_engine.current_epoch()?;
let total_rewards = epoch.total_rewards();
let participants = epoch.participants();

for participant in participants {
    let calculated_reward = reward_engine.calculate_reward(participant)?;
    let expected_reward = participant.contribution_score * total_rewards;
    assert!((calculated_reward - expected_reward).abs() < 0.01);
}
```

**Step 3: Audit reward transactions**
```bash
# Check reward transaction logs
curl -s http://localhost:8080/api/rewards/transactions | jq

# Validate blockchain receipts
curl -s http://localhost:8080/api/rewards/receipts/validate | jq
```

### 10.2 Staking Issues

#### Symptom: Staking operations fail

**Step 1: Check staking status**
```bash
# Get staking information
curl -s http://localhost:8080/api/staking/status | jq

# Check minimum stake requirements
curl -s http://localhost:8080/api/staking/requirements | jq
```

**Step 2: Debug staking calculations**
```rust
// Validate staking rewards
let staker = staking_engine.get_staker(user_id)?;
let rewards = staking_engine.calculate_rewards(staker)?;
assert!(rewards > 0.0);

// Check unstaking period
let unstaking_time = staking_engine.unstaking_period(staker)?;
assert!(unstaking_time > chrono::Duration::days(7));
```

**Step 3: Process staking operations**
```bash
# Stake tokens
curl -X POST http://localhost:8080/api/staking/stake \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"amount": 1000, "duration_days": 30}'

# Check staking confirmation
curl -s http://localhost:8080/api/staking/confirm | jq
```

---

## 11. Emergency Procedures

### 11.1 System Recovery

#### Critical System Failure

**Step 1: Assess system state**
```bash
# Check system health
./health-check.sh

# Identify failed components
kubectl get pods --all-namespaces | grep -E "(Error|CrashLoopBackOff|Pending)"
```

**Step 2: Isolate failing components**
```bash
# Scale down failing services
kubectl scale deployment bizra-consensus-engine --replicas=0

# Check if system stabilizes
kubectl get pods -l app=bizra-genesis
```

**Step 3: Perform controlled restart**
```bash
# Restart in order of dependencies
kubectl rollout restart deployment/api-gateway
kubectl rollout restart deployment/consensus-engine
kubectl rollout restart deployment/agent-orchestrator

# Monitor recovery
kubectl logs -f deployment/consensus-engine
```

#### Data Recovery

**Step 1: Check backup integrity**
```bash
# List available backups
aws s3 ls s3://bizra-backups/

# Verify backup consistency
aws s3 cp s3://bizra-backups/latest-backup.tar.gz - | tar -tzf - | head -20
```

**Step 2: Restore from backup**
```bash
# Stop application
kubectl scale deployment --all --replicas=0

# Restore database
pg_restore -h localhost -U bizra -d bizra_genesis /tmp/backup.sql

# Restore application data
kubectl apply -f k8s/restore-job.yaml

# Restart services
kubectl apply -f k8s/deployment.yaml
```

### 11.2 Communication Protocols

#### Incident Response
1. **Immediate Assessment**: Run health check script
2. **Stakeholder Notification**: Alert relevant teams
3. **Containment**: Isolate affected components
4. **Recovery**: Follow recovery procedures
5. **Post-Mortem**: Document root cause and prevention

#### Escalation Matrix
- **P1 (Critical)**: System down, immediate engineering response
- **P2 (High)**: Degraded performance, SLA breach imminent
- **P3 (Medium)**: Minor issues, monitor and resolve
- **P4 (Low)**: Cosmetic issues, scheduled fix

---

## 12. Appendices

### 12.1 Diagnostic Scripts

#### Complete System Diagnostic

```bash
#!/bin/bash
# comprehensive-diagnostic.sh

echo "=== BIZRA Genesis Node Comprehensive Diagnostic ==="
echo "Timestamp: $(date)"
echo ""

# System resources
echo "System Resources:"
echo "CPU: $(uptime | awk '{print $NF}')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1f%% used", $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5 " used"}')"
echo ""

# Service status
echo "Service Status:"
services=("consensus-engine" "agent-orchestrator" "api-gateway" "websocket-gateway")
for service in "${services[@]}"; do
    status=$(kubectl get pods -l app=$service -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NOT_FOUND")
    echo "  $service: $status"
done
echo ""

# Key metrics
echo "Key Metrics (last 5 minutes):"
metrics=(
    "bizra_consensus_success_total"
    "bizra_router_decisions_total"
    "bizra_ws_connections_active"
    "bizra_ihsan_score_average"
)

for metric in "${metrics[@]}"; do
    value=$(curl -s "http://localhost:9090/api/v1/query?query=rate($metric[5m])" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
    echo "  $metric: $value"
done
echo ""

# Recent errors
echo "Recent Errors (last 100 lines):"
kubectl logs --all-containers --tail=100 -l app=bizra-genesis 2>/dev/null | grep -i error | tail -5 || echo "  No recent errors found"
echo ""

echo "=== Diagnostic Complete ==="
```

### 12.2 Performance Benchmarks

| Component | Metric | Warning Threshold | Critical Threshold |
|-----------|--------|-------------------|-------------------|
| **Consensus Engine** | Latency P95 | 75μs | 100μs |
| **AI Router** | Routing Time | 2μs | 3μs |
| **API Gateway** | Response Time | 150ms | 200ms |
| **WebSocket Gateway** | Connection Time | 100ms | 200ms |
| **Agent Orchestrator** | Coordination Time | 20ms | 50ms |
| **Ihsan Gate** | Scoring Time | 10μs | 25μs |

### 12.3 Common Error Codes

| Error Code | Description | Troubleshooting |
|------------|-------------|----------------|
| **CONSENSUS_001** | Quorum not reached | Check agent health and connectivity |
| **ROUTER_002** | Model unavailable | Verify AI model registry and endpoints |
| **WS_003** | Connection timeout | Check network configuration and firewalls |
| **AUTH_004** | Invalid token | Verify JWT signature and expiration |
| **ECONOMIC_005** | Insufficient stake | Check staking requirements and balance |

### 12.4 Monitoring Dashboards

#### Grafana Dashboard URLs
- **Core KPIs**: http://localhost:3000/d/bizra-core-kpis
- **Consensus Performance**: http://localhost:3000/d/bizra-consensus
- **Agent Ecosystem**: http://localhost:3000/d/bizra-agents
- **Economic Engine**: http://localhost:3000/d/bizra-economic

#### Prometheus Query Examples
```promql
# Consensus success rate
rate(bizra_consensus_success_total[5m]) / rate(bizra_consensus_attempts_total[5m])

# Agent response quality
histogram_quantile(0.95, rate(bizra_agent_response_quality_bucket[5m]))

# System resource usage
rate(process_cpu_user_seconds_total{job="bizra-genesis"}[5m])
```

---

**Document Control:**
- **Next Review**: December 29, 2025
- **Change History**: Initial release v1.0
- **Related Documents**:
  - [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
  - [Observability Troubleshooting](OBSERVABILITY_TROUBLESHOOTING.md)
  - [Performance Testing](testing/PERFORMANCE_TESTING.md)

*Built with إحسان (Excellence) • Systematic Debugging Playbook 🔧*