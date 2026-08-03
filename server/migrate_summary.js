 require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
  ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMP;
  ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_summarized_message_id INT;
`;

pool.query(sql)
  .then(() => { console.log('Migration OK — 3 columns added to tickets'); process.exit(0); })
  .catch(e => { console.error('Migration FAILED:', e.message); process.exit(1); });
