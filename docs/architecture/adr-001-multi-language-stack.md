# ADR 001: Multi-Language Stack Selection

## Status
**Accepted**

## Context
BIZRA Genesis Node requires a technology stack that can deliver:
- **High Performance**: Sub-100μs consensus operations with SIMD acceleration
- **Memory Safety**: Zero unsafe code with formal verification capabilities
- **Scalability**: Support for 10,000+ concurrent users with horizontal scaling
- **AI Integration**: Efficient orchestration of large language models
- **Enterprise Features**: Comprehensive monitoring, security, and compliance
- **Developer Productivity**: Modern development experience with strong tooling

The system must orchestrate 18 specialized agents across three categories (PAT, SAT, TAT) while maintaining cryptographic verifiability and real-time performance monitoring.

## Decision
Adopt a **polyglot architecture** with **Rust as the core consensus engine** and **Node.js/React for API and UI layers**:

### Core Consensus Engine (Rust)
- **Consensus algorithms**: Thompson Sampling router, WSC consensus, cryptographic operations
- **Agent orchestration**: Multi-agent coordination with Byzantine fault tolerance
- **Performance-critical paths**: SIMD-accelerated calculations, memory pooling
- **Formal verification**: Prusti support for critical consensus logic

### API & Business Logic (Node.js)
- **REST APIs**: Consensus operations, AI orchestration, monitoring endpoints
- **Authentication/Authorization**: JWT, OAuth 2.0, RBAC implementation
- **Rate limiting**: Request throttling and abuse prevention
- **Input validation**: Schema-based validation with comprehensive error handling

### User Interface (React)
- **Decision support**: Real-time AI-powered decision interfaces
- **Monitoring dashboards**: System health, performance metrics, agent status
- **Mobile responsiveness**: Cross-platform compatibility
- **Real-time updates**: WebSocket integration for live data

### AI Services (Python/FastAPI)
- **VLLM integration**: Large language model inference and serving
- **Model orchestration**: Mixture of Experts coordination
- **Performance monitoring**: AI service metrics and optimization

## Rationale

### Performance Requirements
- **Rust's zero-cost abstractions** enable sub-100μs consensus operations
- **SIMD acceleration** provides 4-16x speedup for vectorized calculations
- **Memory safety guarantees** prevent runtime errors in critical paths
- **Async runtime (Tokio)** supports high-concurrency agent operations

### Safety & Reliability
- **Compile-time guarantees** prevent entire classes of runtime errors
- **Ownership system** eliminates data races and memory corruption
- **Pattern matching** ensures exhaustive error handling
- **Type system** catches logic errors at compile time

### Ecosystem Maturity
- **Cargo ecosystem** provides battle-tested crates for crypto, async, serialization
- **NPM ecosystem** offers comprehensive solutions for web development
- **Kubernetes integration** supports cloud-native deployment patterns
- **Monitoring tools** integrate seamlessly with existing enterprise stacks

### Team Capabilities
- **Rust expertise** available for performance-critical components
- **JavaScript/Node.js** widely known for API and UI development
- **Python** standard for AI/ML workloads
- **Gradual adoption** allows team to learn Rust incrementally

## Consequences

### Positive
- **Performance**: Sub-100μs consensus latency with SIMD optimization
- **Safety**: Zero unsafe code with formal verification capabilities
- **Scalability**: Horizontal scaling with Kubernetes orchestration
- **Maintainability**: Clear separation of concerns by language/runtime
- **Ecosystem**: Access to mature tooling and libraries in each domain

### Negative
- **Complexity**: Multiple language runtimes increase operational complexity
- **Coordination**: Inter-language communication requires careful API design
- **Tooling**: Separate build, test, and deployment pipelines per language
- **Learning Curve**: Team must maintain expertise across multiple stacks
- **Debugging**: Cross-language debugging and tracing complexity

### Mitigation Strategies
- **Clear boundaries**: Well-defined APIs between language boundaries
- **Shared tooling**: Unified CI/CD, monitoring, and logging across languages
- **Documentation**: Comprehensive API documentation for inter-language calls
- **Testing**: Integration tests covering cross-language interactions
- **Monitoring**: Distributed tracing across language boundaries

## Alternatives Considered

### Option 1: Single Language (Rust Only)
- **Pros**: Unified codebase, single toolchain, simplified deployment
- **Cons**: Limited web framework ecosystem, complex UI development, AI integration challenges
- **Rejected**: Web ecosystem maturity and AI integration requirements outweigh benefits

### Option 2: Single Language (Node.js Only)
- **Pros**: Unified JavaScript ecosystem, excellent web development support
- **Cons**: Performance limitations for consensus algorithms, memory safety concerns
- **Rejected**: Performance requirements (sub-100μs) cannot be met with JavaScript

### Option 3: Single Language (Python Only)
- **Pros**: Excellent AI/ML ecosystem, readable code, scientific computing support
- **Cons**: Performance limitations, GIL contention, memory safety concerns
- **Rejected**: Real-time performance requirements and memory safety critical for consensus

### Option 4: Go + JavaScript
- **Pros**: Strong concurrency model, good performance, mature ecosystem
- **Cons**: Less mature crypto libraries, limited SIMD support, smaller community
- **Rejected**: Rust's safety guarantees and performance characteristics better suited for consensus

## Implementation Notes

### Language Boundaries
```
┌─────────────────┐    gRPC/Protocol Buffers    ┌─────────────────┐
│   React UI      │◄────────────────────────────┤  Node.js API    │
│   (Frontend)    │                             │  (Business)     │
└─────────────────┘                             └─────────────────┘
                                                          │
                                                          │ gRPC
                                                          ▼
┌─────────────────┐    HTTP/REST              ┌─────────────────┐
│   Rust Core     │◄──────────────────────────┤  Python VLLM    │
│   (Consensus)   │                           │  (AI Models)    │
└─────────────────┘                           └─────────────────┘
```

### Communication Patterns
- **UI ↔ API**: REST APIs with WebSocket for real-time updates
- **API ↔ Core**: gRPC with Protocol Buffers for type safety
- **Core ↔ AI**: HTTP/REST with JSON payloads
- **All Services**: Prometheus metrics, structured logging

### Shared Infrastructure
- **Monitoring**: Unified Prometheus/Grafana stack across all services
- **Logging**: ELK stack with structured JSON logs
- **Security**: HashiCorp Vault for secrets, service mesh for mTLS
- **CI/CD**: GitHub Actions with language-specific build/test steps

## References

- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Node.js Production Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Performance Patterns](https://kentcdodds.com/blog/usememo-and-usecallback)
- [VLLM Documentation](https://vllm.readthedocs.io/)

---

**Decision Date**: November 14, 2025
**Decision Maker**: Technical Architecture Review Board
**Supersedes**: N/A
**Superseded by**: N/A
