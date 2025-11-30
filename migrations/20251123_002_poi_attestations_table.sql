-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI ATTESTATIONS TABLE MIGRATION                    ║
-- ║  Main table for storing verified impact attestations                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Create the poi_attestations table
CREATE TABLE poi_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL,
    impact_domain TEXT NOT NULL,
    raw_score REAL NOT NULL CHECK (raw_score >= 0 AND raw_score <= 100),
    weight REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
    normalized_score REAL NOT NULL,
    payload_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    status poi_status NOT NULL DEFAULT 'pending',
    attestation_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,

    -- Foreign key constraint to users table
    CONSTRAINT poi_contributor_fk
        FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Unique constraint to prevent duplicate attestations
    CONSTRAINT poi_payload_hash_unique UNIQUE (payload_hash)
);

-- Performance indexes
CREATE INDEX idx_poi_contributor ON poi_attestations (contributor_id);
CREATE INDEX idx_poi_domain_status ON poi_attestations (impact_domain, status);
CREATE INDEX idx_poi_created_at ON poi_attestations (created_at DESC);

-- Add public_key column to users table for signature verification
-- This might already exist from previous migrations
ALTER TABLE users
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Index for public key lookups during signature verification
CREATE INDEX IF NOT EXISTS idx_users_public_key
ON users (public_key) WHERE public_key IS NOT NULL;
