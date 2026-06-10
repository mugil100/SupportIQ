
const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

// get all tickets assigned to the agent
router.get("/ahome", verifyToken, async (req, res) => {
    if (req.role !== "agent")
        return res.status(403).json({ error: "Access denied" });

    const result = await pool.query(
        `select ticket_id,title,priority,status,created_at
         from tickets
        where assigned_agent_id is NOT NULL
        order by created_at DESC`
    );
    res.json(result.rows);
});

router.get("/unassigned", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `select * from tickets where assigned_agent_id is NULL order by created_at DESC`
        );
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ message: "Unassigned tickets not fetched !" });

    }
});

router.get("/agenttickets", verifyToken, async (req, res) => {
    const userId = req.customer_id; // this is users.id from the JWT
    const status = req.query.status; // e.g. "open", "inprogress", "resolved", "closed"

    try {
        // First, get the agent_id from the agents table using the users.id
        const agentLookup = await pool.query(
            `SELECT id FROM users WHERE id = $1`, [userId]
        );

        if (agentLookup.rows.length === 0) {
            return res.status(404).json({ error: "Agent profile not found" });
        }

        const agentId = agentLookup.rows[0].id;

        // Build status filter — map frontend values to DB values
        const statusMap = {
            open: "Open",
            inprogress: "In Progress",
            resolved: "Resolved",
            closed: "Closed"
        };
        const dbStatus = statusMap[status];

        let query = `SELECT * FROM tickets WHERE assigned_agent_id = $1`;
        const params = [agentId];

        if (dbStatus) {
            query += ` AND status = $2`;
            params.push(dbStatus);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching assigned tickets:", err);
        res.status(500).json({ error: "Error fetching the assigned tickets" });
    }
});
// getting the stats of the agent
router.get(`/agenttickets/:id`, verifyToken, async (req, res) => {
    try {
        const { id } = req.params; // ticket id
        const agent_id = req.customer_id;
        console.log("Ticket, Agent Id:", id, agent_id);

        await pool.query(`select * from tickets where ticket_id = $1`, [id]);

        if (!id || !agent_id) {
            console.log("insufficient Parameters");
            return res.status(400).json({ error: "Missing required parameters" });
        }
        const details = await pool.query(
            `select * from tickets 
        where
        ticket_id = $1 AND
        assigned_agent_id= $2 `, [id, agent_id]
        );

        const ticket_details = await pool.query(
            `select * from ticket_messages 
        where ticket_id = $1 and is_deleted = false
        order by created_at ASC, message_id ASC`, [id]
        );

        if (details.rows.length === 0) {
            return res.status(404).json({ error: "Ticket details not found" });
        }
        res.json({ ticket: details.rows[0], messages: ticket_details.rows });

    } catch (err) {
        res.status(500).json("Ticket not fetched");
    }
});

router.post(`/agenttickets/:id/resolved`, verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query(
            `update tickets set status = $1, resolved_at = NOW() where ticket_id = $2`, ['Resolved', id]
        );

        // TICKET_RESOLVED: notify the customer who owns this ticket
        const custResult = await pool.query(
            `SELECT customer_id FROM tickets WHERE ticket_id = $1`, [id]
        );
        const customerId = custResult.rows[0]?.customer_id;
        if (customerId) {
            const notiResult = await pool.query(
                `INSERT INTO Notifications
                (user_id, ticket_id, notification_type, message_content)
                VALUES($1,$2,'TICKET_RESOLVED', $3) RETURNING *`,
                [customerId, id, `Your Ticket #${id} has been resolved`]
            );
            const io = req.app.get("io");
            if (io) {
                io.to(`user_${customerId}`).emit("new_notification", notiResult.rows[0]);
                io.to(id).emit("ticket_resolved");
            }
        }

        res.json({ message: "Ticket resolved successfully" });
    } catch (err) {
        console.error("Error resolving ticket:", err);
        res.status(500).json({ error: "Failed to resolve ticket" });
    }
});


router.put(`/unassigned/assign`, verifyToken, async (req, res) => {
    try {
        const { ticket_id } = req.body;
        const agentId = req.customer_id;

        if (!ticket_id) {
            return res.status(400).json({ error: "Ticket ID is required" });
        }

        const result = await pool.query(
            `UPDATE tickets 
            SET assigned_agent_id = $1 
            WHERE ticket_id = $2 
            AND assigned_agent_id IS NULL RETURNING *`,
            [agentId, ticket_id]
        );

        await pool.query(
            `
            INSERT INTO Notifications
            (user_id, ticket_id, notification_type, message_content)
            VALUES($1,$2,'TICKET_ASSIGNED', 'You have been assigned this ticket ' || $3)
            `,
            [agentId, ticket_id, ticket_id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Ticket not found or already assigned" });
        }

        res.json({ message: "Ticket assigned successfully", ticket: result.rows[0] });
    } catch (err) {
        console.error("Error assigning ticket:", err);
        res.status(500).json({ error: "Failed to assign ticket" });
    }
});

router.get("/dashboard", verifyToken, async (req, res) => {
    const agent_id = req.customer_id;
    try {
        const result = await pool.query(
            `
            SELECT
                COUNT(*) AS assigned,
                COUNT(
                    CASE
                        WHEN status='In Progress'
                        THEN 1
                    END
                ) AS in_progress,

                COUNT(
                    CASE
                        WHEN status='Resolved'
                        THEN 1
                    END
                ) AS resolved,

                COUNT(
                    CASE
                        WHEN
                            last_agent_reply_at IS NULL
                            OR last_customer_reply_at > last_agent_reply_at
                        THEN 1
                    END
                    ) AS unreplied 

                FROM tickets
                WHERE assigned_agent_id = $1;
            `,
            [agent_id]
        );

        const unread = await pool.query(
            `
                select count(*) as unread
                from Notifications 
                where is_read = false and user_id = $1
            `,
            [agent_id]
        );
        res.json({
            assigned: parseInt(result.rows[0].assigned) || 0,
            in_progress: parseInt(result.rows[0].in_progress) || 0,
            resolved: parseInt(result.rows[0].resolved) || 0,
            unreplied: parseInt(result.rows[0].unreplied) || 0,
            unread: parseInt(unread.rows[0].unread) || 0
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json("Error fetching dashboard details");
    }

});

module.exports = router;