-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - SAT-LAB MODEL TRACKING                            ║
-- ║  Track which sovereign model generated each piece of content            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Add model_id column to track content provenance
ALTER TABLE sat_outbox_items 
    ADD COLUMN IF NOT EXISTS model_id VARCHAR(64) DEFAULT 'bizra-planner:latest';

-- Add index for filtering by model
CREATE INDEX IF NOT EXISTS idx_sat_outbox_model_id 
    ON sat_outbox_items (model_id);

-- Add model info to recommendations
ALTER TABLE sat_recommendations
    ADD COLUMN IF NOT EXISTS model_id VARCHAR(64) DEFAULT 'bizra-planner:latest';

-- Add model info to activities
ALTER TABLE sat_activities
    ADD COLUMN IF NOT EXISTS model_id VARCHAR(64) DEFAULT 'bizra-planner:latest';

-- Comment for documentation
COMMENT ON COLUMN sat_outbox_items.model_id IS 'Ollama model that generated this content (e.g., bizra-planner:latest)';
COMMENT ON COLUMN sat_recommendations.model_id IS 'Ollama model that generated this recommendation';
COMMENT ON COLUMN sat_activities.model_id IS 'Ollama model involved in this activity';
