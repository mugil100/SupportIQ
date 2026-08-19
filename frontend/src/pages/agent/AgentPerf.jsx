import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import "../../styles/AgentPerf.css";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const STAR_COLORS = ["", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="perf-tooltip">
                <p className="tooltip-label">{label}</p>
                <p className="tooltip-value">{payload[0].value} tickets</p>
            </div>
        );
    }
    return null;
};

const RatingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="perf-tooltip">
                <p className="tooltip-label">{payload[0].payload.label}</p>
                <p className="tooltip-value">{payload[0].value} ratings</p>
            </div>
        );
    }
    return null;
};

function AgentPerf() {
    const [perf, setPerf] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get("agent/performance")
            .then(res => {
                setPerf(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching performance:", err);
                setLoading(false);
            });
    }, []);

    // Fill in missing dates for last 30 days
    const buildChartData = () => {
        if (!perf?.daily_resolved) return [];

        const map = {};
        perf.daily_resolved.forEach(d => {
            const key = new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            map[key] = parseInt(d.count);
        });

        const result = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            result.push({ date: key, resolved: map[key] || 0 });
        }
        return result;
    };

    // Build rating distribution data (always show 1-5)
    const buildRatingData = () => {
        if (!perf?.rating_distribution) return [1, 2, 3, 4, 5].map(r => ({ rating: r, count: 0, label: STAR_LABELS[r] }));
        const map = {};
        perf.rating_distribution.forEach(r => { map[r.rating] = parseInt(r.count); });
        return [1, 2, 3, 4, 5].map(r => ({
            rating: r,
            count: map[r] || 0,
            label: STAR_LABELS[r]
        }));
    };

    const chartData = buildChartData();
    const ratingData = buildRatingData();



    return (
        <>
            <AgentNavbar />
            <div className="perf-page">
                <div className="perf-header">
                    <h1>Performance Dashboard</h1>
                    <p className="perf-subtitle">Track your support metrics and customer satisfaction</p>
                </div>

                {loading ? (
                    <div className="perf-loading">
                        <div className="perf-spinner"></div>
                        <p>Loading performance data...</p>
                    </div>
                ) : !perf ? (
                    <div className="perf-empty">
                        <p>Unable to load performance data. Please try again later.</p>
                    </div>
                ) : (
                    <>
                        {/* ─── Stat Cards ─── */}
                        <div className="perf-stats-row">
                            <div className="perf-card">
                                <div className="perf-card-icon resolved-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <div className="perf-card-content">
                                    <span className="perf-card-label">Tickets Resolved</span>
                                    <span className="perf-card-value">{perf.total_resolved}</span>
                                </div>
                            </div>

                            <div className="perf-card">
                                <div className="perf-card-icon time-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                                <div className="perf-card-content">
                                    <span className="perf-card-label">Avg Resolution Time</span>
                                    <span className="perf-card-value">
                                        {perf.avg_resolution_hours > 0 ? `${perf.avg_resolution_hours}h` : "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="perf-card">
                                <div className="perf-card-icon csat-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </div>
                                <div className="perf-card-content">
                                    <span className="perf-card-label">Avg CSAT Score</span>
                                    <span className="perf-card-value">
                                        {perf.avg_csat > 0 ? `${perf.avg_csat}/5` : "—"}
                                    </span>
                                    {perf.total_ratings > 0 && (
                                        <span className="perf-card-sub">{perf.total_ratings} rating{perf.total_ratings > 1 ? "s" : ""}</span>
                                    )}
                                </div>
                            </div>

                            <div className="perf-card">
                                <div className="perf-card-icon workload-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                </div>
                                <div className="perf-card-content">
                                    <span className="perf-card-label">Active Tickets</span>
                                    <span className="perf-card-value">{perf.open_count + perf.in_progress_count}</span>
                                    <span className="perf-card-sub">
                                        {perf.open_count} open · {perf.in_progress_count} in progress
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ─── Charts Row ─── */}
                        <div className="perf-charts-row">
                            {/* Resolution Trend */}
                            <div className="perf-chart-card wide">
                                <h2>Resolution Trend</h2>
                                <p className="chart-subtitle">Tickets resolved per day — last 30 days</p>
                                <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#5e6ad2" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#5e6ad2" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: "rgba(232,234,246,0.45)", fontSize: 11 }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                                                tickLine={false}
                                                interval={4}
                                            />
                                            <YAxis
                                                tick={{ fill: "rgba(232,234,246,0.45)", fontSize: 11 }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="resolved"
                                                stroke="#5e6ad2"
                                                strokeWidth={2.5}
                                                fillOpacity={1}
                                                fill="url(#colorResolved)"
                                                dot={false}
                                                activeDot={{ r: 5, fill: "#5e6ad2", stroke: "#1a1a28", strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Rating Distribution */}
                            <div className="perf-chart-card">
                                <h2>Rating Distribution</h2>
                                <p className="chart-subtitle">Customer satisfaction breakdown</p>
                                <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={ratingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: "rgba(232,234,246,0.45)", fontSize: 11 }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: "rgba(232,234,246,0.45)", fontSize: 11 }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<RatingTooltip />} />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                                                {ratingData.map((entry, index) => (
                                                    <Cell key={index} fill={STAR_COLORS[entry.rating]} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default AgentPerf;