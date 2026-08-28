import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import toast from "react-hot-toast";
import "../styles/ReassignModal.css";

function ReassignModal({ ticketId, currentAgentId, onClose, onReassign }) {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                // Reuse the dashboard agent list endpoint since it has workload stats
                const res = await axios.get("/manager/dashboard/agents");
                // Filter out deactivated agents and the current assigned agent
                const availableAgents = res.data.agents.filter(
                    a => a.is_active && a.agent_id !== currentAgentId
                );
                setAgents(availableAgents);
            } catch (err) {
                toast.error("Failed to load agents");
            } finally {
                setLoading(false);
            }
        };
        fetchAgents();
    }, [currentAgentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAgentId) return;

        setSubmitting(true);
        try {
            await axios.put(`/manager/tickets/${ticketId}/reassign`, {
                agent_id: parseInt(selectedAgentId, 10)
            });
            toast.success("Ticket reassigned successfully");
            onReassign(); // trigger refresh in parent component
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to reassign ticket");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rm-overlay" onClick={onClose}>
            <div className="rm-modal" onClick={e => e.stopPropagation()}>
                <button className="rm-close-btn" onClick={onClose}>✕</button>
                <h2>Reassign Ticket #{ticketId}</h2>
                <p className="rm-subtitle">Select an active agent to take over this ticket.</p>

                {loading ? (
                    <div className="rm-loading">Loading agents...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="rm-form">
                        <div className="rm-agent-list">
                            {agents.length === 0 ? (
                                <p className="rm-no-agents">No other active agents available.</p>
                            ) : (
                                agents.map(agent => (
                                    <label
                                        key={agent.agent_id}
                                        className={`rm-agent-card ${selectedAgentId === agent.agent_id.toString() ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="agent_id"
                                            value={agent.agent_id}
                                            checked={selectedAgentId === agent.agent_id.toString()}
                                            onChange={(e) => setSelectedAgentId(e.target.value)}
                                            style={{ display: "none" }}
                                        />
                                        <div className="rm-agent-avatar">
                                            {agent.agent_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="rm-agent-info">
                                            <span className="rm-agent-name">{agent.agent_name}</span>
                                            <div className="rm-agent-stats">
                                                <span className={`rm-stat-pill ${agent.open_count > 5 ? 'high' : ''}`}>
                                                    {agent.open_count} open
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="rm-actions">
                            <button type="button" className="rm-cancel" onClick={onClose} disabled={submitting}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rm-submit"
                                disabled={!selectedAgentId || submitting || agents.length === 0}
                            >
                                {submitting ? "Reassigning..." : "Reassign Ticket"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ReassignModal;
