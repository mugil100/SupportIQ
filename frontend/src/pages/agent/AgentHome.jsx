import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "../../styles/AgentHome.css";
import AgentNavbar from "./AgentNavbar";
import AgentStats from "../../components/AgentStats";

const STATUS_COLORS = {
    "Open":        "#5e6ad2",
    "In Progress": "#f59e0b",
    "Resolved":    "#10b981",
    "Closed":      "#64748b",
};

const PRIORITY_COLORS = {
    "High":   "#ef4444",
    "Medium": "#f59e0b",
    "Low":    "#10b981",
};

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)           return "just now";
    if (diff < 3600)         return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)        return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7)   return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function AgentHome() {
    const navigate = useNavigate();
    const aname = localStorage.getItem("name") || "Agent";

    const [stats, setStats] = useState({
        assigned: 0,
        in_progress: 0,
        resolved: 0,
        unreplied: 0,
        unread: 0
    });
    const [recentTickets, setRecentTickets] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

    // Fetch KPI stats (with 30s polling)
    useEffect(() => {
        const fetchStats = () => {
            axios.get("agent/dashboard")
                .then(res => setStats(res.data))
                .catch(err => console.error("Error fetching stats:", err));
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch recent activity once on mount
    const fetchRecent = useCallback(() => {
        setActivityLoading(true);
        axios.get("agent/recent-activity")
            .then(res => setRecentTickets(res.data))
            .catch(err => console.error("Error fetching recent activity:", err))
            .finally(() => setActivityLoading(false));
    }, []);

    useEffect(() => {
        fetchRecent();
    }, [fetchRecent]);

    return (
        <>
            <AgentNavbar />
            <div className="ahome">
                <h1>Welcome Back, {aname}</h1>
                <AgentStats stats={stats} />

                <div className="recent-activity">
                    <div className="ra-header">
                        <h1>Recent Activity</h1>
                        <button className="ra-refresh-btn" onClick={fetchRecent}>↻ Refresh</button>
                    </div>

                    {activityLoading ? (
                        <div className="ra-empty">Loading recent tickets...</div>
                    ) : recentTickets.length === 0 ? (
                        <div className="ra-empty">No tickets assigned yet.</div>
                    ) : (
                        recentTickets.map(ticket => (
                            <div
                                key={ticket.ticket_id}
                                className="r-items"
                                onClick={() => navigate(`/agent/agenttickets/${ticket.ticket_id}`)}
                            >
                                <div className="ra-ticket-top">
                                    <span className="ra-ticket-id">#{ticket.ticket_id}</span>
                                    <span
                                        className="ra-status-badge"
                                        style={{ color: STATUS_COLORS[ticket.status] || "#e8eaf6" }}
                                    >
                                        {ticket.status}
                                    </span>
                                </div>
                                <div className="ra-ticket-title">{ticket.title}</div>
                                <div className="ra-ticket-meta">
                                    <span className="ra-customer">👤 {ticket.customer_name || "Unknown"}</span>
                                    <span className="ra-priority" style={{ color: PRIORITY_COLORS[ticket.priority] || "#94a3b8" }}>
                                        ● {ticket.priority}
                                    </span>
                                    <span className="ra-time">{timeAgo(ticket.last_activity_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

export default AgentHome;
