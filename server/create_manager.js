const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createManager() {
  try {
    const hashPwd = await bcrypt.hash('password123', 10);
    const res = await pool.query(
      `INSERT INTO users (username, email, password, role, name, is_active)
       VALUES ($1, $2, $3, 'manager', $4, true) RETURNING id, username`,
      ['admin_manager', 'manager@supportiq.com', hashPwd, 'Admin Manager']
    );
    console.log('Successfully created manager:');
    console.log('Username: ' + res.rows[0].username);
    console.log('Password: password123');
  } catch (err) {
    if (err.code === '23505') {
        console.log('Manager user already exists! You can log in with:');
        console.log('Username: admin_manager');
        console.log('Password: password123 (if not changed)');
    } else {
        console.error('Error:', err);
    }
  } finally {
    await pool.end();
  }
}
createManager();
