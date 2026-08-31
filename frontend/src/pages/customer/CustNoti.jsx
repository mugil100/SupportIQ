import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import "../../styles/CustNoti.css";
import { useNavigate } from "react-router-dom";

// Clean SVG stroke icons matching the editorial palette
function NotiIcon({ type }) {
    switch (type) {
        case "AGENT_REPLY":
        case "CUSTOMER_REPLY":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        case "TICKET_RESOLVED":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            );
        case "TICKET_REOPENED":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
            );
        default:
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            );
    }
}

export default function CustNoti() {
    const navigate = useNavigate();
    const [noti, setNoti] = useState([]);
    const [view, setView] = useState("unread");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const res = await axios.post("/noti/filter", { state: "unread" });
                setNoti(res.data || []);
            } catch (error) {
                console.error("Error fetching notifications", error);
            } finally {
                setLoading(false);
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

    async function handleClick(name) {
        setView(name);
        setLoading(true);
        try {
            const res = await axios.post("/noti/filter", { state: name });
            setNoti(res.data || []);
        } catch (error) {
            console.error("Error filtering notifications", error);
        } finally {
            setLoading(false);
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

    async function handleNotiClick(noti_id, ticket_id) {
        try {
            navigate(`/ticket/${ticket_id}`);
            await handleRead(noti_id);
        } catch (error) {
            console.error("Error clicking the notification", error);
        }
    }

    return (
        <div className="cust-noti-body">
            <TicketNavbar />
            <main className="cust-main-canvas">
                <div className="cust-noti-frame">
                    
                    {/* Header */}
                    <div className="cust-noti-header">
                        <div>
                            <span className="cust-noti-tag">Inbox & Updates</span>
                            <h1 className="cust-noti-title">Notifications</h1>
                        </div>

                        {/* Filter Tabs */}
                        <div className="cust-noti-sort">
                            <button
                                className={`cust-noti-pill ${view === "unread" ? "active" : ""}`}
                                onClick={() => handleClick("unread")}
                            >
                                Unread
                            </button>
                            <button
                                className={`cust-noti-pill ${view === "read" ? "active" : ""}`}
                                onClick={() => handleClick("read")}
                            >
                                Read History
                            </button>
                            {view === "unread" && noti.length > 0 && (
                                <button onClick={handleAllRead} className="cust-noti-mark-all">
                                    Mark All as Read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="cust-noti-empty">
                            <p>Loading notifications...</p>
                        </div>
                    ) : noti.length === 0 ? (
                        <div className="cust-noti-empty">
                            <div className="cust-empty-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </div>
                            <p className="empty-title">All caught up</p>
                            <p className="empty-subtitle">No {view} notifications at this time.</p>
                        </div>
                    ) : (
                        <ul className="cust-noti-list">
                            {noti.map((item) => (
                                <li
                                    key={item.notification_id}
                                    className="cust-noti-item"
                                    onClick={() => handleNotiClick(item.notification_id, item.ticket_id)}
                                >
                                    <div className="cust-noti-icon-badge">
                                        <NotiIcon type={item.notification_type} />
                                    </div>
                                    <div className="cust-noti-content">
                                        <div className="cust-noti-meta-row">
                                            <span className="cust-noti-type-tag">
                                                {(item.notification_type || "Notification").replace(/_/g, " ")}
                                            </span>
                                            <span className="cust-noti-time">
                                                {new Date(item.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="cust-noti-text">{item.message_content}</p>
                                    </div>
                                    {view === "unread" && (
                                        <div className="cust-noti-action">
                                            <button
                                                className="cust-mark-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRead(item.notification_id);
                                                }}
                                            >
                                                Mark Read
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
