# Architecture Scanner Summary

- Files scanned: 517
- Generated: 2025-11-29T10:30:10.079Z

## 🔒 Security Hotspots

**Total Detected:** 2015
**Average Confidence:** 85.4%

### Critical Severity (2)

- **missing_validation** in `src\replay.rs:384`
  - Risk: sql_injection
  - Confidence: 80%
  - Evidence: `reasoning: format!("Selected candidate {} with highest Ihsan score", winner_idx)...`
- **missing_validation** in `tests\consensus_routing_tests.rs:1810`
  - Risk: sql_injection
  - Confidence: 80%
  - Evidence: `RunReceipt::new(format!("recovery-{}", fallback_selections), winner.model);
    ...`


### High Severity (1590)

- **unsafe_code** in `benches\api_performance.rs:145`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `group.throughput(Throughput::Bytes(request_json.len() as u64));...`
- **unsafe_code** in `benches\api_performance.rs:158`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `group.throughput(Throughput::Bytes(response_json.len() as u64));...`
- **unsafe_code** in `benches\api_performance.rs:171`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `group.throughput(Throughput::Bytes(consensus_json.len() as u64));...`
- **unsafe_code** in `benches\api_performance.rs:235`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `// Token generation
        group.bench_function("encode_token", |b| {...`
- **unsafe_code** in `benches\api_performance.rs:250`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `decode::<Claims>(&token, &decoding_key, &validation)
            })
        });...`
- **unsafe_code** in `benches\api_performance.rs:260`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `})
            .collect();

        group.bench_function("validate_100_tokens", ...`
- **unsafe_code** in `benches\api_performance.rs:267`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `}
            })
        });

        group.finish();
    }
}...`
- **unsafe_code** in `benches\api_performance.rs:490`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `tx.send(42).unwrap();
                rx.recv().unwrap()
            })
        ...`
- **unsafe_code** in `benches\api_performance.rs:491`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `rx.recv().unwrap()
            })
        });

        // Atomic operations...`
- **unsafe_code** in `benches\buffer_pool.rs:9`
  - Risk: runtime_crash
  - Confidence: 85%
  - Evidence: `let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("buffer_...`

_...and 1580 more_


### Medium Severity (423)

- **unsafe_code** in `app.js:228`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `satContent.innerHTML = '<p>No content items in outbox</p>';
    return;
  }...`
- **unsafe_code** in `app.js:248`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `</div>
  `).join('');

  satContent.innerHTML = `
    <div class="sat-content-li...`
- **unsafe_code** in `app.js:501`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `// Clear existing content
  container.innerHTML = '';

  // Use telemetry data f...`
- **unsafe_code** in `app.js:514`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `agentCard.innerHTML = `
      <div class="agent-header">
        <div>
         ...`
- **unsafe_code** in `app.js:549`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `// Clear existing content
  container.innerHTML = '';

  // Use telemetry data f...`
- **unsafe_code** in `app.js:562`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `agentCard.innerHTML = `
      <div class="agent-header">
        <div>...`
- **unsafe_code** in `app.js:605`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `});
  }
  
  container.innerHTML = blocks.map(block => `
    <div class="block-i...`
- **unsafe_code** in `app.js:683`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `uptimeElement.innerHTML = `<strong>${uptimeHours}h ${uptimeMinutes}m</strong>`;
...`
- **unsafe_code** in `benches\database_performance.rs:77`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `.await
        .expect("Failed to initialize persistence")
}...`
- **unsafe_code** in `benches\database_performance.rs:104`
  - Risk: runtime_crash
  - Confidence: 75%
  - Evidence: `.await
                .expect("Receipt insert failed");
            black_box((...`

_...and 413 more_





## ⚡ Performance Bottlenecks

**Total Detected:** 865

### High Severity (739)

- **large_god_module** in `app.js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 828 lines of code (threshold: 300)...`
- **large_god_module** in `backend\server.js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 1058 lines of code (threshold: 300)...`
- **large_god_module** in `backend\websocket.js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 444 lines of code (threshold: 300)...`
- **blocking_io_in_async** in `benches\buffer_pool.rs:49`
  - Impact: response_latency
  - Confidence: 90%
  - Evidence: `handle.await.unwrap();
                        }
                    }
         ...`
- **blocking_io_in_async** in `benches\database_performance.rs:76`
  - Impact: response_latency
  - Confidence: 90%
  - Evidence: `.await
        .expect("Failed to initialize persistence")
}...`
- **blocking_io_in_async** in `benches\database_performance.rs:418`
  - Impact: response_latency
  - Confidence: 90%
  - Evidence: `handle.await.unwrap();
                    }

                    black_box(());...`
- **large_god_module** in `front-end\animate.tsx:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 814 lines of code (threshold: 300)...`
- **large_god_module** in `front-end\app (2).js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 370 lines of code (threshold: 300)...`
- **large_god_module** in `front-end\app.js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 444 lines of code (threshold: 300)...`
- **large_god_module** in `k6\performance-tests.js:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 508 lines of code (threshold: 300)...`

_...and 729 more_


### Medium Severity (123)

- **large_god_module** in `benches\agent_performance.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 826 lines (threshold: 300)...`
- **large_god_module** in `benches\api_performance.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 669 lines (threshold: 300)...`
- **large_god_module** in `benches\database_performance.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 464 lines (threshold: 300)...`
- **large_god_module** in `examples\ab_testing_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 390 lines (threshold: 300)...`
- **large_god_module** in `examples\anthropic_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 384 lines (threshold: 300)...`
- **large_god_module** in `examples\full_ecosystem_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 304 lines (threshold: 300)...`
- **large_god_module** in `examples\multi_provider_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 320 lines (threshold: 300)...`
- **large_god_module** in `examples\pat_agents_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 335 lines (threshold: 300)...`
- **large_god_module** in `examples\rate_limit_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 347 lines (threshold: 300)...`
- **large_god_module** in `examples\streaming_demo.rs:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Module size: 349 lines (threshold: 300)...`

_...and 113 more_


### Low Severity (3)

- **unoptimized_iteration** in `apps\dashboard\src\pages\PatDashboard.tsx:22`
  - Impact: response_latency
  - Confidence: 65%
  - Evidence: `useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardD...`
- **unoptimized_iteration** in `apps\dashboard\src\components\rewards\RewardsDashboard.tsx:62`
  - Impact: response_latency
  - Confidence: 65%
  - Evidence: `useEffect(() => {
    loadEpochs();
  }, []);

  async function loadEpochs() {
 ...`
- **unoptimized_iteration** in `apps\dashboard\src\pages\sat\SatOutboxPage.tsx:25`
  - Impact: response_latency
  - Confidence: 65%
  - Evidence: `// Load SAT content on mount
  useEffect(() => {
    loadSatData();
  }, []);...`





## Integration Surface

- Database: 84 files
- HTTP/WebSocket: 146 files
- LLM/AI: 62 files
- Observability: 141 files

## Hotspots (Top 10)

- C:\bizra-genesis-node\bizra-moe\src\lib.rs (score 65)
- C:\bizra-genesis-node\app.js (score 55)
- C:\bizra-genesis-node\backend\server.js (score 55)
- C:\bizra-genesis-node\src\routing.rs (score 55)
- C:\bizra-genesis-node\src\scoring.rs (score 55)
- C:\bizra-genesis-node\tests\circuit_breaker_tests.rs (score 55)
- C:\bizra-genesis-node\tests\fullstack_integration_tests.rs (score 55)
- C:\bizra-genesis-node\tests\poi_rewards_tests.rs (score 55)
- C:\bizra-genesis-node\tests\resource_utilization.rs (score 55)
- C:\bizra-genesis-node\tests\secrets_kms_integration.rs (score 55)

---

**Audit Quality Metrics:**
- Overall Confidence: 85.4%
- False Positive Estimate: <14.6%
- Total Patterns: 21 audit-grade detection rules (13 security + 8 performance)
