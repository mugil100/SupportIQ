import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import Footer from "../../components/Footer";
import "../../styles/ManagerLogin.css";

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
            const response = await axios.post("/login", {
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

            toast.success("Welcome to Executive Operations!");
            navigate("/manager/dashboard");
        } catch (err) {
            const data = err.response?.data;
            const errorMsg = data?.error || (data?.errors && data.errors[0]?.message) || "Authentication failed";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-root mgr-auth-theme">
            
            {/* Top Minimal Brand Bar */}
            <header className="auth-top-bar">
                <div className="auth-brand">
                    <span className="auth-brand-name">SupportIQ</span>
                    <span className="auth-portal-tag mgr-tag">EXECUTIVE COMMAND</span>
                </div>
                
                <div className="auth-switch-links">
                    <Link to="/" className="auth-switch-btn">Customer Portal →</Link>
                    <Link to="/agent" className="auth-switch-btn">Agent Portal →</Link>
                </div>
            </header>

            {/* Auth Main Card */}
            <main className="auth-card-container">
                <div className="auth-card">
                    
                    <div className="auth-card-header">
                        <div className="auth-portal-badge mgr-badge">
                            <span className="auth-badge-dot"></span>
                            <span>Executive Operations Command</span>
                        </div>
                        <h1 className="auth-title">Manager Command Sign In</h1>
                        <p className="auth-subtitle">
                            Access live team telemetry, SLA monitoring, agent workloads, and escalation queues.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        
                        <div className="auth-field-group">
                            <label>Manager Email or Username</label>
                            <input
                                type="text"
                                name="identifier"
                                placeholder="manager@supportiq.com"
                                value={formData.identifier}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="auth-field-group">
                            <div className="auth-label-row">
                                <label>Password</label>
                                <Link to="/reset-password" className="auth-forgot-link">Forgot password?</Link>
                            </div>
                            <div className="auth-pwd-wrap">
                                <input
                                    type={showPwd ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="auth-pwd-toggle"
                                    onClick={() => setShowPwd(!showPwd)}
                                >
                                    {showPwd ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="auth-submit-btn mgr-submit-btn" 
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Sign In to Command Center →"}
                        </button>
                    </form>

                    <div className="auth-card-footer">
                        <p className="auth-note-text">
                            🛡️ Protected executive endpoint. All administrative actions and session events are logged for compliance and security auditing.
                        </p>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default ManagerLogin;
