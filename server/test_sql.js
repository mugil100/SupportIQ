const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    let countQuery = `SELECT COUNT(*) FROM tickets t WHERE 1=1`;
    let dataQuery = `
            SELECT 
                t.ticket_id, t.title, t.status, t.priority, t.category,
                t.created_at, t.escalated, t.escalation_resolved,
                c.name AS customer_name,
                a.name AS agent_name
            FROM tickets t
            LEFT JOIN users c ON t.customer_id = c.id
            LEFT JOIN users a ON t.assigned_agent_id = a.id
            WHERE 1=1 ORDER BY t.created_at DESC LIMIT $1 OFFSET $2
        `;
    
    console.log("Running count...");
    await pool.query(countQuery, []);
    console.log("Running data...");
    await pool.query(dataQuery, [15, 0]);
    console.log("All success");
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
test();
