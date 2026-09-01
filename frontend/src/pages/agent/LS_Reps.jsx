import React, { useState } from "react";
import "../../styles/LoginSignUp.css";
import axios from "../../api/axios";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import Footer from "../../components/Footer";

function LS_Reps() {
    const navigate = useNavigate();
    const [showpwd, setshowPwd] = useState(false);
    const [formData, setFormData] = useState({
        identifier: "",
        password: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (!formData.identifier.trim()) return "Email or Username is required";
        if (!formData.password.trim()) return "Password is required";
        return null;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setSubmitting(true);
        try {
            const field = formData.identifier.includes("@") ? "email" : "username";

            const response = await axios.post("/login", {
                [field]: formData.identifier,
                password: formData.password,
                role: "agent"
            });

            if (response.data?.token) {
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("role", response.data.role);
                localStorage.setItem("user_id", response.data.id);
                localStorage.setItem("name", response.data.name);
                axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
            }

            toast.success("Welcome to Support Workstation");
            navigate("/agent/ahome", { state: { name: response.data.name } });
        } catch (error) {
            const data = error.response?.data;
            const message = data?.error || (data?.errors && data.errors[0]?.message) || "Authentication failed. Check your credentials.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page-root agent-auth-theme">
            
            {/* Top Minimal Brand Bar */}
            <header className="auth-top-bar">
                <div className="auth-brand">
                    <span className="auth-brand-name">SupportIQ</span>
                    <span className="auth-portal-tag agent-tag">SPECIALIST WORKSTATION</span>
                </div>
                
                <div className="auth-switch-links">
                    <Link to="/" className="auth-switch-btn">Customer Login →</Link>
                    <Link to="/manager" className="auth-switch-btn">Manager Portal →</Link>
                </div>
            </header>

            {/* Auth Main Card */}
            <main className="auth-card-container">
                <div className="auth-card">
                    
                    <div className="auth-card-header">
                        <div className="auth-portal-badge agent-badge">
                            <span className="auth-badge-dot"></span>
                            <span>Agent Workstation Access</span>
                        </div>
                        <h1 className="auth-title">Support Specialist Login</h1>
                        <p className="auth-subtitle">
                            Sign in to access your assigned triage queue, real-time message stream, and AI reply copilot.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        
                        <div className="auth-field-group">
                            <label>Agent Email or Username</label>
                            <input
                                type="text"
                                name="identifier"
                                placeholder="agent@supportiq.com"
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
                                    type={showpwd ? "text" : "password"}
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
                                    onClick={() => setshowPwd(!showpwd)}
                                >
                                    {showpwd ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="auth-submit-btn agent-submit-btn" 
                            disabled={submitting}
                        >
                            {submitting ? "Opening Workstation..." : "Launch Agent Workstation →"}
                        </button>
                    </form>

                    <div className="auth-card-footer">
                        <p className="auth-note-text">
                            🔒 Access restricted to authorized SupportIQ support personnel. New agent accounts are created via invitation by your operations manager.
                        </p>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default LS_Reps;
