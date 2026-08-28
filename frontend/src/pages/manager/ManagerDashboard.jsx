import React, { useState, useEffect, useCallback } from "react";
import ManagerNavbar from "./ManagerNavbar";
import "../../styles/ManagerDashboard.css";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";

const REFRESH_INTERVAL = 30000; // 30 seconds

function ManagerDashboard() {
    const navigate = useNavigate();
    const socket = useSocket();
    const [stats, setStats] = useState({
        total_open: 0,
        sla_breached: 0,
        escalated: 0,
        resolved_today: 0
    });
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const [statsRes, agentsRes] = await Promise.all([
                axios.get("/manager/dashboard/stats"),
                axios.get("/manager/dashboard/agents")
            ]);
            setStats(statsRes.data);
            setAgents(agentsRes.data.agents);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchDashboardData(true);
    }, [fetchDashboardData]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => fetchDashboardData(false), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // Socket listener for real-time escalation updates
    useEffect(() => {
        const onNewEscalation = () => {
            setStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        };

        socket.on("new_escalation", onNewEscalation);
        return () => socket.off("new_escalation", onNewEscalation);
    }, [socket]);

    // Skeleton loader
    if (loading) {
        return (
            <div className="manager-layout">
                <ManagerNavbar />
                <div className="m-dashboard-container">
                    <div className="m-dashboard-header">
                        <div className="m-skel m-skel-title" style={{ width: "260px" }}></div>
                        <div className="m-skel m-skel-text" style={{ width: "320px" }}></div>
                    </div>
                    <div className="m-stat-cards">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="m-stat-card m-skel-card">
                                <div className="m-skel m-skel-text" style={{ width: "80%" }}></div>
                                <div className="m-skel m-skel-value"></div>
                            </div>
                        ))}
                    </div>
                    <div className="m-agent-table-container">
                        <div className="m-skel m-skel-title" style={{ width: "180px", marginBottom: "20px" }}></div>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="m-skel m-skel-row"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="manager-layout">
            <ManagerNavbar />
            <div className="m-dashboard-container">
                <div className="m-dashboard-header">
                    <h1>Operations Dashboard</h1>
                    <p>Real-time overview of support operations and team workload</p>
                </div>

                <div className="m-stat-cards">
                    <div
                        className="m-stat-card m-stat-clickable"
                        onClick={() => navigate("/manager/tickets?status=Open")}
                    >
                        <div className="m-stat-icon">📋</div>
                        <div className="m-stat-info">
                            <h3>Open & In Progress</h3>
                            <div className="m-stat-value">{stats.total_open}</div>
                        </div>
                    </div>

                    <div
                        className="m-stat-card warning m-stat-clickable"
                        onClick={() => navigate("/manager/tickets")}
                    >
                        <div className="m-stat-icon">⏰</div>
                        <div className="m-stat-info">
                            <h3>SLA Breached (&gt;24h)</h3>
                            <div className="m-stat-value">{stats.sla_breached}</div>
                        </div>
                    </div>

                    <div
                        className="m-stat-card danger m-stat-clickable"
                        onClick={() => navigate("/manager/escalations")}
                    >
                        <div className="m-stat-icon">🚨</div>
                        <div className="m-stat-info">
                            <h3>Unresolved Escalations</h3>
                            <div className="m-stat-value">{stats.escalated}</div>
                        </div>
                    </div>

                    <div className="m-stat-card success">
                        <div className="m-stat-icon">✅</div>
                        <div className="m-stat-info">
                            <h3>Resolved Today</h3>
                            <div className="m-stat-value">{stats.resolved_today}</div>
                        </div>
                    </div>
                </div>

                <div className="m-agent-table-container">
                    <div className="m-table-header">
                        <h2>Live Agent Workload</h2>
                        <span className="m-agent-count">{agents.length} agents</span>
                    </div>
                    <table className="m-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Status</th>
                                <th>Open</th>
                                <th>In Progress</th>
                                <th>Resolved</th>
                                <th>Avg Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.agent_id}>
                                    <td>
                                        <div className="m-agent-cell">
                                            <div className="m-agent-avatar">
                                                {agent.agent_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span>{agent.agent_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${agent.is_active ? 'status-active' : 'status-inactive'}`}>
                                            {agent.is_active ? "Active" : "Deactivated"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`m-count-pill ${agent.open_count > 5 ? 'high' : ''}`}>
                                            {agent.open_count}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="m-count-pill">{agent.in_progress_count}</span>
                                    </td>
                                    <td>
                                        <span className="m-count-pill resolved">{agent.resolved_count}</span>
                                    </td>
                                    <td>
                                        <span className={`m-response-time ${agent.avg_response_hours > 24 ? 'slow' : ''}`}>
                                            {agent.avg_response_hours > 0 ? `${agent.avg_response_hours} hrs` : "—"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {agents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="m-empty-row">
                                        No agents found. Invite your first agent from the Agents page.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ManagerDashboard;
