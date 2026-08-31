import React from "react";

function AgentStats({ stats }) {
    const statCards = [
        {
            label: "Assigned to Me",
            num: stats.assigned ?? 0,
            tag: "Active",
            accent: "blue",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                </svg>
            )
        },
        {
            label: "In Progress",
            num: stats.in_progress ?? 0,
            tag: "Working",
            accent: "amber",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        },
        {
            label: "Needs Reply",
            num: stats.unreplied ?? 0,
            tag: "Customer Waiting",
            accent: "rose",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                </svg>
            )
        },
        {
            label: "Resolved",
            num: stats.resolved ?? 0,
            tag: "Completed",
            accent: "emerald",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            )
        },
        {
            label: "Unread Notifications",
            num: stats.unread ?? 0,
            tag: "Alerts",
            accent: "sky",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            )
        }
    ];

    return (
        <div className="agent-stats-grid">
            {statCards.map((c, i) => (
                <div key={i} className={`agent-stat-card accent-${c.accent}`}>
                    <div className="stat-card-top">
                        <span className="stat-card-label">{c.label}</span>
                        <div className="stat-card-icon">{c.icon}</div>
                    </div>
                    <div className="stat-card-bottom">
                        <b className="stat-card-num">{c.num}</b>
                        <span className="stat-card-tag">{c.tag}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AgentStats;