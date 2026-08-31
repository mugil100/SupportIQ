import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "../api/axios";
import "../styles/NotificationToast.css";

function ToastIcon({ type }) {
    switch (type) {
        case "AGENT_REPLY":
        case "CUSTOMER_REPLY":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        case "TICKET_RESOLVED":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            );
        case "TICKET_REOPENED":
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
            );
        default:
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            );
    }
}

const AUTO_DISMISS_MS = 5000;



/**
 * Global toast + browser notification component.
 * Mount once in a layout/navbar — it listens on the shared socket singleton.
 *
 * @param {function} onUnreadChange  — called with the updated unread count
 *                                     whenever a new notification arrives.
 */
export default function NotificationToast({ onUnreadChange }) {
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();
    const socket = useSocket();
    const timerMap = useRef(new Map());

    // ---- helpers ----
    const dismiss = useCallback((id) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );
        // Remove from DOM after exit animation
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 350);
    }, []);

    const handleClick = useCallback(
        (noti) => {
            const role = localStorage.getItem("role");
            const ticketId = noti.ticket_id;
            if (ticketId) {
                if (role === "agent") {
                    navigate(`/agent/agenttickets/${ticketId}`);
                } else if (role === "manager") {
                    navigate(`/manager/tickets/${ticketId}`);
                } else {
                    navigate(`/ticket/${ticketId}`);
                }
            }
        },
        [navigate]
    );

    // ---- socket listener ----
    useEffect(() => {
        function onNewNotification(noti) {
            const id = noti.notification_id || Date.now();

            // Notify parent of new unread count
            if (onUnreadChange) onUnreadChange((prev) => prev + 1);

            // Delivery path A: tab is visible → in-app toast
            if (document.visibilityState === "visible") {
                setToasts((prev) => [{ ...noti, id, exiting: false }, ...prev]);
            } else {
                // Delivery path B: tab is hidden → browser notification
                if (
                    "Notification" in window &&
                    Notification.permission === "granted"
                ) {
                    const browserNoti = new Notification("SupportIQ", {
                        body: noti.message_content,
                        icon: "/favicon.ico",
                        tag: `supportiq-${id}`, // collapse duplicates
                    });
                    browserNoti.onclick = () => {
                        window.focus();
                        const role = localStorage.getItem("role");
                        if (noti.ticket_id) {
                            if (role === "agent") {
                                navigate(`/agent/agenttickets/${noti.ticket_id}`);
                            } else if (role === "manager") {
                                navigate(`/manager/tickets/${noti.ticket_id}`);
                            } else {
                                navigate(`/ticket/${noti.ticket_id}`);
                            }
                        }
                    };
                }
            }
        }

        function onNotificationsRead() {
            axios.post("/noti/filter", { state: "unread" })
                .then(res => {
                    if (onUnreadChange && Array.isArray(res.data)) {
                        onUnreadChange(res.data.length);
                    }
                })
                .catch(() => {});
        }

        // Socket is already connected via SocketProvider — just listen
        socket.on("new_notification", onNewNotification);
        socket.on("notifications_read_for_ticket", onNotificationsRead);

        return () => {
            socket.off("new_notification", onNewNotification);
            socket.off("notifications_read_for_ticket", onNotificationsRead);
        };
    }, [navigate, onUnreadChange, socket]);

    // ---- auto-dismiss timers ----
    useEffect(() => {
        const activeIds = new Set(toasts.map((t) => t.id));
        const currentTimerMap = timerMap.current;

        // Start timers only for new toasts that aren't already tracked
        toasts.forEach((t) => {
            if (!t.exiting && !currentTimerMap.has(t.id)) {
                const timerId = setTimeout(() => {
                    currentTimerMap.delete(t.id);
                    dismiss(t.id);
                }, AUTO_DISMISS_MS);
                currentTimerMap.set(t.id, timerId);
            }
        });

        // Clean up timers for toasts that have been removed from the array
        currentTimerMap.forEach((timerId, id) => {
            if (!activeIds.has(id)) {
                clearTimeout(timerId);
                currentTimerMap.delete(id);
            }
        });

        // On unmount, clear all remaining timers
        return () => {
            currentTimerMap.forEach(clearTimeout);
            currentTimerMap.clear();
        };
    }, [toasts, dismiss]);

    // ---- render ----
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`toast-item ${t.exiting ? "toast-exit" : ""}`}
                    onClick={() => {
                        handleClick(t);
                        dismiss(t.id);
                    }}
                >
                    <div className="toast-body">
                        <div
                            className={`toast-icon ${t.notification_type || ""}`}
                        >
                            <ToastIcon type={t.notification_type} />
                        </div>
                        <div className="toast-text">
                            <div className="toast-type">
                                {(t.notification_type || "notification").replace(
                                    /_/g,
                                    " "
                                )}
                            </div>
                            <div className="toast-message">
                                {t.message_content}
                            </div>
                            <div className="toast-time">Just now</div>
                        </div>
                    </div>
                    <button
                        className="toast-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismiss(t.id);
                        }}
                    >
                        ✕
                    </button>
                    <div
                        className={`toast-progress ${t.notification_type || ""}`}
                    />
                </div>
            ))}
        </div>
    );
}
