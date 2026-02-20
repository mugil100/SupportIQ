const express = require("express");
const pool = require("../config/database");
const {verifyToken} = require("../middleware/auth");
const router = express.Router();

// get all tickets assigned to the agent
router.get("/ahome",verifyToken, async(req,res)=>{
    if(req.role!== "agent")
        return res.status(403).json({error:"Access denied"});

    const result = await pool.query(
        `select ticket_id,title,priority,status,created_at
         from tickets
        where assigned_agent_id is NOT NULL`
    );
    res.json(result.rows);
});

router.get("/unassigned",verifyToken, async(req,res)=>{
    try{
    const result = await pool.query(
        `select * from tickets where assigned_agent_id is NULL`
    );
    res.json(result.rows);}
    catch(err){
        res.status(500).json({message:"Unassigned tickets not fetched !"});

    }
});

router.get("/agenttickets", verifyToken, async(req,res)=>{
    let agentid = req.customer_id;
    try{
        const result = await pool.query(`select * from tickets 
        where
        assigned_agent_id = $1`,[agentid]);
        res.json(result.rows);
    }catch(err){
        res.status(500).json("Eror fetching the assigned tickets");
    }
});
//getting the stats of the agent
router.get("/agenttickets/:id", verifyToken,async(req,res)=>{
    try{
    const {id} = req.params;
    const agent_id = req.customer_id;
    console.log("Ticket, Agent Id:",id, agent_id);

    if(!id || !agent_id){
        console.log("insufficient Parameters");
        return res.status(400).json({error:"Missing required parameters"});
    }
    const details = await pool.query(
        `select * from tickets 
        where
        ticket_id = $1 AND
        assigned_agent_id= $2 `,[id,agent_id]
    );
    if(details.rows[0].length===0){
        return res.status(404).json({error:"Ticket details not found"});
    }
    console.log("details: ", details);
    res.json(details.rows[0]);
    
}catch(err){
    res.status(500).json("Ticket not fetched");
}

});

// router.get("/",verifyToken, async(req,res)=>{

//     const res = await pool.query(
//         `select count from tickets where `
//     );
// });

module.exports = router;