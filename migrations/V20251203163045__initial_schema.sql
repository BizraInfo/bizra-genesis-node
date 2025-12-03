-- Migration: initial_schema
-- Version: 20251203163045
-- Created: 2025-12-03 16:30:45
-- BIZRA Node0 Genesis - Initial Database Schema

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE agent_type AS ENUM ('PAT', 'SAT');
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'processing', 'error');
CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE node_status AS ENUM ('online', 'offline', 'syncing', 'maintenance');

-- ============================================
-- CORE TABLES
-- ============================================

-- Agents Table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    agent_type agent_type NOT NULL,
    status agent_status DEFAULT 'inactive',
    model VARCHAR(255),
    capabilities JSONB DEFAULT '[]',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    status task_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    input JSONB,
    output JSONB,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Chunks Table (for RAG)
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Federation Nodes Table
CREATE TABLE federation_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    endpoint VARCHAR(500),
    public_key TEXT,
    status node_status DEFAULT 'offline',
    capabilities JSONB DEFAULT '[]',
    last_seen TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255),
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Metrics Table
CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_knowledge_source ON knowledge_chunks(source);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_metrics_name_time ON system_metrics(metric_name, recorded_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INITIAL DATA - PAT AGENTS
-- ============================================
INSERT INTO agents (name, agent_type, status, model, capabilities) VALUES
    ('MasterReasoner', 'PAT', 'active', 'deepseek-r1:8b', '["reasoning", "analysis", "synthesis"]'),
    ('MemoryManager', 'PAT', 'active', 'qwen2.5:7b', '["memory", "context", "retrieval"]'),
    ('CreativeEngine', 'PAT', 'active', 'qwen2.5:7b', '["creative", "writing", "design"]'),
    ('DataAnalyst', 'PAT', 'active', 'mistral', '["data", "analytics", "visualization"]'),
    ('EthicsGuardian', 'PAT', 'active', 'qwen2.5:7b', '["ethics", "validation", "compliance"]'),
    ('CommunicationHub', 'PAT', 'active', 'mistral', '["communication", "formatting", "translation"]');

COMMENT ON TABLE agents IS 'BIZRA Node0 Genesis - AI Agent Registry';
COMMENT ON TABLE tasks IS 'Agent task queue and execution history';
COMMENT ON TABLE knowledge_chunks IS 'RAG knowledge base storage';
COMMENT ON TABLE federation_nodes IS 'BIZRA federation network nodes';
