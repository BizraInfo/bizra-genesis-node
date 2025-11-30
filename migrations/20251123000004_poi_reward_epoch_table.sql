-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI REWARD EPOCH TABLE MIGRATION                    ║
-- ║  Table for managing reward distribution periods                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Reward epoch table
-- Defines windows during which PoI attestations are collected for reward calculation
CREATE TABLE poi_reward_epoch (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp   TIMESTAMPTZ NOT NULL,
    total_pool      NUMERIC(38, 18) NOT NULL,
    status          poi_reward_epoch_status NOT NULL DEFAULT 'active'::poi_reward_epoch_status,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    distributed_at  TIMESTAMPTZ,

    CONSTRAINT poi_reward_epoch_time_valid
        CHECK (end_timestamp > start_timestamp)
);

-- Performance indexes
CREATE INDEX idx_poi_reward_epoch_status ON poi_reward_epoch(status);
CREATE INDEX idx_poi_reward_epoch_window ON poi_reward_epoch(start_timestamp, end_timestamp);
CREATE INDEX idx_poi_reward_epoch_created ON poi_reward_epoch(created_at);
