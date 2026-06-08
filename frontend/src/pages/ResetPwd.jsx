import React, { useState } from "react";
import axios from "../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/LoginSignUp.css";

import Header from "../components/Header";
import Input from "../components/Input";
import Submit from "../components/Submit";
import pwdicon from "../assets/password.png";

function ResetPwd() {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [pwd, setPwd] = useState("");
    const [confirmpwd, setCpwd] = useState("");
    const [showpwd, setshowPwd] = useState(false);
    const [showcpwd, setshowcpwd] = useState(false);

    function handleChange(e) {
        if (e.target.name === "password") {
            setPwd(e.target.value);
        } else {
            setCpwd(e.target.value);
        }
    }

    async function handleSubmit(e) {
        if (e) e.preventDefault();

        if (!pwd || !confirmpwd) {
            alert("Both passwords are required for resetting...");
            return;
        }

        if (pwd !== confirmpwd) {
            alert("Passwords do not match");
            return;
        }

        try {
            console.log("Reset password API called");
            await axios.post("/reset-pwd", {
                password: pwd,
                token: token
            });
            alert("Password reset successful, please log in with your new password");
            navigate("/");
        } catch (error) {
            alert(error.response?.data?.error || "An error occurred");
        }
    }

    return (
        <div className="cust-login">
            <div className="container">
                <div className="brand-mark">
                    <div className="brand-mark-icon"></div>
                    <span className="brand-mark-name">SupportIQ</span>
                </div>

                <Header action="Reset Password" />

                <p className="auth-subtitle">
                    Please enter and confirm your new secure password below to complete the reset.
                </p>

                <div className="inputs">
                    <div className="password-wrapper">
                        <Input
                            icon={pwdicon}
                            type={showpwd ? "text" : "password"}
                            placeholder="New Password"
                            name="password"
                            value={pwd}
                            onChange={handleChange}
                        />
                        <span className="toggle" onClick={() => setshowPwd(!showpwd)}>
                            {showpwd ? "🤐" : "👀"}
                        </span>
                    </div>

                    <div className="password-wrapper">
                        <Input
                            icon={pwdicon}
                            type={showcpwd ? "text" : "password"}
                            placeholder="Confirm Password"
                            name="confirmpassword"
                            value={confirmpwd}
                            onChange={handleChange}
                        />
                        <span className="toggle" onClick={() => setshowcpwd(!showcpwd)}>
                            {showcpwd ? "🤐" : "👀"}
                        </span>
                    </div>
                </div>

                <Submit action="Reset Password" handleSubmit={handleSubmit} />

                <div className="auth-footer">
                    Back to <span onClick={() => navigate("/")}>Customer Login</span> or <span onClick={() => navigate("/agent")}>Agent Login</span>
                </div>
            </div>
        </div>
    );
}

export default ResetPwd;