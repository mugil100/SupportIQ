import React, { useState } from "react";
import TicketNavbar from "../../components/TicketNavbar";
import "../../styles/Custhome.css";
import { Route, useNavigate, useLocation } from "react-router-dom";
import Footer from "../../components/Footer";

function Custhome(){
    const navigate = useNavigate();
    const location = useLocation();
    const name = localStorage.getItem("name") || "User";
    console.log(name);

    return (
        <div className="cust-body">
            <TicketNavbar/>
            <div className="cust-container">
                <div className="greeting">
                    <div className="welcome">
                        <h1>Welcome, {name}</h1>
                        <h2>How can we help you today?</h2>
                    </div>

                    <div className="actions">
                        <div className="card"
                            onClick={() => navigate("/raiseticket")}
                        >
                            <h2>Raise a ticket</h2>
                            <p>Report an issue / request help</p>
                        </div>

                        <div className="card"
                            onClick={() => navigate("/mytickets")}
                        >
                            <h2>View my tickets</h2>
                            <p>View and track your existing tickets</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer/>
        </div>
    );
}

export default Custhome;