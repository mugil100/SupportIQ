require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const {Server} = require("socket-io");
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const agentRoutes = require("./routes/agent");
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());
// Health check

const io = new Server(server,{
    cors:{
        origin: "http://localhost:3000",
        credentials: true
    }
});

io.on("connection",(socket)=>{ //server wide connections
    console.log("Client connected : ",socket.id);
    socket.on("join_ticket",(ticket_id)=>{ // listens for events related to a specific client connection
        
        socket.join(ticket_id); //subscribe a specific client socket to an arbitrary channel called a "room"
        console.log(`Joined ticket room ${ticket_id}`);
    });

    socket.on("send_message", async({ticket_id, sender, sender_id, message})=>{
        // save message to db
        await pool.query(
            `insert into ticket_messages (ticket_id,sender,sender_id,message)
            values ($1,$2,$3,$4)`,[ticket_id, sender, sender_id, message]
        );

        // emit to all users in this ticket
        io.to(ticket_id).emit("receive_message",{
            sender_type: sender,
            message,
            created_at : new Date()
        });
    });

    socket.on("disconnect",()=>{
        console.log("Disconnected : ",socket.id);
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

server.listen(port,()=>{
    console.log(`Server running on port http://localhost:${port} `);
});
