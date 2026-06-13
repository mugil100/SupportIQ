require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const agentRoutes = require("./routes/agent");
const notiRoutes = require("./routes/noti");
const app = express();
const server = http.createServer(app);
const pool = require("../server/config/database");


app.use(express.json());
app.use(cors());
// Health check

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

    socket.on("join_ticket", (ticket_id) => { // listens for events related to a specific client connection

        socket.join(ticket_id); //subscribe a specific client socket to an arbitrary channel called a "room"
        console.log(`Joined ticket room ${ticket_id}`);
    });

    socket.on("send_message", async (payload) => {
        try {
            if (!payload) return;
            const { ticket_id, message } = payload;
            
            // Derive sender from JWT to prevent spoofing
            const userRole = socket.user?.role?.toLowerCase();
            const sender = (userRole === "agent" || userRole === "manager") ? "Agent" : "Customer";
            
            console.log("📩 send_message received:", ticket_id, sender);

            // The JWT payload maps the user's ID to `customer_id` for both Agents and Customers
            const sender_id = socket.user?.customer_id;
            const reply_time = new Date();

            // Check if ticket is closed before saving message
            const statusCheck = await pool.query(
                `SELECT status FROM tickets WHERE ticket_id = $1`, [ticket_id]
            );
            if (statusCheck.rows.length === 0) return;
            if (statusCheck.rows[0].status === "Closed") {
                socket.emit("error_message", { error: "Cannot send messages to a closed ticket" });
                return;
            }

            // save message to db
            const result = await pool.query(
                `insert into ticket_messages (ticket_id,sender_type,sender_id,message,delivered,seen)
                values ($1,$2,$3,$4,false,false) RETURNING message_id`, [ticket_id, sender, sender_id, message]
            );

            if (sender === "Agent") {
                await pool.query(
                    `UPDATE tickets SET last_agent_reply_at = $1, status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END WHERE ticket_id = $2`,
                    [reply_time, ticket_id]
                );

                // AGENT_REPLY: notify the customer who owns this ticket
                const custResult = await pool.query(
                    `SELECT customer_id FROM tickets WHERE ticket_id = $1`, [ticket_id]
                );
                const customerId = custResult.rows[0]?.customer_id;
                if (customerId) {
                    const notiResult = await pool.query(
                        `INSERT INTO Notifications
                        (user_id, ticket_id, notification_type, message_content)
                        VALUES($1,$2,'AGENT_REPLY', $3) RETURNING *`,
                        [customerId, ticket_id, `Agent replied to your Ticket #${ticket_id}`]
                    );
                    io.to(`user_${customerId}`).emit("new_notification", notiResult.rows[0]);
                }
            } else {
                await pool.query(
                    `UPDATE tickets SET last_customer_reply_at = $1 WHERE ticket_id = $2`,
                    [reply_time, ticket_id]
                );
                // Look up the assigned agent for this ticket
                const agentResult = await pool.query(
                    `SELECT assigned_agent_id FROM tickets WHERE ticket_id = $1`, [ticket_id]
                );
                const agentId = agentResult.rows[0]?.assigned_agent_id;

                // Only insert notification if there is an assigned agent
                if (agentId) {
                    const notiResult = await pool.query(
                        `INSERT INTO Notifications
                        (user_id, ticket_id, notification_type, message_content)
                        VALUES($1,$2,'CUSTOMER_REPLY', $3) RETURNING *`,
                        [agentId, ticket_id, `Customer messaged to Ticket #${ticket_id}`]
                    );
                    // Push real-time notification to the agent's personal room
                    io.to(`user_${agentId}`).emit("new_notification", notiResult.rows[0]);
                }

                // Check if ticket is resolved and should be reopened
                const check_resolve = await pool.query(
                    `select status from tickets where ticket_id = $1`, [ticket_id]
                );
                if (check_resolve.rows[0]?.status === "Resolved") {
                    await pool.query(
                        `update tickets set status = 'Open' where ticket_id = $1`, [ticket_id]
                    );
                    // Notify everyone in the room that the ticket is back open
                    io.to(ticket_id).emit("ticket_reopened");

                    // TICKET_REOPENED: notify the assigned agent
                    if (agentId) {
                        const reopenNoti = await pool.query(
                            `INSERT INTO Notifications
                            (user_id, ticket_id, notification_type, message_content)
                            VALUES($1,$2,'TICKET_REOPENED', $3) RETURNING *`,
                            [agentId, ticket_id, `Ticket #${ticket_id} has been reopened by the customer`]
                        );
                        io.to(`user_${agentId}`).emit("new_notification", reopenNoti.rows[0]);
                    }
                }
            }

            const message_id = result.rows[0].message_id;

            // emit to all users in this ticket
            io.to(ticket_id).emit("receive_message", {
                message_id: message_id,
                sender_type: sender,
                message,
                delivered: true,
                seen: false
            });
            await pool.query(
                `update ticket_messages set delivered = true where message_id = $1`, [message_id]
            );

        } catch (error) {
            console.error("Socket send_message error:", error);
        }
    });

    socket.on("typing_start", ({ ticket_id, sender }) => {
        socket.to(ticket_id).emit("typing_start", {
            sender
        });
    });

    socket.on("typing_stop", ({ ticket_id, sender }) => {
        socket.to(ticket_id).emit("typing_stop", {
            sender
        });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected : ", socket.id);
    });

    socket.on("mark_seen", async (payload) => {
        try {
            if (!payload) return;
            const { ticket_id } = payload;
            if (!ticket_id) return;

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

            await pool.query(
                `update ticket_messages 
                set seen = true
                where ticket_id = $1 and sender_type = $2`,
                [ticket_id, receiveType]
            );

            socket.to(ticket_id).emit("messages_seen");
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
app.use("/agent", notiRoutes);

const port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});
