require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const agentRoutes = require("./routes/agent");
const managerRoutes = require("./routes/manager");
const notiRoutes = require("./routes/noti");
const aiRoutes = require("./routes/ai");
require("./bg_jobs/autoClose");
const app = express();
const server = http.createServer(app);
const pool = require("../server/config/database");

// Security Headers via Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(cookieParser());

// Strict CORS Origin Whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS policy violation for Socket.IO: Origin ${origin} not allowed`));
            }
        },
        credentials: true
    }
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token; //Reads JWT from socket handshake
    if (!token) {
        return next(new Error("Invalid or missing token"));
    }
    //process → Node.js global object
    //process.env → object that stores environment variables

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        socket.user = decoded; //decoded - function parameter provided by jwt.verify
        next();
    });
});

io.on("connection", (socket) => { //server wide connections
    console.log("Client connected : ", socket.id);

    // Join a personal room so we can push notifications regardless of page
    const userId = socket.user.customer_id;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined personal room user_${userId}`);

    // Auto-join managers to a shared room for escalation broadcasts
    if (socket.user.role === "manager") {
        socket.join("managers");
        console.log(`Manager ${userId} joined managers room`);
    }

    // ── Issue 3+4: join_ticket ─────────────────────────────────────────────
    // Validates ticket_id, enforces authorization, uses namespaced room name.
    socket.on("join_ticket", async (ticket_id) => {
        // Issue 3: validate and normalize to a safe integer
        const tid = parseInt(ticket_id, 10);
        if (!Number.isFinite(tid) || tid <= 0) return;
        const roomId = `ticket_${tid}`;

        const userId = socket.user?.customer_id;
        const role = socket.user?.role?.toLowerCase();

        try {
            // Issue 4: verify the user is the ticket owner or the assigned agent
            const ticketCheck = await pool.query(
                `SELECT customer_id, assigned_agent_id FROM tickets WHERE ticket_id = $1`,
                [tid]
            );
            if (ticketCheck.rows.length === 0) return;
            const { customer_id, assigned_agent_id } = ticketCheck.rows[0];
            const isAuthorized =
                (userId === customer_id) ||
                (userId === assigned_agent_id) ||
                (role === "manager");
            if (!isAuthorized) {
                socket.emit("error_message", { error: "Unauthorized access to this ticket" });
                return;
            }

            socket.join(roomId);
            console.log(`Joined ticket room ${roomId}`);

            if (userId && tid) {
                const updateRes = await pool.query(
                    `UPDATE Notifications 
                     SET is_read = true 
                     WHERE user_id = $1 AND ticket_id = $2 AND is_read = false
                     RETURNING notification_id`,
                    [userId, tid]
                );
                if (updateRes.rows.length > 0) {
                    io.to(`user_${userId}`).emit("notifications_read_for_ticket", { ticket_id: tid });
                }
            }
        } catch (err) {
            console.error("join_ticket error:", err);
        }
    });

    socket.on("leave_ticket", (ticket_id) => {
        // Issue 3: validate and normalize
        const tid = parseInt(ticket_id, 10);
        if (!Number.isFinite(tid) || tid <= 0) return;
        socket.leave(`ticket_${tid}`);
        console.log(`Left ticket room ticket_${tid}`);
    });

    // ── Issue 3+4: send_message ────────────────────────────────────────────
    // Validates ticket_id, combines status+auth into one DB query, uses
    // namespaced room name for all broadcasts.
    socket.on("send_message", async (payload, callback) => {
        try {
            if (!payload) return;
            const { ticket_id, message } = payload;

            // Issue 3: validate and normalize ticket_id
            const tid = parseInt(ticket_id, 10);
            if (!Number.isFinite(tid) || tid <= 0) return;

            // Derive sender from JWT to prevent spoofing
            const userRole = socket.user?.role?.toLowerCase();
            const sender = (userRole === "agent" || userRole === "manager") ? "Agent" : "Customer";

            console.log("📩 send_message received:", tid, sender);

            // The JWT payload maps the user's ID to `customer_id` for both Agents and Customers
            const sender_id = socket.user?.customer_id;
            const reply_time = new Date();

            // Issue 4: combined status + authorization check — single DB round-trip
            const ticketRow = await pool.query(
                `SELECT status, customer_id, assigned_agent_id FROM tickets WHERE ticket_id = $1`,
                [tid]
            );
            if (ticketRow.rows.length === 0) return;
            const { status: ticketStatus, customer_id, assigned_agent_id } = ticketRow.rows[0];

            if (ticketStatus === "Closed") {
                socket.emit("error_message", { error: "Cannot send messages to a closed ticket" });
                return;
            }

            // Issue 4: must be the ticket owner or the assigned agent
            const isAuthorized =
                (sender_id === customer_id) ||
                (sender_id === assigned_agent_id) ||
                (userRole === "manager");
            if (!isAuthorized) {
                socket.emit("error_message", { error: "Unauthorized: you do not have access to this ticket" });
                return;
            }

            // save message to db
            const result = await pool.query(
                `insert into ticket_messages (ticket_id,sender_type,sender_id,message,delivered,seen)
                values ($1,$2,$3,$4,false,false) RETURNING message_id`, [tid, sender, sender_id, message]
            );

            // ── Smart Summary invalidation ──────────────────────────────────
            // Null out the cached summary so it regenerates (incrementally)
            // the next time an agent opens/refreshes this ticket. Zero AI cost.
            await pool.query(
                `UPDATE tickets SET ai_summary = NULL WHERE ticket_id = $1`,
                [tid]
            );

            if (sender === "Agent") {
                await pool.query(
                    `UPDATE tickets SET last_agent_reply_at = $1, status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END WHERE ticket_id = $2`,
                    [reply_time, tid]
                );

                // AGENT_REPLY: notify the customer who owns this ticket
                // Use the already-fetched customer_id (saves one DB round-trip)
                const customerId = customer_id;
                if (customerId) {
                    // Issue 3: check the namespaced room name
                    const custSockets = await io.in(`user_${customerId}`).fetchSockets();
                    const isCustInRoom = custSockets.some(s => s.rooms.has(`ticket_${tid}`));

                    const notiResult = await pool.query(
                        `INSERT INTO Notifications
                        (user_id, ticket_id, notification_type, message_content, is_read)
                        VALUES($1,$2,'AGENT_REPLY', $3, $4) RETURNING *`,
                        [customerId, tid, `Agent replied to your Ticket #${tid}`, isCustInRoom]
                    );
                    if (!isCustInRoom) {
                        io.to(`user_${customerId}`).emit("new_notification", notiResult.rows[0]);
                    }
                }
            } else {
                await pool.query(
                    `UPDATE tickets SET last_customer_reply_at = $1 WHERE ticket_id = $2`,
                    [reply_time, tid]
                );
                // Use the already-fetched assigned_agent_id (saves one DB round-trip)
                const agentId = assigned_agent_id;

                // Only insert notification if there is an assigned agent
                if (agentId) {
                    // Issue 3: check the namespaced room name
                    const agentSockets = await io.in(`user_${agentId}`).fetchSockets();
                    const isAgentInRoom = agentSockets.some(s => s.rooms.has(`ticket_${tid}`));

                    const notiResult = await pool.query(
                        `INSERT INTO Notifications
                        (user_id, ticket_id, notification_type, message_content, is_read)
                        VALUES($1,$2,'CUSTOMER_REPLY', $3, $4) RETURNING *`,
                        [agentId, tid, `Customer messaged to Ticket #${tid}`, isAgentInRoom]
                    );
                    if (!isAgentInRoom) {
                        // Push real-time notification to the agent's personal room
                        io.to(`user_${agentId}`).emit("new_notification", notiResult.rows[0]);
                    }
                }

                // Check if ticket is resolved and should be reopened
                const check_resolve = await pool.query(
                    `select status from tickets where ticket_id = $1`, [tid]
                );
                if (check_resolve.rows[0]?.status === "Resolved") {
                    await pool.query(
                        `update tickets set status = 'Open' where ticket_id = $1`, [tid]
                    );
                    // Issue 3: namespaced room broadcast
                    io.to(`ticket_${tid}`).emit("ticket_reopened");

                    // TICKET_REOPENED: notify the assigned agent
                    if (agentId) {
                        const reopenNoti = await pool.query(
                            `INSERT INTO Notifications
                            (user_id, ticket_id, notification_type, message_content)
                            VALUES($1,$2,'TICKET_REOPENED', $3) RETURNING *`,
                            [agentId, tid, `Ticket #${tid} has been reopened by the customer`]
                        );
                        io.to(`user_${agentId}`).emit("new_notification", reopenNoti.rows[0]);
                    }
                }
            }

            const message_id = result.rows[0].message_id;

            // Issue 8: Ack callback for optimistic UI reconciliation
            if (typeof callback === "function") {
                callback({
                    success: true,
                    message: {
                        message_id: message_id,
                        sender_type: sender,
                        sender_id: sender_id, // Issue 6
                        message,
                        delivered: true,
                        seen: false,
                        created_at: reply_time.toISOString() // Issue 6
                    }
                });
            }

            // Issue 3 & 8: broadcast to the namespaced ticket room, using socket.to
            // so the sender doesn't receive their own message again
            socket.to(`ticket_${tid}`).emit("receive_message", {
                message_id: message_id,
                sender_type: sender,
                sender_id: sender_id, // Issue 6
                message,
                delivered: true,
                seen: false,
                created_at: reply_time.toISOString() // Issue 6
            });
            await pool.query(
                `update ticket_messages set delivered = true where message_id = $1`, [message_id]
            );

        } catch (error) {
            console.error("Socket send_message error:", error);
        }
    });

    socket.on("typing_start", ({ ticket_id, sender }) => {
        // Issue 3: validate and use namespaced room
        const tid = parseInt(ticket_id, 10);
        if (!Number.isFinite(tid) || tid <= 0) return;
        socket.to(`ticket_${tid}`).emit("typing_start", { sender });
    });

    socket.on("typing_stop", ({ ticket_id, sender }) => {
        // Issue 3: validate and use namespaced room
        const tid = parseInt(ticket_id, 10);
        if (!Number.isFinite(tid) || tid <= 0) return;
        socket.to(`ticket_${tid}`).emit("typing_stop", { sender });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected : ", socket.id);
    });

    socket.on("mark_seen", async (payload) => {
        try {
            if (!payload) return;
            const { ticket_id } = payload;
            // Issue 3: validate and normalize
            const tid = parseInt(ticket_id, 10);
            if (!Number.isFinite(tid) || tid <= 0) return;

            let receiveId;
            let receiveType;

            const userRole = socket.user?.role?.toLowerCase();
            if (userRole === "agent" || userRole === "manager") {
                receiveType = "Customer";
                receiveId = socket.user?.customer_id;
            }
            else {
                receiveId = socket.user?.customer_id;
                receiveType = "Agent";
            }

            const result = await pool.query(
                `update ticket_messages 
                set seen = true
                where ticket_id = $1 and sender_type = $2 and seen = false
                RETURNING message_id`,
                [tid, receiveType]
            );

            // Issue 7: only emit if rows were actually updated
            if (result.rows.length > 0) {
                // Issue 3: namespaced room broadcast
                socket.to(`ticket_${tid}`).emit("messages_seen", { seenBy: userRole === "customer" ? "Customer" : "Agent" });
            }
        } catch (error) {
            console.error("Socket mark_seen error:", error);
        }
    });
});

app.get("/", (req, res) => {
    res.send("SupportIQ backend running...");
});

// Make io accessible to route handlers
app.set("io", io);

// Mount routes 
app.use("/", authRoutes);
app.use("/", ticketRoutes);
app.use("/", notiRoutes); // Customer-facing notification routes
app.use("/agent", agentRoutes);
app.use("/manager", managerRoutes);
app.use("/agent", notiRoutes);
app.use("/agent", aiRoutes);
app.use("/ai", aiRoutes);

const port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});
