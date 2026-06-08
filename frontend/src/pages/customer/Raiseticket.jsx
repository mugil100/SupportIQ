import React,{useState} from "react";
import "../../styles/Raiseticket.css";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";

function Raiseticket(){
    const token = localStorage.getItem("token");
    const baseAddr = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const addr = baseAddr.endsWith('/') ? baseAddr : `${baseAddr}/`;
    const [ticket, setTicket] = useState({
        title:"", 
        category:"",
        priority:"",
        description:"",
        image:null
    });

    const handleChange = (e)=>{
        setTicket({...ticket, [e.target.name]: e.target.value});
    }
    const handleImg = (e)=>{
        setTicket({...ticket, image: e.target.files[0]});
    }
 
    const handleSubmit = async(e)=>{
        //avoid reset on browser behavior
        e.preventDefault();
        const formdata = new FormData();
        // object data model for sending files
        formdata.append("title", ticket.title);
        formdata.append("category", ticket.category);
        formdata.append("priority", ticket.priority);
        formdata.append("description", ticket.description);
        if(ticket.image){
            formdata.append("image",ticket.image);
            
        }

        try{
            //console.log(formdata);
            await axios.post(addr+"raiseticket",formdata,
                {headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }}
            );

            alert("Ticket raise successfully");
            setTicket({
            title:"", 
            category:"",
            priority:"",
            description:"",
            image:null
        });
        }catch(err){
            alert("Failed to raise ticket : "+err.message);
        }
    };
 
    return (
        <div className="ticket-container">
            <TicketNavbar/>
            <div className="ticket-body">
                <h1>Raise a Support Ticket</h1>
                    <form className="raise-form" onSubmit={handleSubmit}>
                        <input 
                        type="text" 
                        placeholder="Title"
                        name="title"
                        value={ticket.title}
                        onChange={handleChange}
                        required
                        />

                        <select 
                        name="category" 
                        value={ticket.category}
                        onChange={handleChange}
                        required
                        >
                            <option value="">Select Category</option>
                            <option >Login & Authentication</option>
                            <option >Billing & Payments</option>
                            <option >Feature Request</option>
                            <option >Bug Report</option>
                            <option >Performance Issues</option>
                            <option >Account Management</option>
                            <option >Other</option>
                        </select>

                        <select 
                        name="priority"
                        id=""
                        value={ticket.priority}
                        onChange={handleChange} required>
                        <option value="">Select priority</option>
                        <option >Low</option>
                        <option >Medium</option>
                        <option >High</option>
                        </select>

                        <textarea 
                        name="description"
                        placeholder="Describe your issue..." 
                        value={ticket.description}
                        onChange={handleChange}
                        required />

                        <label>Image addressing the issue (optional)</label>
                        <input type="file" name="image" onChange={handleImg}/>

                        <button type="submit">Submit Ticket</button>
                    </form>
            </div>
            <Footer/>
        </div>
    );
}

export default Raiseticket;