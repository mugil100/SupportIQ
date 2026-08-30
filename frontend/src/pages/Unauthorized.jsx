import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NotFound.css";

function Unauthorized() {
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
                <div className="notfound-code" style={{ color: "#f59e0b" }}>403</div>
                <div className="notfound-divider" />
                <h1 className="notfound-title">Access Denied</h1>
                <p className="notfound-message">
                    You don't have permission to view this page.
                    Please ensure you're logged in with the correct account role.
                </p>
                <button className="notfound-btn" onClick={goHome}>
                    ← Back to My Dashboard
                </button>
            </div>
        </div>
    );
}

export default Unauthorized;
