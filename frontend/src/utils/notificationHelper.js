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
