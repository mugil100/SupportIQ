import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentUnassigned.css";

export default function AgentUnassigned() {

    const [tickets, setTickets] = useState([]);
    const [showBtn, setShowBtn] = useState(false);

    useEffect(() => {
        axios.get("/agent/unassigned")
            .then(res => setTickets(res.data));
    }, []);

    const handleMouse = (e) =>{
        if(e.nativeEvent.offsetY < 50){
            setShowBtn(true);
        }
        else{
            setShowBtn(false);
        }
    };

    async function handleAssign(ticket_id){
        console.log("btn clicked", ticket_id);
        try{
            const token = localStorage.getItem("token");

            const res = await axios.put(
                "/agent/unassigned/assign",
                { ticket_id },
                {
                    headers :{Authorization : `Bearer ${token}`
                }
                }
            );
            // Refresh ticket list after assignment
            const updated = await axios.get("/agent/unassigned");
            setTickets(updated.data);
        }
        catch(err){
            console.error(err);
        }

    };

    return (
        <>
            <AgentNavbar />
            <div className="unassigned-page">
                <h2>Unassigned Tickets</h2>

                <div className="unassigned-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Created At</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="unassigned-empty">
                                        No unassigned tickets 🎉
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((t) => (
                                    <tr key={t.ticket_id}>
                                        <td>{t.ticket_id}</td>
                                        <td>{t.title}</td>
                                        <td>{t.category}</td>
                                        <td>{t.created_at}</td>
                                        <td>{t.status}</td>
                                        <td>
                                            <button onClick={() => handleAssign(t.ticket_id)}>
                                                Assign to Self
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
