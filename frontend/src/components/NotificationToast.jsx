import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import "../styles/NotificationToast.css";

const ICON_MAP = {
    CUSTOMER_REPLY: "💬",
    AGENT_REPLY: "🗣️",
    TICKET_RESOLVED: "✅",
    TICKET_REOPENED: "🔄",
};

const AUTO_DISMISS_MS = 5000;

/**
 * Requests browser notification permission on a user gesture.
 * Safe to call multiple times — it no-ops if already granted/denied.
 */
export function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}

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
                            } else {
                                navigate(`/ticket/${noti.ticket_id}`);
                            }
                        }
                    };
                }
            }
        }

        // Socket is already connected via SocketProvider — just listen
        socket.on("new_notification", onNewNotification);

        return () => {
            socket.off("new_notification", onNewNotification);
        };
    }, [navigate, onUnreadChange, socket]);

    // ---- auto-dismiss timers ----
    useEffect(() => {
        const timers = toasts
            .filter((t) => !t.exiting)
            .map((t) =>
                setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS)
            );
        return () => timers.forEach(clearTimeout);
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
                            {ICON_MAP[t.notification_type] || "🔔"}
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
