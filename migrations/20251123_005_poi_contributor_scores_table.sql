-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI CONTRIBUTOR SCORES TABLE MIGRATION               ║
-- ║  Stores computed scores per contributor per epoch                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Contributor scores table
-- AggregatedPoi scores derived from attestations within each epoch
CREATE TABLE poi_contributor_scores (
    epoch_id        UUID NOT NULL REFERENCES poi_reward_epoch(id) ON DELETE CASCADE,
    contributor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_score     NUMERIC(38, 18) NOT NULL,
    normalized_share NUMERIC(38, 18) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (epoch_id, contributor_id),

    CONSTRAINT poi_contributor_scores_share_valid
        CHECK (normalized_share >= 0 AND normalized_share <= 1)
);

-- Performance indexes
CREATE INDEX idx_poi_scores_contributor ON poi_contributor_scores(contributor_id);
CREATE INDEX idx_poi_scores_epoch ON poi_contributor_scores(epoch_id);
