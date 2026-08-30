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
            setEscalations(res.data.escalations);
            setPagination({
                page: res.data.page,
                totalPages: res.data.totalPages,
                total: res.data.total
            });
        } catch (err) {
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
        <div className="escalation-queue-page">
            <ManagerNavbar />
            
            <main className="eq-main">
                <div className="eq-header">
                    <div>
                        <h1>Escalation Queue</h1>
                        <p>High-priority tickets requiring manager intervention.</p>
                    </div>
                    <div className="eq-stats">
                        <div className="eq-stat-box">
                            <span className="eq-stat-value">{pagination.total}</span>
                            <span className="eq-stat-label">Active Escalations</span>
                        </div>
                    </div>
                </div>

                <div className="eq-content">
                    {loading ? (
                        <div className="eq-loading">
                            <div className="spinner"></div>
                            <p>Loading escalations...</p>
                        </div>
                    ) : escalations.length === 0 ? (
                        <div className="eq-empty">
                            <div className="eq-empty-icon">✅</div>
                            <h3>All Clear</h3>
                            <p>There are no active escalations at this time.</p>
                        </div>
                    ) : (
                        <div className="eq-table-container">
                            <table className="eq-table">
                                <thead>
                                    <tr>
                                        <th>Ticket ID</th>
                                        <th>Title</th>
                                        <th>Customer</th>
                                        <th>Agent</th>
                                        <th>Escalated At</th>
                                        <th>Priority</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {escalations.map(ticket => (
                                        <tr key={ticket.ticket_id} className="eq-row">
                                            <td>#{ticket.ticket_id}</td>
                                            <td className="eq-title-cell" title={ticket.title}>
                                                <Link to={`/manager/tickets/${ticket.ticket_id}`} className="eq-link">
                                                    {ticket.title}
                                                </Link>
                                            </td>
                                            <td>{ticket.customer_name || "Unknown"}</td>
                                            <td>
                                                {ticket.agent_name ? (
                                                    <span className="eq-agent-badge">{ticket.agent_name}</span>
                                                ) : (
                                                    <span className="eq-unassigned">Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="eq-time">
                                                    {new Date(ticket.escalated_at).toLocaleDateString()}
                                                    <br />
                                                    <small>{new Date(ticket.escalated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`eq-priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                                            </td>
                                            <td>
                                                <Link to={`/manager/tickets/${ticket.ticket_id}`} className="eq-action-btn">
                                                    Review & Resolve
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
                                onClick={() => handlePageChange(pagination.page - 1)} 
                                disabled={pagination.page === 1}
                            >
                                Previous
                            </button>
                            <span className="eq-page-info">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button 
                                onClick={() => handlePageChange(pagination.page + 1)} 
                                disabled={pagination.page === pagination.totalPages}
                            >
                                Next
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
