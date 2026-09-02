require("dotenv").config();
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// Use a dedicated pool with SSL support for connecting to Render externally
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

const STAFF = [
  {
    username: "supportiq_manager",
    email: "manager@supportiq.com",
    name: "SupportIQ Manager",
    password: "Manager@2026!",
    role: "manager",
  },
  {
    username: "supportiq_agent",
    email: "agent@supportiq.com",
    name: "SupportIQ Agent",
    password: "Agent@2026!",
    role: "agent",
  },
];

async function seedStaff() {
  console.log("=".repeat(50));
  console.log("SupportIQ Staff Seeder");
  console.log("=".repeat(50));
  console.log("Connecting to:", process.env.DATABASE_URL?.split("@")[1] || "local DB");

  for (const user of STAFF) {
    try {
      const exists = await pool.query(
        "SELECT id FROM users WHERE username = $1 OR email = $2",
        [user.username, user.email]
      );

      if (exists.rows.length > 0) {
        console.log(`\n[SKIP] ${user.role.toUpperCase()} already exists:`);
        console.log(`  Username : ${user.username}`);
        console.log(`  Email    : ${user.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      const result = await pool.query(
        `INSERT INTO users (username, email, password, role, name, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, username, role`,
        [user.username, user.email, hashedPassword, user.role, user.name]
      );

      console.log(`\n[CREATED] ${user.role.toUpperCase()} (ID: ${result.rows[0].id})`);
      console.log(`  Name     : ${user.name}`);
      console.log(`  Username : ${user.username}`);
      console.log(`  Email    : ${user.email}`);
      console.log(`  Password : ${user.password}`);
    } catch (err) {
      console.error(`\n[ERROR] Failed to create ${user.role}:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Done!");
  console.log("=".repeat(50));
  await pool.end();
  process.exit(0);
}

seedStaff();
