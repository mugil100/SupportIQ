import {React, useState} from "react";
import axios from "../api/axios";
import {useParams, useNavigate} from "react-router-dom";

function ResetPwd(){
    
    const {token} = useParams();
    const navigate = useNavigate();
    const [pwd, setPwd] = useState("");
    const [confirmpwd, setCpwd] = useState(""); 

    async function handleChange(e){

        if(e.target.name === "password"){
            setPwd(e.target.value);
            console.log(pwd);
        }
        else{
            setCpwd(e.target.value);
            console.log(confirmpwd);
        }
    }

    async function handleSubmit(e){
        e.preventDefault();
        if(!pwd || !confirmpwd){
            alert("Both passwords are required for resetting...");
            return;
        }

        if(pwd != confirmpwd){
            alert("Passwords doesnt match");
            return;
        } 

        try{
            console.log("api is hit");
            await axios.post("/reset-pwd", {
                password: pwd,
                token: token 
            });
            
        }
        catch(error){
            alert(error.response?.data?.error);
            return;
        }
        alert("Password reset successful");
        navigate("/");
    }

    return (
        <div>
            <h1>Reset Password</h1>

            <form action="">
                <p>New Password</p>
                <input type="password" id="" name = "password" onChange = {handleChange} />

                <p>Confirm password</p>
                <input type="password" id="" name = "confirmpassword" onChange = {handleChange}/>
                
            </form>
            <button type="submit" onClick={handleSubmit}>Submit</button>
        </div>
    );
}

export default ResetPwd;