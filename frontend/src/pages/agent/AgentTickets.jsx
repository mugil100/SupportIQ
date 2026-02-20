import React, {useState, useEffect } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import { useNavigate } from "react-router-dom";

function AgentTickets(){

    const [filter, setFilter] = useState("assigned");
    const [tickets, setTickets] = useState([]);
    const [loading,setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(()=>{
        axios.get(`/agent/agenttickets?status=${filter}`)
        .then(res=>{
            setTickets(res.data);
            setLoading(false);
        })
        .catch(()=>setLoading(false));
    },[filter]);

    function handleClick(ticket_id){
        console.log(ticket_id);
        navigate(`/agent/agenttickets/${ticket_id}`);
    }

    return(
        <>
        <AgentNavbar/>
        <div className="agent-tpage">
            <h2>My Tickets</h2>
            <div className="ticket-filters"></div>
                <button onClick={()=>{setFilter("assigned")}}>Assigned</button>
                <button onClick={()=>{setFilter("inprogress")}}>In Progress</button>
                <button onClick={()=>{setFilter("unreplied")}}>Unreplied</button>
                <button onClick={()=>{setFilter("resolved")}}>Resolved</button>
            </div>

        {loading && <p>Loading Tickets...</p>}

            <div className="ticket-table">
                    <table>
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Created At</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((t)=>(
                            <tr key={t.ticket_id}
                            onClick={()=>handleClick(t.ticket_id)}>
                                <td>{t.ticket_id}</td>
                                <td>{t.title}</td>
                                <td>{t.category}</td>
                                <td>{t.created_at}</td>
                                <td>{t.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

}

export default AgentTickets;