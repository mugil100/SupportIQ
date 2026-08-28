import React, { useState, useEffect } from "react";
import "../../styles/ManagerNavbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationToast from "../../components/NotificationToast";
import axios from "../../api/axios";

function ManagerNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [escalationCount, setEscalationCount] = useState(0);
    const managerName = localStorage.getItem("name") || "Manager";

    function isActive(path) {
        return location.pathname.startsWith(path) ? "active-link" : "";
    }

    // Fetch escalation count for badge
    useEffect(() => {
        axios.get("/manager/dashboard/stats")
            .then(res => setEscalationCount(res.data.escalated || 0))
            .catch(() => {});
    }, [location.pathname]);

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
            navigate("/manager");
        }
    }

    return (
        <div className="m-navbar">
            <NotificationToast />
            <div className="header">
                <p className="logo" onClick={() => navigate("/manager/dashboard")}>SupportIQ</p>
                <p className="m-portal-label">Manager Portal</p>
            </div>

            <div className="m-user-info">
                <div className="m-user-avatar">{managerName.charAt(0).toUpperCase()}</div>
                <p className="m-user-name">{managerName}</p>
            </div>

            <div className="m-nav-items">
                <p className={isActive("/manager/dashboard")} onClick={() => navigate("/manager/dashboard")}>
                    <span className="m-nav-icon">📊</span> Dashboard
                </p>
                <p className={isActive("/manager/agents")} onClick={() => navigate("/manager/agents")}>
                    <span className="m-nav-icon">👥</span> Agents
                </p>
                <p className={`m-nav-escalation ${isActive("/manager/escalations")}`} onClick={() => navigate("/manager/escalations")}>
                    <span className="m-nav-icon">🚨</span> Escalations
                    {escalationCount > 0 && <span className="m-esc-badge">{escalationCount > 99 ? "99+" : escalationCount}</span>}
                </p>
                <p className={isActive("/manager/tickets")} onClick={() => navigate("/manager/tickets")}>
                    <span className="m-nav-icon">🎫</span> All Tickets
                </p>
            </div>

            <div className="m-logout">
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
}

export default ManagerNavbar;
