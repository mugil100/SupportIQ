import React, { useState } from "react";
import "../../styles/LoginSignUp.css";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import toast from "react-hot-toast";

import Header from "../../components/Header";
import Input from "../../components/Input";
import Submit from "../../components/Submit";
import TabSelect from "../../components/TabSelect";

import usericon from "../../assets/person.png";
import emailicon from "../../assets/email.png";
import pwdicon from "../../assets/password.png";

const baseAddr = import.meta.env.VITE_API_URL || "http://localhost:5000";
const addr = baseAddr.endsWith('/') ? baseAddr : `${baseAddr}/`;

function LS_Reps() {
    const navigate = useNavigate();
    const [action, setAction] = useState("Sign Up");
    const [showpwd, setshowPwd] = useState(false);
    const [role, setRole] = useState("");
    const [formData, setFormData] = useState(
        {
            name: "",
            username: "",
            identifier: "",
            email: "",
            password: "",
            role: ""
        }
    );
    console.log("Website is running");

    // handle changing values in the form
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const validateForm = () => {
        if (action === "Sign Up") {
            if (!role)
                return ("Please select Agent or Manager role");
            if (!formData.name.trim())          //removes whitespace spaces, tabs, newlines
                return "Name is required";
            if (!formData.username.trim())
                return "Username required";
            if (!formData.email.trim())
                return "Email required";

            const emailregex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailregex.test(formData.email))
                return "Invalid email format";

            if (formData.password.length < 8)
                return "Password must be at least 8 characters";
        }
        if (action === "Login") {
            if (!formData.identifier.trim())
                return "Enter Email or Username";
            if (!formData.password.trim())
                return "Password is required";
        }
        return null;
    }
    const handleSubmit = async () => {
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }
        try {
            if (action === "Login") {

                const field = formData.identifier.includes("@") ? "email" : "username";

                const response = await axios.post(addr + "login", {
                    [field]: formData.identifier,
                    password: formData.password,
                    role: role
                });


                if (response.data?.token) {
                    //save token in browser storage
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    localStorage.setItem("name", response.data.name);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                    console.log(axios.defaults.headers.common["Authorization"]);
                }
                toast.success("Login successful");
                if (role === "manager") {
                    navigate("/manager/dashboard", { state: { name: response.data.name } });
                } else {
                    navigate("/agent/ahome", { state: { name: response.data.name } });
                }

            } else {
                const response = await axios.post(addr + "signup", {
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: role
                });

                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                    console.log(response.data);
                }
                toast.success("Signup success");
                if (role === "manager") {
                    navigate("/manager/dashboard", { state: { name: response.data.name } });
                } else {
                    navigate("/agent/ahome", { state: { name: response.data.name } });
                }
            }
        } catch (err) {
            const data = err.response?.data;
            const errorMsg = data?.error || (data?.errors && data.errors[0]?.message) || "Authentication failed";
            toast.error(errorMsg);
        }

        setFormData({ name: "", username: "", identifier: "", email: "", password: "" });
    };



    return (
        <div className="al-container">
            <div className="role">
                <button
                    className={role === "agent" ? "active" : ""}
                    onClick={() => setRole("agent")}
                >
                    Agent
                </button>

                <button
                    className={role === "manager" ? "active" : ""}
                    onClick={() => setRole("manager")}
                >
                    Manager
                </button>
            </div>

            <TabSelect action={action} setAction={setAction} />
            <Header action={action} />

            <div className={`inputs ${action === "Sign Up" ? "signup" : "login"}`}>
                {action === "Sign Up" && (
                    <Input
                        icon={usericon}
                        type="text"
                        placeholder="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                    />
                )}
                {action === "Sign Up" && (
                    <Input
                        icon={usericon}
                        type="text"
                        placeholder="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                    />
                )}
                {action === "Sign Up" && (
                    <Input
                        icon={emailicon}
                        type="email"
                        placeholder="Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                )}

                {action === "Login" && (
                    <Input
                        icon={usericon}
                        type="text"
                        placeholder="Email or Username"
                        name="identifier"
                        value={formData.identifier}
                        onChange={handleChange}
                    />
                )}

                <div className="password-wrapper">
                    <Input
                        icon={pwdicon}
                        type={showpwd ? "text" : "password"}
                        placeholder="Password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                    <span className="toggle"
                        onClick={() => {
                            setshowPwd(!showpwd)
                        }}>
                        {showpwd ? "🤐" : "👀"}
                    </span>
                </div>
            </div>
            <div className="forgot-password">
                Forgot password  <span onClick={() => { navigate("/forgot-pwd") }}>Click Here</span>
            </div>
            <Submit action={action} handleSubmit={handleSubmit} />
        </div>
    );
}

export default LS_Reps;



