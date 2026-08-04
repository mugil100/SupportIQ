import React from "react";
import axios from "../../api/axios";
import { useParams } from "react-router-dom";
import "../../styles/ViewTicket.css";
import { useState, useEffect, useRef } from "react";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import { useSocket } from "../../context/SocketContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

function ViewTicket() {
    const { id } = useParams();
    const socket = useSocket();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [typingUser, setTypingUser] = useState(null);
    const bottomRef = useRef(null);
    const typingTimer = useRef(null);
    const isTypingRef = useRef(false);

    // Close & Rate modal state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState("");
    const [closing, setClosing] = useState(false);

    const deleteMsg = async (msgId) => {
        await axios.delete(`ticket/message/${msgId}`);
        setMessages(messages.filter(m => m.message_id !== msgId));
    };

    useEffect(() => {
        axios.get(`ticket/${id}`).then(res => setTicket(res.data));

        // Issue 1: named handler so it can be registered for both initial connect
        // and every subsequent reconnect — avoids the one-shot else-branch problem
        const handleConnect = async () => {
            socket.emit("join_ticket", id);
            socket.emit("mark_seen", { ticket_id: id });
            // Issue 5: Refetch to get any messages missed during disconnect
            try {
                const res = await axios.get(`ticket/${id}/messages`);
                setMessages(prev => {
                    const maxServerId = res.data.length > 0 ? Math.max(...res.data.map(m => m.message_id)) : 0;
                    const existingSeen = new Set(prev.filter(m => m.seen).map(m => m.message_id));
                    
                    const merged = res.data.map(m => ({
                        ...m,
                        seen: m.seen || existingSeen.has(m.message_id)
                    }));
                    
                    const existingIds = new Set(merged.map(m => m.message_id));
                    const missing = prev.filter(m => !existingIds.has(m.message_id) && (m.isOptimistic || m.message_id > maxServerId));
                    
                    return [...merged, ...missing];
                });
            } catch (err) {
                console.error("Failed to refetch messages on reconnect:", err);
            }
        };

        axios.get(`ticket/${id}/messages`).then(res => {
            setMessages(res.data);
            
            // Issue 11: Join room only after baseline fetch completes to prevent race conditions
            if (socket.connected) {
                handleConnect();
            } else {
                // socket.once: auto-removed after firing, prevents stacking on re-mounts
                socket.once("connect", handleConnect);
            }
        });

        // Issue 2: named handlers so socket.off() removes only THIS effect's
        // listeners, not every listener registered for these events
        const onMessage        = (msg) => setMessages(prev => [...prev, msg]);
        const onTypingStart    = ({ sender }) => setTypingUser(sender);
        const onTypingStop     = () => setTypingUser(null);
        const onMessagesSeen   = (data) => {
            if (data?.seenBy === "Customer") return; // Ignore if it was another Customer tab
            setMessages(prev => prev.map(m => ({ ...m, seen: true })));
        };
        const onTicketReopened = () => setTicket(prev => prev ? { ...prev, status: "Open" } : null);
        const onTicketResolved = () => setTicket(prev => prev ? { ...prev, status: "Resolved" } : null);
        const onTicketClosed   = () => setTicket(prev => prev ? { ...prev, status: "Closed" } : null);

        // Issue 1: re-join room and re-mark-seen after every reconnect
        socket.io.on("reconnect", handleConnect);

        socket.on("receive_message", onMessage);
        socket.on("typing_start",    onTypingStart);
        socket.on("typing_stop",     onTypingStop);
        socket.on("messages_seen",   onMessagesSeen);
        socket.on("ticket_reopened", onTicketReopened);
        socket.on("ticket_resolved", onTicketResolved);
        socket.on("ticket_closed",   onTicketClosed);

        return () => {
            // Issue 2: remove only the specific handler references from this effect
            socket.off("connect",         handleConnect);
            socket.io.off("reconnect",       handleConnect);
            socket.off("receive_message", onMessage);
            socket.off("typing_start",    onTypingStart);
            socket.off("typing_stop",     onTypingStop);
            socket.off("messages_seen",   onMessagesSeen);
            socket.off("ticket_reopened", onTicketReopened);
            socket.off("ticket_resolved", onTicketResolved);
            socket.off("ticket_closed",   onTicketClosed);
            socket.emit("leave_ticket", id);
            if (typingTimer.current) clearTimeout(typingTimer.current);
        };
    }, [id, socket]);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!text.trim()) return;

        // Issue 8: Optimistic UI
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg = {
            message_id: tempId,
            sender_type: "Customer",
            message: text,
            delivered: false,
            seen: false,
            created_at: new Date().toISOString(),
            isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);
        const messageText = text;
        setText("");

        socket.emit("send_message", {
            ticket_id: id,
            sender: "Customer",
            message: messageText
        }, (ack) => {
            if (ack?.success) {
                setMessages(prev => prev.map(m =>
                    m.message_id === tempId
                        ? { ...ack.message, isOptimistic: false }
                        : m
                ));
            } else {
                setMessages(prev => prev.filter(m => m.message_id !== tempId));
                alert("Failed to send message. Please try again.");
            }
        });
    }

    const handleCloseTicket = async () => {
        if (rating === 0) return;
        setClosing(true);
        try {
            await axios.post(`ticket/${id}/close`, {
                rating,
                feedback_text: feedbackText || null
            });
            setTicket(prev => ({ ...prev, status: "Closed" }));
            setShowRatingModal(false);
        } catch (err) {
            console.error("Error closing ticket:", err);
            alert("Failed to close ticket. Please try again.");
        } finally {
            setClosing(false);
        }
    };

    const isClosed = ticket?.status === "Closed";
    const isResolved = ticket?.status === "Resolved";

    if (!ticket) return (
        <div className="vt-body">
            <TicketNavbar />
            <p className="loading">Loading ticket...</p>
            <Footer />
        </div>
    );

    return (
        <div className="vt-body">
            <TicketNavbar className="header" />
            <div className="customer-ticket-container">
                <div className="ticket-header">
                    <div>
                        <h2>Ticket #{ticket.ticket_id}</h2>
                        <small>Created: {new Date(ticket.created_at).toLocaleString()}</small>
                    </div>
                    <div className="ticket-badges">
                        {ticket.priority && <span className={`badge ${ticket.priority}`}>{ticket.priority}</span>}
                        <span className={`badge status-${ticket.status}`}>{ticket.status}</span>
                    </div>
                </div>

                <div className="ticket-details">
                    <h3>{ticket.title}</h3>
                    <p className="category">Category : {ticket.category}</p>
                    <div className="description">{ticket.description}</div>
                    {ticket.image_url && (
                        <img src={`${cleanApiUrl}/uploads/${ticket.image_url}`} alt="Ticket Attachment" className="ticket-image" />
                    )}
                </div>

                {/* Accept Resolution & Close Banner */}
                {isResolved && (
                    <div className="resolve-banner">
                        <div className="resolve-banner-content">
                            <span className="resolve-icon">✓</span>
                            <div>
                                <p className="resolve-title">This ticket has been marked as resolved</p>
                                <p className="resolve-subtitle">Are you satisfied with the resolution? You can close this ticket or continue the conversation.</p>
                            </div>
                        </div>
                        <button className="close-ticket-btn" onClick={() => setShowRatingModal(true)}>
                            Accept &amp; Close Ticket
                        </button>
                    </div>
                )}

                {/* Closed banner */}
                {isClosed && (
                    <div className="closed-banner">
                        <span className="closed-icon">🔒</span>
                        <p>This ticket has been closed. No further messages can be sent.</p>
                    </div>
                )}

                <div className="chat-section">
                    <h3>Conversation</h3>
                    {typingUser && (
                        <div className="typing-indicator">
                            {typingUser} is typing...
                        </div>
                    )}
                    <div className="chatbox">
                        {messages.map((m) => (
                            <div key={m.message_id} className={`chat-msg ${m.sender_type}`} style={{ opacity: m.isOptimistic ? 0.7 : 1 }}>

                                <span>{m.message}</span>
                                {m.sender_type === "Customer" && !m.isOptimistic && (
                                    <span className="status">
                                        {m.seen ? "✔✔ Seen" : m.delivered ? "✔ Delivered" : "Sent"}
                                    </span>
                                )}

                                {m.created_at && (
                                    <div style={{ fontSize: '0.7em', marginTop: '4px', opacity: 0.7 }}>
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}

                                {m.sender_type === "Customer" && !isClosed && !m.isOptimistic && (
                                    <button className="delete-btn" onClick={() => deleteMsg(m.message_id)}>✕</button>
                                )}

                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    {!isClosed ? (
                        <div className="chat-input">
                            <textarea
                                value={text}
                                onChange={e => {
                                    setText(e.target.value);

                                    if (!isTypingRef.current) {
                                        isTypingRef.current = true;
                                        socket.emit("typing_start", {
                                            ticket_id: id,
                                            sender: "Customer"
                                        });
                                    }

                                    if (typingTimer.current) clearTimeout(typingTimer.current);
                                    typingTimer.current = setTimeout(() => {
                                        isTypingRef.current = false;
                                        socket.emit("typing_stop", {
                                            ticket_id: id,
                                            sender: "Customer"
                                        });
                                    }, 1000);
                                }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Type your message here..."
                            />
                            <button onClick={sendMessage}>Send</button>
                        </div>
                    ) : (
                        <div className="chat-closed-msg">
                            Conversation closed — Thank you for your feedback!
                        </div>
                    )}
                </div>
            </div>

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="rating-overlay" onClick={() => setShowRatingModal(false)}>
                    <div className="rating-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowRatingModal(false)}>✕</button>
                        <div className="rating-modal-header">
                            <h2>Rate Your Experience</h2>
                            <p>How was the support you received for this ticket?</p>
                        </div>

                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={`star ${star <= (hoverRating || rating) ? "filled" : ""}`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        <p className="rating-label">
                            {rating === 1 && "Poor"}
                            {rating === 2 && "Fair"}
                            {rating === 3 && "Good"}
                            {rating === 4 && "Very Good"}
                            {rating === 5 && "Excellent"}
                        </p>

                        <textarea
                            className="feedback-textarea"
                            placeholder="Any additional feedback? (optional)"
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            rows={3}
                        />

                        <button
                            className="submit-rating-btn"
                            onClick={handleCloseTicket}
                            disabled={rating === 0 || closing}
                        >
                            {closing ? "Submitting..." : "Submit & Close Ticket"}
                        </button>
                    </div>
                </div>
            )}

            <Footer className="footer" />
        </div>
    );
}

export default ViewTicket;