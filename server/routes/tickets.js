const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Raise a ticket
router.post("/raiseticket", verifyToken, upload.single("image"), async (req, res) => {
    const { title, category, priority, description } = req.body;
    const image = req.file?.filename || null;
    const customer_id = req.customer_id;
    const ticket_time = new Date();
    console.log("File received:", req.file);
    console.log("Headers:", req.headers.authorization);

    try {
        await pool.query(
            `insert into tickets
            (customer_id,title,category,priority,description,image_url, last_customer_reply_at)
            values ($1,$2,$3,$4,$5,$6,$7)`,
            [customer_id, title, category, priority, description, image,ticket_time]
        );
        res.status(201).json({ message: "Ticket raised successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get user's tickets
router.get("/mytickets", verifyToken, async (req, res) => {

    const customer_id = req.customer_id;

    try {
        const result = await pool.query(
            `select ticket_id, title,category,priority,status,created_at
            from tickets
            where customer_id = $1
            order by created_at DESC`,
            [customer_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// get single ticket details
router.get("/ticket/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const customer_id = req.customer_id;

    const ticket = await pool.query(
        `select * from tickets 
        where ticket_id = $1 and customer_id=$2`,
        [id, customer_id]
    );

    if (ticket.rows[0].length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
    }
    res.json(ticket.rows[0]);
});

//fetch chat history
router.get("/ticket/:id/messages", verifyToken, async (req, res) => {
    const { id } = req.params;
    const msgs = await pool.query(
        `select sender_type, message, created_at,message_id,seen,delivered
        from ticket_messages
        where ticket_id =$1 and is_deleted=false
        order by created_at ASC`, [id]
    );
    res.json(msgs.rows);
});


// send new message
router.post("/ticket/:id/message", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    await pool.query(
        `insert into ticket_messages (ticket_id, sender_type,sender_id,message)
        values ($1,'Customer',$2,$3)
        `, [id, req.customer_id, message]
    );
    res.status(201).json({ message: "Message Sent" });
});


//update ticket status
router.put("/ticket/:id/status", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
        `update tickets set status =$1
        where ticket_id = $2 and customer_id = $3`,
        [status, id, req.customer_id]
    );
    res.json({ message: "Status Updated" });
});

// delete message

router.delete("/ticket/message/:id/", verifyToken, async (req, res) => {
    const { id } = req.params;

    await pool.query(
        `update ticket_messages
        set is_deleted = true
        where message_id=$1 and sender_id=$2`,
        [id, req.customer_id]
    );
    res.json({ message: "Message deleted" });
});

module.exports = router;
