require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const agentRoutes = require("./routes/agent");
const app = express();
const server = http.createServer(app);
const pool = require("../server/config/database");

app.use(express.json());
app.use(cors());
// Health check

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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

    socket.on("join_ticket", (ticket_id) => { // listens for events related to a specific client connection

        socket.join(ticket_id); //subscribe a specific client socket to an arbitrary channel called a "room"
        console.log(`Joined ticket room ${ticket_id}`);
    });

    socket.on("send_message", async ({ ticket_id, sender, message }) => {
        console.log("📩 send_message received:");

        // The JWT payload maps the user's ID to \`customer_id\` for both Agents and Customers
        const sender_id = socket.user.customer_id;
        const reply_time = new Date();
        try {
            // save message to db
            const result = await pool.query(
                `insert into ticket_messages (ticket_id,sender_type,sender_id,message,delivered,seen)
                values ($1,$2,$3,$4,false,false) RETURNING message_id`, [ticket_id, sender, sender_id, message]
            );

            if (sender === "Agent") {
                await pool.query(
                    `UPDATE tickets SET last_agent_reply_at = $1 WHERE ticket_id = $2`,
                    [reply_time, ticket_id]
                );
            } else {
                await pool.query(
                    `UPDATE tickets SET last_customer_reply_at = $1 WHERE ticket_id = $2`,
                    [reply_time, ticket_id]
                );
                const check_resolve = await pool.query(
                        `select status from tickets where ticket_id = $1`,[ticket_id]
                    );
                    if(check_resolve.rows[0].status === "Resolved"){ 
                        await pool.query(
                            `update tickets set status = "Open" where ticket_id = $1`,[ticket_id]
                        )
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

    socket.on("mark_seen", async ({ ticket_id }) => {
        let receiveId;
        let receiveType;

        if (socket.user.role === "Agent") {
            receiveType = "Customer",
                receiveId = socket.user.agent_id;
        }
        else {
            receiveId = socket.user.customer_id;
            receiveType = "Agent";
        }

        await pool.query(
            `update ticket_messages 
            set seen = true
            where ticket_id = $1 and sender_type = $2`,
            [ticket_id, receiveType]
        );

        socket.to(ticket_id).emit("messages_seen");
    });
});

app.get("/", (req, res) => {
    res.send("SupportIQ backend running...");
});

// Mount routes 
app.use("/", authRoutes);
app.use("/", ticketRoutes);
app.use("/agent", agentRoutes);

const port = 5000;

server.listen(port, () => {
    console.log(`Server running on port http://localhost:${port} `);
});
