import React, { useState, useEffect, useCallback } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import Footer from "../../components/Footer";
import "../../styles/AgentUnassigned.css";
import toast from "react-hot-toast";

const STATUS_CLASSES = {
    "Open": "status-open",
    "Assigned": "status-progress",
    "In Progress": "status-progress",
    "Resolved": "status-resolved",
    "Closed": "status-closed",
};

export default function AgentUnassigned() {
    const [tickets, setTickets] = useState([]);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchTickets = useCallback(() => {
        setLoading(true);
        axios.get("/agent/unassigned", { params: { page, limit, search: debouncedSearch, status, category } })
            .then(res => {
                setTickets(res.data.tickets || []);
                setTotalPages(res.data.totalPages || 1);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [page, limit, debouncedSearch, status, category]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    async function handleAssign(ticket_id) {
        setAssigningId(ticket_id);
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                "/agent/unassigned/assign",
                { ticket_id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Ticket assigned to you successfully!");
            fetchTickets();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to assign ticket");
        } finally {
            setAssigningId(null);
        }
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
                        <span>02 UNCLAIMED INVENTORY</span>
                    </div>
                    <h1 className="agent-subpage-title">Unassigned Tickets</h1>
                    <p className="agent-subpage-desc">
                        Pick up new incoming merchant inquiries and disputed transaction cases to begin resolution.
                    </p>
                </div>

                {/* Main Card Frame */}
                <div className="agent-card-frame">
                    
                    {/* Controls Row */}
                    <div className="agent-filter-toolbar">
                        <div className="agent-search-controls" style={{ maxWidth: '100%', width: '100%' }}>
                            <div className="agent-search-input-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder="Search unassigned tickets by ID or keyword..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                />
                            </div>

                            <select 
                                className="agent-category-select"
                                value={status} 
                                onChange={e => { setStatus(e.target.value); setPage(1); }}
                            >
                                <option value="">All Statuses</option>
                                <option value="Open">Open</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Progress">In Progress</option>
                            </select>

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
                                    <th>Created At</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
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
                                ) : tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="agent-empty-table-cell">
                                            <div className="empty-state-box">
                                                <span className="empty-icon">🎉</span>
                                                <p>All caught up! No unassigned tickets in the queue.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((t) => (
                                        <tr key={t.ticket_id}>
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
                                                <span className="agent-date-text">{new Date(t.created_at).toLocaleDateString()}</span>
                                            </td>
                                            <td>
                                                <span className={`agent-status-pill ${STATUS_CLASSES[t.status] || ''}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className="agent-claim-btn"
                                                    onClick={() => handleAssign(t.ticket_id)}
                                                    disabled={assigningId === t.ticket_id}
                                                >
                                                    {assigningId === t.ticket_id ? "Claiming..." : "Assign to Me →"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
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
