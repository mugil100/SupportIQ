import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import AgentNavbar from "./AgentNavbar";
import Footer from "../../components/Footer";
import "../../styles/AgentPerf.css";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const STAR_COLORS = ["", "#EF4444", "#F59E0B", "#EAB308", "#10B981", "#0284C7"];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="agent-perf-tooltip">
                <p className="tooltip-label">{label}</p>
                <p className="tooltip-value">{payload[0].value} tickets resolved</p>
            </div>
        );
    }
    return null;
};

const RatingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="agent-perf-tooltip">
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
        <div className="agent-page-root">
            {/* Top Navigation */}
            <div className="agent-header-wrapper">
                <AgentNavbar />
            </div>

            <main className="agent-subpage-container">
                {/* Page Header */}
                <div className="agent-subpage-header">
                    <div className="agent-subpage-tag">
                        <span className="subpage-tag-dot"></span>
                        <span>04 WORKSPACE TELEMETRY</span>
                    </div>
                    <h1 className="agent-subpage-title">Performance Analytics</h1>
                    <p className="agent-subpage-desc">
                        Resolution velocity, Customer Satisfaction (CSAT), throughput velocity, and workload metrics.
                    </p>
                </div>

                {loading ? (
                    <div className="agent-perf-loading">
                        <div className="agent-spinner"></div>
                        <p>Computing resolution telemetry...</p>
                    </div>
                ) : !perf ? (
                    <div className="agent-perf-empty">
                        <p>Unable to load performance telemetry. Please try again later.</p>
                    </div>
                ) : (
                    <div className="agent-perf-content">
                        {/* ─── Top 4 KPI Metrics ─── */}
                        <div className="agent-perf-kpi-grid">
                            <div className="agent-perf-card">
                                <div className="perf-card-top">
                                    <span className="perf-kpi-label">Tickets Resolved</span>
                                    <div className="perf-kpi-icon icon-blue">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <div className="perf-card-bottom">
                                    <span className="perf-kpi-num">{perf.total_resolved}</span>
                                    <span className="perf-kpi-tag">Total All-Time</span>
                                </div>
                            </div>

                            <div className="agent-perf-card">
                                <div className="perf-card-top">
                                    <span className="perf-kpi-label">Avg Resolution Time</span>
                                    <div className="perf-kpi-icon icon-amber">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <div className="perf-card-bottom">
                                    <span className="perf-kpi-num">
                                        {perf.avg_resolution_hours > 0 ? `${perf.avg_resolution_hours}h` : "—"}
                                    </span>
                                    <span className="perf-kpi-tag">Turnaround</span>
                                </div>
                            </div>

                            <div className="agent-perf-card">
                                <div className="perf-card-top">
                                    <span className="perf-kpi-label">Average CSAT Score</span>
                                    <div className="perf-kpi-icon icon-emerald">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    </div>
                                </div>
                                <div className="perf-card-bottom">
                                    <span className="perf-kpi-num">
                                        {perf.avg_csat > 0 ? `${perf.avg_csat}/5` : "—"}
                                    </span>
                                    <span className="perf-kpi-tag">{perf.total_ratings || 0} Ratings</span>
                                </div>
                            </div>

                            <div className="agent-perf-card">
                                <div className="perf-card-top">
                                    <span className="perf-kpi-label">Active Workload</span>
                                    <div className="perf-kpi-icon icon-sky">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div className="perf-card-bottom">
                                    <span className="perf-kpi-num">{perf.open_count + perf.in_progress_count}</span>
                                    <span className="perf-kpi-tag">{perf.open_count} open · {perf.in_progress_count} in-prog</span>
                                </div>
                            </div>
                        </div>

                        {/* ─── Charts Row ─── */}
                        <div className="agent-perf-charts-grid">
                            {/* Resolution Velocity Area Chart */}
                            <div className="agent-chart-card wide">
                                <div className="chart-header">
                                    <span className="chart-tag">30-Day Velocity</span>
                                    <h3 className="chart-title">Resolution Trend</h3>
                                    <p className="chart-desc">Daily count of tickets closed and marked resolved</p>
                                </div>
                                <div className="chart-render-wrapper">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorResolvedAzure" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: "#64748B", fontSize: 11 }}
                                                axisLine={{ stroke: "#E2E8F0" }}
                                                tickLine={false}
                                                interval={4}
                                            />
                                            <YAxis
                                                tick={{ fill: "#64748B", fontSize: 11 }}
                                                axisLine={{ stroke: "#E2E8F0" }}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="resolved"
                                                stroke="#0284C7"
                                                strokeWidth={2.5}
                                                fillOpacity={1}
                                                fill="url(#colorResolvedAzure)"
                                                dot={false}
                                                activeDot={{ r: 5, fill: "#0284C7", stroke: "#FFFFFF", strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Customer Satisfaction Breakdown */}
                            <div className="agent-chart-card">
                                <div className="chart-header">
                                    <span className="chart-tag">CSAT Distribution</span>
                                    <h3 className="chart-title">Customer Ratings</h3>
                                    <p className="chart-desc">Feedback ratings submitted by merchants</p>
                                </div>
                                <div className="chart-render-wrapper">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={ratingData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: "#64748B", fontSize: 11 }}
                                                axisLine={{ stroke: "#E2E8F0" }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: "#64748B", fontSize: 11 }}
                                                axisLine={{ stroke: "#E2E8F0" }}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<RatingTooltip />} />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={34}>
                                                {ratingData.map((entry, index) => (
                                                    <Cell key={index} fill={STAR_COLORS[entry.rating]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

export default AgentPerf;