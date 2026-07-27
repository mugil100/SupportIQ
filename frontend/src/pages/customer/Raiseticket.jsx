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

// Conditional contextual fields per category
const CATEGORY_FIELDS = {
    "API & Integration": [
        { name: "api_endpoint", label: "API Endpoint", type: "text", placeholder: "e.g. /v1/payments/capture" },
        { name: "error_code", label: "Error Code / HTTP Status", type: "text", placeholder: "e.g. 502, INVALID_KEY" },
        {
            name: "sdk_type", label: "SDK / Integration Type", type: "select",
            options: ["REST API", "Node.js SDK", "Python SDK", "PHP SDK", "Java SDK", "Webhooks", "Other"]
        },
    ],
    "Transaction Disputes": [
        { name: "transaction_id", label: "Transaction ID", type: "text", placeholder: "e.g. txn_abc123xyz" },
        { name: "dispute_amount", label: "Disputed Amount (₹)", type: "number", placeholder: "e.g. 5000" },
        { name: "transaction_date", label: "Transaction Date", type: "date" },
    ],
    "Billing & Invoicing": [
        { name: "invoice_number", label: "Invoice Number", type: "text", placeholder: "e.g. INV-2025-001" },
        { name: "billing_amount", label: "Amount in Question (₹)", type: "number", placeholder: "e.g. 12000" },
    ],
    "Onboarding & KYC": [
        {
            name: "document_type", label: "Document Type", type: "select",
            options: ["PAN Card", "GST Certificate", "Bank Statement", "Address Proof", "Other"]
        },
        {
            name: "kyc_status", label: "Current KYC Status", type: "select",
            options: ["Not Started", "Documents Submitted", "Under Review", "Rejected", "Needs Resubmission"]
        },
    ],
    "Account & Compliance": [
        {
            name: "account_action", label: "Issue Type", type: "select",
            options: ["Account Suspended", "Limit Breach", "Policy Violation Notice", "Compliance Question", "Other"]
        },
    ],
};

function Raiseticket() {
    const [ticket, setTicket] = useState({
        title: "",
        category: "",
        description: "",
        image: null,
        metadata: {}
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTicket(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setTicket(prev => ({
            ...prev,
            category: newCategory,
            metadata: {} // Reset metadata when category changes
        }));
        if (errors.category) {
            setErrors(prev => {
                const next = { ...prev };
                delete next.category;
                return next;
            });
        }
    };

    const handleMetadataChange = (name, value) => {
        setTicket(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [name]: value
            }
        }));
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
        setSuccessMsg("");

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

        // Clean & attach metadata if present
        if (ticket.metadata && Object.keys(ticket.metadata).length > 0) {
            const cleanedMeta = {};
            Object.entries(ticket.metadata).forEach(([k, v]) => {
                if (v !== "" && v !== null && v !== undefined) {
                    cleanedMeta[k] = v;
                }
            });
            if (Object.keys(cleanedMeta).length > 0) {
                formdata.append("metadata", JSON.stringify(cleanedMeta));
            }
        }

        try {
            await axios.post("raiseticket", formdata, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setTicket({ title: "", category: "", description: "", image: null, metadata: {} });
            setErrors({});
            setSubmitError("");
            setSubmitting(false);
            setSuccessMsg("Your ticket has been submitted successfully. Our support team will review it shortly.");
        } catch (err) {
            const serverMsg = err.response?.data?.error || "Something went wrong. Please try again.";
            setSubmitError(serverMsg);
            setSubmitting(false);
        }
    };

    return (
        <div className="ticket-container">
            <TicketNavbar />
            <div className="ticket-body">
                <h1>Raise a Support Ticket</h1>
                <p>Describe your issue and we'll route it to the right engineering or support team.</p>

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
                            onChange={handleCategoryChange}
                            className={errors.category ? "input--error" : ""}
                        >
                            <option value="">Select category</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <span className="field-error">{errors.category}</span>}
                    </div>

                    {/* Contextual Dynamic Fields per Category */}
                    {ticket.category && CATEGORY_FIELDS[ticket.category] && (
                        <div className="contextual-fields-container">
                            <div className="contextual-fields-header">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <span>Contextual details for {ticket.category}</span>
                            </div>
                            <div className="contextual-fields-grid">
                                {CATEGORY_FIELDS[ticket.category].map(field => (
                                    <div className="form-group contextual-field-group" key={field.name}>
                                        <label htmlFor={`meta-${field.name}`}>
                                            {field.label} <span className="label-optional">(optional)</span>
                                        </label>
                                        {field.type === "select" ? (
                                            <select
                                                id={`meta-${field.name}`}
                                                value={ticket.metadata?.[field.name] || ""}
                                                onChange={(e) => handleMetadataChange(field.name, e.target.value)}
                                            >
                                                <option value="">Select option</option>
                                                {field.options.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                id={`meta-${field.name}`}
                                                type={field.type}
                                                placeholder={field.placeholder || ""}
                                                value={ticket.metadata?.[field.name] || ""}
                                                onChange={(e) => handleMetadataChange(field.name, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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