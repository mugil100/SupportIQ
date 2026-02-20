import React,{ useEffect, useState} from "react";
import axios from "../../api/axios";
import "../../styles/AgentHome.css";
import AgentNavbar from "./AgentNavbar";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function AgentHome(){
    const navigate = useNavigate();
    const location = useLocation();
    const aname = location.state?.name || "Agent";
    const [stats, setStats] = useState({});
    // useEffect(()=>{
    //     axios.get("agent/stats")
    //         .then(res=>setStats(res.data))
    //         .catch(err=> console.log(err));
    //         },[]);

    // function getAssigned(){
    //     navigate("agent/ahome/assigned");
        
    // }
    // function getInprogress(){
    //     navigate("agent/ahome/inprogress");
        
    // }
    // function getResolved(){
    //     navigate("agent/ahome/resolved");
        
    // }
    // function getUnreplied(){
    //     navigate("agent/ahome/unreplied");
        
    // }
    return(
        <> 
            <AgentNavbar/>
            <div className="ahome">
                <h1>Welcome Back, {aname} </h1>
                <div className="stats-row">
                    <div className="a-card"
                    >
                        Assigned <br/> <b className="a-num">{stats.assigned ?? <p>not available</p> }</b>
                    </div>
                    <div className="a-card" >
                        In progress <br/> <b className="a-num">{stats.inProgress ??0}</b>
                    </div>
                    <div className="a-card" >
                        Unreplied <br/> <b className="a-num">{stats.unreplied ?? 0}</b>
                    </div>
                    <div className="a-card" >
                        Resolved <br/> <b className="a-num">{stats.resolved ?? 0}</b>
                    </div>
                </div>

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

