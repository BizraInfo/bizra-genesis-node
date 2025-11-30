-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  BIZRA GENESIS NODE - ALPHA INVITES TABLES MIGRATION                      ║
-- ║  Tables for Alpha-100 user onboarding and invite management                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Create custom enum type for invite status
CREATE TYPE invite_status AS ENUM ('pending', 'sent', 'accepted', 'expired', 'revoked');

-- Alpha requests table - stores user requests for alpha access
CREATE TABLE IF NOT EXISTS alpha_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(255),
    use_case TEXT NOT NULL,
    experience VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL UNIQUE,
    status invite_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alpha invites table - stores generated invite codes
CREATE TABLE IF NOT EXISTS alpha_invites (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    invite_code VARCHAR(255) UNIQUE NOT NULL,
    status invite_status NOT NULL DEFAULT 'sent',
    position INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    -- Foreign key to alpha_requests
    CONSTRAINT fk_alpha_invite_request FOREIGN KEY (email)
        REFERENCES alpha_requests(email) ON DELETE CASCADE
);

-- Users table extension (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_alpha_user BOOLEAN NOT NULL DEFAULT FALSE,
    alpha_position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alpha_requests_email ON alpha_requests(email);
CREATE INDEX IF NOT EXISTS idx_alpha_requests_position ON alpha_requests(position);
CREATE INDEX IF NOT EXISTS idx_alpha_requests_status ON alpha_requests(status);
CREATE INDEX IF NOT EXISTS idx_alpha_invites_email ON alpha_invites(email);
CREATE INDEX IF NOT EXISTS idx_alpha_invites_code ON alpha_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_alpha_invites_expires ON alpha_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_alpha ON users(is_alpha_user, alpha_position);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_alpha_requests_updated_at ON alpha_requests;
CREATE TRIGGER update_alpha_requests_updated_at
    BEFORE UPDATE ON alpha_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Sample Alpha-100 requests and invites (for testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert sample alpha requests
INSERT INTO alpha_requests (name, email, organization, use_case, experience, position, status)
VALUES
    ('John Doe', 'john.doe@example.com', 'Tech Corp', 'Building AI-powered analytics platform', 'Senior Developer', 1, 'pending'),
    ('Jane Smith', 'jane.smith@example.com', 'Startup Inc', 'Researching multi-agent systems', 'AI Researcher', 2, 'pending'),
    ('Bob Johnson', 'bob.johnson@example.com', 'University', 'Academic research on consensus algorithms', 'Professor', 3, 'pending')
ON CONFLICT (email) DO NOTHING;

-- Insert corresponding invites for first 3 users
INSERT INTO alpha_invites (id, email, invite_code, status, position, expires_at)
VALUES
    (gen_random_uuid()::text, 'john.doe@example.com', 'ALPHA-ABCD-1234-EFGH', 'sent', 1, NOW() + INTERVAL '7 days'),
    (gen_random_uuid()::text, 'jane.smith@example.com', 'ALPHA-IJKL-5678-MNOP', 'sent', 2, NOW() + INTERVAL '7 days'),
    (gen_random_uuid()::text, 'bob.johnson@example.com', 'ALPHA-QRST-9012-UVWX', 'sent', 3, NOW() + INTERVAL '7 days')
ON CONFLICT (invite_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- View for alpha program analytics
CREATE OR REPLACE VIEW alpha_program_analytics AS
SELECT
    'requests' as metric_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted
FROM alpha_requests

UNION ALL

SELECT
    'invites' as metric_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as pending,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted
FROM alpha_invites

UNION ALL

SELECT
    'users' as metric_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_alpha_user = TRUE) as alpha_users,
    COUNT(*) FILTER (WHERE is_alpha_user = FALSE) as regular_users
FROM users;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to generate alpha invite codes
CREATE OR REPLACE FUNCTION generate_alpha_invite_code()
RETURNS VARCHAR(255) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding ambiguous chars
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 12 random characters
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Format as XXXX-XXXX-XXXX
    RETURN substr(result, 1, 4) || '-' || substr(result, 5, 4) || '-' || substr(result, 9, 4);
END;
$$ LANGUAGE plpgsql;

-- Function to get next position for alpha requests
CREATE OR REPLACE FUNCTION get_next_alpha_position()
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos FROM alpha_requests;
    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Grant permissions to the API user (adjust as needed)
GRANT SELECT, INSERT, UPDATE ON alpha_requests TO bizra_api;
GRANT SELECT, INSERT, UPDATE ON alpha_invites TO bizra_api;
GRANT SELECT, INSERT, UPDATE ON users TO bizra_api;
GRANT USAGE ON SEQUENCE alpha_requests_id_seq TO bizra_api;
GRANT USAGE ON SEQUENCE users_id_seq TO bizra_api;

-- Grant permissions on views
GRANT SELECT ON alpha_program_analytics TO bizra_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS FOR DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE alpha_requests IS 'User requests for Alpha-100 program access';
COMMENT ON TABLE alpha_invites IS 'Generated invite codes for Alpha-100 users';
COMMENT ON TABLE users IS 'User accounts with alpha program support';
COMMENT ON VIEW alpha_program_analytics IS 'Analytics view for alpha program metrics';