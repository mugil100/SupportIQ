import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import "../../styles/AgentTickets.css";

const STATUS_CLASSES = {
    "Open": "status-open",
    "In Progress": "status-progress",
    "Resolved": "status-resolved",
    "Closed": "status-closed",
};

const PRIORITY_CLASSES = {
    "High": "priority-high",
    "Medium": "priority-medium",
    "Low": "priority-low",
};

function AgentTickets() {
    const [filter, setFilter] = useState("");
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [page, setPage] = useState(1);
    const limit = 10;
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [category, setCategory] = useState("");
    const [totalPages, setTotalPages] = useState(1);

    const navigate = useNavigate();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        setLoading(true);
        axios.get(`/agent/agenttickets`, { params: { status: filter, page, limit, search: debouncedSearch, category } })
            .then(res => {
                setTickets(res.data.tickets || []);
                setTotalPages(res.data.totalPages || 1);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [filter, page, limit, debouncedSearch, category]);

    function handleClick(ticket_id) {
        navigate(`/agent/agenttickets/${ticket_id}`);
    }

    return (
        <div className="agent-page-root">
            {/* Top Navigation */}
            <div className="agent-header-wrapper">
                <AgentNavbar />
            </div>

            <main className="agent-subpage-container">
                {/* Page Header */}
                <div className="agent-subpage-header">
                    <div className="agent-subpage-tag">
                        <span className="subpage-tag-dot"></span>
                        <span>01 WORKSTATION QUEUE</span>
                    </div>
                    <h1 className="agent-subpage-title">My Tickets</h1>
                    <p className="agent-subpage-desc">
                        Review, triage, and resolve all support cases and merchant inquiries assigned directly to you.
                    </p>
                </div>

                {/* Main Card Frame */}
                <div className="agent-card-frame">
                    
                    {/* Filter Pills & Controls Row */}
                    <div className="agent-filter-toolbar">
                        <div className="agent-pill-filters">
                            <button className={`agent-filter-pill ${filter === "" ? "active" : ""}`} onClick={() => { setFilter(""); setPage(1); }}>All</button>
                            <button className={`agent-filter-pill ${filter === "open" ? "active" : ""}`} onClick={() => { setFilter("open"); setPage(1); }}>Open</button>
                            <button className={`agent-filter-pill ${filter === "inprogress" ? "active" : ""}`} onClick={() => { setFilter("inprogress"); setPage(1); }}>In Progress</button>
                            <button className={`agent-filter-pill ${filter === "resolved" ? "active" : ""}`} onClick={() => { setFilter("resolved"); setPage(1); }}>Resolved</button>
                            <button className={`agent-filter-pill ${filter === "closed" ? "active" : ""}`} onClick={() => { setFilter("closed"); setPage(1); }}>Closed</button>
                        </div>

                        <div className="agent-search-controls">
                            <div className="agent-search-input-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder="Search by ID or title..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                />
                            </div>

                            <select 
                                className="agent-category-select"
                                value={category} 
                                onChange={e => { setCategory(e.target.value); setPage(1); }}
                            >
                                <option value="">All Categories</option>
                                <option value="Billing & Invoicing">Billing & Invoicing</option>
                                <option value="API & Integration">API & Integration</option>
                                <option value="Onboarding & KYC">Onboarding & KYC</option>
                                <option value="Transaction Disputes">Transaction Disputes</option>
                                <option value="Account & Compliance">Account & Compliance</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="agent-table-wrapper">
                        <table className="agent-data-table">
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skeleton-${idx}`}>
                                            <td colSpan="6" style={{ padding: '14px 20px' }}>
                                                <div className="skeleton skeleton-row" style={{ height: '36px', margin: 0 }}></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : tickets.length > 0 ? (
                                    tickets.map((t) => (
                                        <tr key={t.ticket_id} onClick={() => handleClick(t.ticket_id)}>
                                            <td>
                                                <span className="agent-id-badge">#{t.ticket_id}</span>
                                            </td>
                                            <td>
                                                <span className="agent-ticket-title-text">{t.title}</span>
                                            </td>
                                            <td>
                                                <span className="agent-category-badge">{t.category}</span>
                                            </td>
                                            <td>
                                                <span className={`agent-priority-chip ${PRIORITY_CLASSES[t.priority] || ''}`}>
                                                    <span className="chip-dot"></span>
                                                    {t.priority || "Normal"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`agent-status-pill ${STATUS_CLASSES[t.status] || ''}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="agent-date-text">{new Date(t.created_at).toLocaleDateString()}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="agent-empty-table-cell">
                                            <div className="empty-state-box">
                                                <span className="empty-icon">📂</span>
                                                <p>No tickets found matching the selected filter</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="agent-pagination">
                        <button 
                            className="agent-page-btn"
                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        <span className="agent-page-info">Page {page} of {totalPages}</span>
                        <button 
                            className="agent-page-btn"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                            disabled={page === totalPages || totalPages === 0}
                        >
                            Next
                        </button>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default AgentTickets;