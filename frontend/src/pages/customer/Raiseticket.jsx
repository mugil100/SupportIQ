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

const AFFECTED_AREAS = ["Dashboard", "API / SDK", "Webhooks", "Settlements", "Reports"];

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
        affected_area: "",
        description: "",
        image: null,
        metadata: {}
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [filePreview, setFilePreview] = useState(null);

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

    const validateAndSetFile = (file) => {
        setErrors(prev => {
            const next = { ...prev };
            delete next.image;
            return next;
        });
        setFilePreview(null);

        const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!ALLOWED_TYPES.includes(file.type)) {
            setErrors(prev => ({ ...prev, image: "Only JPEG, PNG, WebP, and PDF files are allowed." }));
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

        // Generate preview
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview({ type: "image", src: e.target.result });
            reader.readAsDataURL(file);
        } else {
            setFilePreview({ type: "pdf", name: file.name, size: (file.size / 1024).toFixed(0) + " KB" });
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
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
        if (ticket.affected_area) {
            formdata.append("affected_area", ticket.affected_area);
        }
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

            setTicket({ title: "", category: "", affected_area: "", description: "", image: null, metadata: {} });
            setErrors({});
            setFilePreview(null);
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

                    {/* Affected Area */}
                    <div className="form-group">
                        <label htmlFor="rt-affected-area">Affected Area</label>
                        <select
                            id="rt-affected-area"
                            name="affected_area"
                            value={ticket.affected_area}
                            onChange={handleChange}
                        >
                            <option value="">Select affected area</option>
                            {AFFECTED_AREAS.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
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
                        <label>Attachment <span className="label-optional">(optional)</span></label>
                        <div
                            className={`drop-zone ${dragActive ? "drop-zone--active" : ""} ${errors.image ? "input--error" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("file-input").click()}
                        >
                            {filePreview ? (
                                <div className="drop-zone__preview">
                                    {filePreview.type === "image" ? (
                                        <img src={filePreview.src} alt="Preview" />
                                    ) : (
                                        <div className="drop-zone__pdf">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                <polyline points="14 2 14 8 20 8"/>
                                            </svg>
                                            <span>{filePreview.name} ({filePreview.size})</span>
                                        </div>
                                    )}
                                    <button type="button" className="drop-zone__remove" onClick={(e) => {
                                        e.stopPropagation();
                                        setTicket(prev => ({ ...prev, image: null }));
                                        setFilePreview(null);
                                    }}>✕</button>
                                </div>
                            ) : (
                                <div className="drop-zone__empty">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <span>Drop a file here or <em>click to browse</em></span>
                                    <span className="drop-zone__hint">JPEG, PNG, WebP, or PDF — max 5MB</span>
                                </div>
                            )}
                        </div>
                        <input id="file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => {
                            if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
                        }} hidden />
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