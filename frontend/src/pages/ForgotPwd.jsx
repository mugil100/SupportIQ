import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import "../styles/LoginSignUp.css";

import Header from "../components/Header";
import Input from "../components/Input";
import Submit from "../components/Submit";
import emailicon from "../assets/email.png";

function ForgotPwd() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");

    const handlechange = (e) => {
        setEmail(e.target.value);
    }

    function validateEmail(email) {
        const emailregex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailregex.test(email);
    }

    async function handleSubmit() {
        let valid = validateEmail(email);

        if (!valid) {
            alert("Invalid Email Address");
            return;
        }

        try {
            const response = await axios.post("/forgot-pwd", { email });
            console.log("Forgot password response:", response.data);
            alert(response.data?.message || "Check your email");
            setEmail("");
        } catch (error) {
            console.error("Forgot password error:", error);
            alert(error.response?.data?.error || "An error occurred. Check console for details.");
        }
    }

    return (
        <div className="cust-login">
            <div className="container">
                <div className="brand-mark">
                    <div className="brand-mark-icon"></div>
                    <span className="brand-mark-name">SupportIQ</span>
                </div>

                <Header action="Forgot Password" />
                
                <p className="auth-subtitle">
                    Enter your registered email address to receive a secure link to reset your password.
                </p>

                <div className="inputs">
                    <Input
                        icon={emailicon}
                        type="email"
                        placeholder="Email ID"
                        name="email"
                        value={email}
                        onChange={handlechange}
                    />
                </div>

                <Submit action="Send Link" handleSubmit={handleSubmit} />

                <div className="auth-footer">
                    Back to <span onClick={() => navigate("/")}>Customer Login</span> or <span onClick={() => navigate("/agent")}>Agent Login</span>
                </div>
            </div>
        </div>
    );
}

export default ForgotPwd;