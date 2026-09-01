import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";
import "../../styles/ManagerAllTickets.css";

const STATUS_OPTIONS = ["All", "Open", "In Progress", "Resolved", "Closed"];

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
            if (status && status !== "All") params.status = status;
            if (category) params.category = category;

            const res = await axios.get("/manager/tickets", { params });
            setTickets(res.data.tickets || []);
            setTotalPages(res.data.totalPages || 1);
            setTotal(res.data.total || 0);
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
        setPage(1);
        fetchTickets();
    };

    const handleStatusFilter = (st) => {
        setStatus(st === "All" ? "" : st);
        setPage(1);
    };

    return (
        <div className="mgr-page-root">
            {/* Top Navigation */}
            <div className="mgr-header-wrapper">
                <ManagerNavbar />
            </div>

            <main className="mgr-subpage-container">
                
                {/* Header */}
                <div className="mat-page-header">
                    <div>
                        <div className="mat-page-tag">
                            <span className="mat-tag-dot"></span>
                            <span>03 GLOBAL TRIAGE</span>
                        </div>
                        <h1 className="mat-page-title">All Support Tickets</h1>
                        <p className="mat-page-desc">Monitor, filter, and inspect enterprise support tickets across all merchant accounts.</p>
                    </div>

                    <div className="mat-total-badge">
                        <span className="mat-total-num">{total}</span>
                        <span className="mat-total-lbl">Total Records</span>
                    </div>
                </div>

                {/* Main Card Frame */}
                <div className="mat-card-frame">
                    
                    {/* Controls Toolbar */}
                    <div className="mat-toolbar">
                        
                        {/* Status Pills */}
                        <div className="mat-status-pills">
                            {STATUS_OPTIONS.map(st => {
                                const isCurrent = (!status && st === "All") || status === st;
                                return (
                                    <button
                                        key={st}
                                        className={`mat-pill-btn ${isCurrent ? 'active' : ''}`}
                                        onClick={() => handleStatusFilter(st)}
                                    >
                                        {st}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search & Category Filter */}
                        <div className="mat-filter-right">
                            <form onSubmit={handleSearchSubmit} className="mat-search-form">
                                <svg className="mat-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search tickets by keyword..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="mat-search-input"
                                />
                                <button type="submit" className="mat-search-btn">Search</button>
                            </form>

                            <select 
                                value={category} 
                                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                                className="mat-category-select"
                            >
                                <option value="">All Categories</option>
                                <option value="Billing & Invoicing">Billing &amp; Invoicing</option>
                                <option value="API & Integration">API &amp; Integration</option>
                                <option value="Onboarding & KYC">Onboarding &amp; KYC</option>
                                <option value="Transaction Disputes">Transaction Disputes</option>
                                <option value="Account & Compliance">Account &amp; Compliance</option>
                            </select>
                        </div>

                    </div>

                    {/* Tickets Table */}
                    <div className="mat-table-wrap">
                        {loading ? (
                            <div className="mat-loading-box">
                                <div className="mat-spinner"></div>
                                <p>Loading ticket records...</p>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="mat-empty-box">
                                <div className="mat-empty-icon">📂</div>
                                <h3>No Tickets Found</h3>
                                <p>No support tickets match the selected filter criteria.</p>
                            </div>
                        ) : (
                            <table className="mat-data-table">
                                <thead>
                                    <tr>
                                        <th>Ticket ID</th>
                                        <th>Title &amp; Subject</th>
                                        <th>Customer</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Assigned Agent</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.ticket_id} onClick={() => navigate(`/manager/tickets/${ticket.ticket_id}`)} className="mat-table-row">
                                            <td>
                                                <span className="mat-id-pill">#{ticket.ticket_id}</span>
                                            </td>
                                            <td className="mat-title-cell">
                                                <div className="mat-title-text">{ticket.title}</div>
                                                {ticket.escalated && !ticket.escalation_resolved && (
                                                    <span className="mat-badge-escalated">🚨 Escalated</span>
                                                )}
                                            </td>
                                            <td className="mat-customer-cell">{ticket.customer_name || "Unknown"}</td>
                                            <td>
                                                <span className={`mat-status-pill status-${(ticket.status || 'open').toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`mat-priority-pill priority-${(ticket.priority || 'medium').toLowerCase()}`}>
                                                    {ticket.priority || "Medium"}
                                                </span>
                                            </td>
                                            <td>
                                                {ticket.agent_name ? (
                                                    <div className="mat-agent-pill">
                                                        <div className="mat-agent-avatar">
                                                            {ticket.agent_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{ticket.agent_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="mat-unassigned-pill">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="mat-date-cell">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mat-pagination">
                            <button
                                className="mat-page-btn"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                ← Previous
                            </button>
                            <span className="mat-page-info">Page {page} of {totalPages}</span>
                            <button
                                className="mat-page-btn"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

export default ManagerAllTickets;
