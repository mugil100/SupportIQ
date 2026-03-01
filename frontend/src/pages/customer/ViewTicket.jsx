import React from "react";
import axios from "../../api/axios";
import { useParams } from "react-router-dom";
import "../../styles/ViewTicket.css";
import { useState } from "react";
import { useEffect } from "react";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import socket from "../../socket";


function ViewTicket() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [typingUser, setTypingUser] = useState(null);

    const deleteMsg = async (msgId) => {
        await axios.delete(`ticket/message/${msgId}`);
        setMessages(messages.filter(m => m.message_id !== msgId));
    };

    useEffect(() => {
        axios.get(`ticket/${id}`).then(res => setTicket(res.data));
        axios.get(`ticket/${id}/messages`).then(res => setMessages(res.data));

        socket.auth = { token: localStorage.getItem("token") };
        socket.connect();
        socket.emit("join_ticket", id);

        socket.on("receive_message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on("typing_start",({sender})=>{
            setTypingUser(sender);
        });

        socket.on("typing_stop",()=>{
            setTypingUser(null);
        });

        return () => {
            socket.off("receive_message");
            socket.off("typing_start");
            socket.off("typing_stop");
            socket.disconnect();
        };
    }, [id]);

    const sendMessage = async () => {
        if (!text.trim()) return;

        socket.emit("send_message", {
            ticket_id: id,
            sender: "Customer",
            message: text
        });

        setText("");
    }

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
                        <img src={`http://localhost:5000/uploads/${ticket.image_url}`} alt="Ticket Attachment" className="ticket-image" />
                    )}
                </div>

                <div className="chat-section">
                    <h3>Conversation</h3>
                    {typingUser && (
                        <div className="typing-indicator">
                            {typingUser} is typing...
                        </div>
                    )}
                    <div className="chatbox">
                        {messages.map((m) => (
                            <div key={m.message_id} className={`chat-msg ${m.sender_type}`}>
                                <span>{m.message}</span>
                                {m.sender_type === "Customer" && (
                                    <button className="delete-btn" onClick={() => deleteMsg(m.message_id)}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="chat-input">
                        <textarea
                            value={text}
                            onChange={e => {
                                setText(e.target.value);

                                socket.emit("typing_start",{
                                    ticket_id : id,
                                    sender : "Customer"
                                });

                                clearTimeout(window.typingTimer);
                                window.typingTimer = setTimeout(()=>{
                                    socket.emit("typing_stop",{
                                        ticket_id : id,
                                        sender : "Customer"
                                    });
                                },1000);
                            }}
                            placeholder="Type your message here..."
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            </div>
            <Footer className="footer" />
        </div>
    );
}

export default ViewTicket;