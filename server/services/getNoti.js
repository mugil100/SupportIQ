const pool = require("../config/database");


async function getNoti(req,res){
    try{
        const agent_id = req.customer_id;
        console.log("Fetching notifications for agent ID:", agent_id); 
        const noti = await pool.query(
            `select * from Notifications 
            where user_id = $1 order by created_at desc`,[agent_id]
        )
        res.json(noti.rows);
    }
    catch(error){
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Error fetching the notifications" });
    }
}

module.exports = {getNoti};
