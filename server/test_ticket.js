require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const pool = require("./config/database");

async function testInsert() {
    try {
        console.log("Testing ticket insert...");
        
        // 1. Get a test customer
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log("No customer found. Creating one...");
            const insertUser = await pool.query(
                "INSERT INTO users (username, email, password, role, name) VALUES ('testcust1', 'test1@example.com', 'pwd', 'customer', 'Test Cust') RETURNING id"
            );
            userRes.rows.push(insertUser.rows[0]);
        }
        const customer_id = userRes.rows[0].id;
        
        // 2. Test insert ticket
        const result = await pool.query(
            `INSERT INTO tickets
            (customer_id, title, category, priority, description, image_url,
             affected_area, metadata, ai_confidence, last_customer_reply_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING ticket_id, created_at`,
            [customer_id, "Test Title", "API & Integration", "Medium", "This is a test description over 20 chars.", null,
             null, null, 0.9, new Date()]
        );
        
        console.log("Success! Ticket ID:", result.rows[0].ticket_id);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

testInsert();
