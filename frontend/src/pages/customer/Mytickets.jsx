import React,{useState, useEffect, use} from "react";
import "../../styles/Tickets.css";
import axios from "../../api/axios";
import TicketNavbar from "../../components/TicketNavbar";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";

function Mytickets(){

    const [tickets, setTickets] = useState([]);
    const navigate = useNavigate();

    useEffect(()=>{
        axios.get("mytickets")
        .then(res=>setTickets(res.data))
        .catch(err=>console.error(err));
    }, []);

    return(
        <div className="mytick-container">
            <TicketNavbar/>
            <div className="tickets-page">
                <h2>My Tickets page</h2>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody>
                        {tickets.map(t=>(
                            <tr key={t.ticket_id}
                            onClick={()=>navigate(`/ticket/${t.ticket_id}`)}
                            >
                                <td>{t.ticket_id}</td>
                                <td>{t.title}</td>
                                <td>{t.category}</td>
                                <td className={t.priority}>{t.priority}</td>
                                <td>{t.status}</td>
                                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
        <Footer/>
        </div>
);
}

export default Mytickets; 