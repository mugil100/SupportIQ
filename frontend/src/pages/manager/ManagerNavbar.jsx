import React from "react";
import "../../styles/ManagerNavbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../api/axios";

function ManagerNavbar() {
    const navigate = useNavigate();
    const location = useLocation();

    function isActive(path) {
        return location.pathname.startsWith(path) ? "active-link" : "";
    }

    async function logout() {
        try {
            await axios.post("/logout");
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user_id");
            localStorage.removeItem("role");
            localStorage.removeItem("name");
            navigate("/");
        }
    }

    return (
        <div className="m-navbar">
            <div className="header">
                <p className="logo" onClick={() => navigate("/manager/dashboard")}>SupportIQ</p>
                <p>Manager Portal</p>
            </div>

            <div className="m-nav-items">
                <p className={isActive("/manager/dashboard")} onClick={() => navigate("/manager/dashboard")}>Dashboard</p>
                <p className={isActive("/manager/agents")} onClick={() => navigate("/manager/agents")}>Agents</p>
                <p className={isActive("/manager/escalations")} onClick={() => navigate("/manager/escalations")}>Escalations</p>
                <p className={isActive("/manager/tickets")} onClick={() => navigate("/manager/tickets")}>All Tickets</p>
            </div>

            <div className="m-logout">
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
}

export default ManagerNavbar;
