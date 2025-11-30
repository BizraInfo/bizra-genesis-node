-- BIZRA Genesis Node - Core Database Schema
-- Migration: 20250114000001_create_core_tables
-- Description: Creates core tables for receipts, router state, consensus runs, and agents
-- Author: BIZRA Development Team
-- Date: 2025-01-14

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ==============================================================================
-- Trust Receipts Table
-- ==============================================================================
-- Stores immutable cryptographic receipts for synthesis runs
-- Each receipt represents a tamper-proof record of consensus decisions
CREATE TABLE trust_receipts (
    -- Primary key and identification
    run_id VARCHAR(255) PRIMARY KEY,

    -- Cryptographic hashes (BLAKE3)
    inputs_sha256 VARCHAR(64) NOT NULL DEFAULT '',
    winner_json_sha256 VARCHAR(64) NOT NULL,
    consensus_hash_hex VARCHAR(64) NOT NULL DEFAULT '',
    pattern_pack_sha256 VARCHAR(64) NOT NULL DEFAULT '',

    -- Consensus metadata
    winner_model VARCHAR(255) NOT NULL,
    policy_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- Ed25519 cryptographic signature
    public_key_der BYTEA NOT NULL,
    signature BYTEA NOT NULL,

    -- Timestamps
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Proof-of-Impact metrics (stored as JSONB for flexibility)
    proof_of_impact JSONB,

    -- Audit fields
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_trust_receipts_winner_model ON trust_receipts(winner_model);
CREATE INDEX idx_trust_receipts_timestamp ON trust_receipts(timestamp_ms DESC);
CREATE INDEX idx_trust_receipts_created_at ON trust_receipts(created_at DESC);
CREATE INDEX idx_trust_receipts_policy_version ON trust_receipts(policy_version);

-- GIN index for JSONB proof_of_impact queries
CREATE INDEX idx_trust_receipts_poi ON trust_receipts USING GIN (proof_of_impact);

-- ==============================================================================
-- Router State Table (Thompson Sampling)
-- ==============================================================================
-- Stores Beta distribution parameters for Thompson Sampling routing algorithm
-- Each row represents one AI model's performance statistics
CREATE TABLE router_state (
    -- Primary key
    model_name VARCHAR(255) PRIMARY KEY,

    -- Beta distribution parameters
    alpha DOUBLE PRECISION NOT NULL DEFAULT 1.0,  -- Successes + 1
    beta DOUBLE PRECISION NOT NULL DEFAULT 1.0,   -- Failures + 1

    -- Derived metrics (for monitoring)
    win_rate DOUBLE PRECISION GENERATED ALWAYS AS (alpha / (alpha + beta)) STORED,
    total_trials INTEGER GENERATED ALWAYS AS ((alpha + beta - 2)::INTEGER) STORED,

    -- Metadata
    model_type VARCHAR(50), -- 'ollama', 'openai', 'anthropic', etc.
    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_alpha CHECK (alpha > 0),
    CONSTRAINT positive_beta CHECK (beta > 0),
    CONSTRAINT valid_win_rate CHECK (win_rate >= 0 AND win_rate <= 1)
);

-- Performance indexes
CREATE INDEX idx_router_state_win_rate ON router_state(win_rate DESC);
CREATE INDEX idx_router_state_enabled ON router_state(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_router_state_model_type ON router_state(model_type);

-- ==============================================================================
-- Consensus Runs Table
-- ==============================================================================
-- Stores detailed consensus execution metrics and results
CREATE TABLE consensus_runs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id VARCHAR(255) NOT NULL UNIQUE,

    -- Input tracking
    input_hash VARCHAR(64) NOT NULL,
    input_size_bytes INTEGER,

    -- Results
    winner_model VARCHAR(255) NOT NULL,
    candidates_count INTEGER NOT NULL,

    -- Performance metrics
    consensus_latency_ms INTEGER NOT NULL,
    total_latency_ms INTEGER NOT NULL,
    routing_latency_us INTEGER,

    -- Consensus algorithm details
    algorithm_version VARCHAR(50) NOT NULL DEFAULT 'weighted-score-v1',
    pareto_frontier_size INTEGER,

    -- Candidate details (JSONB for flexibility)
    candidates JSONB NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key to trust receipts
    CONSTRAINT fk_consensus_receipt FOREIGN KEY (run_id)
        REFERENCES trust_receipts(run_id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT positive_candidates CHECK (candidates_count > 0),
    CONSTRAINT positive_latency CHECK (consensus_latency_ms >= 0)
);

-- Performance indexes
CREATE INDEX idx_consensus_runs_winner_model ON consensus_runs(winner_model);
CREATE INDEX idx_consensus_runs_created_at ON consensus_runs(created_at DESC);
CREATE INDEX idx_consensus_runs_latency ON consensus_runs(consensus_latency_ms);
CREATE INDEX idx_consensus_runs_input_hash ON consensus_runs(input_hash);

-- GIN index for JSONB candidates queries
CREATE INDEX idx_consensus_runs_candidates ON consensus_runs USING GIN (candidates);

-- ==============================================================================
-- Agent State Table (AEGIS Multi-Agent System)
-- ==============================================================================
-- Stores state for 18 AEGIS agents (7 PAT + 5 SAT + 6 TAT)
CREATE TABLE agent_state (
    -- Primary key
    agent_id VARCHAR(255) PRIMARY KEY,

    -- Agent classification
    agent_type VARCHAR(10) NOT NULL, -- 'PAT', 'SAT', 'TAT'
    agent_name VARCHAR(255) NOT NULL,
    agent_role VARCHAR(255) NOT NULL,

    -- State management
    state JSONB NOT NULL DEFAULT '{}',
    health_status VARCHAR(50) NOT NULL DEFAULT 'healthy', -- 'healthy', 'degraded', 'failed'

    -- Performance metrics
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    tasks_failed INTEGER NOT NULL DEFAULT 0,
    avg_task_latency_ms DOUBLE PRECISION,

    -- Resource tracking
    cpu_usage_percent DOUBLE PRECISION,
    memory_usage_mb DOUBLE PRECISION,

    -- Timestamps
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_agent_type CHECK (agent_type IN ('PAT', 'SAT', 'TAT')),
    CONSTRAINT valid_health_status CHECK (health_status IN ('healthy', 'degraded', 'failed')),
    CONSTRAINT positive_tasks CHECK (tasks_completed >= 0 AND tasks_failed >= 0)
);

-- Performance indexes
CREATE INDEX idx_agent_state_type ON agent_state(agent_type);
CREATE INDEX idx_agent_state_health ON agent_state(health_status);
CREATE INDEX idx_agent_state_last_active ON agent_state(last_active DESC);

-- GIN index for JSONB state queries
CREATE INDEX idx_agent_state_state ON agent_state USING GIN (state);

-- ==============================================================================
-- Proof of Impact Analytics Table
-- ==============================================================================
-- Denormalized table for efficient PoI analytics and reporting
CREATE TABLE proof_of_impact (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to trust receipts
    receipt_id VARCHAR(255) NOT NULL,

    -- Five-dimensional PoI metrics (0-100 scale)
    quality REAL NOT NULL,
    utility REAL NOT NULL,
    trust REAL NOT NULL,
    fairness REAL NOT NULL,
    diversity REAL NOT NULL,

    -- Computed aggregate (0-5 scale)
    normalized_score REAL GENERATED ALWAYS AS
        ((quality + utility + trust + fairness + diversity) / 100.0) STORED,

    -- Metadata
    model_name VARCHAR(255) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_poi_receipt FOREIGN KEY (receipt_id)
        REFERENCES trust_receipts(run_id) ON DELETE CASCADE,

    -- Data integrity constraints
    CONSTRAINT valid_quality CHECK (quality >= 0 AND quality <= 100),
    CONSTRAINT valid_utility CHECK (utility >= 0 AND utility <= 100),
    CONSTRAINT valid_trust_score CHECK (trust >= 0 AND trust <= 100),
    CONSTRAINT valid_fairness CHECK (fairness >= 0 AND fairness <= 100),
    CONSTRAINT valid_diversity CHECK (diversity >= 0 AND diversity <= 100)
);

-- Performance indexes for analytics queries
CREATE INDEX idx_poi_normalized_score ON proof_of_impact(normalized_score DESC);
CREATE INDEX idx_poi_model_name ON proof_of_impact(model_name);
CREATE INDEX idx_poi_created_at ON proof_of_impact(created_at DESC);
CREATE INDEX idx_poi_receipt_id ON proof_of_impact(receipt_id);

-- Composite index for model performance analytics
CREATE INDEX idx_poi_model_score ON proof_of_impact(model_name, normalized_score DESC);

-- ==============================================================================
-- Functions and Triggers
-- ==============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_trust_receipts_updated_at
    BEFORE UPDATE ON trust_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_state_updated_at
    BEFORE UPDATE ON agent_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Comments for Documentation
-- ==============================================================================

COMMENT ON TABLE trust_receipts IS 'Immutable cryptographic receipts for synthesis runs with Ed25519 signatures';
COMMENT ON TABLE router_state IS 'Thompson Sampling Beta distribution parameters for AI model routing';
COMMENT ON TABLE consensus_runs IS 'Detailed consensus execution metrics and candidate information';
COMMENT ON TABLE agent_state IS 'State management for 18 AEGIS multi-agent system agents';
COMMENT ON TABLE proof_of_impact IS 'Denormalized PoI analytics for efficient reporting and trend analysis';

COMMENT ON COLUMN router_state.alpha IS 'Beta distribution alpha parameter (successes + 1)';
COMMENT ON COLUMN router_state.beta IS 'Beta distribution beta parameter (failures + 1)';
COMMENT ON COLUMN router_state.win_rate IS 'Computed win rate: alpha / (alpha + beta)';
COMMENT ON COLUMN proof_of_impact.normalized_score IS 'Aggregate PoI score: (quality + utility + trust + fairness + diversity) / 100';
