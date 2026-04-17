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
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
);


select * from tickets;
select * from ticket_messages;

ALTER TABLE tickets
ADD COLUMN last_customer_reply_at TIMESTAMP,
ADD COLUMN last_agent_reply_at TIMESTAMP,
ADD COLUMN resolved_at TIMESTAMP,
ADD COLUMN closed_at TIMESTAMP;