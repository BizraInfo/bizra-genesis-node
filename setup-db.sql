-- BIZRA Genesis Node Database Schema Setup
-- Creates all required tables for SQLx offline compilation

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PoI attestations table
CREATE TABLE IF NOT EXISTS poi_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL,
    attestation_id TEXT NOT NULL,
    body JSONB NOT NULL,
    signature TEXT NOT NULL,
    gas_fee BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contributor_id, attestation_id)
);

-- Proof of Impact table
CREATE TABLE IF NOT EXISTS proof_of_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    domain TEXT NOT NULL,
    type TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    evidence_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contributor scores table
CREATE TABLE IF NOT EXISTS poi_contributor_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_id UUID NOT NULL,
    contributor_id UUID NOT NULL,
    total_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    contribution_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(epoch_id, contributor_id)
);

-- Reward epoch table
CREATE TABLE IF NOT EXISTS poi_reward_epoch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_start TIMESTAMP WITH TIME ZONE NOT NULL,
    epoch_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    total_pool DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards table
CREATE TABLE IF NOT EXISTS poi_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    reward_type TEXT NOT NULL,
    transaction_hash TEXT,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (epoch_id) REFERENCES poi_reward_epoch(id)
);

-- Router state table for ML model routing
CREATE TABLE IF NOT EXISTS router_state (
    id SERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL DEFAULT 'embedding',
    alpha DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    beta DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_name, model_type)
);

-- Trust receipts table
CREATE TABLE IF NOT EXISTS trust_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    verification_type TEXT NOT NULL,
    verdict TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    poi_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alpha invites table
CREATE TABLE IF NOT EXISTS alpha_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    invite_token UUID DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'pending',
    invited_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Alpha requests table
CREATE TABLE IF NOT EXISTS alpha_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(email)
);

-- Invite tokens table
CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID DEFAULT gen_random_uuid() UNIQUE,
    email VARCHAR(255),
    invite_type TEXT DEFAULT 'alpha',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID
);

-- Agent state table
CREATE TABLE IF NOT EXISTS agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    session_id TEXT,
    state_data JSONB,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poi_attestations_contributor_id ON poi_attestations(contributor_id);
CREATE INDEX IF NOT EXISTS idx_poi_attestations_attestation_id ON poi_attestations(attestation_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_impact_user_id ON proof_of_impact(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_impact_domain ON proof_of_impact(domain);
CREATE INDEX IF NOT EXISTS idx_poi_contributor_scores_epoch_id ON poi_contributor_scores(epoch_id);
CREATE INDEX IF NOT EXISTS idx_poi_contributor_scores_contributor_id ON poi_contributor_scores(contributor_id);
CREATE INDEX IF NOT EXISTS idx_poi_rewards_epoch_id ON poi_rewards(epoch_id);
CREATE INDEX IF NOT EXISTS idx_poi_rewards_recipient_id ON poi_rewards(recipient_id);
CREATE INDEX IF NOT EXISTS idx_router_state_model_name ON router_state(model_name);
CREATE INDEX IF NOT EXISTS idx_trust_receipts_run_id ON trust_receipts(run_id);
