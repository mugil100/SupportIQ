import React, { useState, useEffect } from "react";
import ManagerNavbar from "./ManagerNavbar";
import "../../styles/ManagerDashboard.css";
import axios from "../../api/axios";

function ManagerDashboard() {
    const [stats, setStats] = useState({
        total_open: 0,
        sla_breached: 0,
        escalated: 0,
        resolved_today: 0
    });
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
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
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="manager-layout">
            <ManagerNavbar />
            <div className="m-dashboard-container">
                <div className="m-dashboard-header">
                    <h1>Manager Dashboard</h1>
                    <p>Overview of support operations and team workload</p>
                </div>

                <div className="m-stat-cards">
                    <div className="m-stat-card">
                        <h3>Total Open & In Progress</h3>
                        <div className="m-stat-value">{stats.total_open}</div>
                    </div>
                    <div className="m-stat-card warning">
                        <h3>SLA Breached (&gt;24h)</h3>
                        <div className="m-stat-value">{stats.sla_breached}</div>
                    </div>
                    <div className="m-stat-card danger">
                        <h3>Unresolved Escalations</h3>
                        <div className="m-stat-value">{stats.escalated}</div>
                    </div>
                    <div className="m-stat-card success">
                        <h3>Resolved Today</h3>
                        <div className="m-stat-value">{stats.resolved_today}</div>
                    </div>
                </div>

                <div className="m-agent-table-container">
                    <h2>Live Agent Workload</h2>
                    <table className="m-table">
                        <thead>
                            <tr>
                                <th>Agent Name</th>
                                <th>Status</th>
                                <th>Open</th>
                                <th>In Progress</th>
                                <th>Resolved</th>
                                <th>Avg Response Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.agent_id}>
                                    <td>{agent.agent_name}</td>
                                    <td>
                                        <span className={`status-badge ${agent.is_active ? 'status-active' : 'status-inactive'}`}>
                                            {agent.is_active ? "Active" : "Deactivated"}
                                        </span>
                                    </td>
                                    <td>{agent.open_count}</td>
                                    <td>{agent.in_progress_count}</td>
                                    <td>{agent.resolved_count}</td>
                                    <td>{agent.avg_response_hours} hrs</td>
                                </tr>
                            ))}
                            {agents.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>No agents found.</td>
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
