-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - INVITE TOKENS TABLE MIGRATION                      ║
-- ║  Supports Alpha-100 and future invite-based programs                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_by UUID,
    used_at TIMESTAMPTZ,
    program VARCHAR(50) DEFAULT 'alpha-100' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Foreign key to users table (created_by)
    CONSTRAINT fk_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Foreign key to users table (used_by)
    CONSTRAINT fk_used_by FOREIGN KEY (used_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Ensure used_by and used_at are consistent
    CONSTRAINT chk_used_consistency CHECK (
        (used = TRUE AND used_by IS NOT NULL AND used_at IS NOT NULL) OR
        (used = FALSE AND used_by IS NULL AND used_at IS NULL)
    )
);

-- Add program column to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS program VARCHAR(50) DEFAULT 'general' NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_used ON invite_tokens(used) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_program ON users(program);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to invite_tokens
DROP TRIGGER IF EXISTS update_invite_tokens_updated_at ON invite_tokens;
CREATE TRIGGER update_invite_tokens_updated_at
    BEFORE UPDATE ON invite_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Sample Alpha-100 invites (for testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert a test admin user if not exists (for created_by FK)
INSERT INTO users (id, email, username, password_hash, first_name, last_name, program)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@bizra.ai',
    'bizra_admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oDWpvLPVGqaS', -- "admin123"
    'BIZRA',
    'Admin',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Insert sample Alpha-100 invites for testing
INSERT INTO invite_tokens (token, created_by, expires_at, program)
VALUES
    (
        'ALPHA-TEST-001',
        '00000000-0000-0000-0000-000000000001'::uuid,
        NOW() + INTERVAL '7 days',
        'alpha-100'
    ),
    (
        'ALPHA-TEST-002',
        '00000000-0000-0000-0000-000000000001'::uuid,
        NOW() + INTERVAL '7 days',
        'alpha-100'
    ),
    (
        'ALPHA-TEST-003',
        '00000000-0000-0000-0000-000000000001'::uuid,
        NOW() + INTERVAL '7 days',
        'alpha-100'
    )
ON CONFLICT (token) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to generate random invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'ALPHA-';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create bulk invites
CREATE OR REPLACE FUNCTION create_alpha_invites(
    p_count INTEGER,
    p_created_by UUID,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE (token VARCHAR(255)) AS $$
DECLARE
    i INTEGER;
    new_token VARCHAR(255);
BEGIN
    FOR i IN 1..p_count LOOP
        LOOP
            new_token := generate_invite_token();
            BEGIN
                INSERT INTO invite_tokens (token, created_by, expires_at, program)
                VALUES (new_token, p_created_by, NOW() + (p_expires_in_days || ' days')::INTERVAL, 'alpha-100')
                RETURNING invite_tokens.token INTO new_token;

                token := new_token;
                RETURN NEXT;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- Token collision, try again
                CONTINUE;
            END;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- View for invite analytics
CREATE OR REPLACE VIEW invite_analytics AS
SELECT
    program,
    COUNT(*) AS total_invites,
    COUNT(*) FILTER (WHERE used = TRUE) AS used_invites,
    COUNT(*) FILTER (WHERE used = FALSE AND expires_at > NOW()) AS active_invites,
    COUNT(*) FILTER (WHERE used = FALSE AND expires_at < NOW()) AS expired_invites,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE used = TRUE) / NULLIF(COUNT(*), 0),
        2
    ) AS conversion_rate
FROM invite_tokens
GROUP BY program;

-- View for Alpha-100 user stats
CREATE OR REPLACE VIEW alpha100_stats AS
SELECT
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS users_last_7_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS users_last_30_days,
    MIN(created_at) AS first_signup,
    MAX(created_at) AS latest_signup
FROM users
WHERE program = 'alpha-100';

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT ON invite_analytics TO bizra_api;
GRANT SELECT ON alpha100_stats TO bizra_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE QUERY EXAMPLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Generate 100 Alpha-100 invites
-- SELECT * FROM create_alpha_invites(100, '00000000-0000-0000-0000-000000000001'::uuid);

-- View invite analytics
-- SELECT * FROM invite_analytics;

-- View Alpha-100 user stats
-- SELECT * FROM alpha100_stats;

-- Find unused, non-expired invites
-- SELECT token, expires_at FROM invite_tokens
-- WHERE used = FALSE AND expires_at > NOW()
-- ORDER BY created_at DESC;
