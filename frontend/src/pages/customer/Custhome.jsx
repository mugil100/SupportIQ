import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TicketNavbar from "../../components/TicketNavbar";
import Footer from "../../components/Footer";
import axios from "../../api/axios";
import "../../styles/Custhome.css";

function Custhome() {
    const navigate = useNavigate();
    const name = localStorage.getItem("name") || "Merchant Partner";

    const [ticketCount, setTicketCount] = useState({ total: 0, open: 0 });

    useEffect(() => {
        axios.get("/mytickets?limit=50")
            .then(res => {
                const list = res.data.tickets || [];
                const openCount = list.filter(t => t.status === "Open" || t.status === "In Progress").length;
                setTicketCount({ total: res.data.total || list.length, open: openCount });
            })
            .catch(() => {});
    }, []);

    const menuItems = [
        {
            num: "01",
            title: "Raise a New Support Request",
            desc: "Submit payment disputes, API issues, or settlement inquiries with AI pre-triage.",
            action: () => navigate("/raiseticket"),
            isPrimary: true,
        },
        {
            num: "02",
            title: "View & Track My Tickets",
            desc: `${ticketCount.total} total submitted • ${ticketCount.open} active tickets in progress`,
            action: () => navigate("/mytickets"),
            isPrimary: false,
        },
        {
            num: "03",
            title: "Notifications & Resolution Alerts",
            desc: "Stay updated with real-time agent responses and escalation status updates.",
            action: () => navigate("/cnoti"),
            isPrimary: false,
        },
        {
            num: "04",
            title: "Merchant Operations & SLA Guarantee",
            desc: "Guaranteed 24-hour first response with dedicated payment specialist routing.",
            action: () => navigate("/mytickets"),
            isPrimary: false,
        }
    ];

    return (
        <div className="cust-body">
            <TicketNavbar />

            <main className="cust-main-canvas">
                <div className="cust-frame-card">
                    
                    {/* Top Hero Section */}
                    <div className="cust-hero-grid">
                        <div className="cust-hero-left">
                            <span className="cust-hero-tag">Merchant Support Portal</span>
                            <h1 className="cust-hero-title">
                                Aligned. Responsive.<br />
                                <span className="cust-hero-accent">Built for Merchants.</span>
                            </h1>
                            <p className="cust-welcome-user">
                                Welcome back, <strong>{name}</strong>
                            </p>
                        </div>

                        <div className="cust-hero-right">
                            <p className="cust-hero-desc">
                                We’ve engineered a high-velocity support desk for high-volume payments—our approach is grounded in real-time resolution, AI-assisted triage, and transparent communication.
                            </p>
                            <div className="cust-hero-cta">
                                <button
                                    className="cust-dark-pill-btn"
                                    onClick={() => navigate("/raiseticket")}
                                >
                                    Raise a Ticket <span className="pill-arrow">→</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Interactive List Section */}
                    <div className="cust-action-list">
                        {menuItems.map((item) => (
                            <div
                                key={item.num}
                                className={`cust-list-item ${item.isPrimary ? "active-item" : ""}`}
                                onClick={item.action}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === "Enter") item.action(); }}
                            >
                                <span className="cust-item-num">{item.num}</span>
                                <div className="cust-item-content">
                                    <div className="cust-item-title">{item.title}</div>
                                    <div className="cust-item-desc">{item.desc}</div>
                                </div>
                                <div className="cust-item-arrow">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Stat Pill Bar */}
                    <div className="cust-quick-bar">
                        <div className="cust-stat-chip">
                            <span className="chip-dot dot-active"></span>
                            <span>Live System: <strong>All Payment Gateways Operational</strong></span>
                        </div>
                        <div className="cust-stat-chip">
                            <span>Active Tickets: <strong>{ticketCount.open} Open</strong></span>
                        </div>
                        <div className="cust-stat-chip">
                            <span>Avg Response Time: <strong>&lt; 2 hours</strong></span>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default Custhome;