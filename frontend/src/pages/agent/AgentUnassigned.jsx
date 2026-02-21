import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentUnassigned.css";

export default function AgentUnassigned() {

    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        axios.get("/agent/unassigned")
            .then(res => setTickets(res.data));
    }, []);

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
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="unassigned-empty">
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
