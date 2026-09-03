import React, { useState, useEffect } from "react";
import "../../styles/AgentNavbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationToast from "../../components/NotificationToast";
import { requestNotificationPermission } from "../../utils/notificationHelper";
import axios from "../../api/axios";

function AgentNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);

    function isActive(path) {
        if (path === "/agent/ahome" && (location.pathname === "/agent/ahome" || location.pathname === "/agent/home")) {
            return "active-pill";
        }
        return location.pathname.startsWith(path) ? "active-pill" : "";
    }

    // Fetch initial unread count
    useEffect(() => {
        axios.get("agent/dashboard")
            .then(res => setUnread(res.data.unread || 0))
            .catch(() => {});
    }, [location.pathname]);

    // Request browser notification permission on first visit
    useEffect(() => {
        if (location.pathname === "/agent/ahome") {
            requestNotificationPermission();
        }
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
            navigate("/");
        }
    }

    const name = localStorage.getItem("name") || "Agent";
    const userId = localStorage.getItem("user_id") || "1";
    const agentIdFormatted = `AGT-${String(userId).padStart(4, '0')}`;

    return (
        <header className="agent-top-navbar">
            <NotificationToast onUnreadChange={setUnread} />
            
            {/* Left: Sleek Minimalist Brand */}
            <div className="agent-nav-left" onClick={() => navigate("/agent/ahome")}>
                <div className="agent-nav-menu-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span className="agent-nav-brand-text">SUPPORTIQ</span>
            </div>

            {/* Center: Frosted Glass Capsule */}
            <nav className="agent-nav-center-capsule">
                <button 
                    className={`agent-nav-tab ${isActive("/agent/ahome")}`}
                    onClick={() => navigate("/agent/ahome")}
                >
                    Home
                </button>
                <button 
                    className={`agent-nav-tab ${isActive("/agent/agenttickets")}`}
                    onClick={() => navigate("/agent/agenttickets")}
                >
                    My Tickets
                </button>
                <button 
                    className={`agent-nav-tab ${isActive("/agent/unassigned")}`}
                    onClick={() => navigate("/agent/unassigned")}
                >
                    Unassigned
                </button>
                <button 
                    className={`agent-nav-tab ${isActive("/agent/noti")}`}
                    onClick={() => navigate("/agent/noti")}
                >
                    Notifications
                    {unread > 0 && <span className="agent-tab-badge">{unread > 99 ? "99+" : unread}</span>}
                </button>
                <button 
                    className={`agent-nav-tab ${isActive("/agent/performance")}`}
                    onClick={() => navigate("/agent/performance")}
                >
                    Performance
                </button>
            </nav>

            {/* Right: Agent ID Badge + Sign Out */}
            <div className="agent-nav-right">
                <div className="agent-nav-user-badge" title={`Logged in as ${name} (${agentIdFormatted})`}>
                    <span className="agent-badge-avatar">{name.charAt(0).toUpperCase()}</span>
                    <div className="agent-badge-details">
                        <span className="agent-badge-name">{name}</span>
                        <span className="agent-badge-id">{agentIdFormatted}</span>
                    </div>
                </div>
                <button className="agent-nav-btn-white" onClick={logout}>
                    Sign Out
                    <span className="nav-btn-icon">↗</span>
                </button>
            </div>
        </header>
    );
}

export default AgentNavbar;