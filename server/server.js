require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const agentRoutes = require("./routes/agent");

const app = express();
app.use(express.json());
app.use(cors());
// Health check
app.get("/", (req, res) => {
    res.send("SupportIQ backend running...");
});

// Mount routes 
app.use("/", authRoutes);
app.use("/", ticketRoutes);
app.use("/agent", agentRoutes);

const port = 5000;

app.listen(port,()=>{
    console.log(`Server running on port http://localhost:${port} `);
});
 