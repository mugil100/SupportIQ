import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import Footer from "../../components/Footer";
import "../../styles/AgentNoti.css";

export default function AgentNoti() {
    const [noti, setNoti] = useState([]);
    const [view, setView] = useState("unread"); // filter state
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const res = await axios.post("/agent/noti/filter", { state: "unread" });
                setNoti(res.data);
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
            await axios.post(`agent/noti/${id}`);
            setNoti(prevNoti => prevNoti.filter(item => item.notification_id !== id));
        } catch(error) {
            console.error("Error marking notification as read", error);
        } 
    }

    async function handleCardClick(item) {
        if (view === "unread") {
            handleRead(item.notification_id);
        }
        if (item.ticket_id) {
            navigate(`/agent/agenttickets/${item.ticket_id}`);
        }
    }

    async function handleClick(e) {
        e.preventDefault();
        const { name } = e.currentTarget;
        setView(name);
        setLoading(true);
        try {
            const res = await axios.post("/agent/noti/filter", { state: name });
            setNoti(res.data);
        } catch (error) {
            console.error("Error filtering notifications", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAllRead(e) {
        e.preventDefault();
        try {
            await axios.post("/agent/noti/mark-all");
            setNoti([]);
        } catch(error) {
            console.error("Error marking all as read", error);
        }
    }

    return (
        <div className="agent-page-root">
            {/* Top Navigation */}
            <div className="agent-header-wrapper">
                <AgentNavbar />
            </div>

            <main className="agent-subpage-container">
                {/* Page Header */}
                <div className="agent-subpage-header">
                    <div className="agent-subpage-tag">
                        <span className="subpage-tag-dot"></span>
                        <span>03 REAL-TIME DISPATCH</span>
                    </div>
                    <h1 className="agent-subpage-title">Notifications</h1>
                    <p className="agent-subpage-desc">
                        Live system alerts, escalation notices, customer ticket responses, and dispatch logs.
                    </p>
                </div>

                {/* Main Card Frame */}
                <div className="agent-card-frame">
                    
                    {/* Controls Row */}
                    <div className="agent-noti-toolbar">
                        <div className="agent-pill-filters">
                            <button 
                                className={`agent-filter-pill ${view === "unread" ? "active" : ""}`} 
                                onClick={handleClick} 
                                name="unread"
                            >
                                Unread Alerts
                            </button>
                            <button 
                                className={`agent-filter-pill ${view === "read" ? "active" : ""}`} 
                                onClick={handleClick} 
                                name="read"
                            >
                                Read History
                            </button>
                        </div>

                        {view === "unread" && noti.length > 0 && (
                            <button 
                                onClick={handleAllRead}
                                className="agent-mark-all-btn"
                            >
                                Mark all as Read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    {loading ? (
                        <div className="agent-noti-loading">
                            <div className="agent-spinner"></div>
                            <p>Loading alerts...</p>
                        </div>
                    ) : noti.length === 0 ? (
                        <div className="agent-noti-empty-state">
                            <div className="empty-noti-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                            </div>
                            <h3>No {view} notifications</h3>
                            <p>You're completely caught up with all dispatch logs and customer alerts.</p>
                        </div>
                    ) : (
                        <div className="agent-noti-list">
                            {noti.map((item) => {
                                const isHigh = item.notification_type?.toLowerCase() === "warning" || 
                                               item.notification_type?.toLowerCase() === "high" ||
                                               item.notification_type?.toLowerCase() === "escalated";
                                return (
                                    <div 
                                        key={item.notification_id} 
                                        className={`agent-noti-card ${isHigh ? 'is-warning' : ''}`}
                                        onClick={() => handleCardClick(item)}
                                        style={{ cursor: item.ticket_id ? 'pointer' : 'default' }}
                                    >
                                        <div className="noti-card-left">
                                            <div className={`noti-icon-badge ${isHigh ? 'badge-high' : 'badge-normal'}`}>
                                                {isHigh ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                    </svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="noti-card-body">
                                                <div className="noti-type-row">
                                                    <span className={`noti-type-tag ${isHigh ? 'tag-warning' : 'tag-info'}`}>
                                                        {item.notification_type || "Dispatch"}
                                                    </span>
                                                    <span className="noti-timestamp">
                                                        {new Date(item.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="noti-card-message">{item.message_content}</p>
                                            </div>
                                        </div>

                                        <div className="noti-card-action">
                                            {item.ticket_id && (
                                                <span className="noti-view-link">View Ticket →</span>
                                            )}
                                            {view === "unread" && (
                                                <button 
                                                    className="agent-read-pill"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRead(item.notification_id);
                                                    }}
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
