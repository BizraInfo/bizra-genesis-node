-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI REWARDS STATUS ENUMS MIGRATION                  ║
-- ║  Creates enum types for reward epoch and individual reward status tracking ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Create the reward epoch status enum
-- Tracks the lifecycle of each reward period
CREATE TYPE poi_reward_epoch_status AS ENUM (
    'active',
    'closed',
    'distributed'
);

-- Create the individual reward status enum
-- Tracks what happened to each contributor's rewards
CREATE TYPE poi_reward_status AS ENUM (
    'pending',
    'distributed',
    'claimed',
    'expired'
);
