const cron = require("node-cron");
const pool = require("../config/database.js");

cron.schedule("0 0 * * *", async()=>{
    try{
        await pool.query(
            `
            update tickets 
            set status = 'Closed',
            closed_at = NOW()
            where
            status = 'Resolved'
            and resolved_at <= NOW()-INTERVAL '5 days'
            `
        );
        console.log("Auto-close job executed !!!")

    }
    catch(err){
        console.error(err);
    }
});