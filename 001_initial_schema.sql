-- Argo Phase 3 Database Migration
-- Initial schema setup

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create doodles table
CREATE TABLE IF NOT EXISTS doodles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    image_hash VARCHAR(32) UNIQUE,
    user_name VARCHAR(50) DEFAULT 'Anonymous',
    session_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    waitlist_position INTEGER,
    reactions JSONB DEFAULT '{"like":0,"love":0,"fire":0,"laugh":0}'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doodle_id UUID NOT NULL REFERENCES doodles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'fire', 'laugh')),
    ip_address INET NOT NULL,
    session_id UUID,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doodle_id, ip_address, reaction_type)
);

-- Create sessions table for tracking unique visitors
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET,
    user_agent TEXT,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    page_views INTEGER DEFAULT 1,
    time_spent_seconds INTEGER DEFAULT 0,
    interactions INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_data JSONB DEFAULT '{}'::jsonb,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    page_section VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create waitlist table (integration point)
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    position INTEGER UNIQUE NOT NULL,
    referral_code VARCHAR(20) UNIQUE,
    referred_by VARCHAR(20),
    source VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_doodles_created_at ON doodles(created_at DESC);
CREATE INDEX idx_doodles_featured ON doodles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_doodles_moderation ON doodles(moderation_status);
CREATE INDEX idx_doodles_hash ON doodles(image_hash);
CREATE INDEX idx_doodles_session ON doodles(session_id);
CREATE INDEX idx_doodles_reactions_gin ON doodles USING gin(reactions);

CREATE INDEX idx_reactions_doodle_id ON reactions(doodle_id);
CREATE INDEX idx_reactions_created_at ON reactions(created_at DESC);
CREATE INDEX idx_reactions_ip ON reactions(ip_address);

CREATE INDEX idx_sessions_last_activity ON sessions(last_activity DESC);
CREATE INDEX idx_sessions_ip ON sessions(ip_address);

CREATE INDEX idx_achievements_session ON achievements(session_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);

CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_doodles_updated_at BEFORE UPDATE ON doodles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get popular doodles
CREATE OR REPLACE FUNCTION get_popular_doodles(limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    id UUID,
    image_url TEXT,
    user_name VARCHAR(50),
    total_reactions INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.image_url,
        d.user_name,
        (d.reactions->>'like')::INTEGER + 
        (d.reactions->>'love')::INTEGER + 
        (d.reactions->>'fire')::INTEGER + 
        (d.reactions->>'laugh')::INTEGER as total_reactions,
        d.created_at
    FROM doodles d
    WHERE d.moderation_status = 'approved'
    ORDER BY total_reactions DESC, d.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment reaction
CREATE OR REPLACE FUNCTION increment_reaction(
    p_doodle_id UUID,
    p_reaction_type VARCHAR(20),
    p_ip_address INET,
    p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if reaction already exists
    SELECT EXISTS(
        SELECT 1 FROM reactions 
        WHERE doodle_id = p_doodle_id 
        AND ip_address = p_ip_address 
        AND reaction_type = p_reaction_type
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Insert reaction
    INSERT INTO reactions (doodle_id, reaction_type, ip_address, session_id)
    VALUES (p_doodle_id, p_reaction_type, p_ip_address, p_session_id);
    
    -- Update doodle reactions count
    UPDATE doodles
    SET reactions = jsonb_set(
        reactions,
        ARRAY[p_reaction_type],
        (COALESCE((reactions->>p_reaction_type)::INTEGER, 0) + 1)::TEXT::JSONB
    )
    WHERE id = p_doodle_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create view for real-time stats
CREATE OR REPLACE VIEW stats_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM doodles WHERE moderation_status = 'approved') as total_doodles,
    (SELECT COUNT(DISTINCT session_id) FROM doodles) as unique_artists,
    (SELECT COUNT(*) FROM reactions) as total_reactions,
    (SELECT COUNT(*) FROM sessions WHERE last_activity > CURRENT_TIMESTAMP - INTERVAL '5 minutes') as active_users,
    (SELECT COUNT(*) FROM doodles WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as doodles_24h,
    (SELECT COUNT(*) FROM waitlist) as waitlist_count,
    (SELECT AVG(time_spent_seconds) FROM sessions WHERE time_spent_seconds > 0) as avg_time_spent,
    (SELECT AVG(interactions) FROM sessions WHERE interactions > 0) as avg_interactions;

-- Insert demo data (optional, remove in production)
INSERT INTO doodles (user_name, image_url, waitlist_position, is_featured, moderation_status)
VALUES 
    ('Demo Artist 1', '/uploads/demo1.png', 1234, true, 'approved'),
    ('Demo Artist 2', '/uploads/demo2.png', 2345, false, 'approved'),
    ('Demo Artist 3', '/uploads/demo3.png', 3456, true, 'approved')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust for your user)
GRANT ALL ON ALL TABLES IN SCHEMA public TO argo_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO argo_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO argo_user;