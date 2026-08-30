import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import Footer from "../../components/Footer";
import "../../styles/AcceptInvite.css";

function AcceptInvite() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Please enter your full name");
            return;
        }

        if (!formData.username.trim() || formData.username.length < 3) {
            toast.error("Username must be at least 3 characters");
            return;
        }

        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post("/accept-invite", {
                token,
                name: formData.name.trim(),
                username: formData.username.trim(),
                password: formData.password
            });

            if (res.data?.token) {
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("role", res.data.role);
                localStorage.setItem("user_id", res.data.id);
                localStorage.setItem("name", res.data.name);
                localStorage.setItem("username", res.data.username);
                axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
            }

            toast.success("Welcome aboard! Your agent account is now active.");
            navigate("/agent/ahome", { state: { name: res.data.name } });
        } catch (err) {
            const serverMsg = err.response?.data?.error || 
                (err.response?.data?.errors && err.response?.data?.errors[0]?.msg) || 
                "Failed to accept invitation. The link may be expired or invalid.";
            toast.error(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-page">
            <header className="ai-header">
                <span className="ai-logo">SupportIQ</span>
                <span className="ai-tagline">Representative Onboarding</span>
            </header>

            <main className="ai-main">
                <div className="ai-card">
                    <div className="ai-badge">Agent Invitation</div>
                    <h1>Complete Your Profile</h1>
                    <p className="ai-subtitle">
                        You’ve been invited to join the SupportIQ support team. Set up your representative credentials to get started.
                    </p>

                    <form onSubmit={handleSubmit} className="ai-form">
                        <div className="ai-field">
                            <label htmlFor="ai-name">Full Name</label>
                            <input
                                id="ai-name"
                                type="text"
                                name="name"
                                placeholder="e.g. Alex Morgan"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="ai-field">
                            <label htmlFor="ai-username">Username</label>
                            <input
                                id="ai-username"
                                type="text"
                                name="username"
                                placeholder="e.g. alex_m"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                            <small>This will be visible on your assigned tickets.</small>
                        </div>

                        <div className="ai-field">
                            <div className="ai-label-row">
                                <label htmlFor="ai-password">Create Password</label>
                                <button
                                    type="button"
                                    className="ai-toggle-pwd"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            <input
                                id="ai-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="At least 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="ai-field">
                            <label htmlFor="ai-confirm-password">Confirm Password</label>
                            <input
                                id="ai-confirm-password"
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="ai-submit-btn"
                            disabled={loading}
                        >
                            {loading ? "Activating Account..." : "Join Support Team"}
                        </button>
                    </form>

                    <div className="ai-footer-link">
                        Already have an active account? <Link to="/agent">Log In</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default AcceptInvite;
