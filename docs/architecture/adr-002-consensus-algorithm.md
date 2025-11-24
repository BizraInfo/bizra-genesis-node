# ADR 002: Consensus Algorithm Choice

## Status
**Accepted**

## Context
BIZRA Genesis Node requires a consensus mechanism that can:
- **Coordinate 18 specialized agents** across PAT (7), SAT (5), and TAT (6) categories
- **Achieve sub-100μs latency** for real-time decision making
- **Maintain Byzantine fault tolerance** (f=3) against arbitrary failures
- **Provide cryptographic verifiability** with proof-of-impact generation
- **Scale to 10,000+ concurrent operations** with intelligent routing
- **Support multi-dimensional quality assessment** (Ihsan scoring)

Traditional consensus algorithms (PBFT, Raft, Paxos) are designed for distributed databases and cannot meet the performance requirements for real-time AI agent coordination.

## Decision
Implement a **hybrid consensus architecture** combining:

### 1. Thompson Sampling Router (Intelligent Routing)
- **Algorithm**: Multi-armed bandit with Upper Confidence Bound (UCB1)
- **Purpose**: Dynamically route requests to optimal agents based on historical performance
- **Exploration/Exploitation**: Balances trying new agents vs. using proven performers
- **Performance**: Sub-5μs routing decisions with SIMD acceleration

### 2. Weighted Score Consensus (WSC) Engine
- **Algorithm**: Pareto-optimal multi-criteria decision analysis
- **Purpose**: Evaluate consensus candidates across multiple quality dimensions
- **Dimensions**: Accuracy (30%), Safety (25%), Efficiency (20%), Transparency (15%), Alignment (10%)
- **Optimization**: Genetic algorithm for Pareto frontier calculation

### 3. Ihsan Quality Gate
- **Scoring**: Multi-dimensional quality assessment (0-100 scale)
- **Threshold**: Minimum 85/100 for consensus acceptance
- **Validation**: Cryptographic proof-of-impact generation
- **Auditability**: Immutable quality records with Ed25519 signatures

### 4. Trust Bridge (Cryptographic Layer)
- **Signatures**: Ed25519 for message authentication
- **Hashing**: BLAKE3 for high-performance integrity checks
- **Proof-of-Impact**: Cryptographic verification of decision quality
- **Zero-Knowledge**: Privacy-preserving consensus without revealing agent details

## Rationale

### Performance Requirements Met
- **Thompson Sampling**: O(1) routing decisions with pre-computed statistics
- **SIMD Acceleration**: 8-16x speedup for vectorized probability calculations
- **Memory Pooling**: Eliminates allocation overhead in hot paths
- **Lock-Free Design**: Concurrent agent coordination without contention

### Byzantine Fault Tolerance
- **f=3 Resilience**: Tolerates up to 3 arbitrary agent failures
- **Quorum Requirements**: 2f+1 = 7 agents minimum for consensus
- **Cryptographic Verification**: Mathematical guarantees against equivocation
- **Agent Diversity**: Multiple agent types prevent single-point failures

### Quality Assurance
- **Multi-dimensional Scoring**: Comprehensive evaluation beyond binary consensus
- **Pareto Optimization**: Finds optimal trade-offs between competing objectives
- **Cryptographic Proofs**: Verifiable quality guarantees for enterprise compliance
- **Continuous Learning**: Thompson sampling adapts to agent performance changes

### Scalability Characteristics
- **Horizontal Scaling**: Independent agent scaling with intelligent routing
- **Load Balancing**: Dynamic redistribution based on agent capacity
- **Resource Efficiency**: Optimal agent utilization through performance-based routing
- **Elastic Adaptation**: Automatic scaling based on demand patterns

## Consequences

### Positive
- **Performance**: Sub-100μs consensus latency with SIMD optimization
- **Reliability**: Byzantine fault tolerance with cryptographic guarantees
- **Quality**: Multi-dimensional assessment with provable outcomes
- **Scalability**: Intelligent routing enables massive concurrent operations
- **Adaptability**: Learning algorithms optimize performance over time

### Negative
- **Algorithmic Complexity**: Multi-stage consensus increases implementation complexity
- **Computational Overhead**: Quality scoring adds processing requirements
- **Memory Footprint**: Statistical tracking requires additional memory
- **Debugging Difficulty**: Complex interactions between routing and consensus layers
- **Parameter Tuning**: Exploration/exploitation ratios require optimization

### Mitigation Strategies
- **Modular Design**: Clear separation between routing, consensus, and verification layers
- **Comprehensive Testing**: Property-based testing for algorithmic correctness
- **Performance Monitoring**: Real-time metrics for algorithm optimization
- **Formal Verification**: Prusti verification for critical consensus logic
- **Documentation**: Detailed algorithmic documentation for maintenance

## Alternatives Considered

### Option 1: Traditional PBFT (Practical Byzantine Fault Tolerance)
- **Pros**: Proven Byzantine fault tolerance, well-understood algorithm
- **Cons**: High latency (seconds), quadratic message complexity, not suitable for real-time AI
- **Rejected**: Performance requirements cannot be met with traditional BFT

### Option 2: Raft Consensus
- **Pros**: Simpler than PBFT, good for database replication, leader election
- **Cons**: CFT only (not BFT), high latency for consensus rounds, not designed for agent coordination
- **Rejected**: Byzantine fault tolerance and real-time requirements not satisfied

### Option 3: Proof-of-Work (PoW) Consensus
- **Pros**: Decentralized, resistant to Sybil attacks, proven at scale (Bitcoin)
- **Cons**: High energy consumption, variable latency, not suitable for real-time decisions
- **Rejected**: Performance and energy requirements incompatible with real-time AI

### Option 4: Federated Byzantine Agreement (FBA)
- **Pros**: Asynchronous operation, good scalability properties
- **Cons**: Complex quorum slice configuration, higher message complexity than PBFT
- **Rejected**: Implementation complexity and performance overhead too high

### Option 5: Simple Majority Voting
- **Pros**: Simple implementation, low latency, easy to understand
- **Cons**: No Byzantine fault tolerance, vulnerable to Sybil attacks, no quality guarantees
- **Rejected**: Security and quality requirements not met

## Implementation Notes

### Algorithm Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Request Input  │───▶│ Thompson Router │───▶│   Agent Pool    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WSC Consensus  │◄───│  Response Coll. │    │ Agent Response  │
│    Engine       │    │   & Scoring     │    │   Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Ihsan Quality   │───▶│  Trust Bridge   │───▶│ Proof-of-Impact │
│     Gate        │    │  (Crypto)       │    │   Generation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Performance Optimizations
- **SIMD Vectorization**: Probability calculations and scoring operations
- **Memory Pooling**: Pre-allocated buffers for frequent consensus operations
- **Lock-Free Data Structures**: Concurrent agent statistics updates
- **Adaptive Caching**: Historical performance data caching with TTL

### Quality Dimensions
| Dimension | Weight | Description | Measurement |
|-----------|--------|-------------|-------------|
| **Accuracy** | 30% | Decision correctness and precision | F1-score, precision, recall |
| **Safety** | 25% | Risk assessment and harm prevention | Safety violation rate |
| **Efficiency** | 20% | Resource utilization and speed | Latency, throughput, cost |
| **Transparency** | 15% | Explainability and auditability | Explanation completeness |
| **Alignment** | 10% | Goal alignment and value creation | Business metric correlation |

### Cryptographic Operations
- **Ed25519**: Schnorr signatures for message authentication
- **BLAKE3**: High-performance cryptographic hashing
- **Proof-of-Impact**: Zero-knowledge proof of quality assessment
- **Key Management**: Automated rotation with HashiCorp Vault integration

## Validation Strategy

### Performance Benchmarks
- **Routing Latency**: <5μs P95 for agent selection
- **Consensus Latency**: <100μs P95 for complete consensus round
- **Quality Scoring**: <50μs for multi-dimensional assessment
- **Cryptographic Ops**: <10μs for signature verification

### Correctness Verification
- **Property-Based Testing**: Proptest for algorithmic invariants
- **Formal Verification**: Prusti for critical consensus logic
- **Chaos Engineering**: Fault injection testing for BFT guarantees
- **Integration Testing**: End-to-end consensus validation

### Monitoring & Observability
- **Consensus Metrics**: Success rates, latency distributions, quality scores
- **Agent Performance**: Individual agent statistics and health monitoring
- **System Health**: Overall consensus system status and alerts
- **Performance Trends**: Historical analysis and optimization insights

## References

- [Thompson Sampling Paper](https://proceedings.neurips.cc/paper/2012/file/6bca6c6e0a2d31b0c9b5c1e4e9c6b0c0-Paper.pdf)
- [Pareto Optimization](https://en.wikipedia.org/wiki/Pareto_efficiency)
- [Byzantine Fault Tolerance](https://en.wikipedia.org/wiki/Byzantine_fault_tolerance)
- [Ed25519 Specification](https://ed25519.cr.yp.to/)
- [BLAKE3 Specification](https://www.blake3.io/)

---

**Decision Date**: November 14, 2025
**Decision Maker**: Technical Architecture Review Board
**Supersedes**: N/A
**Superseded by**: N/A
