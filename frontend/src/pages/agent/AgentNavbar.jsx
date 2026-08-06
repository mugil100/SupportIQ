import React, { useState, useEffect } from "react";
import "../../styles/AgentNavbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationToast, { requestNotificationPermission } from "../../components/NotificationToast";
import axios from "../../api/axios";

function AgentNavbar(){
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);

    function isActive(path){
        return location.pathname === path ? "active-link":""; //location.pathname is the endpoint url name
    }

    // Fetch initial unread count
    useEffect(() => {
        axios.get("agent/dashboard")
            .then(res => setUnread(res.data.unread || 0))
            .catch(() => {});
    }, [location.pathname]); // re-fetch when navigating

    // Request browser notification permission on first visit to dashboard
    useEffect(() => {
        if (location.pathname === "/agent/ahome") {
            requestNotificationPermission();
        }
    }, [location.pathname]);

    async function logout(){
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
        <div className="a-navbar">
            <NotificationToast onUnreadChange={setUnread} />
            <div className="header">
                <p className="logo" onClick={()=>{navigate("/agent/ahome")}}>Logo</p>
                <p>Agent Dashboard Portal</p>
            </div>

            <div className="a-nav-items">

                <p className={isActive("/agent/home")}
                onClick={()=>{
                    
                    navigate("/agent/ahome")}}>Home</p>

                <p className={isActive("/agent/agenttickets")}
                onClick={()=>{navigate("/agent/agenttickets")}} >My Tickets</p>
               
                <p className={isActive("/agent/unassigned")}
                onClick={()=>{navigate("/agent/unassigned")}}>Unassigned</p>
                
                <p className={`noti-nav-link ${isActive("/agent/noti")}`}
                onClick={()=>{navigate("/agent/noti")}}>
                    Notifications
                    {unread > 0 && <span className="noti-badge-count">{unread > 99 ? "99+" : unread}</span>}
                </p>
                
                <p className={isActive("/agent/performance")}
                onClick={()=>{navigate("/agent/performance")}}>Performance</p>
                
                <p className={isActive("/agent/help")}
                onClick={()=>{navigate("/agent/help")}}>Help</p>

            </div>

            <div className="a-logout">
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
}

export default AgentNavbar;