import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ManagerNavbar from "./ManagerNavbar";
import ReassignModal from "../../components/ReassignModal";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import "../../styles/ManagerTicketView.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

function ManagerTicketView() {
    const { id } = useParams();
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

    const fetchTicketData = async () => {
        try {
            const res = await axios.get(`/manager/tickets/${id}`);
            setTicket(res.data.ticket);
            setMessages(res.data.messages);
            setNotes(res.data.notes);
        } catch (err) {
            toast.error("Failed to load ticket details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketData();
    }, [id]);

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
            // The API returns the raw inserted note; we need to append the author name locally for immediate display
            const noteWithAuthor = {
                ...res.data,
                author_name: localStorage.getItem("name") || "Manager"
            };
            setNotes([...notes, noteWithAuthor]);
            setNewNote("");
            toast.success("Note added");
        } catch (err) {
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
        } catch (err) {
            toast.error("Failed to resolve escalation");
        }
    };

    if (loading) {
        return (
            <div className="manager-layout">
                <ManagerNavbar />
                <div className="mtv-container">
                    <div className="mtv-loading">Loading ticket details...</div>
                </div>
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="manager-layout">
            <ManagerNavbar />
            <div className="mtv-container">
                
                {/* Header & Meta */}
                <div className="mtv-header">
                    <div className="mtv-header-left">
                        <h1>Ticket #{ticket.ticket_id}</h1>
                        <span className={`status-badge status-${ticket.status}`}>{ticket.status}</span>
                        {ticket.priority && <span className={`badge ${ticket.priority}`}>{ticket.priority}</span>}
                        {ticket.escalated && !ticket.escalation_resolved && (
                            <span className="mtv-badge-escalated">Escalated</span>
                        )}
                    </div>
                    <div className="mtv-header-right">
                        {ticket.escalated && !ticket.escalation_resolved && (
                            <button className="mtv-btn-resolve" onClick={handleResolveEscalation}>
                                Resolve Escalation
                            </button>
                        )}
                        <button className="mtv-btn-reassign" onClick={() => setShowReassign(true)}>
                            Reassign Ticket
                        </button>
                    </div>
                </div>

                <div className="mtv-grid">
                    {/* Left Column: Details & Chat */}
                    <div className="mtv-left-col">
                        <div className="mtv-card mtv-details-card">
                            <div className="mtv-meta-grid">
                                <div className="mtv-meta-item">
                                    <label>Customer</label>
                                    <div>{ticket.customer_name}</div>
                                </div>
                                <div className="mtv-meta-item">
                                    <label>Assigned Agent</label>
                                    <div>{ticket.agent_name || "Unassigned"}</div>
                                </div>
                                <div className="mtv-meta-item">
                                    <label>Category</label>
                                    <div>{ticket.category}</div>
                                </div>
                                <div className="mtv-meta-item">
                                    <label>Created At</label>
                                    <div>{new Date(ticket.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="mtv-description">
                                <h3>{ticket.title}</h3>
                                <p>{ticket.description}</p>
                                {ticket.image_url && (
                                    <img 
                                        src={`${cleanApiUrl}/uploads/${ticket.image_url}?token=${localStorage.getItem("token")}`} 
                                        alt="Ticket Attachment" 
                                        className="mtv-attachment" 
                                        onClick={() => setModalImage(`${cleanApiUrl}/uploads/${ticket.image_url}?token=${localStorage.getItem("token")}`)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mtv-card mtv-chat-card">
                            <h3>Conversation History</h3>
                            <div className="mtv-chatbox">
                                {messages.length === 0 ? (
                                    <p className="mtv-empty-msg">No messages yet.</p>
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
                                                <div className="mtv-msg-sender">{isCustomer ? ticket.customer_name : (ticket.agent_name || 'Agent')}</div>
                                                <div className="mtv-msg-bubble">
                                                    {m.message}
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
                            <h3>Internal Notes</h3>
                            <p className="mtv-notes-desc">Visible only to managers and agents.</p>
                            
                            <div className="mtv-notes-list">
                                {notes.length === 0 ? (
                                    <p className="mtv-empty-msg">No internal notes yet.</p>
                                ) : (
                                    notes.map(note => (
                                        <div key={note.note_id} className="mtv-note">
                                            <div className="mtv-note-header">
                                                <span className="mtv-note-author">{note.author_name}</span>
                                                <span className="mtv-note-time">{new Date(note.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="mtv-note-body">{note.content}</div>
                                        </div>
                                    ))
                                )}
                                <div ref={notesEndRef} />
                            </div>

                            <form onSubmit={handleAddNote} className="mtv-notes-form">
                                <textarea
                                    placeholder="Add an internal note..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    rows="3"
                                ></textarea>
                                <button type="submit" disabled={!newNote.trim() || submittingNote}>
                                    {submittingNote ? "Saving..." : "Add Note"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

            </div>

            {showReassign && (
                <ReassignModal
                    ticketId={ticket.ticket_id}
                    currentAgentId={ticket.assigned_agent_id}
                    onClose={() => setShowReassign(false)}
                    onReassign={fetchTicketData}
                />
            )}

            {modalImage && (
                <div className="image-modal-overlay" onClick={() => setModalImage(null)}>
                    <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn image-modal-close" onClick={() => setModalImage(null)}>✕</button>
                        <img src={modalImage} alt="Fullscreen Attachment" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagerTicketView;
