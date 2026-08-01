const pool = require("../config/database");
const express = require("express");

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

async function mark_noti_read(req,res){
    const noti_id = req.params.id;
    const agent_id = req.customer_id;
    console.log("Notification ID:", noti_id);
    console.log("Agent ID:", agent_id);
    try{
        //check if the noti is available and correcly associated
        const exists = await pool.query(
            `select * from Notifications 
            where notification_id = $1 and user_id = $2`,[noti_id,agent_id] 
        );

        if(exists.rows.length == 0){
            return res.status(404).json({ error: "No notification found" });
        }
        //mark notification as read
        await pool.query(
            `update Notifications 
            set is_read = true where notification_id = $1 and user_id = $2`,
            [noti_id, agent_id]
        )
        res.json({message: "Notification marked as read"});
    }
    catch(error){
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Error marking the notification as read" });
    }
}

async function filterNoti(req,res){
    const {state} = req.body;
    const agent_id = req.customer_id;
    try{
        if(state === "unread"){
            const noti = await pool.query(
                `select * from Notifications 
                where user_id = $1 and is_read = false order by created_at desc`,
                [agent_id]
            )
            res.json(noti.rows);
        }
        else{
            const noti = await pool.query(
                `select * from Notifications 
                where user_id = $1 and is_read = true order by created_at desc`,
                [agent_id]
            )
            res.json(noti.rows);
        }
    }
    catch(error){
        console.error("Error filtering notifications:", error);
        res.status(500).json({ error: "Error filtering the notifications" });
    }
}

async function mark_all_as_read(req,res){

    const agent_id = req.customer_id;

    try{
        await pool.query(
            `
            update Notifications 
            set is_read = true 
            where user_id=$1
            `,[agent_id]);
        res.json({message: "All notifications marked as read"});

    }catch(error){
        console.error("Error marking all as read:", error);
        res.status(500).json({ error: "Error marking all the notifications as read" });
    }
}

async function mark_ticket_noti_read(req, res) {
    const ticket_id = req.params.id;
    const user_id = req.customer_id;
    try {
        await pool.query(
            `UPDATE Notifications 
             SET is_read = true 
             WHERE user_id = $1 AND ticket_id = $2 AND is_read = false`,
            [user_id, ticket_id]
        );
        res.json({ message: "Ticket notifications marked as read" });
    } catch (error) {
        console.error("Error marking ticket notifications as read:", error);
        res.status(500).json({ error: "Error marking ticket notifications as read" });
    }
}

module.exports = {getNoti, mark_noti_read, filterNoti, mark_all_as_read, mark_ticket_noti_read};
