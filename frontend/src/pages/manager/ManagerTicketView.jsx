import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ManagerNavbar from "./ManagerNavbar";
import Footer from "../../components/Footer";
import ReassignModal from "../../components/ReassignModal";
import axios, { API_BASE_URL } from "../../api/axios";
import toast from "react-hot-toast";
import "../../styles/ManagerTicketView.css";

const cleanApiUrl = API_BASE_URL;

function ManagerTicketView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [showReassign, setShowReassign] = useState(false);
    const [submittingNote, setSubmittingNote] = useState(false);
    const [modalImage, setModalImage] = useState(null);
    const chatEndRef = useRef(null);
    const notesEndRef = useRef(null);

    const fetchTicketData = useCallback(async () => {
        try {
            const res = await axios.get(`/manager/tickets/${id}`);
            setTicket(res.data.ticket);
            setMessages(res.data.messages || []);
            setNotes(res.data.notes || []);
        } catch (_err) {
            toast.error("Failed to load ticket details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTicketData();
    }, [fetchTicketData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [notes]);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSubmittingNote(true);
        try {
            const res = await axios.post(`/manager/tickets/${id}/notes`, {
                content: newNote
            });
            const noteWithAuthor = {
                ...res.data,
                author_name: localStorage.getItem("name") || "Manager"
            };
            setNotes([...notes, noteWithAuthor]);
            setNewNote("");
            toast.success("Note added");
        } catch (_err) {
            toast.error("Failed to add note");
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleResolveEscalation = async () => {
        try {
            await axios.put(`/manager/escalations/${id}/resolve`);
            setTicket(prev => ({ ...prev, escalation_resolved: true }));
            toast.success("Escalation resolved");
        } catch (_err) {
            toast.error("Failed to resolve escalation");
        }
    };

    if (loading) {
        return (
            <div className="mgr-page-root">
                <div className="mgr-header-wrapper">
                    <ManagerNavbar />
                </div>
                <main className="mgr-subpage-container">
                    <div className="mtv-loading-card">
                        <div className="mtv-spinner"></div>
                        <p>Loading ticket workspace &amp; conversation logs...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="mgr-page-root">
                <div className="mgr-header-wrapper">
                    <ManagerNavbar />
                </div>
                <main className="mgr-subpage-container">
                    <div className="mtv-empty-card">
                        <h2>Ticket Not Found</h2>
                        <p>The requested ticket could not be located.</p>
                        <button className="mtv-btn-back" onClick={() => navigate("/manager/tickets")}>
                            ← Return to All Tickets
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="mgr-page-root">
            {/* Top Navigation */}
            <div className="mgr-header-wrapper">
                <ManagerNavbar />
            </div>

            <main className="mgr-subpage-container">
                
                {/* Back Nav */}
                <div className="mtv-top-nav">
                    <button className="mtv-btn-back" onClick={() => navigate(-1)}>
                        ← Back
                    </button>
                </div>

                {/* Header & Actions */}
                <div className="mtv-page-header">
                    <div>
                        <div className="mtv-header-badges">
                            <span className="mtv-id-pill">#{ticket.ticket_id}</span>
                            <span className={`mtv-status-pill status-${(ticket.status || 'open').toLowerCase().replace(/\s+/g, '-')}`}>
                                {ticket.status}
                            </span>
                            {ticket.priority && (
                                <span className={`mtv-priority-pill priority-${ticket.priority.toLowerCase()}`}>
                                    {ticket.priority}
                                </span>
                            )}
                            {ticket.escalated && !ticket.escalation_resolved && (
                                <span className="mtv-badge-escalated">🚨 Escalated Incident</span>
                            )}
                        </div>
                        <h1 className="mtv-page-title">{ticket.title}</h1>
                    </div>

                    <div className="mtv-header-actions">
                        {ticket.escalated && !ticket.escalation_resolved && (
                            <button className="mtv-btn-resolve" onClick={handleResolveEscalation}>
                                Resolve Escalation
                            </button>
                        )}
                        <button className="mtv-btn-reassign" onClick={() => setShowReassign(true)}>
                            Reassign Specialist ➔
                        </button>
                    </div>
                </div>

                {/* 2-Column Workstation Grid */}
                <div className="mtv-grid">
                    
                    {/* Left Column: Details & Live Chat */}
                    <div className="mtv-left-col">
                        
                        {/* Details Meta Card */}
                        <div className="mtv-card mtv-details-card">
                            <div className="mtv-meta-grid">
                                <div className="mtv-meta-item">
                                    <span className="mtv-meta-label">Customer</span>
                                    <div className="mtv-meta-val">{ticket.customer_name || "Unknown"}</div>
                                </div>
                                <div className="mtv-meta-item">
                                    <span className="mtv-meta-label">Assigned Agent</span>
                                    <div className="mtv-meta-val">
                                        {ticket.agent_name ? (
                                            <span>
                                                {ticket.agent_name}{" "}
                                                <span style={{ fontSize: "10px", fontWeight: "700", background: "#EFF6FF", color: "#2563EB", padding: "1px 6px", borderRadius: "9999px" }}>
                                                    AGT-{String(ticket.assigned_agent_id).padStart(4, '0')}
                                                </span>
                                            </span>
                                        ) : (
                                            "Unassigned"
                                        )}
                                    </div>
                                </div>
                                <div className="mtv-meta-item">
                                    <span className="mtv-meta-label">Category</span>
                                    <div className="mtv-meta-val">{ticket.category || "General"}</div>
                                </div>
                                <div className="mtv-meta-item">
                                    <span className="mtv-meta-label">Created At</span>
                                    <div className="mtv-meta-val">{new Date(ticket.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <div className="mtv-description-box">
                                <span className="mtv-desc-label">Initial Request Description</span>
                                <p className="mtv-desc-text">{ticket.description}</p>
                                {ticket.image_url && (
                                    <div className="mtv-attachment-wrap">
                                        <img 
                                            src={`${cleanApiUrl}/uploads/${ticket.image_url}?token=${localStorage.getItem("token")}`} 
                                            alt="Ticket Attachment" 
                                            className="mtv-attachment" 
                                            onClick={() => setModalImage(`${cleanApiUrl}/uploads/${ticket.image_url}?token=${localStorage.getItem("token")}`)}
                                        />
                                        <span className="mtv-attachment-hint">Click image to expand</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat History Card */}
                        <div className="mtv-card mtv-chat-card">
                            <div className="mtv-chat-header">
                                <h3 className="mtv-card-title">Live Message Stream</h3>
                                <span className="mtv-chat-count">{messages.length} messages</span>
                            </div>

                            <div className="mtv-chatbox">
                                {messages.length === 0 ? (
                                    <div className="mtv-empty-chat">
                                        <p>No messages exchanged in this ticket yet.</p>
                                    </div>
                                ) : (
                                    messages.map(m => {
                                        if (m.sender_type === "System") {
                                            return (
                                                <div key={m.message_id} className="mtv-sys-msg">
                                                    <span className="mtv-sys-icon">ℹ️</span>
                                                    <span>{m.message}</span>
                                                    <small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                </div>
                                            );
                                        }

                                        const isCustomer = m.sender_type === "Customer";
                                        return (
                                            <div key={m.message_id} className={`mtv-msg-wrapper ${isCustomer ? 'customer' : 'agent'}`}>
                                                <div className="mtv-msg-sender">
                                                    {isCustomer ? (ticket.customer_name || 'Customer') : (ticket.agent_name || 'Agent')}
                                                </div>
                                                <div className="mtv-msg-bubble">
                                                    <p>{m.message}</p>
                                                    <div className="mtv-msg-time">
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Internal Notes */}
                    <div className="mtv-right-col">
                        <div className="mtv-card mtv-notes-card">
                            <div className="mtv-notes-header">
                                <div>
                                    <h3 className="mtv-card-title">Internal Notes</h3>
                                    <p className="mtv-notes-desc">Confidential audit trail visible to managers &amp; assigned agents only.</p>
                                </div>
                            </div>

                            <div className="mtv-notes-list">
                                {notes.length === 0 ? (
                                    <div className="mtv-empty-notes">
                                        <p>No internal notes recorded for this ticket.</p>
                                    </div>
                                ) : (
                                    notes.map(note => (
                                        <div key={note.note_id} className="mtv-note-item">
                                            <div className="mtv-note-meta">
                                                <span className="mtv-note-author">{note.author_name || "Manager"}</span>
                                                <span className="mtv-note-time">
                                                    {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="mtv-note-content">{note.content}</p>
                                        </div>
                                    ))
                                )}
                                <div ref={notesEndRef} />
                            </div>

                            <form onSubmit={handleAddNote} className="mtv-note-form">
                                <textarea
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder="Add an internal managerial note..."
                                    rows="3"
                                    className="mtv-note-input"
                                />
                                <button type="submit" className="mtv-btn-add-note" disabled={submittingNote || !newNote.trim()}>
                                    {submittingNote ? "Posting..." : "Post Internal Note →"}
                                </button>
                            </form>
                        </div>
                    </div>

                </div>

            </main>

            {/* Reassign Specialist Modal */}
            {showReassign && (
                <ReassignModal
                    ticketId={ticket.ticket_id}
                    currentAgentId={ticket.assigned_agent_id}
                    onClose={() => setShowReassign(false)}
                    onSuccess={(newAgentName) => {
                        setTicket(prev => ({ ...prev, agent_name: newAgentName }));
                        setShowReassign(false);
                        fetchTicketData();
                    }}
                />
            )}

            {/* Attachment Modal */}
            {modalImage && (
                <div className="mtv-modal-overlay" onClick={() => setModalImage(null)}>
                    <div className="mtv-modal-content" onClick={e => e.stopPropagation()}>
                        <img src={modalImage} alt="Expanded Attachment" className="mtv-modal-img" />
                        <button className="mtv-modal-close" onClick={() => setModalImage(null)}>✕</button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

export default ManagerTicketView;
