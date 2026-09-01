import React, { useState, useEffect, useCallback } from "react";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
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

    return (
        <div className="mgr-page-root">
            
            {/* ─── Hero Canvas (Obsidian & Electric Lime Banner) ─── */}
            <section className="mgr-hero-banner">
                <ManagerNavbar />

                <div className="mgr-hero-inner">
                    <div className="mgr-hero-text-block">
                        
                        <div className="mgr-hero-badge">
                            <span className="mgr-badge-star">★</span>
                            <span>100% SLA COMPLIANCE • REAL-TIME OPERATIONAL DESK</span>
                        </div>

                        <h1 className="mgr-hero-title">
                            Enterprise Support Oversight for<br />
                            <span className="mgr-hero-accent-text">High-Velocity Operations</span>
                        </h1>

                        <p className="mgr-hero-description">
                            SupportIQ delivers executive-level operational telemetry, instant agent workload balancing, and zero-breach SLA triage for enterprise support organizations.
                        </p>

                        <div className="mgr-hero-btn-row">
                            <button 
                                className="mgr-btn-lime"
                                onClick={() => navigate("/manager/escalations")}
                            >
                                Triage Escalations
                                <span className="mgr-btn-circle-arrow">→</span>
                            </button>

                            <button 
                                className="mgr-btn-frosted"
                                onClick={() => navigate("/manager/agents")}
                            >
                                View Agent Roster
                                <span className="mgr-btn-circle-arrow-trans">→</span>
                            </button>
                        </div>
                    </div>

                    {/* Translucent Feature Chips on Right */}
                    <div className="mgr-hero-feature-chips">
                        <div className="mgr-feature-pill">24/7 SLA Protection</div>
                        <div className="mgr-feature-pill">Workload Balancing</div>
                        <div className="mgr-feature-pill">AI Auto-Triage</div>
                    </div>
                </div>
            </section>

            {/* ─── Lower Content Canvas (Clean White Desk) ─── */}
            <main className="mgr-main-canvas">
                
                {loading ? (
                    <div className="mgr-loading-box">
                        <div className="mgr-spinner"></div>
                        <p>Syncing operational telemetry &amp; team workload...</p>
                    </div>
                ) : (
                    <>
                        {/* ─── 4 KPI Metrics Grid (Featured Lime Card) ─── */}
                        <div className="mgr-kpi-grid">
                            
                            {/* Card 1: Open & In Progress */}
                            <div 
                                className="mgr-metric-card"
                                onClick={() => navigate("/manager/tickets?status=Open")}
                            >
                                <div className="metric-icon-wrap">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                </div>
                                <div className="metric-content">
                                    <h3 className="metric-title">Open &amp; In Progress</h3>
                                    <div className="metric-num">{stats.total_open}</div>
                                    <p className="metric-desc">Active tickets currently being handled by agents</p>
                                </div>
                            </div>

                            {/* Card 2: SLA Breached (>24h) - FEATURED ELECTRIC LIME CARD */}
                            <div 
                                className="mgr-metric-card featured-lime"
                                onClick={() => navigate("/manager/tickets")}
                            >
                                <div className="metric-icon-wrap">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                                <div className="metric-content">
                                    <h3 className="metric-title">SLA Breached (&gt;24h)</h3>
                                    <div className="metric-num">{stats.sla_breached}</div>
                                    <p className="metric-desc">Critical tickets exceeding 24-hour SLA window</p>
                                </div>
                            </div>

                            {/* Card 3: Unresolved Escalations */}
                            <div 
                                className="mgr-metric-card"
                                onClick={() => navigate("/manager/escalations")}
                            >
                                <div className="metric-icon-wrap icon-rose">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                                <div className="metric-content">
                                    <h3 className="metric-title">Unresolved Escalations</h3>
                                    <div className="metric-num">{stats.escalated}</div>
                                    <p className="metric-desc">Urgent cases requiring executive intervention</p>
                                </div>
                            </div>

                            {/* Card 4: Resolved Today */}
                            <div className="mgr-metric-card">
                                <div className="metric-icon-wrap icon-emerald">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </div>
                                <div className="metric-content">
                                    <h3 className="metric-title">Resolved Today</h3>
                                    <div className="metric-num">{stats.resolved_today}</div>
                                    <p className="metric-desc">Total merchant tickets resolved across all agents today</p>
                                </div>
                            </div>

                        </div>

                        {/* ─── Live Agent Workload Table ─── */}
                        <div className="mgr-workload-card">
                            <div className="mgr-workload-header">
                                <div>
                                    <span className="workload-tag">02 TEAM TELEMETRY</span>
                                    <h3 className="workload-title">Live Agent Workload</h3>
                                </div>
                                <span className="mgr-agent-counter-pill">{agents.length} active agents</span>
                            </div>

                            <div className="mgr-table-wrap">
                                <table className="mgr-data-table">
                                    <thead>
                                        <tr>
                                            <th>Agent</th>
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
                                                <td>
                                                    <div className="mgr-agent-row-cell">
                                                        <div className="mgr-agent-avatar">
                                                            {agent.agent_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="mgr-agent-name-text">{agent.agent_name}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`mgr-agent-status-pill ${agent.is_active ? 'active' : 'inactive'}`}>
                                                        <span className="status-dot"></span>
                                                        {agent.is_active ? "Active" : "Deactivated"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`mgr-workload-count ${agent.open_count > 5 ? 'high' : ''}`}>
                                                        {agent.open_count}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="mgr-workload-count">{agent.in_progress_count}</span>
                                                </td>
                                                <td>
                                                    <span className="mgr-workload-count resolved">{agent.resolved_count}</span>
                                                </td>
                                                <td>
                                                    <span className={`mgr-response-text ${agent.avg_response_hours > 24 ? 'slow' : ''}`}>
                                                        {agent.avg_response_hours > 0 ? `${agent.avg_response_hours} hrs` : "—"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {agents.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="mgr-empty-table-cell">
                                                    No agents registered yet. Invite agents from the Agent Roster page.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </>
                )}

            </main>

            <Footer />
        </div>
    );
}

export default ManagerDashboard;
