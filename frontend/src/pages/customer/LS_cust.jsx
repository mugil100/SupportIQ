import React, { useState } from "react";
import "../../styles/LoginSignUp.css";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

import Header from "../../components/Header";
import Input from "../../components/Input";
import Submit from "../../components/Submit";
import TabSelect from "../../components/TabSelect";

import usericon from "../../assets/person.png";
import emailicon from "../../assets/email.png";
import pwdicon from "../../assets/password.png";
import Footer from "../../components/Footer";

const baseAddr = import.meta.env.VITE_API_URL || "http://localhost:5000";
const addr = baseAddr.endsWith('/') ? baseAddr : `${baseAddr}/`;

function LS_cust() {
    const navigate = useNavigate();
    const [action, setAction] = useState("Sign Up");
    const [showpwd, setshowPwd] = useState(false);
    const [formData, setFormData] = useState(
        {
            name: "",
            username: "",
            identifier: "",
            email: "",
            password: "",
            role: "customer"
        }
    );
    console.log("Website is running");
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    //checks the correctness of inputs
    //username format to be checked
    const validateForm = () => {
        if (action === "Sign Up") {
            // if(!formData.username &&!formData.email &&!formData.password){
            //     return "All fields are required for Sign Up";
            // }
            if (!formData.name.trim())
                return "Name is required";
            if (!formData.username.trim())
                return "Username required";
            if (!formData.email.trim())
                return "Email required";

            const emailregex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailregex.test(formData.email))
                return "Invalid email format";

            if (formData.password.length < 6)
                return "Password must be atleast 6 characters";
        }
        if (action === "Login") {
            if (!formData.identifier.trim())
                return "Enter Email or Username";
            if (!formData.password.trim())
                return "Password is required";
        }
        // }else{
        //     if(!formData.username ||!formData.password){
        //         return"Email and Password are required for Login"
        //     }
        // }
        return null;
    }
    // const handleSubmit=()=>{
    //     const error = validateForm();
    //     if (error){
    //         alert(error);
    //         return;
    //     }

    //     if(action ==="Login"){
    //         console.log("Logging in with:", formData);
    //     }else{
    //         console.log("Signing up in with:", formData);
    //     }
    //     setFormData({username:"", email:"",password:""});
    // };
    const handleSubmit = async () => {
        const error = validateForm();
        if (error) {
            alert(error);
            return;
        }
        try {
            if (action === "Login") {

                const field = formData.identifier.includes("@") ? "email" : "username";

                const response = await axios.post(addr + "login", {
                    [field]: formData.identifier,
                    password: formData.password,
                    role: "customer"
                });
                // store token and set default Authorization header
                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                }
                // persist user's name so it survives navigation/refresh
                if (response.data?.name) {
                    localStorage.setItem("name", response.data.name);
                }
                alert("Login successful");
                console.log("Login done: " + response.data.name);
                navigate("/chome", { state: { name: response.data.name } });

            } else {
                const response = await axios.post(addr + "signup", {
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: "customer"
                });
                // if server returned a token, store it
                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    localStorage.setItem("role", response.data.role);
                    localStorage.setItem("user_id", response.data.id);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                }
                if (response.data?.name) {
                    localStorage.setItem("name", response.data.name);
                }
                alert("Signup success");
                console.log(response.data.name);
                navigate("/chome", { state: { name: response.data.name } });
            }
        } catch (err) {
            alert(err.response?.data?.error); //wot???
        }

        setFormData({ name: "", username: "", identifier: "", email: "", password: "" });
    };
    // user
    return (
        <div className="cust-login">
            <div className="container">
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
                    Forgot password <span onClick={() => navigate("/forgot-pwd")}>Click Here</span>
                </div>
                <Submit action={action} handleSubmit={handleSubmit} />
            </div>
        </div>

    );
}

export default LS_cust;



