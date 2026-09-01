-- SupportIQ Production Database Schema & Migrations

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'manager')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP
);

-- 2. Optional Role Subtables
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS agents (
    agent_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT[] DEFAULT '{}'
);

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('Low','Medium','High')) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Open',
    assigned_agent_id INT REFERENCES users(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_customer_reply_at TIMESTAMP,
    last_agent_reply_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    affected_area VARCHAR(30),
    ai_confidence NUMERIC(3,2),
    source VARCHAR(20) DEFAULT 'web',
    escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    escalation_resolved BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    ai_summary_updated_at TIMESTAMP,
    last_summarized_message_id INT
);

-- Ensure all columns exist on tickets if table already existed
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_customer_reply_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_agent_reply_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS affected_area VARCHAR(30);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_summarized_message_id INT;

-- 4. Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    sender_type VARCHAR(10) CHECK (sender_type IN ('Customer','Agent','System')),
    sender_id INT,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    delivered BOOLEAN NOT NULL DEFAULT false,
    seen BOOLEAN NOT NULL DEFAULT false
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INT REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL,
    message_content VARCHAR(500) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Ticket Feedback / CSAT Ratings
CREATE TABLE IF NOT EXISTS ticket_feedback (
    feedback_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL UNIQUE REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Internal Managerial Notes
CREATE TABLE IF NOT EXISTS ticket_notes (
    note_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
