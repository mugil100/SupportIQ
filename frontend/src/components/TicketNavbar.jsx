import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/TicketNavbar.css";
import NotificationToast from "./NotificationToast";
import { requestNotificationPermission } from "../utils/notificationHelper";
import axios from "../api/axios";

function TicketNavbar(){
    const location = useLocation();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);

    // Fetch initial unread count
    useEffect(() => {
        axios.post("/noti/filter", { state: "unread" })
            .then(res => setUnread(Array.isArray(res.data) ? res.data.length : 0))
            .catch(() => {});
    }, [location.pathname]);

    // Request browser notification permission when customer first arrives at home
    useEffect(() => {
        if (location.pathname === "/chome") {
            requestNotificationPermission();
        }
    }, [location.pathname]);

    async function logout() {
        try {
            await axios.post("/logout");
        } catch (_err) {
            // Proceed with local cleanup even if server call fails
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user_id");
            localStorage.removeItem("role");
            localStorage.removeItem("name");
            navigate("/");
        }
    }

    return(
        <div className="ticket-navbar">
            <NotificationToast onUnreadChange={setUnread} />
            <nav className="ticket-nav">
                <Link to="/chome" className="nav-item">Home</Link>
                <Link to="/raiseticket" className="nav-item">Raise a Ticket</Link>
                <Link to="/mytickets" className="nav-item">My Tickets</Link>
                <Link to="/cnoti" className="nav-item noti-link">
                    Notifications
                    {unread > 0 && <span className="cust-noti-badge">{unread > 99 ? "99+" : unread}</span>}
                </Link>
                <Link to="/help" className="nav-item">Help</Link>
                <button className="cust-logout-btn" onClick={logout}>Logout</button>
            </nav>
        </div>
    );
}
export default TicketNavbar;