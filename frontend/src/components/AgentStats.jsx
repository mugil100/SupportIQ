import React from "react";

function AgentStats({ stats }) {
    return (
        <div className="stats-row">
            <div className="a-card">
                <span className="a-card-label">Assigned</span>
                <b className="a-num">{stats.assigned ?? 0}</b>
            </div>
            <div className="a-card">
                <span className="a-card-label">In progress</span>
                <b className="a-num">{stats.in_progress ?? 0}</b>
            </div>
            <div className="a-card">
                <span className="a-card-label">Unreplied</span>
                <b className="a-num">{stats.unreplied ?? 0}</b>
            </div>
            <div className="a-card">
                <span className="a-card-label">Resolved</span>
                <b className="a-num">{stats.resolved ?? 0}</b>
            </div>
        </div>
    );
}

export default AgentStats;