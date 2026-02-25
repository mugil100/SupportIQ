import React,{useState, useEffect} from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";
import { Navigate } from "react-router-dom";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentTicketView.css";

function AgentTicketView(){
    
    const {id} = useParams();
    const[ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    //fetches the ticket data
    useEffect(()=>{
        axios.get(`/agent/agenttickets/${id}`)
        .then(res=>{
            setTicket(res.data);
            setMessages(res.data?.messages || []);
        })
        .catch(err=> console.log(err));
    },[id]);

    function sendReply(){
        if(!reply.trim()) return;

        axios.post(`/agent/agenttickets/${id}/reply`,{
            message: reply
        })
        .then(()=>{
            setMessages(prev=>[
                ...prev,
                {sender_type: "Agent", message: reply}
            ]);
            setReply("");
        });
    }

    if(!ticket) return <p>Loading ticket...</p> ;


    return(
        <>
            <AgentNavbar/>
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
                {ticket.image_url &&(
                    <img src={ticket.image_url} alt="Ticket Attachment" className="ticket-image" />
                )}
            </div>
            <div className="ticket-bottom">
                <div className="chat-section">
                    <h3>Conversation</h3>
                    <div className="chat-box">
                        {messages.map((m,i)=>(
                            <div key={i}
                            className={`chat-msg ${m.sender_type}`}>
                                {m.message}
                            </div>
                        ))}
                    </div>
                    <div className="reply-box">
                        <textarea value={reply}
                        onChange={e=>setReply(e.target.value)}
                        placeholder="Type your reply"/>
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