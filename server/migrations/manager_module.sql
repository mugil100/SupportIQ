-- ============================================================================
-- SupportIQ — Manager Module Schema Migration
-- Run once against your dev database:
--   psql $DATABASE_URL -f server/migrations/manager_module.sql
-- ============================================================================

-- 1. Agent activation flag (controls login gating)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Escalation tracking on tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_resolved BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated_by INT REFERENCES users(id);

-- 3. Internal notes (visible to agents + managers only, never to customers)
CREATE TABLE IF NOT EXISTS internal_notes (
    note_id    SERIAL PRIMARY KEY,
    ticket_id  INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    author_id  INT NOT NULL REFERENCES users(id),
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Agent invite tokens
CREATE TABLE IF NOT EXISTS agent_invites (
    invite_id   SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    invited_by  INT NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMP NOT NULL,
    accepted    BOOLEAN DEFAULT false,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 5. Allow NULL sender_id for System messages in chat
ALTER TABLE ticket_messages ALTER COLUMN sender_id DROP NOT NULL;
