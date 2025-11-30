# ADR 003: Database Architecture

## Status
**Accepted**

## Context
BIZRA Genesis Node requires a data architecture that can support:
- **High-performance consensus operations** with sub-100μs query requirements
- **Complex agent relationships** with graph database capabilities
- **AI embeddings and vector search** for semantic similarity operations
- **Real-time metrics and time-series data** for monitoring and analytics
- **Enterprise-grade reliability** with ACID compliance and disaster recovery
- **Scalability to 10,000+ concurrent users** with horizontal scaling
- **Multi-tenant isolation** with security and compliance requirements

The system must handle diverse data patterns: transactional consensus data, graph relationships between agents, vector embeddings for AI operations, and time-series metrics for observability.

## Decision
Implement a **polyglot persistence architecture** with four specialized databases:

### 1. PostgreSQL (Transactional Data)
- **Purpose**: ACID-compliant storage for business transactions, user data, and audit logs
- **Version**: PostgreSQL 15 with enterprise extensions
- **Key Features**:
  - JSONB for flexible metadata storage
  - PostGIS for geospatial consensus data (if needed)
  - Partitioning for large audit log tables
  - Connection pooling with PgBouncer

### 2. Redis Cluster (Caching & Sessions)
- **Purpose**: High-performance caching, session management, and real-time data
- **Version**: Redis 7 with clustering and persistence
- **Key Features**:
  - Active-Active replication for high availability
  - RedisJSON for complex session data
  - Pub/Sub for real-time agent coordination
  - Lua scripting for atomic operations

### 3. Neo4j (Graph Database)
- **Purpose**: Agent relationships, consensus graphs, and complex relationship queries
- **Version**: Neo4j 5 with enterprise features
- **Key Features**:
  - Cypher query language for graph traversals
  - Graph algorithms for consensus optimization
  - Causal clustering for high availability
  - APOC library for advanced graph operations

### 4. ChromaDB (Vector Database)
- **Purpose**: AI embeddings storage and semantic similarity search
- **Version**: ChromaDB 0.4 with distributed deployment
- **Key Features**:
  - HNSW indexing for fast vector similarity search
  - Metadata filtering for contextual retrieval
  - Distributed architecture for scalability
  - Integration with sentence transformers

## Rationale

### Performance Requirements
- **PostgreSQL**: Optimized for OLTP with B-tree and GiST indexes
- **Redis**: In-memory operations with <1ms latency for cache hits
- **Neo4j**: Graph traversals optimized for relationship-heavy queries
- **ChromaDB**: Vector operations with GPU acceleration support

### Data Pattern Optimization
- **Transactional**: PostgreSQL's MVCC and WAL ensure consistency
- **Ephemeral**: Redis provides volatile storage with persistence options
- **Relational**: Neo4j's native graph model for agent interconnections
- **Semantic**: ChromaDB's vector indexing for AI-powered similarity search

### Scalability Characteristics
- **Horizontal Scaling**: All databases support clustering/distribution
- **Read/Write Splitting**: PostgreSQL and Redis support master-slave configurations
- **Sharding**: Neo4j and ChromaDB support data partitioning
- **Load Balancing**: Kubernetes services provide automatic distribution

### Reliability & Compliance
- **ACID Compliance**: PostgreSQL ensures transactional integrity
- **Persistence**: Redis AOF/RDB with configurable durability
- **Backup/Recovery**: Automated backups with point-in-time recovery
- **Encryption**: At-rest and in-transit encryption across all databases

## Consequences

### Positive
- **Performance**: Each database optimized for its specific access patterns
- **Scalability**: Independent scaling of different data tiers
- **Maintainability**: Specialized tools and expertise for each database
- **Flexibility**: Best-of-breed solutions for different data requirements
- **Cost Efficiency**: Right-sizing resources for specific workloads

### Negative
- **Operational Complexity**: Multiple database technologies to manage
- **Consistency Challenges**: Eventual consistency across data stores
- **Development Overhead**: Multiple query languages and connection patterns
- **Monitoring Complexity**: Different monitoring approaches per database
- **Backup Complexity**: Coordinated backup strategies across technologies

### Mitigation Strategies
- **Service Abstraction**: Repository pattern hides database complexity
- **Event Sourcing**: Event-driven architecture for cross-database consistency
- **Monitoring Integration**: Unified monitoring with database-specific exporters
- **Automation**: Infrastructure as Code for database provisioning
- **Documentation**: Comprehensive data architecture documentation

## Alternatives Considered

### Option 1: Single Database (PostgreSQL Only)
- **Pros**: Single technology stack, ACID consistency, mature ecosystem
- **Cons**: Poor performance for graph operations, limited vector search, complex schema for diverse data types
- **Rejected**: Performance and functionality requirements for graph and vector operations

### Option 2: Single Database (MongoDB Only)
- **Pros**: Flexible schema, good performance, document model
- **Cons**: Limited ACID guarantees, poor graph query performance, immature vector search
- **Rejected**: ACID requirements and graph/vector performance needs

### Option 3: Single Database (Neo4j Only)
- **Pros**: Excellent graph operations, ACID compliance, Cypher query language
- **Cons**: Poor OLTP performance, limited vector capabilities, expensive licensing
- **Rejected**: OLTP performance requirements and vector search needs

### Option 4: Traditional RDBMS + Redis Cache
- **Pros**: Proven architecture, good performance, mature tooling
- **Cons**: No native graph support, complex vector search implementation, limited AI integration
- **Rejected**: Graph database and vector search requirements for agent coordination and AI features

## Implementation Notes

### Data Architecture Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Service Layer (Rust/Node.js)             │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │    │
│  │  │ Repository  │ │ Repository  │ │ Repository  │     │    │
│  │  │  Pattern    │ │  Pattern    │ │  Pattern    │     │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ PostgreSQL  │ │   Redis     │ │   Neo4j     │ │  ChromaDB    │ │
│  │ (ACID)      │ │ (Cache)     │ │ (Graph)     │ │ (Vector)     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Kubernetes  │ │ Persistent  │ │ Network     │ │ Monitoring   │ │
│  │ Services    │ │ Volumes     │ │ Policies    │ │ & Logging   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### Consensus Data Flow
```
Consensus Request → PostgreSQL (transaction log)
                   → Redis (active consensus state)
                   → Neo4j (agent relationship updates)
                   → ChromaDB (embedding updates)
```

#### Query Patterns
- **Transactional Queries**: PostgreSQL with optimized indexes
- **Cache-Aside**: Redis for frequently accessed data
- **Graph Traversal**: Neo4j for agent relationship queries
- **Vector Similarity**: ChromaDB for semantic search operations

### Performance Optimizations

#### PostgreSQL Optimizations
- **Indexing Strategy**: B-tree for equality, GiST for JSONB, BRIN for time-series
- **Partitioning**: Table partitioning for large datasets (audit logs, metrics)
- **Connection Pooling**: PgBouncer for efficient connection management
- **Query Optimization**: EXPLAIN ANALYZE for query plan optimization

#### Redis Optimizations
- **Memory Management**: Maxmemory policies with LRU eviction
- **Persistence**: AOF with configurable fsync for durability
- **Clustering**: Redis Cluster for horizontal scaling
- **Lua Scripts**: Atomic operations for complex multi-key operations

#### Neo4j Optimizations
- **Schema Design**: Proper indexing on frequently queried properties
- **Query Optimization**: PROFILE and EXPLAIN for query analysis
- **Memory Configuration**: Heap and page cache optimization
- **Import Performance**: Bulk import for initial data loading

#### ChromaDB Optimizations
- **Indexing**: HNSW algorithm for fast approximate nearest neighbors
- **Metadata Filtering**: Efficient filtering on metadata attributes
- **Batch Operations**: Bulk operations for embedding updates
- **GPU Acceleration**: CUDA support for vector operations

### Backup and Recovery Strategy

#### Backup Frequency
- **PostgreSQL**: Daily full backups, hourly incremental
- **Redis**: AOF persistence with continuous backup
- **Neo4j**: Daily full backups, transaction log shipping
- **ChromaDB**: Continuous replication with snapshot backups

#### Recovery Objectives
- **RTO (Recovery Time Objective)**: <1 hour for critical data, <4 hours for others
- **RPO (Recovery Point Objective)**: <5 minutes data loss for critical systems
- **Testing**: Quarterly disaster recovery testing and validation

### Monitoring and Observability

#### Database Metrics
- **Performance**: Query latency, throughput, connection counts
- **Health**: Replication lag, disk usage, memory utilization
- **Errors**: Failed queries, connection timeouts, deadlock detection
- **Business**: Consensus success rates, agent coordination metrics

#### Alerting Rules
- **Critical**: Database unavailability, data corruption, security breaches
- **Warning**: High latency, resource exhaustion, replication lag
- **Info**: Performance trends, capacity planning metrics

## Validation Strategy

### Performance Benchmarks
- **PostgreSQL**: 10,000 TPS for transactional workloads
- **Redis**: <1ms P95 latency for cache operations
- **Neo4j**: <100ms for complex graph traversals
- **ChromaDB**: <50ms for vector similarity search (1M vectors)

### Data Consistency Testing
- **Cross-Database Consistency**: Eventual consistency validation
- **Transaction Isolation**: ACID property verification
- **Data Integrity**: Checksum validation and corruption detection
- **Backup Integrity**: Regular backup restoration testing

### Scalability Testing
- **Load Testing**: K6 scenarios for concurrent user simulation
- **Capacity Planning**: Resource utilization monitoring under load
- **Horizontal Scaling**: Cluster expansion and contraction testing
- **Failover Testing**: Automatic failover and recovery validation

## Migration Strategy

### Phase 1: Foundation (Months 1-3)
- PostgreSQL schema design and initial implementation
- Redis integration for caching and sessions
- Basic data migration scripts and validation

### Phase 2: Core Services (Months 4-6)
- Neo4j integration for agent relationships
- ChromaDB setup for AI embeddings
- Cross-database consistency mechanisms

### Phase 3: AI Integration (Months 7-9)
- Vector database optimization and indexing
- AI-specific data pipeline implementation
- Performance tuning for AI workloads

### Phase 4: Production Readiness (Months 10-12)
- Backup and recovery procedure implementation
- Monitoring and alerting setup
- Disaster recovery testing and validation

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Database Performance Best Practices](https://www.cockroachlabs.com/guides/database-performance/)

---

**Decision Date**: November 14, 2025
**Decision Maker**: Technical Architecture Review Board
**Supersedes**: N/A
**Superseded by**: N/A
