-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI REWARDS TABLE MIGRATION                         ║
-- ║  Final rewards allocated to contributors after epoch distribution            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Individual rewards table
-- Token amounts allocated to each contributor for each epoch
CREATE TABLE poi_rewards (
    epoch_id        UUID NOT NULL REFERENCES poi_reward_epoch(id) ON DELETE CASCADE,
    contributor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(38, 18) NOT NULL,
    status          poi_reward_status NOT NULL DEFAULT 'pending'::poi_reward_status,
    claimed_at      TIMESTAMPTZ,
    transaction_hash TEXT, -- on-chain or ledger reference
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (epoch_id, contributor_id)
);

-- Performance indexes
CREATE INDEX idx_poi_rewards_contributor ON poi_rewards(contributor_id);
CREATE INDEX idx_poi_rewards_status ON poi_rewards(status);
CREATE INDEX idx_poi_rewards_epoch ON poi_rewards(epoch_id);
