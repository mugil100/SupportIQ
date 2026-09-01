import React, { useState } from "react";
import "../../styles/LoginSignUp.css";
import axios from "../../api/axios";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import Footer from "../../components/Footer";

function LS_cust() {
    const navigate = useNavigate();
    const [action, setAction] = useState("Login");
    const [showpwd, setshowPwd] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        identifier: "",
        email: "",
        password: "",
        role: "customer"
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (action === "Sign Up") {
            if (!formData.name.trim()) return "Full name is required";
            if (!formData.username.trim()) return "Username is required";
            if (!formData.email.trim()) return "Email address is required";

            const emailregex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailregex.test(formData.email)) return "Invalid email address format";
            if (formData.password.length < 6) return "Password must be at least 6 characters";
        }
        if (action === "Login") {
            if (!formData.identifier.trim()) return "Enter your Email or Username";
            if (!formData.password.trim()) return "Password is required";
        }
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
            if (action === "Login") {
                const field = formData.identifier.includes("@") ? "email" : "username";

                const response = await axios.post("/login", {
                    [field]: formData.identifier,
                    password: formData.password,
                    role: "customer"
                });

                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    localStorage.setItem("name", response.data.name);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                }

                toast.success("Welcome back!");
                navigate("/chome", { state: { name: response.data.name } });
            } else {
                const response = await axios.post("/signup", {
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: "customer"
                });

                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    localStorage.setItem("name", response.data.name);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                }

                toast.success("Account created successfully!");
                navigate("/chome", { state: { name: response.data.name } });
            }
        } catch (error) {
            const data = error.response?.data;
            const message = data?.error || (data?.errors && data.errors[0]?.message) || "Authentication failed";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page-root cust-auth-theme">
            
            {/* Top Minimal Brand Bar */}
            <header className="auth-top-bar">
                <div className="auth-brand">
                    <span className="auth-brand-name">SupportIQ</span>
                    <span className="auth-portal-tag cust-tag">MERCHANT &amp; CUSTOMER PORTAL</span>
                </div>
                
                <div className="auth-switch-links">
                    <Link to="/agent" className="auth-switch-btn">Agent Login →</Link>
                    <Link to="/manager" className="auth-switch-btn">Manager Portal →</Link>
                </div>
            </header>

            {/* Auth Main Card */}
            <main className="auth-card-container">
                <div className="auth-card">
                    
                    <div className="auth-card-header">
                        <div className="auth-portal-badge cust-badge">
                            <span className="auth-badge-dot"></span>
                            <span>Customer &amp; Merchant Access</span>
                        </div>
                        <h1 className="auth-title">
                            {action === "Login" ? "Sign in to SupportIQ" : "Create Merchant Account"}
                        </h1>
                        <p className="auth-subtitle">
                            {action === "Login" 
                                ? "Access your support tickets, view live resolution updates, and chat with specialists." 
                                : "Join the SupportIQ platform to raise and track enterprise support tickets."}
                        </p>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="auth-tabs">
                        <button 
                            type="button"
                            className={`auth-tab-btn ${action === "Login" ? "active" : ""}`}
                            onClick={() => setAction("Login")}
                        >
                            Sign In
                        </button>
                        <button 
                            type="button"
                            className={`auth-tab-btn ${action === "Sign Up" ? "active" : ""}`}
                            onClick={() => setAction("Sign Up")}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        
                        {action === "Sign Up" && (
                            <>
                                <div className="auth-field-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="e.g. Alex Morgan"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="auth-field-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="e.g. alexmorgan"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="auth-field-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="alex@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {action === "Login" && (
                            <div className="auth-field-group">
                                <label>Email or Username</label>
                                <input
                                    type="text"
                                    name="identifier"
                                    placeholder="Enter your email or username"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        )}

                        <div className="auth-field-group">
                            <div className="auth-label-row">
                                <label>Password</label>
                                {action === "Login" && (
                                    <Link to="/reset-password" className="auth-forgot-link">Forgot password?</Link>
                                )}
                            </div>
                            <div className="auth-pwd-wrap">
                                <input
                                    type={showpwd ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete={action === "Login" ? "current-password" : "new-password"}
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
                            className="auth-submit-btn cust-submit-btn" 
                            disabled={submitting}
                        >
                            {submitting 
                                ? "Authenticating..." 
                                : action === "Login" ? "Sign In to Portal →" : "Create Account →"}
                        </button>
                    </form>

                    <div className="auth-card-footer">
                        <p>
                            {action === "Login" ? "Need an account? " : "Already registered? "}
                            <span 
                                className="auth-toggle-link" 
                                onClick={() => setAction(action === "Login" ? "Sign Up" : "Login")}
                            >
                                {action === "Login" ? "Create one now" : "Sign in here"}
                            </span>
                        </p>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default LS_cust;
