import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";
import { Navigate } from "react-router-dom";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentTicketView.css";
import socket from "../../socket";

function AgentTicketView() {

    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [typingUser, setTypingUser] = useState(null);
    const bottomRef = useRef(null);

    //fetches the ticket data
    useEffect(() => {
        axios.get(`agent/agenttickets/${id}`).then(res => {
            console.log("loaded ticket data : ", res.data);
            setTicket(res.data.ticket);
            setMessages(res.data.messages || []);
        });
        socket.auth = { token: localStorage.getItem("token") };
        socket.connect();
        socket.on("connect", () => {
            socket.emit("join_ticket", id);
        });
        socket.on("receive_message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.emit("mark_seen", {
            ticket_id: id
        });

        socket.on("typing_start", ({ sender }) => {
            setTypingUser(sender);
        });

        socket.on("typing_stop", ({ sender }) => {
            setTypingUser(null);
        });
        socket.on("messages_seen", () => {
            setMessages(prev =>
                prev.map(m => ({ ...m, seen: true }))
            );
        });

        socket.on("ticket_reopened", () => {
            setTicket(prev => ({ ...prev, status: "Open" }));
        });

        return () => {
            socket.off("connect");
            socket.off("receive_message");
            socket.off("typing_start");
            socket.off("typing_stop");
            socket.off("messages_seen");
            socket.off("ticket_reopened");
            socket.disconnect();
        };
    }, [id]);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function sendReply() {
        // if(!reply.trim()) return;

        // axios.post(`/agent/agenttickets/${id}/reply`,{
        //     message: reply
        // })
        // .then(()=>{
        //     setMessages(prev=>[
        //         ...prev,
        //         {sender_type: "Agent", message: reply}
        //     ]);
        //     setReply("");
        // });
        if (!reply.trim()) return;

        socket.emit("send_message", {
            ticket_id: id,
            sender: "Agent",
            message: reply
        });
        setReply("");
    };

    function handleResolve() {
        if (ticket.status === "Resolved") return;  // guard: already resolved
        axios.post(`agent/agenttickets/${id}/resolved`)
            .then(() => {
                setTicket(prev => ({ ...prev, status: "Resolved" }));
            })
            .catch(err => {
                console.error("Failed to resolve ticket:", err);
                alert("Could not resolve ticket. Please try again.");
            });
    }


    if (!ticket) return <p>Loading ticket...</p>;


    return (
        <>
            <AgentNavbar />
            <div className="ticket-view-page">
                <div className="ticket-header">
                    <div>
                        <h2>Ticket #{ticket.ticket_id}</h2>
                        <small>Created: {new Date(ticket.created_at).toLocaleString()}</small>
                    </div>
                    <div className="ticket-badges">
                        <span className={`badge ${ticket.priority}`}>{ticket.priority}</span>
                        <span className={`badge status-${ticket.status}`}>{ticket.status}</span>
                    </div>
                </div>
            </div>
            <div className="ticket-details">
                <h3>{ticket.title}</h3>
                <p className="category">Category : {ticket.category}</p>
                <div className="description">{ticket.description}</div>
                {ticket.image_url && (
                    <img src={ticket.image_url} alt="Ticket Attachment" className="ticket-image" />
                )}
                <button className={"btn-resolved"} onClick={handleResolve}> Mark as Resolved</button>
            </div>
            <div className="ticket-bottom">
                <div className="chat-section">
                    <h3>Conversation</h3>
                    {typingUser && (
                        <div className="typing-indicator">
                            {typingUser} is typing...
                        </div>
                    )}
                    <div className="chat-box">
                        {messages.map((m, i) => (
                            <div key={i}
                                className={`chat-msg ${m.sender_type}1`}>
                                {m.message}

                                {m.sender_type === "Agent" && (
                                    <span className="status">
                                        {m.seen ? "✔✔ Seen" : m.delivered ? "✔ Delivered" : ""}
                                    </span>
                                )}
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    <div className="reply-box">
                        <textarea value={reply}
                            onChange={e => {
                                setReply(e.target.value);

                                socket.emit("typing_start", { //Server, I (Agent) am typing in ticket #
                                    ticket_id: id,
                                    sender: "Agent"
                                });

                                clearTimeout(window.typingTimer);
                                window.typingTimer = setTimeout(() => { //window survives re-renders
                                    socket.emit("typing_stop", {
                                        ticket_id: id,
                                        sender: "Agent"
                                    });
                                }, 1000);
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendReply();
                                }
                            }}
                            placeholder="Type your reply"

                        />

                        <button onClick={sendReply}>Send</button>
                    </div>
                </div>
                <div className="ai-panel">
                    <h3>AI Suggested Reply</h3>
                    <p className="ai-placeholder">
                        AI recommendations will appear here
                    </p>
                    <button disabled>Insert Reply</button>
                </div>
            </div>
        </>
    );
}

export default AgentTicketView;