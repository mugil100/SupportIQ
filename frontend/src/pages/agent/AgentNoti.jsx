import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import AgentNavbar from "../agent/AgentNavbar";
import "../../styles/AgentNoti.css";

export default function AgentNoti() {
    const [noti, setNoti] = useState([]);

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
    }, []); // Empty dependency array prevents infinite loops

    return (
        <div>
            <AgentNavbar />
            <div className="agent-noti-page">
                <h1>Notifications</h1>
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
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
