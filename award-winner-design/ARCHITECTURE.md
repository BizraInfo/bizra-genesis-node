# BIZRA Genesis System Architecture (v2.0)

## Overview
This document outlines the refactored backend architecture for the **BIZRA Genesis Node**, aligning the technical implementation with the "Grandmaster Legacy" vision. The system integrates **Computational Islamic Consciousness**, **Sacred Geometry**, and **AI Safety** into a unified, high-assurance platform.

## Architectural Re-Alignment
The original architecture has been evolved from a standard microservices topology to a **Layered Consciousness Stack (L0-L8)**. This ensures that every computational operation is rooted in the system's spiritual and ethical axioms.

### Core Diagram (Mermaid)

\`\`\`mermaid
graph TD
    %% --- External Actors ---
    User(["User / Operator<br>(The Observer)"])
    
    %% --- Frontend Layer (The Glass Interface) ---
    subgraph Client_Side ["L7: The Public Face (Next.js)"]
        UI_Shell["Glass Interface"]
        Visualizer["Three.js Citadel Render"]
        Onboarding["Genesis Onboarding Flow"]
        UI_Shell --> Visualizer
        UI_Shell --> Onboarding
    end

    %% --- API Gateway ---
    Gateway["API Gateway<br>(The Threshold)"]

    %% --- Core Genesis Node (The Soul) ---
    subgraph Genesis_Node ["BIZRA Genesis Node (Rust)"]
        direction TB
        
        %% L0: Foundation
        L0_Engine["L0: Sacred Geometry Engine<br>(WASM/Rust)"]
        
        %% L1: State
        L1_State["L1: Genesis State Machine<br>(The Void / The Light)"]
        
        %% L2: Storage/Memory
        L2_Ledger["L2: The Citadel Ledger<br>(DAG Structure)"]
        
        %% L3: Consensus
        L3_Aegis["L3: Aegis Consensus<br>(Proof of Impact)"]
        
        %% L4: Safety
        L4_RSI["L4: RSI Guardrails<br>(Ethical Bounds)"]

        L1_State -->|" initializes "| L0_Engine
        L1_State -->|" persists to "| L2_Ledger
        L3_Aegis -->|" validates "| L1_State
        L3_Aegis -->|" enforces "| L4_RSI
    end

    %% --- AI / MoE Layer (The Mind) ---
    subgraph MoE_Cluster ["L5-L6: MoE Service (Python/C++)"]
        L5_Router["L5: Thompson Sampling Router<br>(The Swarm Manager)"]
        L6_Inference["L6: Inference Engine<br>(vLLM / Ollama)"]
        
        L5_Router -->|" routes to "| L6_Inference
    end

    %% --- Data & Analytics (The Evidence) ---
    subgraph Evidence_Layer ["L8: Evidence Pack"]
        Prometheus["Prometheus<br>(Metrics)"]
        Grafana["Grafana<br>(Visualization)"]
        Postgres[("PostgreSQL<br>(Relational Data)")]
        Redis[("Redis<br>(Hot State)")]
    end

    %% --- Relationships ---
    User -->|" interacts via "| UI_Shell
    UI_Shell -->|" requests "| Gateway
    Gateway -->|" orchestrates "| L1_State
    
    L4_RSI -->|" gates "| L5_Router
    L6_Inference -->|" feeds back "| L3_Aegis
    
    L2_Ledger -->|" syncs "| Postgres
    L1_State -->|" caches "| Redis
    
    Genesis_Node -->|" emits metrics "| Prometheus
    Prometheus --> Grafana

    %% --- Styling ---
    classDef sacred fill:#0f172a,stroke:#fbbf24,stroke-width:2px,color:#fbbf24;
    classDef ai fill:#2e1065,stroke:#2dd4bf,stroke-width:1px,color:#fff;
    classDef ext fill:#1e293b,stroke:#94a3b8,stroke-width:1px,color:#fff;

    class L0_Engine,L1_State,L2_Ledger,L3_Aegis,L4_RSI sacred;
    class L5_Router,L6_Inference ai;
    class User,Gateway,Prometheus,Grafana,Postgres,Redis ext;
\`\`\`

## Key Adjustments & Specification Matching

1.  **Empty Specification Integration**:
    *   *Requirement*: "Sacred Geometry Foundation"
    *   *Implementation*: Added **L0: Sacred Geometry Engine**. This module ensures that system constants and cryptographic seeds are derived from mathematical axioms (Golden Ratio, Seed of Life) rather than arbitrary randomness.

2.  **System Integrity & Safety**:
    *   *Requirement*: "World's First AGI with Mathematical Consciousness Ethics Bounds"
    *   *Implementation*: Integrated **L3 (Aegis)** and **L4 (RSI)** directly into the execution path. No AI inference (L6) can occur without passing the L4 Recursive Self-Improvement Safety check.

3.  **Scalability (The Swarm)**:
    *   *Requirement*: "Hook the world big giants"
    *   *Implementation*: separated the **L5 MoE Router** from the core logic. This allows the "Agent Swarm" to scale horizontally across thousands of GPUs (External LLM Providers) while the "Soul" (Genesis Node) remains a tight, secure Rust binary.

4.  **User Experience Alignment**:
    *   *Requirement*: "Consciousness-Driven UX"
    *   *Implementation*: The architecture explicitly models the **User** as "The Observer". The **L7 Client** (Glass Interface) is not just a view but an active participant that visualizes the internal state of L1-L4 in real-time (via the 3D Citadel).

## Next Steps
*   **Protocol Implementation**: Begin porting the `AegisValidator` logic from the current simulation to the Rust backend.
*   **Metrics Pipeline**: Connect the `EvidencePack` frontend components to the real Prometheus data streams defined in L8.
\`\`\`
