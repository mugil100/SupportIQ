import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import "../../styles/ManagerAgentDetail.css";

function ManagerAgentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketSearch, setTicketSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAgentDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/manager/agents/${id}`);
            setData(res.data);
        } catch (_err) {
            toast.error("Failed to load agent details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAgentDetails();
    }, [fetchAgentDetails]);

    const handleToggleStatus = async () => {
        if (!data?.agent) return;
        const { is_active, name } = data.agent;
        const action = is_active ? "deactivate" : "activate";
        const confirmMsg = is_active
            ? `Are you sure you want to deactivate ${name}? They will be blocked from logging in.`
            : `Are you sure you want to activate ${name}?`;

        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            if (is_active) {
                await axios.put(`/manager/agents/${id}/deactivate`);
                toast.success(`${name} deactivated`);
            } else {
                await axios.put(`/manager/agents/${id}/activate`);
                toast.success(`${name} activated`);
            }
            setData(prev => prev ? ({
                ...prev,
                agent: { ...prev.agent, is_active: !is_active }
            }) : null);
        } catch (err) {
            toast.error(err.response?.data?.error || `Failed to ${action} agent`);
        } finally {
            setActionLoading(false);
        }
    };

    const agent = data?.agent;
    const stats = data?.stats;
    const tickets = data?.tickets || [];

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = !ticketSearch || 
            (t.title && t.title.toLowerCase().includes(ticketSearch.toLowerCase())) ||
            (t.customer_name && t.customer_name.toLowerCase().includes(ticketSearch.toLowerCase())) ||
            t.ticket_id.toString().includes(ticketSearch);

        const matchesStatus = !statusFilter || t.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="mgr-page-root">
            {/* Top Navigation */}
            <div className="mgr-header-wrapper">
                <ManagerNavbar />
            </div>

            <main className="mgr-subpage-container">
                
                {/* Back Nav */}
                <div className="mad-top-nav">
                    <button className="mad-btn-back" onClick={() => navigate("/manager/agents")}>
                        ← Back to Agent Roster
                    </button>
                </div>

                {loading ? (
                    <div className="mad-loading-card">
                        <div className="mad-spinner"></div>
                        <p>Loading agent telemetry &amp; performance data...</p>
                    </div>
                ) : !agent ? (
                    <div className="mad-empty-card">
                        <h2>Agent Profile Not Found</h2>
                        <p>The requested support representative profile does not exist or has been removed.</p>
                        <button className="mad-btn-back" onClick={() => navigate("/manager/agents")}>
                            ← Return to Agent Roster
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Profile Header Card */}
                        <div className="mad-profile-card">
                            <div className="mad-profile-main">
                                <div className="mad-avatar">
                                    {(agent.name || agent.username || "A").charAt(0).toUpperCase()}
                                </div>
                                <div className="mad-profile-info">
                                    <div className="mad-name-row">
                                        <h1 className="mad-agent-name">{agent.name || "Representative"}</h1>
                                        <span className={`mad-status-badge ${agent.is_active ? 'active' : 'inactive'}`}>
                                            <span className="mad-status-dot"></span>
                                            {agent.is_active ? "Active" : "Deactivated"}
                                        </span>
                                    </div>
                                    <p className="mad-username">@{agent.username}</p>
                                    <div className="mad-meta-list">
                                        <span className="mad-meta-item">📧 {agent.email}</span>
                                        <span className="mad-meta-item">📅 Member Since: {new Date(agent.created_at).toLocaleDateString()}</span>
                                        {agent.last_seen && (
                                            <span className="mad-meta-item">🕒 Last Active: {new Date(agent.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mad-profile-actions">
                                <button
                                    className={`mad-btn-toggle ${agent.is_active ? 'deactivate' : 'activate'}`}
                                    onClick={handleToggleStatus}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Updating..." : agent.is_active ? "Deactivate Account" : "Activate Account"}
                                </button>
                            </div>
                        </div>

                        {/* Performance Stats Grid */}
                        <div className="mad-stats-grid">
                            <div className="mad-stat-card">
                                <span className="mad-stat-label">Total Assigned</span>
                                <span className="mad-stat-val">{stats?.total_assigned || 0}</span>
                                <span className="mad-stat-sub">Lifetime tickets assigned</span>
                            </div>

                            <div className="mad-stat-card">
                                <span className="mad-stat-label">Active Workload</span>
                                <span className="mad-stat-val">
                                    {(stats?.open_count || 0) + (stats?.in_progress_count || 0)}
                                </span>
                                <span className="mad-stat-sub">
                                    {stats?.open_count || 0} Open • {stats?.in_progress_count || 0} In Progress
                                </span>
                            </div>

                            <div className="mad-stat-card">
                                <span className="mad-stat-label">Resolved &amp; Closed</span>
                                <span className="mad-stat-val">
                                    {(stats?.resolved_count || 0) + (stats?.closed_count || 0)}
                                </span>
                                <span className="mad-stat-sub">
                                    {stats?.resolved_count || 0} Resolved • {stats?.closed_count || 0} Closed
                                </span>
                            </div>

                            <div className="mad-stat-card">
                                <span className="mad-stat-label">Avg Response Time</span>
                                <span className="mad-stat-val">
                                    {stats?.avg_response_hours ? `${stats.avg_response_hours}h` : "N/A"}
                                </span>
                                <span className="mad-stat-sub">First turnaround speed</span>
                            </div>

                            <div className="mad-stat-card">
                                <span className="mad-stat-label">Customer Satisfaction</span>
                                <span className="mad-stat-val">
                                    {stats?.avg_rating ? `⭐ ${stats.avg_rating}` : "N/A"}
                                </span>
                                <span className="mad-stat-sub">
                                    {stats?.feedback_count ? `Based on ${stats.feedback_count} reviews` : "No ratings yet"}
                                </span>
                            </div>
                        </div>

                        {/* Assigned Tickets Section */}
                        <div className="mad-tickets-section">
                            <div className="mad-section-header">
                                <div>
                                    <span className="mad-section-tag">04 CASE AUDIT</span>
                                    <h2 className="mad-section-title">Assigned Tickets ({tickets.length})</h2>
                                </div>
                                <div className="mad-ticket-filters">
                                    <div className="mad-search-wrap">
                                        <svg className="mad-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search agent tickets..."
                                            value={ticketSearch}
                                            onChange={(e) => setTicketSearch(e.target.value)}
                                            className="mad-filter-input"
                                        />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="mad-filter-select"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mad-table-wrapper">
                                {filteredTickets.length === 0 ? (
                                    <div className="mad-table-empty">
                                        <p>No tickets match your filter criteria.</p>
                                    </div>
                                ) : (
                                    <table className="mad-table">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Subject</th>
                                                <th>Category</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTickets.map(ticket => (
                                                <tr
                                                    key={ticket.ticket_id}
                                                    onClick={() => navigate(`/manager/tickets/${ticket.ticket_id}`)}
                                                    className="mad-ticket-row"
                                                >
                                                    <td>
                                                        <span className="mad-id-pill">#{ticket.ticket_id}</span>
                                                    </td>
                                                    <td className="mad-cust">{ticket.customer_name || "Unknown"}</td>
                                                    <td className="mad-title">
                                                        <div className="mad-title-text">{ticket.title}</div>
                                                        {ticket.escalated && !ticket.escalation_resolved && (
                                                            <span className="mad-escalated-badge">🚨 Escalated</span>
                                                        )}
                                                    </td>
                                                    <td className="mad-cat-cell">{ticket.category || "General"}</td>
                                                    <td>
                                                        <span className={`mad-priority-pill priority-${(ticket.priority || 'medium').toLowerCase()}`}>
                                                            {ticket.priority || "Medium"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`mad-status-pill status-${(ticket.status || 'open').toLowerCase().replace(/\s+/g, '-')}`}>
                                                            {ticket.status}
                                                        </span>
                                                    </td>
                                                    <td className="mad-date">
                                                        {new Date(ticket.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </main>

            <Footer />
        </div>
    );
}

export default ManagerAgentDetail;
