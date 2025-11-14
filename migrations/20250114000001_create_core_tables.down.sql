-- BIZRA Genesis Node - Core Database Schema Rollback
-- Migration: 20250114000001_create_core_tables
-- Description: Drops all core tables and related objects
-- Author: BIZRA Development Team
-- Date: 2025-01-14

-- Drop triggers first
DROP TRIGGER IF EXISTS update_trust_receipts_updated_at ON trust_receipts;
DROP TRIGGER IF EXISTS update_agent_state_updated_at ON agent_state;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS proof_of_impact CASCADE;
DROP TABLE IF EXISTS consensus_runs CASCADE;
DROP TABLE IF EXISTS agent_state CASCADE;
DROP TABLE IF EXISTS router_state CASCADE;
DROP TABLE IF EXISTS trust_receipts CASCADE;

-- Note: Extensions are not dropped as they may be used by other schemas
-- If needed, manually drop with:
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- DROP EXTENSION IF EXISTS "pg_trgm";
