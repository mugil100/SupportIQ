import React from "react";

function  TabSelect({action,setAction}){
    return (
        <div className="tab-container">
            <div
            className={action==="Login"?'tab active':'tab'}
            onClick={()=>setAction("Login")}
            >Login</div>

            <div 
            className={action==="Sign Up"?'tab active': 'tab'}
            onClick={()=>setAction("Sign Up")}
            >Sign Up</div>
        </div>
    );
}

export default TabSelect;