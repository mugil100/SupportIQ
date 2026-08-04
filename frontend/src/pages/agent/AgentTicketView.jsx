import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentTicketView.css";
import { useSocket } from "../../context/SocketContext";

const VARIANTS = ["professional", "empathetic", "concise"];
const VARIANT_LABELS = {
    professional: "💼 Professional",
    empathetic: "💙 Empathetic",
    concise: "⚡ Concise"
};

function AgentTicketView() {
    const { id } = useParams();
    const socket = useSocket();

    // ── Ticket / chat state ──────────────────────────────────────────────────
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [typingUser, setTypingUser] = useState(null);
    const bottomRef = useRef(null);
    const typingTimer = useRef(null);
    const isTypingRef = useRef(false);

    // ── Smart Summary state ───────────────────────────────────────
    const [summary, setSummary] = useState(null);
    const [summaryExpanded, setSummaryExpanded] = useState(true);

    // ── AI Panel state ───────────────────────────────────────────────────────
    const [showAiPanel, setShowAiPanel] = useState(true);
    const [activeVariant, setActiveVariant] = useState("professional");
    const [suggestions, setSuggestions] = useState({}); // { professional: "...", empathetic: "..." }
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamedText, setStreamedText] = useState("");
    const abortRef = useRef(null); // AbortController for in-flight fetches

    // ── Socket & ticket loading ──────────────────────────────────────────────
    useEffect(() => {
        // Issue 1: named handler so it can be registered for both initial connect
        // and every subsequent reconnect — avoids the one-shot else-branch problem
        const handleConnect = async () => {
            socket.emit("join_ticket", id);
            socket.emit("mark_seen", { ticket_id: id });
            // Issue 5: Refetch to get any messages missed during disconnect
            try {
                const res = await axios.get(`agent/agenttickets/${id}`);
                if (res.data.messages) {
                    setMessages(prev => {
                        const maxServerId = res.data.messages.length > 0 ? Math.max(...res.data.messages.map(m => m.message_id)) : 0;
                        const existingSeen = new Set(prev.filter(m => m.seen).map(m => m.message_id));
                        
                        const merged = res.data.messages.map(m => ({
                            ...m,
                            seen: m.seen || existingSeen.has(m.message_id)
                        }));
                        
                        const existingIds = new Set(merged.map(m => m.message_id));
                        const missing = prev.filter(m => !existingIds.has(m.message_id) && (m.isOptimistic || m.message_id > maxServerId));
                        
                        return [...merged, ...missing];
                    });
                }
            } catch (err) {
                console.error("Failed to refetch messages on reconnect:", err);
            }
        };

        axios.get(`agent/agenttickets/${id}`).then(res => {
            setTicket(res.data.ticket);
            setMessages(res.data.messages || []);
            // Load summary once on mount — never re-fetched on live socket events.
            // Agent sees the cached summary for this session; stale flag is set
            // server-side on new messages, so next open will regenerate.
            if (res.data.summary) setSummary(res.data.summary);

            // Issue 11: Join room only after baseline fetch completes to prevent race conditions
            if (socket.connected) {
                handleConnect();
            } else {
                // socket.once: auto-removed after firing, prevents stacking on re-mounts
                socket.once("connect", handleConnect);
            }
        });

        // Issue 2: named handlers so socket.off() removes only THIS effect's
        const onFocus = () => {
            if (socket.connected) {
                socket.emit("mark_seen", { ticket_id: id });
            }
        };
        window.addEventListener("focus", onFocus);

        const onMessage = (msg) => {
            setMessages(prev => [...prev, msg]);
            if (document.hasFocus()) {
                socket.emit("mark_seen", { ticket_id: id });
            }
        };
        const onTypingStart    = ({ sender }) => setTypingUser(sender);
        const onTypingStop     = () => setTypingUser(null);
        const onMessagesSeen   = (data) => {
            // seenBy = who just read the messages
            // If a Customer read them, mark Agent-sent messages as seen
            // If another Agent tab triggered this, ignore it
            if (!data?.seenBy || data.seenBy === "Agent") return;
            setMessages(prev => prev.map(m =>
                m.sender_type === "Agent" ? { ...m, seen: true } : m
            ));
        };
        const onTicketReopened = () => setTicket(prev => prev ? { ...prev, status: "Open" } : null);
        const onTicketResolved = () => setTicket(prev => prev ? { ...prev, status: "Resolved" } : null);

        // Issue 1: re-join room and re-mark-seen after every reconnect
        socket.io.on("reconnect", handleConnect);

        socket.on("receive_message", onMessage);
        socket.on("typing_start",    onTypingStart);
        socket.on("typing_stop",     onTypingStop);
        socket.on("messages_seen",   onMessagesSeen);
        socket.on("ticket_reopened", onTicketReopened);
        socket.on("ticket_resolved", onTicketResolved);

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
            window.removeEventListener("focus", onFocus);
            socket.emit("leave_ticket", id);
            if (typingTimer.current) clearTimeout(typingTimer.current);
        };
    }, [id, socket]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── AI generation ────────────────────────────────────────────────────────
    const generateSuggestion = useCallback(async (variantName) => {
        // Abort any in-flight stream
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setActiveVariant(variantName);
        setIsGenerating(true);
        setStreamedText("");

        try {
            const token = localStorage.getItem("token");
            const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
            const res = await fetch(
                `${apiBase}/agent/ai-suggest`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ ticket_id: id, variant: variantName }),
                    signal: controller.signal
                }
            );

            if (!res.ok) throw new Error("Request failed");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            accumulated += parsed.text;
                            setStreamedText(accumulated);
                        }
                    } catch (_) { /* skip */ }
                }
            }

            // Commit to suggestions map
            setSuggestions(prev => ({ ...prev, [variantName]: accumulated }));
            setStreamedText("");
        } catch (err) {
            if (err.name !== "AbortError") {
                console.error("AI suggestion error:", err);
            }
        } finally {
            setIsGenerating(false);
        }
    }, [id]);

    // Auto-trigger for default variant when panel opens and ticket is loaded
    const hasPanelTriggered = useRef(false);
    useEffect(() => {
        if (showAiPanel && ticket && !hasPanelTriggered.current) {
            hasPanelTriggered.current = true;
            generateSuggestion("professional");
        }
    }, [showAiPanel, ticket, generateSuggestion]);

    // ── Variant chip click logic ─────────────────────────────────────────────
    function handleVariantClick(variantName) {
        if (isGenerating && variantName !== activeVariant) return; // block mid-stream switch
        if (variantName === activeVariant && !isGenerating) {
            // Clicking active (completed) chip → insert into reply box
            insertSuggestion();
            return;
        }
        if (suggestions[variantName]) {
            // Already generated — just switch to it
            setActiveVariant(variantName);
            setStreamedText("");
        } else {
            // Generate new
            generateSuggestion(variantName);
        }
    }

    function handleRegenerate() {
        setSuggestions(prev => {
            const updated = { ...prev };
            delete updated[activeVariant];
            return updated;
        });
        generateSuggestion(activeVariant);
    }

    function insertSuggestion() {
        const text = suggestions[activeVariant] || streamedText;
        if (text) setReply(text);
    }

    // ── Display text (streamed or committed) ─────────────────────────────────
    const displayText = isGenerating && activeVariant
        ? streamedText
        : (suggestions[activeVariant] || "");

    // ── Chat actions ─────────────────────────────────────────────────────────
    function sendReply() {
        if (!reply.trim()) return;

        // Issue 8: Optimistic UI
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg = {
            message_id: tempId,
            sender_type: "Agent",
            message: reply,
            delivered: false,
            seen: false,
            created_at: new Date().toISOString(),
            isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);
        const replyText = reply;
        setReply("");

        socket.emit("send_message", { ticket_id: id, sender: "Agent", message: replyText }, (ack) => {
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

    function handleResolve() {
        if (ticket.status === "Resolved") return;
        axios.post(`agent/agenttickets/${id}/resolved`)
            .then(() => setTicket(prev => ({ ...prev, status: "Resolved" })))
            .catch(err => {
                console.error("Failed to resolve ticket:", err);
                alert("Could not resolve ticket. Please try again.");
            });
    }

    if (!ticket) return (
        <div className="ticket-loading">
            <div className="ticket-loading-spinner" />
            <span>Loading ticket...</span>
        </div>
    );

    return (
        <>
            <AgentNavbar />
            <div className="ticket-view-page">

                {/* ─── Header ─────────────────────────────────────────────── */}
                <div className="ticket-header">
                    <div>
                        <h2>Ticket #{ticket.ticket_id}</h2>
                        <small>Created: {new Date(ticket.created_at).toLocaleString()}</small>
                    </div>
                    <div className="ticket-header-right">
                        <div className="ticket-badges">
                            <span className={`badge ${ticket.priority}`}>{ticket.priority}</span>
                            <span className={`badge status-${ticket.status?.replace(" ", "").toLowerCase()}`}>
                                {ticket.status}
                            </span>
                        </div>
                        {/* AI Copilot toggle */}
                        <button
                            className={`ai-toggle-btn ${showAiPanel ? "ai-toggle-active" : ""}`}
                            onClick={() => setShowAiPanel(p => !p)}
                            title={showAiPanel ? "Hide AI Copilot" : "Show AI Copilot"}
                        >
                            ✨ AI Copilot
                        </button>
                    </div>
                </div>

                {/* ─── Details ─────────────────────────────────────── */}
                <div className="ticket-details">
                    <h3>{ticket.title}</h3>
                    <p className="category">Category : {ticket.category}</p>
                    <div className="description">{ticket.description}</div>
                    {ticket.image_url && (
                        <img src={ticket.image_url} alt="Ticket Attachment" className="ticket-image" />
                    )}
                    <button className="resolve-btn" onClick={handleResolve}>
                        Mark as Resolved
                    </button>
                </div>

                {/* ─── Smart Summary ───────────────────────────────────────── */}
                {summary && (
                    <div className="summary-card">
                        <div className="summary-header" onClick={() => setSummaryExpanded(!summaryExpanded)}>
                            <span>✨ Smart Summary</span>
                            <button>{summaryExpanded ? "▲" : "▼"}</button>
                        </div>
                        {summaryExpanded && <div className="summary-content">{summary}</div>}
                    </div>
                )}

                {/* ─── Bottom Grid ────────────────────────────────────────── */}
                <div className={`ticket-bottom ${showAiPanel ? "with-ai" : "without-ai"}`}>

                    {/* ─ Chat Section ─ */}
                    <div className="chat-section">
                        <h3>Conversation</h3>
                        {typingUser && (
                            <div className="typing-indicator">
                                {typingUser} is typing...
                            </div>
                        )}
                        <div className="chat-box">
                            {messages.map((m) => (
                                <div key={m.message_id} className={`chat-msg ${m.sender_type}1`} style={{ opacity: m.isOptimistic ? 0.7 : 1 }}>
                                    {m.message}
                                    {m.sender_type === "Agent" && !m.isOptimistic && (
                                        <span className="status">
                                            {m.seen ? "✔✔ Seen" : m.delivered ? "✔ Delivered" : ""}
                                        </span>
                                    )}
                                    {m.created_at && (
                                        <div style={{ fontSize: '0.7em', marginTop: '4px', opacity: 0.7 }}>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                        <div className="reply-box">
                            <textarea
                                value={reply}
                                onChange={e => {
                                    setReply(e.target.value);
                                    if (!isTypingRef.current) {
                                        isTypingRef.current = true;
                                        socket.emit("typing_start", { ticket_id: id, sender: "Agent" });
                                    }
                                    if (typingTimer.current) clearTimeout(typingTimer.current);
                                    typingTimer.current = setTimeout(() => {
                                        isTypingRef.current = false;
                                        socket.emit("typing_stop", { ticket_id: id, sender: "Agent" });
                                    }, 1000);
                                }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendReply();
                                    }
                                }}
                                placeholder="Type your reply…"
                            />
                            <button onClick={sendReply}>Send</button>
                        </div>
                    </div>

                    {/* ─ AI Panel ─ */}
                    <div className={`ai-panel ${showAiPanel ? "ai-panel-open" : "ai-panel-closed"}`}>
                        <div className="ai-panel-inner">

                            {/* Header row */}
                            <div className="ai-panel-header">
                                <div className="ai-panel-title">
                                    <span className="ai-sparkle">✨</span>
                                    <h3>AI Copilot</h3>
                                </div>
                                <button
                                    className="ai-regen-btn"
                                    onClick={handleRegenerate}
                                    disabled={isGenerating}
                                    title="Regenerate suggestion"
                                >
                                    {isGenerating ? (
                                        <span className="ai-spin">⟳</span>
                                    ) : "↺ Regenerate"}
                                </button>
                            </div>

                            {/* Variant chips */}
                            <div className="ai-chips">
                                {VARIANTS.map(v => (
                                    <button
                                        key={v}
                                        className={`ai-chip ${activeVariant === v ? "ai-chip-active" : ""} ${suggestions[v] && activeVariant !== v ? "ai-chip-done" : ""}`}
                                        onClick={() => handleVariantClick(v)}
                                        title={activeVariant === v && suggestions[v] ? "Click to insert this reply" : `Generate ${v} reply`}
                                    >
                                        {VARIANT_LABELS[v]}
                                        {suggestions[v] && activeVariant !== v && (
                                            <span className="ai-chip-check">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Suggestion text box */}
                            <div className="ai-suggestion-box">
                                {displayText ? (
                                    <p className="ai-suggestion-text">
                                        {displayText}
                                        {isGenerating && <span className="ai-cursor">|</span>}
                                    </p>
                                ) : (
                                    <p className="ai-placeholder">
                                        {isGenerating
                                            ? "Generating suggestion…"
                                            : "Select a tone above to generate an AI-suggested reply."}
                                    </p>
                                )}
                            </div>

                            {/* Insert Reply button */}
                            <button
                                className={`ai-insert-btn ${displayText && !isGenerating ? "ai-insert-ready" : ""}`}
                                onClick={insertSuggestion}
                                disabled={!displayText || isGenerating}
                            >
                                ↓ Insert Reply
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

export default AgentTicketView;