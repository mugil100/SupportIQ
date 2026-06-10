import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import "../../styles/CustNoti.css";

export default function CustNoti() {
    const [noti, setNoti] = useState([]);
    const [view, setView] = useState("unread");

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.post("/noti/filter", { state: "unread" });
                setNoti(res.data);
            } catch (error) {
                console.error("Error fetching notifications", error);
            }
        };
        fetchNotifications();
    }, []);

    async function handleRead(id) {
        try {
            await axios.post(`/noti/${id}`);
            setNoti(prevNoti => prevNoti.filter(item => item.notification_id !== id));
        } catch (error) {
            console.error("Error marking the notification as read", error);
        }
    }

    async function handleClick(e) {
        e.preventDefault();
        const { name } = e.target;
        setView(name);
        try {
            const res = await axios.post("/noti/filter", { state: name });
            setNoti(res.data);
        } catch (error) {
            console.error("Error filtering notifications", error);
        }
    }

    async function handleAllRead(e) {
        e.preventDefault();
        try {
            await axios.post("/noti/mark-all");
            setNoti([]);
        } catch (error) {
            console.error("Error marking all as read", error);
        }
    }

    const ICON_MAP = {
        AGENT_REPLY: "🗣️",
        TICKET_RESOLVED: "✅",
        TICKET_REOPENED: "🔄",
        CUSTOMER_REPLY: "💬",
    };

    return (
        <div className="cust-noti-body">
            <TicketNavbar />
            <div className="cust-noti-page">
                <h1>Notifications</h1>

                <div className="cust-noti-sort">
                    <button
                        className={`cust-noti-filter-btn ${view === "unread" ? "active" : ""}`}
                        onClick={handleClick}
                        name="unread"
                    >
                        Unread
                    </button>
                    <button
                        className={`cust-noti-filter-btn ${view === "read" ? "active" : ""}`}
                        onClick={handleClick}
                        name="read"
                    >
                        Read
                    </button>
                    {view === "unread" && noti.length > 0 && (
                        <button onClick={handleAllRead} className="cust-noti-filter-btn mark-all">
                            Mark all as Read
                        </button>
                    )}
                </div>

                {noti.length === 0 ? (
                    <div className="cust-noti-empty">
                        <p>No {view} notifications 🎉</p>
                    </div>
                ) : (
                    <ul className="cust-noti-list">
                        {noti.map((item) => (
                            <li key={item.notification_id} className="cust-noti-item">
                                <div className="cust-noti-icon-wrap">
                                    <span className={`cust-noti-icon ${item.notification_type || ""}`}>
                                        {ICON_MAP[item.notification_type] || "🔔"}
                                    </span>
                                </div>
                                <div className="cust-noti-content">
                                    <div className="cust-noti-type-label">
                                        {(item.notification_type || "Notification").replace(/_/g, " ")}
                                    </div>
                                    <p className="cust-noti-text">{item.message_content}</p>
                                    <span className="cust-noti-time">
                                        {new Date(item.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {view === "unread" && (
                                    <div className="cust-noti-action">
                                        <button onClick={() => handleRead(item.notification_id)}>
                                            Mark as Read
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <Footer />
        </div>
    );
}
