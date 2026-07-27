const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Raise a ticket
router.post("/raiseticket", verifyToken, (req, res, next) => {
    const uploadSingle = upload.single("image");
    uploadSingle(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { title, category, priority, description, metadata } = req.body;
    const image = req.file?.filename || null;
    const customer_id = req.customer_id;
    const ticket_time = new Date();

    let parsedMetadata = '{}';
    if (metadata) {
        try {
            parsedMetadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
        } catch (e) {
            parsedMetadata = '{}';
        }
    }

    try {
        await pool.query(
            `insert into tickets
            (customer_id, title, category, priority, description, image_url, metadata, last_customer_reply_at)
            values ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [customer_id, title, category, priority || 'Medium', description, image, parsedMetadata, ticket_time]
        );
        res.status(201).json({ message: "Ticket raised successfully" });
    } catch (err) {
        // Fallback in case metadata column is not created yet
        if (err.code === '42703') {
            try {
                await pool.query(
                    `insert into tickets
                    (customer_id, title, category, priority, description, image_url, last_customer_reply_at)
                    values ($1, $2, $3, $4, $5, $6, $7)`,
                    [customer_id, title, category, priority || 'Medium', description, image, ticket_time]
                );
                return res.status(201).json({ message: "Ticket raised successfully" });
            } catch (fallbackErr) {
                console.error(fallbackErr);
                return res.status(500).json({ error: "Database error" });
            }
        }
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

    try {
        const ticket = await pool.query(
            `select * from tickets 
            where ticket_id = $1 and customer_id=$2`,
            [id, customer_id]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        res.json(ticket.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

//fetch chat history
router.get("/ticket/:id/messages", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const ticketCheck = await pool.query(
            `select customer_id, assigned_agent_id from tickets where ticket_id = $1`,
            [id]
        );

        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const ticket = ticketCheck.rows[0];
        if (ticket.customer_id !== req.customer_id && ticket.assigned_agent_id !== req.customer_id) {
            return res.status(403).json({ error: "Access denied" });
        }

        const msgs = await pool.query(
            `select sender_type, message, created_at,message_id,seen,delivered
            from ticket_messages
            where ticket_id =$1 and is_deleted=false
            order by created_at ASC, message_id ASC`, [id]
        );
        res.json(msgs.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});




// update ticket status
router.put("/ticket/:id/status", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const ticketCheck = await pool.query(
            `SELECT status FROM tickets WHERE ticket_id = $1`, [id]
        );
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        
        const currentStatus = ticketCheck.rows[0].status;
        const allowedTransitions = {
            'Open': ['Assigned'],
            'Assigned': ['In Progress'],
            'In Progress': ['Resolved'],
            'Resolved': ['Open', 'Closed'],
            'Closed': []
        };

        if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(status)) {
            return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${status}` });
        }

        await pool.query(
            `update tickets set status = $1 where ticket_id = $2`,
            [status, id]
        );
        res.json({ message: "Status Updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// delete message

router.delete("/ticket/message/:id/", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            `update ticket_messages
            set is_deleted = true
            where message_id=$1 and sender_id=$2`,
            [id, req.customer_id]
        );
        res.json({ message: "Message deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// close ticket and submit rating
router.post("/ticket/:id/close", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { rating, feedback_text } = req.body;
    const customer_id = req.customer_id;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    try {
        // Verify ticket belongs to this customer and is Resolved
        const ticket = await pool.query(
            `SELECT * FROM tickets WHERE ticket_id = $1 AND customer_id = $2`,
            [id, customer_id]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        if (ticket.rows[0].status !== "Resolved") {
            return res.status(400).json({ error: "Ticket must be resolved before closing" });
        }

        // Update ticket status to Closed
        await pool.query(
            `UPDATE tickets SET status = 'Closed', closed_at = NOW() WHERE ticket_id = $1`,
            [id]
        );

        // Insert feedback
        await pool.query(
            `INSERT INTO ticket_feedback (ticket_id, rating, feedback_text)
            VALUES ($1, $2, $3)
            ON CONFLICT (ticket_id) DO UPDATE SET rating = $2, feedback_text = $3`,
            [id, rating, feedback_text || null]
        );

        // Notify the assigned agent
        const agentId = ticket.rows[0].assigned_agent_id;
        if (agentId) {
            const notiResult = await pool.query(
                `INSERT INTO Notifications
                (user_id, ticket_id, notification_type, message_content)
                VALUES($1,$2,'TICKET_CLOSED', $3) RETURNING *`,
                [agentId, id, `Ticket #${id} has been closed by the customer with a ${rating}-star rating`]
            );
            const io = req.app.get("io");
            if (io) {
                io.to(`user_${agentId}`).emit("new_notification", notiResult.rows[0]);
                io.to(id).emit("ticket_closed");
            }
        }

        res.json({ message: "Ticket closed successfully" });
    } catch (err) {
        console.error("Error closing ticket:", err);
        res.status(500).json({ error: "Failed to close ticket" });
    }
});

module.exports = router;
