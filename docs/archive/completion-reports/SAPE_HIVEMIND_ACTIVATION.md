# SAPE v1.0 Execution: Hivemind Activation

## 1) Intent Gate (What/Why/Bounds)

**Slot:**

*   **Domain**: Distributed AI Systems / Knowledge Retrieval (RAG)
*   **Objective**: Unify the offline Knowledge Ingestion System (`ingest_knowledge.rs`) with the real-time Reasoning Core (`SapeEngine`) to enable context-aware reasoning.
*   **Stakes**: **High**. This is the bridge between "learning" (ingestion) and "thinking" (reasoning). Without it, the Genesis Node is amnesic.
*   **Constraints**:
    *   Must use existing Postgres `knowledge_base` schema and `pgvector`.
    *   Must integrate into `sape_engine::modules::knowledge_kernels`.
    *   Must use the same embedding model as ingestion (default: `nomic-embed-text`).
    *   Latency budget: < 500ms for retrieval.
*   **Success Criteria**: `SapeEngine` can successfully answer a query using information that was previously ingested into the `knowledge_base` table.
*   **Forbidden Moves**: Hardcoding knowledge, hallucinating citations, ignoring low-confidence retrieval results.

**Directive:**
> The objective is to implement Retrieval-Augmented Generation (RAG) within the `SapeEngine` by connecting the `KnowledgeKernels` module to the PostgreSQL vector database. We assume `ingest_knowledge.rs` has already populated the DB.

---

## 2) Persona & Cognitive Lenses

*   **Systems Architect**: The system is a pipeline: Ingestion (Offline) -> DB (Storage) -> Retrieval (Online) -> Synthesis. The critical interface is `KnowledgeKernels::gather`. It requires a `PgPool` dependency injection into `SapeEngine`. We must ensure connection pooling is efficient and does not bottleneck the reasoning loop.
*   **Formal Theorist**: We define Knowledge $K$ as a set of tuples $(v, m, c)$ where $v$ is a vector, $m$ is metadata, and $c$ is content. The Retrieval function $R(q, k)$ maps a query $q$ to a subset of $K$ based on a distance metric $d(v_q, v_k) < \epsilon$. We must verify that the embedding space is metric-preserving for semantic similarity.
*   **Ethicist (Ihsān)**: The "Knowledge" is not neutral. Retrieval algorithms can create echo chambers. We must implement "Maximal Marginal Relevance" (MMR) or similar diversity mechanisms to ensure the agent considers multiple viewpoints if available in the knowledge base, rather than just the single most similar chunk.

---

## 3) Knowledge Kernels (Evidence Discipline)

*   **Allowed Sources**: Local Codebase (`c:\bizra-genesis-node`).
*   **Evidence Table**:
    *   `[A] src/bin/ingest_knowledge.rs`: Populates `knowledge_base` with `content`, `embedding` (vector), `metadata` (JSON).
    *   `[A] src/api/sape.rs`: Entry point for SAPE, currently passes a query string.
    *   `[A] sape_engine/src/lib.rs`: Defines `SapeEngine` struct and `KnowledgeKernels` module.
    *   `[A] Cargo.toml`: Confirms `sqlx` (Postgres), `pgvector`, and `sape_engine` (workspace member) availability.

---

## 4) Rare-Path Prober (Probe rarely fired circuits)

*   **I-Path (Impulse)**: **Standard RAG**. Inject `PgPool` into `SapeEngine`. In `KnowledgeKernels::gather`, run a simple cosine similarity search (`ORDER BY embedding <-> $1 LIMIT 5`) and return the content.
*   **C-Path (Counter-Impulse)**: **Proactive Ignorance**. Instead of always returning the top-k results, the system calculates a "Knowledge Confidence Score". If the score is below a threshold (e.g., 0.7), the system explicitly returns "Insufficient Knowledge" and triggers a `LearningRequest` event.
    *   *R1*: Reject low-confidence retrieval (don't guess).
    *   *R2*: Emit structured `LearningRequest` event for the swarm.
    *   *R3*: Block response generation until knowledge is acquired (optional "Blocking Mode").
*   **O-Path (Orthogonal)**: **Synaptic Potentiation (Dreaming)**. During idle periods, the engine randomly samples the `knowledge_base` and generates synthetic Q&A pairs to fine-tune a local LoRA adapter, effectively "memorizing" the database into weights for faster access.
    *   *R1*: Offline "dreaming" cycle.
    *   *R2*: Synthetic data generation from static knowledge.
    *   *R3*: Weight updates based on retrieval frequency.

---

## 5) Symbolic Harness (Neural ↔ Symbolic bridge)

*   **Types**:
    ```rust
    struct KnowledgeChunk { id: Uuid, content: String, relevance: f64, source: String }
    struct RetrievalContext { query: String, chunks: Vec<KnowledgeChunk> }
    ```
*   **Invariants**:
    *   `forall c in chunks: similarity(query, c) > threshold`
    *   `pool.connections < max_connections`
*   **Rules**:
    *   If `chunks.is_empty()`, fallback to `GeneralKnowledge` or `UncertaintyResponse`.
    *   If `chunks.len() > 0`, prompt must include "Based on the following context...".
*   **Program Sketch**:
    ```rust
    async fn gather_evidence(query: &str, pool: &PgPool) -> Result<Vec<KnowledgeChunk>> {
        let embedding = ollama.embed(query).await?;
        let rows = sqlx::query_as!(
            KnowledgeChunk,
            "SELECT content, 1 - (embedding <=> $1) as relevance FROM knowledge_base ORDER BY relevance DESC LIMIT 5"
        ).fetch_all(pool).await?;
        Ok(rows)
    }
    ```

---

## 6) Abstraction Elevator (Higher-order layers)

*   **Micro**: The specific SQL query using the `<->` (L2 distance) or `<=>` (Cosine distance) operator in `pgvector`.
*   **Meso**: The `KnowledgeKernels` module acting as the hippocampus, mediating between the raw storage and the `SapeEngine`'s working memory.
*   **Macro**: The "Hivemind" capability. The node transitions from an isolated processor to a connected node in a knowledge network.
*   **Meta-Reflection**: Unifying these layers creates a "Scholar" agent. The tension lies between the *static* nature of the database and the *fluid* nature of reasoning. We need the C-Path (Proactive Ignorance) to ensure the Scholar doesn't become a "Parrot".

---

## 7) Tension Studio (Logic × Creativity)

*   **Constraint Clash**: **Latency vs. Depth**.
    *   *Design Point A*: Fast Retrieval (Top-3, no re-ranking). Latency ~50ms.
    *   *Design Point B*: Deep Retrieval (Top-50 + Cross-Encoder Re-ranking). Latency ~800ms.
    *   *Synthesis*: **Tiered Retrieval**. Run Fast Retrieval. If max relevance < 0.8, trigger Deep Retrieval.
*   **Adversarial Flip**: **Poisoned Knowledge**.
    *   *Attack*: Malicious actor ingests false data with high similarity keywords.
    *   *Defense*: `KnowledgeKernels` must verify the *source* metadata against a trusted list (e.g., "internal_docs", "verified_papers").

---

## 8) Prove (6 Checks)

*   **Correctness**: Relies on `pgvector` index correctness and embedding model consistency.
*   **Consistency**: Ingestion and Retrieval MUST use the exact same embedding model version.
*   **Completeness**: Does the `knowledge_base` cover the domain? (Operational concern, not code).
*   **Causality**: Query -> Embedding -> Search -> Context -> Answer. The chain is clear.
*   **Ethics (Ihsān)**: We implement the "Proactive Ignorance" (C-Path) to prevent hallucination, adhering to the principle of "No assumptions — only verified excellence."
*   **Evidence**: We have the code for ingestion; we just need to link it.

---

## Confidence & Next Experiments

*   **Confidence**: 0.95 (High). The path is technically clear and uses standard components.
*   **Risks**:
    *   Embedding model mismatch (e.g., `ingest` uses `nomic-embed-text`, `sape` uses `llama3`).
    *   Database connection exhaustion under load.
*   **Experiments**:
    *   *Exp 1*: Implement `KnowledgeKernels` with `sqlx` and `pgvector`.
    *   *Exp 2*: Run a "Needle in a Haystack" test (ingest a unique fact, query it).
