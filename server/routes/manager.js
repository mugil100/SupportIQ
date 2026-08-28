const express = require("express");
const pool = require("../config/database");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middleware/auth");
const { SendEmail } = require("../services/emailService");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const router = express.Router();

// ── Middleware: require manager role ────────────────────────────────────────
function requireManager(req, res, next) {
    if (req.role !== "manager") {
        return res.status(403).json({ error: "Manager access required" });
    }
    next();
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — OPERATIONS DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

// ── GET /manager/dashboard/stats ────────────────────────────────────────────
// Returns 4 stat cards: total open, SLA breached (>24h open), escalated, resolved today
router.get("/dashboard/stats", verifyToken, requireManager, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(CASE WHEN status IN ('Open', 'In Progress') THEN 1 END) AS total_open,

                COUNT(CASE 
                    WHEN status IN ('Open', 'In Progress')
                    AND created_at <= NOW() - INTERVAL '24 hours'
                    THEN 1 
                END) AS sla_breached,

                COUNT(CASE 
                    WHEN escalated = true AND escalation_resolved = false 
                    THEN 1 
                END) AS escalated,

                COUNT(CASE 
                    WHEN resolved_at::date = CURRENT_DATE 
                    THEN 1 
                END) AS resolved_today

            FROM tickets
        `);

        const row = result.rows[0];
        res.json({
            total_open: parseInt(row.total_open) || 0,
            sla_breached: parseInt(row.sla_breached) || 0,
            escalated: parseInt(row.escalated) || 0,
            resolved_today: parseInt(row.resolved_today) || 0
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

// ── GET /manager/dashboard/agents ───────────────────────────────────────────
// Agent workload table: each agent's open/in-progress/resolved counts + avg response time
router.get("/dashboard/agents", verifyToken, requireManager, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id AS agent_id,
                u.name AS agent_name,
                u.is_active,
                u.last_seen,

                COUNT(CASE WHEN t.status = 'Open' THEN 1 END) AS open_count,
                COUNT(CASE WHEN t.status = 'In Progress' THEN 1 END) AS in_progress_count,
                COUNT(CASE WHEN t.status IN ('Resolved', 'Closed') THEN 1 END) AS resolved_count,

                ROUND(
                    AVG(
                        CASE 
                            WHEN t.last_agent_reply_at IS NOT NULL AND t.created_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (t.last_agent_reply_at - t.created_at)) / 3600
                        END
                    )::numeric, 1
                ) AS avg_response_hours

            FROM users u
            LEFT JOIN tickets t ON t.assigned_agent_id = u.id
            WHERE u.role = 'agent'
            GROUP BY u.id, u.name, u.is_active, u.last_seen
            ORDER BY u.name ASC
        `);

        const agents = result.rows.map(row => ({
            agent_id: row.agent_id,
            agent_name: row.agent_name,
            is_active: row.is_active,
            last_seen: row.last_seen,
            open_count: parseInt(row.open_count) || 0,
            in_progress_count: parseInt(row.in_progress_count) || 0,
            resolved_count: parseInt(row.resolved_count) || 0,
            avg_response_hours: parseFloat(row.avg_response_hours) || 0
        }));

        res.json({ agents });
    } catch (err) {
        console.error("Error fetching agent workload:", err);
        res.status(500).json({ error: "Failed to fetch agent workload" });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — TICKET REASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

// ── PUT /manager/tickets/:id/reassign ───────────────────────────────────────
// Moves a ticket from one agent to another. Posts a system message and notifies both agents.
router.put("/tickets/:id/reassign", verifyToken, requireManager,
    [body("agent_id").isInt({ min: 1 }).withMessage("Agent ID is required")],
    validate,
    async (req, res) => {
        const ticketId = parseInt(req.params.id, 10);
        const { agent_id: newAgentId } = req.body;

        try {
            // 1. Verify ticket exists
            const ticketResult = await pool.query(
                `SELECT ticket_id, assigned_agent_id, title FROM tickets WHERE ticket_id = $1`,
                [ticketId]
            );
            if (ticketResult.rows.length === 0) {
                return res.status(404).json({ error: "Ticket not found" });
            }
            const ticket = ticketResult.rows[0];
            const oldAgentId = ticket.assigned_agent_id;

            if (oldAgentId === newAgentId) {
                return res.status(400).json({ error: "Ticket is already assigned to this agent" });
            }

            // 2. Verify target agent exists and is active
            const agentResult = await pool.query(
                `SELECT id, name, is_active FROM users WHERE id = $1 AND role = 'agent'`,
                [newAgentId]
            );
            if (agentResult.rows.length === 0) {
                return res.status(404).json({ error: "Target agent not found" });
            }
            if (!agentResult.rows[0].is_active) {
                return res.status(400).json({ error: "Cannot reassign to a deactivated agent" });
            }
            const newAgentName = agentResult.rows[0].name;

            // 3. Get old agent name (if any)
            let oldAgentName = "Unassigned";
            if (oldAgentId) {
                const oldAgent = await pool.query(`SELECT name FROM users WHERE id = $1`, [oldAgentId]);
                if (oldAgent.rows.length > 0) oldAgentName = oldAgent.rows[0].name;
            }

            // 4. Update the ticket
            await pool.query(
                `UPDATE tickets SET assigned_agent_id = $1 WHERE ticket_id = $2`,
                [newAgentId, ticketId]
            );

            // 5. Insert system message into ticket chat
            const systemMsg = `Ticket reassigned from ${oldAgentName} to ${newAgentName} by Manager.`;
            await pool.query(
                `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, delivered, seen)
                 VALUES ($1, 'System', NULL, $2, true, false)`,
                [ticketId, systemMsg]
            );

            // 6. Notify both agents via socket + DB notifications
            const io = req.app.get("io");

            // Notify new agent
            const newNoti = await pool.query(
                `INSERT INTO Notifications (user_id, ticket_id, notification_type, message_content)
                 VALUES ($1, $2, 'TICKET_ASSIGNED', $3) RETURNING *`,
                [newAgentId, ticketId, `Ticket #${ticketId} has been reassigned to you by a manager`]
            );
            if (io) io.to(`user_${newAgentId}`).emit("new_notification", newNoti.rows[0]);

            // Notify old agent (if any)
            if (oldAgentId) {
                const oldNoti = await pool.query(
                    `INSERT INTO Notifications (user_id, ticket_id, notification_type, message_content)
                     VALUES ($1, $2, 'TICKET_ASSIGNED', $3) RETURNING *`,
                    [oldAgentId, ticketId, `Ticket #${ticketId} has been reassigned from you to ${newAgentName}`]
                );
                if (io) io.to(`user_${oldAgentId}`).emit("new_notification", oldNoti.rows[0]);
            }

            // Broadcast system message to anyone viewing the ticket chat
            if (io) {
                io.to(`ticket_${ticketId}`).emit("receive_message", {
                    message_id: Date.now(),
                    sender_type: "System",
                    sender_id: null,
                    message: systemMsg,
                    delivered: true,
                    seen: false,
                    created_at: new Date().toISOString()
                });
            }

            res.json({ message: "Ticket reassigned successfully", from: oldAgentName, to: newAgentName });
        } catch (err) {
            console.error("Error reassigning ticket:", err);
            res.status(500).json({ error: "Failed to reassign ticket" });
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — ESCALATION HANDLING
// ════════════════════════════════════════════════════════════════════════════

// ── GET /manager/escalations ────────────────────────────────────────────────
// Fetches all escalated & unresolved tickets
router.get("/escalations", verifyToken, requireManager, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM tickets WHERE escalated = true AND escalation_resolved = false`
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(`
            SELECT 
                t.ticket_id, t.title, t.status, t.priority, t.category,
                t.escalated_at, t.created_at,
                c.name AS customer_name,
                a.name AS agent_name, a.id AS agent_id
            FROM tickets t
            LEFT JOIN users c ON t.customer_id = c.id
            LEFT JOIN users a ON t.assigned_agent_id = a.id
            WHERE t.escalated = true AND t.escalation_resolved = false
            ORDER BY t.escalated_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json({
            escalations: result.rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error("Error fetching escalations:", err);
        res.status(500).json({ error: "Failed to fetch escalations" });
    }
});

// ── PUT /manager/escalations/:id/resolve ────────────────────────────────────
// Marks an escalation as resolved
router.put("/escalations/:id/resolve", verifyToken, requireManager, async (req, res) => {
    const ticketId = parseInt(req.params.id, 10);
    try {
        const result = await pool.query(
            `UPDATE tickets SET escalation_resolved = true
             WHERE ticket_id = $1 AND escalated = true
             RETURNING ticket_id, assigned_agent_id`,
            [ticketId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Escalated ticket not found" });
        }

        // Notify assigned agent
        const agentId = result.rows[0].assigned_agent_id;
        if (agentId) {
            const io = req.app.get("io");
            const noti = await pool.query(
                `INSERT INTO Notifications (user_id, ticket_id, notification_type, message_content)
                 VALUES ($1, $2, 'ESCALATION_RESOLVED', $3) RETURNING *`,
                [agentId, ticketId, `Escalation on Ticket #${ticketId} has been resolved by manager`]
            );
            if (io) io.to(`user_${agentId}`).emit("new_notification", noti.rows[0]);
        }

        res.json({ message: "Escalation resolved" });
    } catch (err) {
        console.error("Error resolving escalation:", err);
        res.status(500).json({ error: "Failed to resolve escalation" });
    }
});

// ── POST /manager/tickets/:id/notes ─────────────────────────────────────────
// Creates an internal note on a ticket (visible to agents + managers only)
router.post("/tickets/:id/notes", verifyToken, requireManager,
    [body("content").trim().isLength({ min: 1, max: 2000 }).withMessage("Note content is required (max 2000 chars)")],
    validate,
    async (req, res) => {
        const ticketId = parseInt(req.params.id, 10);
        const { content } = req.body;

        try {
            const result = await pool.query(
                `INSERT INTO internal_notes (ticket_id, author_id, content)
                 VALUES ($1, $2, $3) RETURNING *`,
                [ticketId, req.customer_id, content]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error("Error creating internal note:", err);
            res.status(500).json({ error: "Failed to create internal note" });
        }
    }
);

// ── GET /manager/tickets/:id/notes ──────────────────────────────────────────
// Fetches all internal notes for a ticket
router.get("/tickets/:id/notes", verifyToken, requireManager, async (req, res) => {
    const ticketId = parseInt(req.params.id, 10);

    try {
        const result = await pool.query(`
            SELECT n.*, u.name AS author_name
            FROM internal_notes n
            JOIN users u ON n.author_id = u.id
            WHERE n.ticket_id = $1
            ORDER BY n.created_at ASC
        `, [ticketId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching internal notes:", err);
        res.status(500).json({ error: "Failed to fetch internal notes" });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 1 (extended) — ALL TICKETS VIEW
// ════════════════════════════════════════════════════════════════════════════

// ── GET /manager/tickets ────────────────────────────────────────────────────
// Global ticket browser with search, status, category, agent filters + pagination
router.get("/tickets", verifyToken, requireManager, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = req.query.search || "";
        const status = req.query.status || "";
        const category = req.query.category || "";
        const agent_id = req.query.agent_id || "";
        const offset = (page - 1) * limit;

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
            WHERE 1=1
        `;
        let params = [];
        let countParams = [];
        let paramIndex = 1;

        if (search) {
            const searchClause = ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
            dataQuery += searchClause;
            countQuery += searchClause;
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
            paramIndex++;
        }

        if (status) {
            const statusClause = ` AND t.status = $${paramIndex}`;
            dataQuery += statusClause;
            countQuery += statusClause;
            params.push(status);
            countParams.push(status);
            paramIndex++;
        }

        if (category) {
            const catClause = ` AND t.category = $${paramIndex}`;
            dataQuery += catClause;
            countQuery += catClause;
            params.push(category);
            countParams.push(category);
            paramIndex++;
        }

        if (agent_id) {
            const agentClause = ` AND t.assigned_agent_id = $${paramIndex}`;
            dataQuery += agentClause;
            countQuery += agentClause;
            params.push(parseInt(agent_id));
            countParams.push(parseInt(agent_id));
            paramIndex++;
        }

        dataQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, countParams),
            pool.query(dataQuery, params)
        ]);

        const total = parseInt(countResult.rows[0].count);
        res.json({
            tickets: dataResult.rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error("Error fetching all tickets:", err);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// ── GET /manager/tickets/:id ────────────────────────────────────────────────
// Single ticket detail: full ticket data + messages + internal notes
router.get("/tickets/:id", verifyToken, requireManager, async (req, res) => {
    const ticketId = parseInt(req.params.id, 10);

    try {
        // Ticket details with customer + agent names
        const ticketResult = await pool.query(`
            SELECT t.*, c.name AS customer_name, a.name AS agent_name
            FROM tickets t
            LEFT JOIN users c ON t.customer_id = c.id
            LEFT JOIN users a ON t.assigned_agent_id = a.id
            WHERE t.ticket_id = $1
        `, [ticketId]);

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        // Messages
        const messagesResult = await pool.query(`
            SELECT sender_type, sender_id, message, created_at, message_id, seen, delivered
            FROM ticket_messages
            WHERE ticket_id = $1 AND is_deleted = false
            ORDER BY created_at ASC, message_id ASC
        `, [ticketId]);

        // Internal notes
        const notesResult = await pool.query(`
            SELECT n.*, u.name AS author_name
            FROM internal_notes n
            JOIN users u ON n.author_id = u.id
            WHERE n.ticket_id = $1
            ORDER BY n.created_at ASC
        `, [ticketId]);

        res.json({
            ticket: ticketResult.rows[0],
            messages: messagesResult.rows,
            notes: notesResult.rows
        });
    } catch (err) {
        console.error("Error fetching ticket details:", err);
        res.status(500).json({ error: "Failed to fetch ticket details" });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — AGENT PROVISIONING
// ════════════════════════════════════════════════════════════════════════════

// ── GET /manager/agents ─────────────────────────────────────────────────────
// Full agent list with workload stats + email + created_at
router.get("/agents", verifyToken, requireManager, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id AS agent_id,
                u.name AS agent_name,
                u.email,
                u.username,
                u.is_active,
                u.last_seen,
                u.created_at,

                COUNT(CASE WHEN t.status = 'Open' THEN 1 END) AS open_count,
                COUNT(CASE WHEN t.status = 'In Progress' THEN 1 END) AS in_progress_count,
                COUNT(CASE WHEN t.status IN ('Resolved', 'Closed') THEN 1 END) AS resolved_count,

                ROUND(
                    AVG(
                        CASE 
                            WHEN t.last_agent_reply_at IS NOT NULL AND t.created_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (t.last_agent_reply_at - t.created_at)) / 3600
                        END
                    )::numeric, 1
                ) AS avg_response_hours

            FROM users u
            LEFT JOIN tickets t ON t.assigned_agent_id = u.id
            WHERE u.role = 'agent'
            GROUP BY u.id, u.name, u.email, u.username, u.is_active, u.last_seen, u.created_at
            ORDER BY u.name ASC
        `);

        const agents = result.rows.map(row => ({
            agent_id: row.agent_id,
            agent_name: row.agent_name,
            email: row.email,
            username: row.username,
            is_active: row.is_active,
            last_seen: row.last_seen,
            created_at: row.created_at,
            open_count: parseInt(row.open_count) || 0,
            in_progress_count: parseInt(row.in_progress_count) || 0,
            resolved_count: parseInt(row.resolved_count) || 0,
            avg_response_hours: parseFloat(row.avg_response_hours) || 0
        }));

        res.json({ agents });
    } catch (err) {
        console.error("Error fetching agents:", err);
        res.status(500).json({ error: "Failed to fetch agents" });
    }
});

// ── POST /manager/agents/invite ─────────────────────────────────────────────
// Sends an invite email to a new agent with a unique token link
router.post("/agents/invite", verifyToken, requireManager,
    [body("email").isEmail().withMessage("Must be a valid email").normalizeEmail()],
    validate,
    async (req, res) => {
        const { email } = req.body;

        try {
            // Check if user already exists
            const existingUser = await pool.query(
                `SELECT id FROM users WHERE email = $1`, [email]
            );
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: "A user with this email already exists" });
            }

            // Check for existing unexpired invite
            const existingInvite = await pool.query(
                `SELECT invite_id FROM agent_invites 
                 WHERE email = $1 AND accepted = false AND expires_at > NOW()`,
                [email]
            );
            if (existingInvite.rows.length > 0) {
                return res.status(400).json({ error: "An active invite already exists for this email" });
            }

            // Generate invite token (48h expiry)
            const inviteToken = jwt.sign(
                { email, invited_by: req.customer_id, purpose: "agent_invite" },
                process.env.JWT_SECRET,
                { expiresIn: "48h" }
            );

            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO agent_invites (email, token, invited_by, expires_at)
                 VALUES ($1, $2, $3, $4)`,
                [email, inviteToken, req.customer_id, expiresAt]
            );

            // Send invite email
            const inviteLink = `${process.env.FRONTEND_URL}/agent/accept-invite/${inviteToken}`;
            await SendEmail(email, inviteLink, "agent_invite");

            res.status(201).json({ message: "Invite sent successfully", email });
        } catch (err) {
            console.error("Error sending agent invite:", err);
            res.status(500).json({ error: "Failed to send invite" });
        }
    }
);

// ── PUT /manager/agents/:id/deactivate ──────────────────────────────────────
// Deactivates an agent account (blocks login)
router.put("/agents/:id/deactivate", verifyToken, requireManager, async (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    try {
        const result = await pool.query(
            `UPDATE users SET is_active = false WHERE id = $1 AND role = 'agent' RETURNING id, name`,
            [agentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }

        res.json({ message: `Agent ${result.rows[0].name} deactivated` });
    } catch (err) {
        console.error("Error deactivating agent:", err);
        res.status(500).json({ error: "Failed to deactivate agent" });
    }
});

// ── PUT /manager/agents/:id/activate ────────────────────────────────────────
// Re-activates an agent account
router.put("/agents/:id/activate", verifyToken, requireManager, async (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    try {
        const result = await pool.query(
            `UPDATE users SET is_active = true WHERE id = $1 AND role = 'agent' RETURNING id, name`,
            [agentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }

        res.json({ message: `Agent ${result.rows[0].name} activated` });
    } catch (err) {
        console.error("Error activating agent:", err);
        res.status(500).json({ error: "Failed to activate agent" });
    }
});

module.exports = router;
