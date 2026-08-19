import React, { useState, useEffect, useCallback } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentUnassigned.css";
import toast from "react-hot-toast";

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

    async function handleAssign(ticket_id){
        console.log("btn clicked", ticket_id);
        try{
            const token = localStorage.getItem("token");

            await axios.put(
                "/agent/unassigned/assign",
                { ticket_id },
                {
                    headers :{Authorization : `Bearer ${token}`
                }
                }
            );
            // Refresh ticket list after assignment
            toast.success("Ticket assigned to you!");
            fetchTickets();
        }
        catch(err){
            console.error(err);
            toast.error("Failed to assign ticket");
        }

    };

    return (
        <>
            <AgentNavbar />
            <div className="unassigned-page">
                <h2>Unassigned Tickets</h2>

                <div className="ticket-controls" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                        type="text" 
                        placeholder="Search tickets..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, color: 'black' }}
                    />
                    <select value={status} onChange={e => {setStatus(e.target.value); setPage(1);}} style={{ padding: '8px', borderRadius: '4px', color: 'black' }}>
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                    <select value={category} onChange={e => {setCategory(e.target.value); setPage(1);}} style={{ padding: '8px', borderRadius: '4px', color: 'black' }}>
                        <option value="">All Categories</option>
                        <option value="Billing & Invoicing">Billing & Invoicing</option>
                        <option value="API & Integration">API & Integration</option>
                        <option value="Onboarding & KYC">Onboarding & KYC</option>
                        <option value="Transaction Disputes">Transaction Disputes</option>
                        <option value="Account & Compliance">Account & Compliance</option>
                    </select>
                </div>

                <div className="unassigned-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Created At</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={`skeleton-${idx}`}>
                                        <td colSpan="6" style={{ padding: '8px' }}>
                                            <div className="skeleton skeleton-row" style={{ height: '32px', margin: 0 }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="unassigned-empty">
                                        No unassigned tickets 🎉
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((t) => (
                                    <tr key={t.ticket_id}>
                                        <td>{t.ticket_id}</td>
                                        <td>{t.title}</td>
                                        <td>{t.category}</td>
                                        <td>{t.created_at}</td>
                                        <td>{t.status}</td>
                                        <td>
                                            <button onClick={() => handleAssign(t.ticket_id)}>
                                                Assign to Self
                                            </button>
                                        </td>
                                    </tr>
                                ))
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
