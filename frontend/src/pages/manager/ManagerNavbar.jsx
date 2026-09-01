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
        return location.pathname === path || (path !== "/manager/dashboard" && location.pathname.startsWith(path)) 
            ? "mgr-nav-active" 
            : "";
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
        <header className="mgr-navbar-header">
            <NotificationToast />
            <div className="mgr-navbar-inner">
                
                {/* Brand / Logo */}
                <div className="mgr-brand-wrap" onClick={() => navigate("/manager/dashboard")}>
                    <div className="mgr-brand-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <span className="mgr-brand-name">SupportIQ</span>
                    <span className="mgr-brand-badge">MANAGER</span>
                </div>

                {/* Nav Links */}
                <nav className="mgr-nav-links">
                    <button 
                        className={`mgr-nav-link ${isActive("/manager/dashboard")}`}
                        onClick={() => navigate("/manager/dashboard")}
                    >
                        Overview
                    </button>
                    <button 
                        className={`mgr-nav-link ${isActive("/manager/agents")}`}
                        onClick={() => navigate("/manager/agents")}
                    >
                        Agent Roster
                    </button>
                    <button 
                        className={`mgr-nav-link ${isActive("/manager/escalations")}`}
                        onClick={() => navigate("/manager/escalations")}
                    >
                        Escalations
                        {escalationCount > 0 && (
                            <span className="mgr-nav-esc-count">{escalationCount > 99 ? "99+" : escalationCount}</span>
                        )}
                    </button>
                    <button 
                        className={`mgr-nav-link ${isActive("/manager/tickets")}`}
                        onClick={() => navigate("/manager/tickets")}
                    >
                        All Tickets
                    </button>
                </nav>

                {/* Right: User & Lime CTA */}
                <div className="mgr-nav-actions">
                    <div className="mgr-user-pill">
                        <div className="mgr-user-avatar">{managerName.charAt(0).toUpperCase()}</div>
                        <span className="mgr-user-name">{managerName}</span>
                    </div>

                    <button className="mgr-lime-cta-btn" onClick={logout}>
                        Sign Out
                        <span className="mgr-cta-arrow">→</span>
                    </button>
                </div>

            </div>
        </header>
    );
}

export default ManagerNavbar;
