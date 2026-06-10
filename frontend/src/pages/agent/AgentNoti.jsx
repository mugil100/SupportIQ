import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import AgentNavbar from "../agent/AgentNavbar";
import "../../styles/AgentNoti.css";

export default function AgentNoti() {
    const [noti, setNoti] = useState([]);
    const [view, setView] = useState("unread"); // filter state

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.get("/agent/noti");
                setNoti(res.data);
                console.log("All notifications:", res.data);
            } catch (error) {
                console.error("Error fetching notifications", error);
            }
        };

        fetchNotifications();
    }, []); 

    async function handleRead(id) {
        try{
            await axios.post(`agent/noti/${id}`);
            setNoti(prevNoti => prevNoti.filter(item => item.notification_id !== id));
        }catch(error){
            console.error("Error marking the notification as read", error);
        } 
    }

    async function handleClick(e){
        e.preventDefault();
        const {name} = e.target;
        setView(name);
        if(name === "unread"){
            await axios.post("/agent/noti/filter", {"state": "unread"});
        }
        else{
            await axios.post("/agent/noti/filter", {"state": "read"});
        }
    }

    return (
        <div>
            <AgentNavbar />
            <div className="agent-noti-page">
                <h1>Notifications</h1>

                <div className="noti-sort">
                    <button className="noti-filter-btn" onClick = {handleClick} name ="unread">
                        Unread
                    </button>
                    <button className="noti-filter-btn" onClick = {handleClick} name ="read">
                        Read
                    </button>
                </div>

                {noti.length === 0 ? (
                    <div className="noti-empty">
                        <p>No new notifications 🎉</p>
                    </div>
                ) : (
                    <ul className="noti-list">
                        {noti.map((item, index) => {
                            const isWarning = item.notification_type?.toLowerCase() === "warning" || item.notification_type?.toLowerCase() === "high";
                            return (
                                <li key={index} className="noti-item">
                                    <div className="noti-content">
                                        <div className="noti-header">
                                            <span className={`noti-badge ${isWarning ? 'warning' : 'info'}`}>
                                                {item.notification_type || "Notification"}
                                            </span>
                                        </div>
                                        <p className="noti-text">{item.message_content}</p>
                                    </div>
                                    <div className="noti-meta">
                                        <span className="noti-time">
                                            {new Date(item.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="mark">
                                        <button onClick = {() => handleRead(item.notification_id)} >Mark as Read</button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
