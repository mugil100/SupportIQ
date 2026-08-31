import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "../../styles/AgentHome.css";
import AgentNavbar from "./AgentNavbar";
import AgentStats from "../../components/AgentStats";
import Footer from "../../components/Footer";

const STATUS_CLASSES = {
    "Open": "status-open",
    "In Progress": "status-progress",
    "Resolved": "status-resolved",
    "Closed": "status-closed",
};

const PRIORITY_CLASSES = {
    "High": "priority-high",
    "Medium": "priority-medium",
    "Low": "priority-low",
};

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)          return "just now";
    if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7)  return `${Math.floor(diff / 86400)}d ago`;
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
        <div className="agent-page-root">
            
            {/* ─── Hero Canvas (Silk Blue Wave Banner) ─── */}
            <section className="agent-hero-banner">
                <AgentNavbar />

                <div className="agent-hero-inner">
                    <div className="agent-hero-text-block">
                        <div className="agent-hero-tag">
                            <span className="hero-tag-dot"></span>
                            <span>AGENT WORKSPACE • WELCOME BACK, {aname.toUpperCase()}</span>
                        </div>

                        <h1 className="agent-hero-title">
                            The intelligence layer<br />
                            for support desks.
                        </h1>

                        <p className="agent-hero-description">
                            SupportIQ helps modern support specialists operate safer, faster, and more compliantly — without sacrificing clinical resolution quality or triage velocity.
                        </p>

                        <div className="agent-hero-btn-row">
                            <button 
                                className="agent-btn-solid-white"
                                onClick={() => navigate("/agent/agenttickets")}
                            >
                                My Assigned Tickets
                            </button>
                            <button 
                                className="agent-btn-frosted-pill"
                                onClick={() => navigate("/agent/unassigned")}
                            >
                                Browse Unassigned Queue
                            </button>
                        </div>
                    </div>

                    <div className="agent-hero-scroll-tag">
                        <span>Scroll Down ↓</span>
                    </div>
                </div>
            </section>

            {/* ─── Lower Infrastructure Section (Clean White) ─── */}
            <section className="agent-infra-section">
                <div className="agent-infra-header-centered">
                    <div className="agent-infra-eyebrow">
                        <span className="eyebrow-icon">🔀</span>
                        <span>The workspace — real-time triage &amp; live performance</span>
                    </div>

                    <h2 className="agent-infra-headline">
                        Support specialists don’t compete on backlog<br />
                        — they compete on infrastructure
                    </h2>

                    <div className="agent-infra-cta-wrap">
                        <button 
                            className="agent-dark-pill-action"
                            onClick={() => navigate("/agent/unassigned")}
                        >
                            Open Triage Queue <span className="sparkle-icon">🪄</span>
                        </button>
                    </div>
                </div>

                {/* ─── Infrastructure Challenge Cards (KPI Metrics) ─── */}
                <div className="agent-content-container">
                    <AgentStats stats={stats} />

                    {/* ─── Recent Activity Table Card ─── */}
                    <div className="agent-infra-table-card">
                        <div className="table-card-top-row">
                            <div>
                                <span className="table-card-tag">02 Worklist</span>
                                <h3 className="table-card-heading">Live Ticket Stream</h3>
                            </div>
                            <button className="agent-refresh-pill-btn" onClick={fetchRecent}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                                </svg>
                                Refresh Feed
                            </button>
                        </div>

                        {activityLoading ? (
                            <div className="agent-table-loading">
                                <div className="agent-spinner"></div>
                                <span>Syncing active tickets...</span>
                            </div>
                        ) : recentTickets.length === 0 ? (
                            <div className="agent-table-empty">
                                <div className="empty-emoji">📂</div>
                                <p>No active tickets assigned to you right now.</p>
                                <button 
                                    className="agent-empty-action"
                                    onClick={() => navigate("/agent/unassigned")}
                                >
                                    Pick from Unassigned Queue
                                </button>
                            </div>
                        ) : (
                            <div className="agent-table-rows">
                                {recentTickets.map(ticket => (
                                    <div
                                        key={ticket.ticket_id}
                                        className="agent-stream-row"
                                        onClick={() => navigate(`/agent/agenttickets/${ticket.ticket_id}`)}
                                    >
                                        <div className="stream-left">
                                            <span className="stream-id">#{ticket.ticket_id}</span>
                                            <div className="stream-details">
                                                <h4 className="stream-title">{ticket.title}</h4>
                                                <div className="stream-meta">
                                                    <span className="stream-customer">👤 {ticket.customer_name || "Merchant"}</span>
                                                    <span className="stream-meta-dot">•</span>
                                                    <span className={`stream-priority ${PRIORITY_CLASSES[ticket.priority] || ''}`}>
                                                        <span className="stream-dot"></span>
                                                        {ticket.priority} Priority
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stream-right">
                                            <span className={`stream-status-chip ${STATUS_CLASSES[ticket.status] || ''}`}>
                                                {ticket.status}
                                            </span>
                                            <span className="stream-time">{timeAgo(ticket.last_activity_at)}</span>
                                            <span className="stream-arrow">→</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default AgentHome;
