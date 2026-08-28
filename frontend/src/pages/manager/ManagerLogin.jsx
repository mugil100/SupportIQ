import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import "../../styles/ManagerLogin.css";

const baseAddr = import.meta.env.VITE_API_URL || "http://localhost:5000";
const addr = baseAddr.endsWith("/") ? baseAddr : `${baseAddr}/`;

function ManagerLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ identifier: "", password: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.identifier.trim()) {
            toast.error("Email or username is required");
            return;
        }
        if (!formData.password.trim()) {
            toast.error("Password is required");
            return;
        }

        setLoading(true);
        try {
            const field = formData.identifier.includes("@") ? "email" : "username";
            const response = await axios.post(addr + "login", {
                [field]: formData.identifier,
                password: formData.password,
                role: "manager"
            });

            if (response.data?.token) {
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("role", response.data.role);
                localStorage.setItem("user_id", response.data.id);
                localStorage.setItem("name", response.data.name);
                axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
            }

            toast.success("Welcome back!");
            navigate("/manager/dashboard");
        } catch (err) {
            const data = err.response?.data;
            const errorMsg = data?.error || (data?.errors && data.errors[0]?.message) || "Login failed";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ml-page">
            <div className="ml-container">
                <div className="ml-brand">
                    <div className="ml-logo">SupportIQ</div>
                    <p className="ml-subtitle">Manager Portal</p>
                </div>

                <form className="ml-form" onSubmit={handleSubmit}>
                    <h2>Sign In</h2>
                    <p className="ml-form-desc">Access your team operations dashboard</p>

                    <div className="ml-field">
                        <label htmlFor="ml-identifier">Email or Username</label>
                        <input
                            id="ml-identifier"
                            type="text"
                            name="identifier"
                            value={formData.identifier}
                            onChange={handleChange}
                            placeholder="Enter your email or username"
                            autoComplete="username"
                        />
                    </div>

                    <div className="ml-field">
                        <label htmlFor="ml-password">Password</label>
                        <div className="ml-pwd-wrapper">
                            <input
                                id="ml-password"
                                type={showPwd ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <span className="ml-pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                                {showPwd ? "🙈" : "👁️"}
                            </span>
                        </div>
                    </div>

                    <button type="submit" className="ml-submit" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="ml-footer-links">
                        <span onClick={() => navigate("/forgot-pwd")}>Forgot password?</span>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ManagerLogin;
