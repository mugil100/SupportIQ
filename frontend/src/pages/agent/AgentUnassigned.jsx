import React,{useState, useEffect} from "react"
import axios from "../../api/axios"
import AgentNavbar from "./AgentNavbar"

export default function AgentUnassigned(){

    const[tickets, setTickets]= useState([]);

    useEffect(()=>{
        axios.get("/agent/unassigned")
             .then(res=>setTickets(res.data));
    },[]);


    return(
        <div>
        <AgentNavbar/>
            <h1>This is the page for the unassigned page</h1>

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
                        <tr  key={t.ticket_id}>
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
    );
}

