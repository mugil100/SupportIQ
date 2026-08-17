import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import { useNavigate } from "react-router-dom";
import "../../styles/AgentTickets.css";

function AgentTickets() {

    const [filter, setFilter] = useState("open");
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
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
        console.log(ticket_id);
        navigate(`/agent/agenttickets/${ticket_id}`);
    }

    return (
        <>
            <AgentNavbar />
            <div className="agent-tpage">
                <h2>My Tickets</h2>
                <div className="ticket-filters">
                    <button className={filter === "open" ? "active-filter" : ""} onClick={() => { setFilter("open"); setPage(1); }}>Open</button>
                    <button className={filter === "inprogress" ? "active-filter" : ""} onClick={() => { setFilter("inprogress"); setPage(1); }}>In Progress</button>
                    <button className={filter === "resolved" ? "active-filter" : ""} onClick={() => { setFilter("resolved"); setPage(1); }}>Resolved</button>
                    <button className={filter === "closed" ? "active-filter" : ""} onClick={() => { setFilter("closed"); setPage(1); }}>Closed</button>
                </div>

                <div className="ticket-controls" style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
                    <input 
                        type="text" 
                        placeholder="Search tickets..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, color: 'black' }}
                    />
                    <select value={category} onChange={e => {setCategory(e.target.value); setPage(1);}} style={{ padding: '8px', borderRadius: '4px', color: 'black' }}>
                        <option value="">All Categories</option>
                        <option value="Billing & Invoicing">Billing & Invoicing</option>
                        <option value="API & Integration">API & Integration</option>
                        <option value="Onboarding & KYC">Onboarding & KYC</option>
                        <option value="Transaction Disputes">Transaction Disputes</option>
                        <option value="Account & Compliance">Account & Compliance</option>
                    </select>
                </div>


                <div className="a-ticket-table">
                    <table className="ticket-table">
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Created At</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={`skeleton-${idx}`}>
                                        <td colSpan="5" style={{ padding: '8px' }}>
                                            <div className="skeleton skeleton-row" style={{ height: '32px', margin: 0 }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : tickets.length > 0 ? (
                                tickets.map((t) => (
                                    <tr key={t.ticket_id}
                                        onClick={() => handleClick(t.ticket_id)}>
                                        <td>{t.ticket_id}</td>
                                        <td>{t.title}</td>
                                        <td>{t.category}</td>
                                        <td>{t.created_at}</td>
                                        <td>{t.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No tickets found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 10px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                    <span>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} style={{ padding: '5px 10px', cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}>Next</button>
                </div>
            </div>
        </>
    );

}

export default AgentTickets;