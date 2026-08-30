import React, { useState, useEffect, useCallback } from "react";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import "../../styles/AgentRoster.css";

function AgentRoster() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state for inviting agent
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    // Action loading state
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get("/manager/agents");
            setAgents(res.data.agents || []);
        } catch (err) {
            console.error("Failed to load agent roster:", err);
            toast.error("Failed to load agent roster");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) {
            toast.error("Please enter a valid email address");
            return;
        }

        setInviting(true);
        try {
            await axios.post("/manager/agents/invite", { email: inviteEmail.trim() });
            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
            setShowInviteModal(false);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to send invitation";
            toast.error(msg);
        } finally {
            setInviting(false);
        }
    };

    const handleToggleStatus = async (agent) => {
        const action = agent.is_active ? "deactivate" : "activate";
        const confirmMsg = agent.is_active
            ? `Are you sure you want to deactivate ${agent.agent_name}? They will be blocked from logging in.`
            : `Are you sure you want to activate ${agent.agent_name}?`;

        if (!window.confirm(confirmMsg)) return;

        setActionLoadingId(agent.agent_id);
        try {
            if (agent.is_active) {
                await axios.put(`/manager/agents/${agent.agent_id}/deactivate`);
                toast.success(`${agent.agent_name} deactivated`);
            } else {
                await axios.put(`/manager/agents/${agent.agent_id}/activate`);
                toast.success(`${agent.agent_name} activated`);
            }
            // Update state locally for fast UI update
            setAgents(prev => prev.map(a => 
                a.agent_id === agent.agent_id ? { ...a, is_active: !a.is_active } : a
            ));
        } catch (err) {
            const msg = err.response?.data?.error || `Failed to ${action} agent`;
            toast.error(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredAgents = agents.filter(a => {
        const q = search.toLowerCase();
        return (
            (a.agent_name && a.agent_name.toLowerCase().includes(q)) ||
            (a.username && a.username.toLowerCase().includes(q)) ||
            (a.email && a.email.toLowerCase().includes(q))
        );
    });

    // Summary stats
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.is_active).length;
    const totalResolved = agents.reduce((acc, a) => acc + (a.resolved_count || 0), 0);
    const overallAvgResponse = agents.length > 0
        ? (agents.reduce((acc, a) => acc + (a.avg_response_hours || 0), 0) / agents.length).toFixed(1)
        : 0;

    return (
        <div className="manager-layout">
            <ManagerNavbar />
            <div className="ar-container">
                
                {/* Header */}
                <div className="ar-header">
                    <div>
                        <h1>Agent Roster & Provisioning</h1>
                        <p>Manage support representatives, monitor workloads, and invite new team members.</p>
                    </div>
                    <button className="ar-btn-invite" onClick={() => setShowInviteModal(true)}>
                        <span className="ar-btn-icon">+</span> Invite Agent
                    </button>
                </div>

                {/* Stats Summary Cards */}
                <div className="ar-stats-grid">
                    <div className="ar-stat-card">
                        <span className="ar-stat-label">Total Agents</span>
                        <span className="ar-stat-value">{totalAgents}</span>
                    </div>
                    <div className="ar-stat-card">
                        <span className="ar-stat-label">Active Agents</span>
                        <span className="ar-stat-value ar-stat-active">{activeAgents}</span>
                    </div>
                    <div className="ar-stat-card">
                        <span className="ar-stat-label">Total Tickets Resolved</span>
                        <span className="ar-stat-value ar-stat-resolved">{totalResolved}</span>
                    </div>
                    <div className="ar-stat-card">
                        <span className="ar-stat-label">Avg Response Time</span>
                        <span className="ar-stat-value">{overallAvgResponse}h</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="ar-controls-card">
                    <div className="ar-search-wrapper">
                        <svg className="ar-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search agents by name, username, or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="ar-search-input"
                        />
                    </div>
                </div>

                {/* Roster Table */}
                <div className="ar-table-container">
                    {loading ? (
                        <div className="ar-loading">
                            <div className="spinner"></div>
                            <p>Loading agent roster...</p>
                        </div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="ar-empty">
                            <div className="ar-empty-icon">👥</div>
                            <h3>No Agents Found</h3>
                            <p>{search ? "No agents match your search criteria." : "No support agents have been added yet."}</p>
                        </div>
                    ) : (
                        <table className="ar-table">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Workload</th>
                                    <th>Resolved</th>
                                    <th>Avg Response</th>
                                    <th>Joined</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.map(agent => (
                                    <tr key={agent.agent_id} className={`ar-row ${!agent.is_active ? 'ar-row-inactive' : ''}`}>
                                        <td className="ar-agent-cell">
                                            <div className="ar-avatar">
                                                {(agent.agent_name || agent.username || "A").charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ar-agent-info">
                                                <span className="ar-agent-name">{agent.agent_name || "Unnamed"}</span>
                                                <span className="ar-agent-username">@{agent.username}</span>
                                            </div>
                                        </td>
                                        <td className="ar-email">{agent.email}</td>
                                        <td>
                                            <span className={`ar-status-badge ${agent.is_active ? 'active' : 'inactive'}`}>
                                                <span className="ar-status-dot"></span>
                                                {agent.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="ar-workload-pills">
                                                <span className="ar-pill ar-pill-open" title="Open tickets">
                                                    {agent.open_count} Open
                                                </span>
                                                <span className="ar-pill ar-pill-progress" title="In Progress tickets">
                                                    {agent.in_progress_count} In Prog
                                                </span>
                                            </div>
                                        </td>
                                        <td className="ar-resolved-count">
                                            {agent.resolved_count}
                                        </td>
                                        <td className="ar-resp-time">
                                            {agent.avg_response_hours > 0 ? `${agent.avg_response_hours} hrs` : "N/A"}
                                        </td>
                                        <td className="ar-date">
                                            {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "N/A"}
                                        </td>
                                        <td>
                                            <button
                                                className={`ar-btn-toggle ${agent.is_active ? 'deactivate' : 'activate'}`}
                                                onClick={() => handleToggleStatus(agent)}
                                                disabled={actionLoadingId === agent.agent_id}
                                            >
                                                {actionLoadingId === agent.agent_id ? (
                                                    "Updating..."
                                                ) : agent.is_active ? (
                                                    "Deactivate"
                                                ) : (
                                                    "Activate"
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="ar-modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div className="ar-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="ar-modal-header">
                            <h2>Invite New Support Agent</h2>
                            <button className="ar-modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
                        </div>
                        <p className="ar-modal-desc">
                            Enter the email address of the new agent. We'll send them a secure link with an invite token valid for 48 hours to complete their account setup.
                        </p>
                        <form onSubmit={handleInvite} className="ar-modal-form">
                            <div className="ar-form-group">
                                <label htmlFor="invite-email">Agent Email Address</label>
                                <input
                                    id="invite-email"
                                    type="email"
                                    placeholder="agent@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="ar-modal-actions">
                                <button
                                    type="button"
                                    className="ar-btn-cancel"
                                    onClick={() => setShowInviteModal(false)}
                                    disabled={inviting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="ar-btn-submit"
                                    disabled={inviting || !inviteEmail.trim()}
                                >
                                    {inviting ? "Sending Invite..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

export default AgentRoster;
