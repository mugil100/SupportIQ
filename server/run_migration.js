const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./migrations/manager_module.sql', 'utf-8');
    await pool.query(sql);
    console.log("Migration executed successfully!");
  } catch(e) {
    console.error("Migration failed:", e.message);
  } finally {
    pool.end();
  }
}

runMigration();
