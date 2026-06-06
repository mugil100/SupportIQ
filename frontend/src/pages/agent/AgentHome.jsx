import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import "../../styles/AgentHome.css";
import AgentNavbar from "./AgentNavbar";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import AgentStats from "../../components/AgentStats";

function AgentHome() {
    const navigate = useNavigate();
    const location = useLocation();
    const aname = location.state?.name || "Agent";
    const [stats, setStats] = useState({
        assigned: 0,
        in_progress: 0,
        resolved: 0,
        unreplied: 0
    });

    useEffect(() => {
        const fetchStats = () => {
            axios.get("agent/dashboard")
                .then(res => setStats(res.data))
                .catch(err => console.error("Error fetching stats:", err));
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // 30s polling
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <AgentNavbar />
            <div className="ahome">
                <h1>Welcome Back, {aname} </h1>
                <AgentStats stats={stats} />

                <div className="recent-activity">
                    <h1>Recent Activity</h1>
                    <div className="r-items"> Recent 1</div>
                    <div className="r-items"> Recent 2</div>
                    <div className="r-items"> Recent 3</div>
                    <div className="r-items"> Recent 4</div>
                    <div className="r-items"> Recent 5</div>

                </div>
            </div>
        </>
    );
}

export default AgentHome;

