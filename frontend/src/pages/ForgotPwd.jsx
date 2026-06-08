import axios from "../api/axios";
import { React, useState } from "react";

function ForgotPwd() {

    const [email, setEmail] = useState("");

    const handlechange = (e) => {
        setEmail(e.target.value);
    }

    function validateEmail(email) {
        //validate the email id
        const emailregex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailregex.test(email);
    }

    async function handleClick(email) {
        let valid = validateEmail(email);

        if (!valid) {
            alert("Invalid Email");
        }
        else {
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
    }
    return (
        <div className="container">
            <h1>Enter your email id :</h1>
            <input type="text" placeholder="Enter your email id" value={email} onChange={handlechange} />
            <button onClick={() => handleClick(email)}>Submit</button>
        </div>
    );
}

export default ForgotPwd;