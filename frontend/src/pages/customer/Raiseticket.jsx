import React, { useState } from "react";
import "../../styles/Raiseticket.css";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";

const CATEGORIES = [
    "Billing & Invoicing",
    "API & Integration",
    "Onboarding & KYC",
    "Transaction Disputes",
    "Account & Compliance"
];

function Raiseticket() {
    const [ticket, setTicket] = useState({
        title: "",
        category: "",
        description: "",
        image: null
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTicket(prev => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleImg = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, image: "Only JPEG, PNG, and WebP files are allowed." }));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({
                ...prev,
                image: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`
            }));
            return;
        }

        setTicket(prev => ({ ...prev, image: file }));
        setErrors(prev => {
            const next = { ...prev };
            delete next.image;
            return next;
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!ticket.title.trim()) {
            newErrors.title = "Title is required";
        } else if (ticket.title.trim().length < 5) {
            newErrors.title = "Title must be at least 5 characters";
        } else if (ticket.title.trim().length > 150) {
            newErrors.title = "Title must be under 150 characters";
        }

        if (!ticket.category) {
            newErrors.category = "Please select a category";
        }

        if (!ticket.description.trim()) {
            newErrors.description = "Please describe your issue";
        } else if (ticket.description.trim().length < 20) {
            newErrors.description = "Please provide more detail (at least 20 characters)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError("");

        if (!validate()) return;

        setSubmitting(true);

        const formdata = new FormData();
        formdata.append("title", ticket.title.trim());
        formdata.append("category", ticket.category);
        formdata.append("priority", "Medium"); // Priority is set by AI in later phases, defaults to Medium
        formdata.append("description", ticket.description.trim());
        if (ticket.image) {
            formdata.append("image", ticket.image);
        }

        try {
            await axios.post("raiseticket", formdata, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setTicket({ title: "", category: "", description: "", image: null });
            setErrors({});
            setSubmitError("");
            // Success feedback — inline banner (replaces alert)
            setSubmitError(""); // clear any previous error
            setSubmitting(false);
            // Show success state
            setSuccessMsg("Your ticket has been submitted. Our team will get back to you shortly.");
        } catch (err) {
            const serverMsg = err.response?.data?.error || "Something went wrong. Please try again.";
            setSubmitError(serverMsg);
            setSubmitting(false);
        }
    };

    const [successMsg, setSuccessMsg] = useState("");

    return (
        <div className="ticket-container">
            <TicketNavbar />
            <div className="ticket-body">
                <h1>Raise a Support Ticket</h1>
                <p>Describe your issue and we'll route it to the right team.</p>

                {/* Success Banner */}
                {successMsg && (
                    <div className="form-banner form-banner--success">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>{successMsg}</span>
                        <button type="button" className="form-banner__dismiss" onClick={() => setSuccessMsg("")}>✕</button>
                    </div>
                )}

                {/* Error Banner */}
                {submitError && (
                    <div className="form-banner form-banner--error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>{submitError}</span>
                        <button type="button" className="form-banner__dismiss" onClick={() => setSubmitError("")}>✕</button>
                    </div>
                )}

                <form className="raise-form" onSubmit={handleSubmit} noValidate>
                    {/* Title */}
                    <div className="form-group">
                        <label htmlFor="rt-title">Subject</label>
                        <input
                            id="rt-title"
                            type="text"
                            placeholder="Brief summary of your issue"
                            name="title"
                            value={ticket.title}
                            onChange={handleChange}
                            className={errors.title ? "input--error" : ""}
                            maxLength={150}
                        />
                        <div className="form-group__footer">
                            {errors.title && <span className="field-error">{errors.title}</span>}
                            <span className="char-count">{ticket.title.length}/150</span>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="form-group">
                        <label htmlFor="rt-category">Category</label>
                        <select
                            id="rt-category"
                            name="category"
                            value={ticket.category}
                            onChange={handleChange}
                            className={errors.category ? "input--error" : ""}
                        >
                            <option value="">Select category</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <span className="field-error">{errors.category}</span>}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="rt-description">Description</label>
                        <textarea
                            id="rt-description"
                            name="description"
                            placeholder="Describe your issue in detail — include steps to reproduce, error messages, and any relevant context..."
                            value={ticket.description}
                            onChange={handleChange}
                            className={errors.description ? "input--error" : ""}
                        />
                        {errors.description && <span className="field-error">{errors.description}</span>}
                    </div>

                    {/* File Upload */}
                    <div className="form-group">
                        <label htmlFor="rt-image">Attachment <span className="label-optional">(optional)</span></label>
                        <input
                            id="rt-image"
                            type="file"
                            name="image"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={handleImg}
                            className={errors.image ? "input--error" : ""}
                        />
                        {ticket.image && !errors.image && (
                            <span className="file-name">
                                {ticket.image.name} ({(ticket.image.size / 1024).toFixed(0)} KB)
                            </span>
                        )}
                        {errors.image && <span className="field-error">{errors.image}</span>}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={submitting ? "btn--loading" : ""}
                    >
                        {submitting ? (
                            <>
                                <span className="spinner"></span>
                                Submitting...
                            </>
                        ) : (
                            "Submit Ticket"
                        )}
                    </button>
                </form>
            </div>
            <Footer />
        </div>
    );
}

export default Raiseticket;