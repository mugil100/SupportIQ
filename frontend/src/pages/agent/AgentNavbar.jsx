import React from "react";
import "../../styles/AgentNavbar.css";
import { useNavigate, useLocation } from "react-router-dom";

function AgentNavbar(){
    const navigate = useNavigate();
    const location = useLocation();

    function isActive(path){
        return location.pathname === path ? "active-link":""; //location.pathname is the endpoint url name
    }

    function logout(){
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("role");
        localStorage.removeItem("name");
        navigate("/");
    }

    return (
        <div className="a-navbar">
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
                
                <p className={isActive("/agent/noti")}
                onClick={()=>{navigate("/agent/noti")}}>Notifications</p>
                
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