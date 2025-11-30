-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - SETTLEMENT BRIDGE                                  ║
-- ║  Adds settlement tracking to rewards table                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Add settlement fields to connect rewards to external ledger/token systems
ALTER TABLE poi_rewards
ADD COLUMN settlement_id TEXT,
ADD COLUMN settlement_status TEXT DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'submitted', 'confirmed', 'failed'));

-- Add timestamp for settlement confirmation
ALTER TABLE poi_rewards
ADD COLUMN settled_at TIMESTAMPTZ;

-- Create enum for settlement statuses (optional, for cleaner schema)
CREATE TYPE poi_settlement_status AS ENUM ('pending', 'submitted', 'confirmed', 'failed');

-- Migrate existing column to use enum (if desired, optional)
-- ALTER TABLE poi_rewards
-- ALTER COLUMN settlement_status TYPE poi_settlement_status USING settlement_status::text::poi_settlement_status;

-- Create index for settlement lookups
CREATE INDEX idx_poi_rewards_settlement_status ON poi_rewards(settlement_status);
CREATE INDEX idx_poi_rewards_settlement_id ON poi_rewards(settlement_id) WHERE settlement_id IS NOT NULL;

-- Add epoch-level settlement tracking
ALTER TABLE poi_reward_epoch
ADD COLUMN settlement_batch_id TEXT,
ADD COLUMN settlement_submitted_at TIMESTAMPTZ,
ADD COLUMN settlement_confirmed_at TIMESTAMPTZ;

-- Index for epoch settlement tracking
CREATE INDEX idx_poi_epoch_settlement ON poi_reward_epoch(settlement_batch_id) WHERE settlement_batch_id IS NOT NULL;
