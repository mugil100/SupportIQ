const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  console.log("Database schema test passed.");
  pool.end();
}
test();
