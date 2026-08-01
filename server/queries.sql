select * from users;

-- select column names
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

select * from users;

-- select column names
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    
    customer_id INT NOT NULL,
    
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('Low','Medium','High')) NOT NULL,
    
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Open',
    
    assigned_agent_id INT,
    
    image_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent_id) REFERENCES agents(agent_id) ON DELETE SET NULL
);

CREATE TABLE ticket_messages (
    message_id SERIAL PRIMARY KEY,
    
    ticket_id INT NOT NULL,
    sender_type VARCHAR(10) CHECK (sender_type IN ('Customer','Agent','System')),
    sender_id INT,
    
    message TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    delivered BOOLEAN NOT NULL DEFAULT false,
    seen BOOLEAN NOT NULL DEFAULT false,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    CONSTRAINT check_sender_id CHECK (
        (sender_type = 'System') OR 
        (sender_type IN ('Customer','Agent') AND sender_id IS NOT NULL)
    )
);

CREATE TABLE ticket_messages (
    message_id SERIAL PRIMARY KEY,
    
    ticket_id INT NOT NULL,
    sender_type VARCHAR(10) CHECK (sender_type IN ('Customer','Agent','System')),
    sender_id INT,
    
    message TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    delivered BOOLEAN NOT NULL DEFAULT false,
    seen BOOLEAN NOT NULL DEFAULT false,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    CONSTRAINT check_sender_id CHECK (
        (sender_type = 'System') OR 
        (sender_type IN ('Customer','Agent') AND sender_id IS NOT NULL)
    )
);


select * from tickets;
select * from ticket_messages;

ALTER TABLE tickets
ADD COLUMN last_customer_reply_at TIMESTAMP,
ADD COLUMN last_agent_reply_at TIMESTAMP,
ADD COLUMN resolved_at TIMESTAMP,
ADD COLUMN closed_at TIMESTAMP;

CREATE TABLE Notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    ticket_id INT,
    notification_type VARCHAR(30) NOT NULL,
    message_content VARCHAR(500) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

select * from Notifications;

-- Ticket feedback / CSAT ratings
CREATE TABLE ticket_feedback (
    feedback_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL UNIQUE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
);

select * from ticket_feedback;

-- Ticket feedback / CSAT ratings
CREATE TABLE ticket_feedback (
    feedback_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL UNIQUE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
);

ALTER TABLE tickets ADD CONSTRAINT check_ticket_status CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'));

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS affected_area VARCHAR(30) CHECK (affected_area IN ('Dashboard', 'API / SDK', 'Webhooks', 'Settlements', 'Reports'));


-- 1. Affected area — which product surface the issue relates to
-- Why: Enables routing tickets to the right team and filtering in the agent dashboard
ALTER TABLE tickets
ADD COLUMN affected_area VARCHAR(30)
CHECK (affected_area IN ('Dashboard', 'API / SDK', 'Webhooks', 'Settlements', 'Reports'));

-- 3. AI classification confidence — records how confident the AI was
-- Why: Lets you build analytics on AI accuracy over time. If a ticket was miscategorised,
-- you can correlate with low confidence scores.
ALTER TABLE tickets
ADD COLUMN ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1);

-- 4. Source channel — where the ticket was created from
-- Why: Future-proofs for when you add email/API/Slack ticket creation.
-- For now, all tickets will be 'web'.
ALTER TABLE tickets
ADD COLUMN source VARCHAR(20) DEFAULT 'web'
CHECK (source IN ('web', 'email', 'api', 'slack'));

-- 5. Expand the status constraint to include 'Assigned'
-- (already in your allowedTransitions but missing from the CHECK constraint)
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS check_ticket_status;
ALTER TABLE tickets ADD CONSTRAINT check_ticket_status
CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'));

-- 6. Expand category to fit longer names like "Account & Compliance" (18 chars is fine but safer at 50)
-- and add a CHECK constraint to prevent bad data:
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS check_ticket_category;
ALTER TABLE tickets ADD CONSTRAINT check_ticket_category
CHECK (category IN (
    'Billing & Invoicing',
    'API & Integration',
    'Onboarding & KYC',
    'Transaction Disputes',
    'Account & Compliance'
));

-- 1. Delete associated notifications for the offending tickets
DELETE FROM notifications 
WHERE ticket_id IN (
    SELECT ticket_id FROM tickets 
    WHERE category NOT IN (
        'Billing & Invoicing',
        'API & Integration',
        'Onboarding & KYC',
        'Transaction Disputes',
        'Account & Compliance'
    ) OR category IS NULL
);

-- 2. Delete the offending tickets
DELETE FROM tickets 
WHERE category NOT IN (
    'Billing & Invoicing',
    'API & Integration',
    'Onboarding & KYC',
    'Transaction Disputes',
    'Account & Compliance'
) OR category IS NULL;

-- 3. Add the constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS check_ticket_category;
ALTER TABLE tickets ADD CONSTRAINT check_ticket_category
CHECK (category IN (
    'Billing & Invoicing',
    'API & Integration',
    'Onboarding & KYC',
    'Transaction Disputes',
    'Account & Compliance'
));

-- ── Smart Ticket Summary ──────────────────────────────────────────────────
-- ai_summary: cached 2-sentence AI summary of the ticket thread
-- ai_summary_updated_at: timestamp of last generation (used for 60s debounce)
-- last_summarized_message_id: cursor — highest message_id included in current summary
--   NULL means no summary exists yet or the summary was invalidated by a new message
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_summarized_message_id INT;
