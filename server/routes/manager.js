const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

// ── Middleware: require manager role ────────────────────────────────────────
function requireManager(req, res, next) {
    if (req.role !== "manager") {
        return res.status(403).json({ error: "Manager access required" });
    }
    next();
}

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

module.exports = router;
