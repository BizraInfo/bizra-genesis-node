-- BIZRA Node0 - PostgreSQL Schema Initialization (v1.0.1)
-- Document ID: BIZRA-NODE0-v1.0.1-GENESIS
-- Layer 3: Data & Assets (The Memory)
-- 
-- v1.0.1 Changes:
-- - Hardware profile: 128GB RAM, 3TB storage
-- - Simplified extensions: pgcrypto + vector only
--
-- This script creates all core tables for BIZRA Genesis Node:
-- 1. user_profile - User identity and preferences
-- 2. asset_registry - Indexed files and documents
-- 3. poi_ledger - Proof-of-Impact event log
-- 4. knowledge_base - Vector embeddings for semantic search
-- 5. resource_pool - Node resource allocation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- ============================================
-- 1. USER PROFILE TABLE
-- Stores user identity, seed state, and preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE DEFAULT 'NODE0-USER',
    
    -- Seed State: dreamer, builder, learner, healer, provider
    seed_state TEXT NOT NULL CHECK (seed_state IN ('dreamer', 'builder', 'learner', 'healer', 'provider')),
    
    -- Primary PAT Agent Role
    primary_pat_role TEXT NOT NULL CHECK (primary_pat_role IN (
        'MasterReasoner', 'MemoryArchitect', 'CreativeSynthesizer',
        'DataAnalyzer', 'Communicator', 'ExecutionPlanner', 'EthicsGuardian'
    )),
    
    -- User goals and preferences
    goals JSONB DEFAULT '[]'::jsonb,
    time_available_weekly INTEGER, -- minutes per week
    
    -- Onboarding data
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}'::jsonb,
    
    -- Authentication (local only)
    password_hash TEXT,
    wallet_public_key TEXT,
    wallet_encrypted_private_key TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ASSET REGISTRY TABLE
-- Indexes all files Node0 can access
-- ============================================
CREATE TABLE IF NOT EXISTS asset_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File identification
    path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_extension TEXT,
    
    -- Domain classification
    domain TEXT NOT NULL CHECK (domain IN (
        'core_bizra',           -- BIZRA system code
        'rd_knowledge',         -- Research papers, whitepapers
        'third_party_tooling',  -- External libraries
        'system_infra',         -- Docker configs, deployment
        'personal_sensitive'    -- User's personal files (encrypted)
    )),
    
    -- File metadata
    file_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    last_modified TIMESTAMPTZ NOT NULL,
    content_hash TEXT,  -- SHA-256 for deduplication
    
    -- Indexing status
    indexed_at TIMESTAMPTZ DEFAULT NOW(),
    embedding_id UUID,  -- Reference to knowledge_base
    is_indexed BOOLEAN DEFAULT FALSE,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. POI LEDGER TABLE
-- Immutable log of all valuable contributions
-- ============================================
CREATE TABLE IF NOT EXISTS poi_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type TEXT NOT NULL CHECK (event_type IN (
        'task_completed',         -- User finished work task with PAT
        'resource_contributed',   -- Node provided compute
        'knowledge_shared',       -- User added to knowledge base
        'learning_session',       -- User completed educational module
        'bug_fixed',              -- User fixed code issue
        'documentation_written',  -- User created/improved docs
        'onboarding_completed',   -- User completed onboarding
        'plan_created',           -- User created 7-day plan
        'daily_checkin',          -- Daily check-in completed
        'weekly_reflection'       -- Weekly reflection completed
    )),
    task_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'NODE0-USER',
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    
    -- Scoring (core BIZRA metrics)
    impact_score NUMERIC(10,4) NOT NULL CHECK (impact_score >= 0),
    ihsan_score NUMERIC(5,4) NOT NULL CHECK (ihsan_score >= 0 AND ihsan_score <= 1),
    
    -- Resources used
    resources_used JSONB DEFAULT '{}'::jsonb,
    -- Example: {"model": "deepseek-r1:7b", "tokens": 15420, "gpu_minutes": 12}
    
    -- Output artifacts
    assets_produced TEXT[],
    description TEXT,
    
    -- Verification (SAT PoI Verifier)
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    rejection_reason TEXT,
    
    -- Simulated rewards (pre-mainnet)
    reward_bzc NUMERIC(20,8) DEFAULT 0,  -- BIZRA Coin (utility)
    reward_imp NUMERIC(20,8) DEFAULT 0,  -- Impact Token (soulbound)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. KNOWLEDGE BASE TABLE
-- Vector embeddings for semantic search
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- text, code, markdown
    
    -- Source tracking
    source_file TEXT,
    source_url TEXT,
    chunk_index INTEGER,
    
    -- Vector embedding (1536 dimensions for OpenAI-compatible models)
    embedding VECTOR(1536),
    
    -- Categorization
    category TEXT,
    tags TEXT[],
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. RESOURCE POOL TABLE
-- Node resource allocation and tracking
-- ============================================
CREATE TABLE IF NOT EXISTS resource_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL DEFAULT 'NODE0-TITAN',
    
    -- CPU allocation
    cpu_cores_total INTEGER NOT NULL,
    cpu_cores_allocated INTEGER NOT NULL DEFAULT 0,
    
    -- GPU allocation
    gpu_enabled BOOLEAN DEFAULT FALSE,
    gpu_vram_gb NUMERIC(10,2),
    gpu_allocated BOOLEAN DEFAULT FALSE,
    
    -- Storage allocation
    storage_total_gb NUMERIC(10,2) NOT NULL,
    storage_allocated_gb NUMERIC(10,2) DEFAULT 0,
    
    -- Network
    bandwidth_mbps INTEGER,
    
    -- Availability windows (JSON array of time ranges)
    availability_hours JSONB DEFAULT '["00:00-08:00", "18:00-24:00"]'::jsonb,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'offline', 'maintenance')),
    
    -- Statistics
    total_tasks_processed INTEGER DEFAULT 0,
    total_compute_hours NUMERIC(10,2) DEFAULT 0,
    total_bzc_earned NUMERIC(20,8) DEFAULT 0,
    
    -- System info (populated by Env Snapshot)
    system_info JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PAT SESSIONS TABLE
-- Track PAT agent conversations
-- ============================================
CREATE TABLE IF NOT EXISTS pat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'NODE0-USER',
    
    -- Session info
    session_name TEXT,
    primary_agent TEXT NOT NULL,
    
    -- Messages (stored as JSONB array)
    messages JSONB DEFAULT '[]'::jsonb,
    
    -- Statistics
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    avg_latency_ms NUMERIC(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PLANS TABLE
-- 7-Day plans created by PAT
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'NODE0-USER',
    
    -- Plan metadata
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    
    -- Plan structure
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Progress tracking
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    progress_percent NUMERIC(5,2) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    
    -- Timestamps
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. SYSTEM HEALTH TABLE
-- Track system health metrics
-- ============================================
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL DEFAULT 'NODE0-TITAN',
    
    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Health metrics
    cpu_usage_percent NUMERIC(5,2),
    memory_usage_percent NUMERIC(5,2),
    gpu_usage_percent NUMERIC(5,2),
    disk_usage_percent NUMERIC(5,2),
    
    -- Service status
    services_status JSONB DEFAULT '{}'::jsonb,
    -- Example: {"postgres": "healthy", "redis": "healthy", "ollama": "healthy"}
    
    -- Network metrics
    latency_ms NUMERIC(10,2),
    
    -- Ollama metrics
    ollama_models_loaded TEXT[],
    ollama_active_requests INTEGER DEFAULT 0,
    
    -- Overall status
    overall_status TEXT DEFAULT 'healthy' CHECK (overall_status IN ('healthy', 'degraded', 'critical', 'offline'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- PoI Ledger indexes
CREATE INDEX IF NOT EXISTS idx_poi_timestamp ON poi_ledger(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_poi_ihsan ON poi_ledger(ihsan_score DESC);
CREATE INDEX IF NOT EXISTS idx_poi_user ON poi_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_poi_event_type ON poi_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_poi_verified ON poi_ledger(verified);

-- Asset Registry indexes
CREATE INDEX IF NOT EXISTS idx_asset_domain ON asset_registry(domain);
CREATE INDEX IF NOT EXISTS idx_asset_path ON asset_registry(path);
CREATE INDEX IF NOT EXISTS idx_asset_type ON asset_registry(file_type);
CREATE INDEX IF NOT EXISTS idx_asset_indexed ON asset_registry(is_indexed);

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS idx_kb_source ON knowledge_base(source_file);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
-- Note: Vector index created separately with HNSW

-- PAT Sessions indexes
CREATE INDEX IF NOT EXISTS idx_session_user ON pat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON pat_sessions(is_active);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plan_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_status ON plans(status);

-- System Health indexes
CREATE INDEX IF NOT EXISTS idx_health_time ON system_health(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_status ON system_health(overall_status);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_registry_updated_at
    BEFORE UPDATE ON asset_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_pool_updated_at
    BEFORE UPDATE ON resource_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pat_sessions_updated_at
    BEFORE UPDATE ON pat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Calculate PoI Rewards
-- ============================================
CREATE OR REPLACE FUNCTION calculate_poi_rewards(
    p_impact_score NUMERIC,
    p_ihsan_score NUMERIC,
    p_duration_minutes INTEGER
) RETURNS TABLE(bzc_reward NUMERIC, imp_reward NUMERIC) AS $$
BEGIN
    -- BZC (utility token) = impact * duration * 0.1
    bzc_reward := p_impact_score * COALESCE(p_duration_minutes, 1) * 0.1;
    
    -- IMP (soulbound) = ihsan * impact * 0.5
    imp_reward := p_ihsan_score * p_impact_score * 0.5;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Verify PoI Event (SAT PoI Verifier)
-- ============================================
CREATE OR REPLACE FUNCTION verify_poi_event(
    p_event_id UUID,
    p_ihsan_threshold NUMERIC DEFAULT 0.85
) RETURNS BOOLEAN AS $$
DECLARE
    v_ihsan NUMERIC;
    v_impact NUMERIC;
    v_result BOOLEAN := FALSE;
BEGIN
    -- Get event scores
    SELECT ihsan_score, impact_score 
    INTO v_ihsan, v_impact
    FROM poi_ledger 
    WHERE id = p_event_id;
    
    -- Check Ihsan threshold
    IF v_ihsan >= p_ihsan_threshold THEN
        -- Mark as verified
        UPDATE poi_ledger 
        SET verified = TRUE,
            verified_at = NOW(),
            verification_notes = 'Auto-verified: Ihsan score meets threshold'
        WHERE id = p_event_id;
        v_result := TRUE;
    ELSE
        -- Mark rejection reason
        UPDATE poi_ledger 
        SET verified = FALSE,
            rejection_reason = 'Ihsan score below threshold: ' || v_ihsan::TEXT || ' < ' || p_ihsan_threshold::TEXT
        WHERE id = p_event_id;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get User PoI Statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_user_poi_stats(p_user_id TEXT DEFAULT 'NODE0-USER')
RETURNS TABLE(
    total_events BIGINT,
    verified_events BIGINT,
    total_impact NUMERIC,
    avg_ihsan NUMERIC,
    total_minutes BIGINT,
    total_bzc NUMERIC,
    total_imp NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_events,
        COUNT(*) FILTER (WHERE verified = TRUE)::BIGINT as verified_events,
        COALESCE(SUM(impact_score), 0) as total_impact,
        COALESCE(AVG(ihsan_score), 0) as avg_ihsan,
        COALESCE(SUM(duration_minutes), 0)::BIGINT as total_minutes,
        COALESCE(SUM(reward_bzc), 0) as total_bzc,
        COALESCE(SUM(reward_imp), 0) as total_imp
    FROM poi_ledger
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA: Default Node0 Resource Pool
-- Hardware Profile: NODE0-TITAN
-- ============================================
INSERT INTO resource_pool (
    node_id,
    cpu_cores_total,
    cpu_cores_allocated,
    gpu_enabled,
    gpu_vram_gb,
    storage_total_gb,
    storage_allocated_gb,
    bandwidth_mbps,
    status,
    system_info
) VALUES (
    'NODE0-TITAN',
    24,          -- i9-14900HX has 24 cores (32 threads)
    4,           -- Default allocation: 4 cores
    TRUE,        -- GPU enabled
    16,          -- RTX 4090 Laptop GPU: 16GB VRAM
    3000,        -- 3TB NVMe SSD
    100,         -- Default 100GB allocated
    1000,        -- 1Gbps assumed
    'active',
    '{
        "cpu": "Intel i9-14900HX",
        "cpu_threads": 32,
        "ram_gb": 128,
        "gpu": "NVIDIA RTX 4090 Laptop GPU",
        "gpu_vram_gb": 16,
        "storage_gb": 3000,
        "os": "Windows 11 Pro + WSL2 Ubuntu 22.04",
        "hostname": "NODE0-TITAN"
    }'::jsonb
) ON CONFLICT (node_id) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bizra_node0;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bizra_node0;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bizra_node0;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'BIZRA Node0 Database Schema Initialized';
    RAISE NOTICE 'Tables created: 8';
    RAISE NOTICE 'Indexes created: 15';
    RAISE NOTICE 'Functions created: 4';
    RAISE NOTICE 'Default resource pool: NODE0-TITAN';
    RAISE NOTICE '================================================';
END $$;
