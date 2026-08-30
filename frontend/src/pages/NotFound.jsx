import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NotFound.css";

function NotFound() {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    function goHome() {
        if (!token) {
            navigate("/");
            return;
        }
        if (role === "agent") navigate("/agent/ahome");
        else if (role === "manager") navigate("/manager/dashboard");
        else navigate("/chome");
    }

    return (
        <div className="notfound-page">
            <div className="notfound-card">
                <div className="notfound-code">404</div>
                <div className="notfound-divider" />
                <h1 className="notfound-title">Page Not Found</h1>
                <p className="notfound-message">
                    The route you're looking for doesn't exist or may have been moved.
                </p>
                <button className="notfound-btn" onClick={goHome}>
                    ← Back to Home
                </button>
            </div>
        </div>
    );
}

export default NotFound;
