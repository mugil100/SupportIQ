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

    const deleteMsg = async (id) => {
        await axios.delete(`ticket/message/${id}`);
        setMessages(messages.filter(m => m.message_id !== id));
    };
    const { id } = useParams();
    const [ticket, setTicket] = useState({});
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");

    useEffect(() => {
        axios.get(`ticket/${id}`).then(res => setTicket(res.data));
        axios.get(`ticket/${id}/messages`).then(res => setMessages(res.data));

        socket.auth = { token: localStorage.getItem("token") };
        socket.connect();
        socket.emit("join_ticket", id);

        socket.on("receive_message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socket.off("receive_message");
            socket.disconnect();
        };
    }, [id]);

    const sendMessage = async () => {
        if (!text.trim()) return;
        console.log("user msg :", text);

        socket.emit("send_message", {
            ticket_id: id,
            sender: "Customer",
            message: text
        });

        setText("");
    }

    return (
        <div className="vt-body">
            <TicketNavbar className="header" />
            <div className="ticket-view">
                <h1 className="t-title">{ticket.title}</h1>
                <span>Status: {ticket.status} </span>
                <div className="chatbox">
                    {messages.map((m) => (
                        <div key={m.message_id} className={m.sender_type}>
                            {m.message}
                            {m.sender_type === "Customer" && (
                                <button onClick={() => deleteMsg(m.message_id)}>❌</button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="chat-input">
                    <input type="text" value={text}
                        onChange={e => setText(e.target.value)} />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
            <Footer className="footer" />
        </div>

    );
}
export default ViewTicket;