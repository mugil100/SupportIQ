import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
import "../../styles/EscalationQueue.css";

function EscalationQueue() {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    useEffect(() => {
        fetchEscalations(1);
    }, []);

    const fetchEscalations = async (page) => {
        setLoading(true);
        try {
            const res = await axios.get("/manager/escalations", { params: { page, limit: 15 } });
            setEscalations(res.data.escalations || []);
            setPagination({
                page: res.data.page || 1,
                totalPages: res.data.totalPages || 1,
                total: res.data.total || 0
            });
        } catch (_err) {
            toast.error("Failed to load escalations");
        } finally {
            setLoading(false);
        }
    }; 

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchEscalations(newPage);
        }
    };

    return (
        <div className="mgr-page-root">
            {/* Top Navigation */}
            <div className="mgr-header-wrapper">
                <ManagerNavbar />
            </div>
            
            <main className="mgr-subpage-container">
                
                {/* Header */}
                <div className="eq-page-header">
                    <div>
                        <div className="eq-page-tag">
                            <span className="eq-tag-dot"></span>
                            <span>🚨 PRIORITY INCIDENTS</span>
                        </div>
                        <h1 className="eq-page-title">Escalation Triage Queue</h1>
                        <p className="eq-page-desc">High-priority customer incidents requiring executive supervisor intervention and expedited resolution.</p>
                    </div>

                    <div className="eq-stat-pill">
                        <span className="eq-stat-num">{pagination.total}</span>
                        <span className="eq-stat-lbl">Active Escalations</span>
                    </div>
                </div>

                {/* Main Card Frame */}
                <div className="eq-card-frame">
                    
                    {loading ? (
                        <div className="eq-loading">
                            <div className="eq-spinner"></div>
                            <p>Loading escalations queue...</p>
                        </div>
                    ) : escalations.length === 0 ? (
                        <div className="eq-empty">
                            <div className="eq-empty-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <h3>Queue All Clear</h3>
                            <p>There are no active escalations requiring manager intervention at this time.</p>
                        </div>
                    ) : (
                        <div className="eq-table-wrap">
                            <table className="eq-table">
                                <thead>
                                    <tr>
                                        <th>Ticket ID</th>
                                        <th>Title</th>
                                        <th>Customer</th>
                                        <th>Assigned Agent</th>
                                        <th>Escalated Time</th>
                                        <th>Priority</th>
                                        <th style={{ textAlign: "right" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {escalations.map(ticket => (
                                        <tr key={ticket.ticket_id} className="eq-row">
                                            <td>
                                                <span className="eq-id-pill">#{ticket.ticket_id}</span>
                                            </td>
                                            <td className="eq-title-cell" title={ticket.title}>
                                                <Link to={`/manager/tickets/${ticket.ticket_id}`} className="eq-link">
                                                    {ticket.title}
                                                </Link>
                                            </td>
                                            <td className="eq-customer-cell">
                                                {ticket.customer_name || "Unknown"}
                                            </td>
                                            <td>
                                                {ticket.agent_name ? (
                                                    <span className="eq-agent-badge">
                                                        <span className="eq-agent-dot"></span>
                                                        {ticket.agent_name}
                                                    </span>
                                                ) : (
                                                    <span className="eq-unassigned">Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="eq-time">
                                                    <span className="eq-time-date">{new Date(ticket.escalated_at).toLocaleDateString()}</span>
                                                    <span className="eq-time-hour">{new Date(ticket.escalated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`eq-priority-badge ${ticket.priority?.toLowerCase() || 'high'}`}>
                                                    {ticket.priority || 'High'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <Link to={`/manager/tickets/${ticket.ticket_id}`} className="eq-action-btn">
                                                    Review &amp; Resolve
                                                    <span className="eq-action-arrow">→</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="eq-pagination">
                            <button 
                                className="eq-page-btn"
                                onClick={() => handlePageChange(pagination.page - 1)} 
                                disabled={pagination.page === 1}
                            >
                                ← Previous
                            </button>
                            <span className="eq-page-info">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button 
                                className="eq-page-btn"
                                onClick={() => handlePageChange(pagination.page + 1)} 
                                disabled={pagination.page === pagination.totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>

            </main>

            <Footer />
        </div>
    );
}

export default EscalationQueue;
