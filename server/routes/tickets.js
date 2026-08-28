const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");
const aiRoutes = require("./ai");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const { generalLimiter } = require("../middleware/rateLimiter");

const { classifyTicket } = aiRoutes;

const router = express.Router();

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Secure route to serve uploaded files using S3 pre-signed URLs
router.get("/uploads/:filename", verifyToken, async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Ensure s3 client is attached to upload middleware
        const s3Client = upload.s3Client;
        if (!s3Client || !process.env.AWS_S3_BUCKET) {
            return res.status(500).json({ error: "S3 not configured on server" });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: filename
        });

        // Generate a pre-signed URL valid for 5 minutes (300 seconds)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // Redirect browser to the secure AWS URL
        res.redirect(presignedUrl);
    } catch (err) {
        console.error("Error generating presigned URL:", err);
        res.status(500).json({ error: "Failed to generate presigned URL" });
    }
});


// Raise a ticket
// router.post("/raiseticket", verifyToken, (req, res, next) => {
//     const uploadSingle = upload.single("image");
//     uploadSingle(req, res, (err) => {
//         if (err) {
//             if (err.code === "LIMIT_FILE_SIZE") {
//                 return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
//             }
//             return res.status(400).json({ error: err.message });
//         }
//         next();
//     });
// }, async (req, res) => {
//     const { title, category, priority, description, metadata, affected_area } = req.body;
//     const image = req.file?.filename || null;
//     const customer_id = req.customer_id;
//     const ticket_time = new Date();

//     let parsedMetadata = '{}';
//     if (metadata) {
//         try {
//             parsedMetadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
//         } catch (e) {
//             parsedMetadata = '{}';
//         }
//     }

//     try {
//         const result = await pool.query(
//             `insert into tickets
//             (customer_id, title, category, priority, description, image_url, metadata, affected_area, last_customer_reply_at)
//             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//             RETURNING ticket_id, created_at`,
//             [customer_id, title, category, priority || 'Medium', description, image, parsedMetadata, affected_area || null, ticket_time]
//         );
//         res.status(201).json({ 
//             message: "Ticket raised successfully",
//             ticket_id: result.rows[0].ticket_id,
//             created_at: result.rows[0].created_at
//         });
//     } catch (err) {
//         // Fallback in case metadata or affected_area column is not created yet
//         if (err.code === '42703') {
//             try {
//                 const fallbackResult = await pool.query(
//                     `insert into tickets
//                     (customer_id, title, category, priority, description, image_url, last_customer_reply_at)
//                     values ($1, $2, $3, $4, $5, $6, $7)
//                     RETURNING ticket_id, created_at`,
//                     [customer_id, title, category, priority || 'Medium', description, image, ticket_time]
//                 );
//                 return res.status(201).json({ 
//                     message: "Ticket raised successfully",
//                     ticket_id: fallbackResult.rows[0].ticket_id,
//                     created_at: fallbackResult.rows[0].created_at
//                 });
//             } catch (fallbackErr) {
//                 console.error(fallbackErr);
//                 return res.status(500).json({ error: "Database error" });
//             }
//         }
//         console.error(err);
//         res.status(500).json({ error: "Database error" });
//     }
// });
// Add at top of file
const VALID_CATEGORIES = [
    "Billing & Invoicing",
    "API & Integration",
    "Onboarding & KYC",
    "Transaction Disputes",
    "Account & Compliance"
];

const VALID_PRIORITIES = ["Low", "Medium", "High"];

const VALID_AFFECTED_AREAS = ["Dashboard", "API / SDK", "Webhooks", "Settlements", "Reports"];

// Raise a ticket — hardened
router.post("/raiseticket", verifyToken, generalLimiter, (req, res, next) => {
    const uploadSingle = upload.single("image");
    uploadSingle(req, res, (err) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
},
[
    body("title").trim().isLength({ min: 5, max: 150 }).withMessage("Title must be between 5 and 150 characters"),
    body("description").trim().isLength({ min: 20, max: 5000 }).withMessage("Description must be between 20 and 5000 characters"),
    body("category").optional({ checkFalsy: true }).isIn(VALID_CATEGORIES).withMessage("Invalid category"),
    body("affected_area").optional({ checkFalsy: true }).isIn(VALID_AFFECTED_AREAS).withMessage("Invalid affected area"),
],
validate,
async (req, res) => {
    try {
        const { title, category, priority, description, affected_area, metadata } = req.body;
        const image = req.file?.key || req.file?.filename || null;
        const customer_id = req.customer_id;

        // ── Title validation ──
        const cleanTitle = title?.trim();
        if (!cleanTitle || cleanTitle.length < 5) {
            return res.status(400).json({
                error: "Title must be at least 5 characters",
                field: "title"
            });
        }
        if (cleanTitle.length > 150) {
            return res.status(400).json({
                error: "Title must be under 150 characters",
                field: "title"
            });
        }

        // ── Category whitelist (kept only as a fallback input; AI will override it) ──
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
                field: "category"
            });
        }

        // ── Priority whitelist (kept only as a fallback input; AI will override it) ──
        const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "Medium";

        // ── Description validation ──
        const cleanDesc = description?.trim();
        if (!cleanDesc || cleanDesc.length < 20) {
            return res.status(400).json({
                error: "Description must be at least 20 characters",
                field: "description"
            });
        }
        if (cleanDesc.length > 5000) {
            return res.status(400).json({
                error: "Description must be under 5000 characters",
                field: "description"
            });
        }

        // ── Affected area whitelist (optional) ──
        const safeArea = affected_area && VALID_AFFECTED_AREAS.includes(affected_area)
            ? affected_area : null;

        // ── Metadata sanitisation ──
        let parsedMetadata = null;
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
                // Strip any keys with values longer than 500 chars (prevent abuse)
                for (const key of Object.keys(parsedMetadata)) {
                    if (typeof parsedMetadata[key] === "string" && parsedMetadata[key].length > 500) {
                        parsedMetadata[key] = parsedMetadata[key].substring(0, 500);
                    }
                }
            } catch {
                parsedMetadata = null;
            }
        }

        // ── AI classification: derive the persisted category/priority from the model result ──
        const aiPrediction = await classifyTicket(cleanTitle, cleanDesc);
        const persistedCategory = aiPrediction.category || category || "API & Integration";
        const persistedPriority = aiPrediction.priority || safePriority;
        const persistedConfidence = typeof aiPrediction.confidence === "number"
            ? aiPrediction.confidence
            : null;

        // ── Rate limiting check (prevent spam: max 10 tickets per hour per user) ──
        const recentCount = await pool.query(
            `SELECT COUNT(*) FROM tickets
             WHERE customer_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [customer_id]
        );
        if (parseInt(recentCount.rows[0].count) >= 10) {
            return res.status(429).json({
                error: "Too many tickets. Please wait before creating another."
            });
        }

        // ── Insert ──
        const result = await pool.query(
            `INSERT INTO tickets
            (customer_id, title, category, priority, description, image_url,
             affected_area, metadata, ai_confidence, last_customer_reply_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING ticket_id, created_at`,
            [customer_id, cleanTitle, persistedCategory, persistedPriority, cleanDesc, image,
             safeArea, parsedMetadata ? JSON.stringify(parsedMetadata) : null, persistedConfidence, new Date()]
        );

        const newTicket = result.rows[0];

        res.status(201).json({
            message: "Ticket raised successfully",
            ticket_id: newTicket.ticket_id,
            created_at: newTicket.created_at
        });

    } catch (err) {
        console.error("Error raising ticket:", err);
        res.status(500).json({ error: "Failed to create ticket. Please try again." });
    }
});



// Get user's tickets
router.get("/mytickets", verifyToken, async (req, res) => {
    const customer_id = req.customer_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const category = req.query.category || "";
    
    const offset = (page - 1) * limit;

    try {
        let countQuery = `SELECT COUNT(*) FROM tickets WHERE customer_id = $1`;
        let countParams = [customer_id];

        let query = `SELECT ticket_id, title, category, priority, status, created_at FROM tickets WHERE customer_id = $1`;
        let params = [customer_id];
        
        let paramIndex = 2;

        if (search) {
            const searchStr = `%${search}%`;
            query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            countQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(searchStr);
            countParams.push(searchStr);
            paramIndex++;
        }

        if (status) {
            query += ` AND status = $${paramIndex}`;
            countQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            countParams.push(status);
            paramIndex++;
        }

        if (category) {
            query += ` AND category = $${paramIndex}`;
            countQuery += ` AND category = $${paramIndex}`;
            params.push(category);
            countParams.push(category);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(query, params);

        res.json({
            tickets: result.rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
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
router.put("/ticket/:id/status", verifyToken, generalLimiter,
    [
        body("status").isIn(['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']).withMessage("Invalid status")
    ],
    validate,
    async (req, res) => {
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


router.post("/ticket/:id/close", verifyToken, generalLimiter,
    [
        body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
        body("feedback_text").optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage("Feedback too long")
    ],
    validate,
    async (req, res) => {
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
                // Issue 3: use the namespaced room name that matches join_ticket on the server
                io.to(`ticket_${id}`).emit("ticket_closed");
            }
        }

        res.json({ message: "Ticket closed successfully" });
    } catch (err) {
        console.error("Error closing ticket:", err);
        res.status(500).json({ error: "Failed to close ticket" });
    }
});

// ── POST /ticket/:id/escalate ──────────────────────────────────────────────
// Customer-facing: flags a ticket as escalated, notifies all managers via socket
router.post("/ticket/:id/escalate", verifyToken, generalLimiter, async (req, res) => {
    const { id } = req.params;
    const customer_id = req.customer_id;

    try {
        // Verify ticket belongs to this customer and is not already escalated
        const ticket = await pool.query(
            `SELECT * FROM tickets WHERE ticket_id = $1 AND customer_id = $2`,
            [id, customer_id]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        if (ticket.rows[0].escalated) {
            return res.status(400).json({ error: "Ticket is already escalated" });
        }

        if (ticket.rows[0].status === "Closed") {
            return res.status(400).json({ error: "Cannot escalate a closed ticket" });
        }

        // Flag the ticket as escalated
        await pool.query(
            `UPDATE tickets SET escalated = true, escalated_at = NOW(), escalated_by = $1
             WHERE ticket_id = $2`,
            [customer_id, id]
        );

        // Insert a system message into the ticket chat
        await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, delivered, seen)
             VALUES ($1, 'System', NULL, 'Customer requested escalation to a manager.', true, false)`,
            [id]
        );

        const io = req.app.get("io");
        if (io) {
            // Broadcast system message to the ticket room
            io.to(`ticket_${id}`).emit("receive_message", {
                message_id: Date.now(),
                sender_type: "System",
                sender_id: null,
                message: "Customer requested escalation to a manager.",
                delivered: true,
                seen: false,
                created_at: new Date().toISOString()
            });

            // Notify all managers via the managers room
            io.to("managers").emit("new_escalation", {
                ticket_id: parseInt(id),
                title: ticket.rows[0].title,
                priority: ticket.rows[0].priority,
                escalated_at: new Date().toISOString()
            });

            // Create notifications for all managers in DB
            const managers = await pool.query(`SELECT id FROM users WHERE role = 'manager'`);
            for (const manager of managers.rows) {
                const noti = await pool.query(
                    `INSERT INTO Notifications (user_id, ticket_id, notification_type, message_content)
                     VALUES ($1, $2, 'ESCALATION', $3) RETURNING *`,
                    [manager.id, id, `Ticket #${id} has been escalated by the customer`]
                );
                io.to(`user_${manager.id}`).emit("new_notification", noti.rows[0]);
            }
        }

        res.json({ message: "Ticket escalated successfully" });
    } catch (err) {
        console.error("Error escalating ticket:", err);
        res.status(500).json({ error: "Failed to escalate ticket" });
    }
});

module.exports = router;
