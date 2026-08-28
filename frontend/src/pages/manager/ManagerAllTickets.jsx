import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ManagerNavbar from "./ManagerNavbar";
import axios from "../../api/axios";
import "../../styles/ManagerAllTickets.css";

function ManagerAllTickets() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (search) params.search = search;
            if (status) params.status = status;
            if (category) params.category = category;

            const res = await axios.get("/manager/tickets", { params });
            setTickets(res.data.tickets);
            setTotalPages(res.data.totalPages);
            setTotal(res.data.total);
        } catch (err) {
            console.error("Failed to fetch tickets:", err);
        } finally {
            setLoading(false);
        }
    }, [page, search, status, category]);

    useEffect(() => {
        // Read URL params for initial load if navigated from dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const urlStatus = urlParams.get('status');
        if (urlStatus && !status) {
            setStatus(urlStatus);
        } else {
            fetchTickets();
        }
    }, [fetchTickets, status]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1); // Reset to page 1 on search
        fetchTickets();
    };

    return (
        <div className="manager-layout">
            <ManagerNavbar />
            <div className="mat-container">
                <div className="mat-header">
                    <div>
                        <h1>All Tickets</h1>
                        <p>Browse and filter all customer tickets across the platform</p>
                    </div>
                    <div className="mat-total-badge">
                        {total} Tickets Found
                    </div>
                </div>

                <div className="mat-filters-card">
                    <form onSubmit={handleSearchSubmit} className="mat-search-form">
                        <input
                            type="text"
                            placeholder="Search ticket title or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="mat-search-input"
                        />
                        <button type="submit" className="mat-search-btn">Search</button>
                    </form>

                    <div className="mat-filter-group">
                        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>

                        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                            <option value="">All Categories</option>
                            <option value="Billing">Billing</option>
                            <option value="Technical Issue">Technical Issue</option>
                            <option value="Account Access">Account Access</option>
                            <option value="General Inquiry">General Inquiry</option>
                            <option value="Feedback/Suggestions">Feedback/Suggestions</option>
                        </select>
                    </div>
                </div>

                <div className="mat-table-container">
                    {loading ? (
                        <div className="mat-loading">Loading tickets...</div>
                    ) : (
                        <>
                            <table className="mat-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Customer</th>
                                        <th>Title</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Assigned Agent</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.ticket_id} onClick={() => navigate(`/manager/tickets/${ticket.ticket_id}`)}>
                                            <td className="mat-id">#{ticket.ticket_id}</td>
                                            <td className="mat-customer">{ticket.customer_name}</td>
                                            <td className="mat-title">
                                                <div className="mat-title-text">{ticket.title}</div>
                                                {ticket.escalated && !ticket.escalation_resolved && (
                                                    <span className="mat-badge-escalated">Escalated</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${ticket.status}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td>
                                                {ticket.priority && (
                                                    <span className={`badge ${ticket.priority}`}>
                                                        {ticket.priority}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="mat-agent">
                                                {ticket.agent_name || <span className="mat-unassigned">Unassigned</span>}
                                            </td>
                                            <td className="mat-date">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {tickets.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="mat-empty">No tickets found matching your criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className="mat-pagination">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </button>
                                    <span className="mat-page-info">Page {page} of {totalPages}</span>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManagerAllTickets;
