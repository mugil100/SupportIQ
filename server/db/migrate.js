require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

async function migrate() {
  const sqlPath = fs.existsSync(path.join(__dirname, "queries.sql"))
    ? path.join(__dirname, "queries.sql")
    : path.join(__dirname, "../queries.sql");

  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration complete");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
