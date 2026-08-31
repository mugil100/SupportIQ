import React,{useState, useEffect} from "react";
import "../../styles/Tickets.css";
import axios from "../../api/axios";
import TicketNavbar from "../../components/TicketNavbar";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";

function Mytickets(){

    const [tickets, setTickets] = useState([]);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(()=>{
        setLoading(true);
        axios.get("mytickets", { params: { page, limit, search: debouncedSearch, status, category } })
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

    return(
        <div className="mytick-container">
            <TicketNavbar />
            <main className="cust-main-canvas">
                <div className="tickets-page">
                    <div className="tickets-page-header">
                        <div>
                            <span className="tickets-page-tag">Merchant Support</span>
                            <h2>My Tickets</h2>
                        </div>
                    </div>

                    {/* ─── Filters row ─── */}
                    <div className="ticket-controls">
                        <input 
                            type="text" 
                            placeholder="Search tickets..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                        <select value={status} onChange={e => {setStatus(e.target.value); setPage(1);}}>
                            <option value="">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <select value={category} onChange={e => {setCategory(e.target.value); setPage(1);}}>
                            <option value="">All Categories</option>
                            <option value="Billing & Invoicing">Billing & Invoicing</option>
                            <option value="API & Integration">API & Integration</option>
                            <option value="Onboarding & KYC">Onboarding & KYC</option>
                            <option value="Transaction Disputes">Transaction Disputes</option>
                            <option value="Account & Compliance">Account & Compliance</option>
                        </select>
                    </div>

                    <div className="tickets-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skeleton-${idx}`}>
                                            <td colSpan="6" style={{ padding: '12px' }}>
                                                <div className="skeleton skeleton-row" style={{ height: '32px', margin: 0 }}></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : tickets.length > 0 ? (
                                    tickets.map(t=>(
                                        <tr key={t.ticket_id} onClick={()=>navigate(`/ticket/${t.ticket_id}`)}>
                                            <td>#{t.ticket_id}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--cust-charcoal, #18181B)' }}>{t.title}</td>
                                            <td>{t.category}</td>
                                            <td className={t.priority}>{t.priority}</td>
                                            <td>{t.status}</td>
                                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--cust-text-muted, #8C8C94)' }}>
                                            No tickets found matching the selected filter
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                        <span>Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>Next</button>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
);
}

export default Mytickets; 