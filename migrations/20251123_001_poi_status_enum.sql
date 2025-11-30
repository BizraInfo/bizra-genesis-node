-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - POI STATUS ENUM MIGRATION                          ║
-- ║  Creates enum for PoI attestation status tracking                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Create the poi_status enum
-- Note: In production, this should be handled by your migration framework
-- which supports conditional creation. For now, run manually if needed:

CREATE TYPE poi_status AS ENUM (
    'pending',
    'verified',
    'rejected',
    'revoked'
);
