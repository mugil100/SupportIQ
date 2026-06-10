# Real-Time Notifications for Customer & Agent

Add real-time push notifications via Socket.IO for four events — **CUSTOMER_REPLY**, **AGENT_REPLY**, **TICKET_RESOLVED**, **TICKET_REOPENED** — so both agents and customers receive instant toast notifications without needing to refresh.

## Current State

- **Socket.IO** already exists: the server creates an `io` instance, clients connect with JWT auth, and ticket-room messaging works.
- **Notifications table** exists in the DB (`Notifications` with `user_id`, `ticket_id`, `notification_type`, `message_content`, `is_read`).
- Only **CUSTOMER_REPLY** notifications are currently saved (for the agent), but they're only fetched via REST polling — **no real-time push**.
- The **customer side has zero notification support** — no DB inserts, no REST endpoints, no UI.
- Socket auth already decodes the JWT and sets `socket.user = { customer_id, role }`.

## Proposed Changes

### 1. Server — User-level notification rooms

#### [MODIFY] [server.js](file:///d:/CCE/WebDev_Course/supportiq/server/server.js)

Currently users only join **ticket rooms**. To push notifications to a user who may be on *any* page, each user needs to also join a **personal room** (`user_<id>`) on connect.

```diff
 io.on("connection", (socket) => {
     console.log("Client connected : ", socket.id);
+
+    // Join a personal room so we can push notifications regardless of page
+    const userId = socket.user.customer_id;
+    socket.join(`user_${userId}`);
+    console.log(`User ${userId} joined personal room user_${userId}`);
```

---

### 2. Server — Emit notifications on each event

#### [MODIFY] [server.js](file:///d:/CCE/WebDev_Course/supportiq/server/server.js)

All four events already have the right code path in the `send_message` handler and the resolve handler. We need to:

**A) CUSTOMER_REPLY** (customer sends message → notify agent)  
Already saves a notification row. Add a `io.to(user_${agentId}).emit("new_notification", ...)` right after the INSERT.

**B) AGENT_REPLY** (agent sends message → notify customer)  
Look up the `customer_id` from the ticket, INSERT a notification row, and emit to `user_${customerId}`.

**C) TICKET_REOPENED** (customer replies to a resolved ticket → notify agent)  
Already detects reopening inside the `send_message` handler. INSERT a notification for the agent and emit.

**D) TICKET_RESOLVED** (agent resolves ticket → notify customer)  
Currently only handled in the REST route [agent.js](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js). We need to pass `io` into that route (or move resolve to a socket event). The cleanest approach: **pass `io` to the agent routes via `app.set("io", io)`**, then use it in the resolve endpoint.

#### [MODIFY] [agent.js](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js)

In the `/agenttickets/:id/resolved` route:
1. Look up the `customer_id` for the ticket.
2. INSERT a `TICKET_RESOLVED` notification row for the customer.
3. Emit `new_notification` to `user_${customerId}`.
4. Emit `ticket_resolved` to the ticket room so any open chat view updates the status badge.

---

### 3. Server — Customer notification REST endpoints

#### [MODIFY] [noti.js](file:///d:/CCE/WebDev_Course/supportiq/server/routes/noti.js) & [NotiService.js](file:///d:/CCE/WebDev_Course/supportiq/server/services/NotiService.js)

Currently notifications are served under `/agent/noti`. Since customers now also need notifications, we'll add a parallel set of **customer-facing** routes:

- `GET /noti` — fetch customer notifications
- `POST /noti/filter` — filter by read/unread
- `POST /noti/:id` — mark one as read
- `POST /noti/mark-all` — mark all as read

> [!NOTE]
> The existing `NotiService.js` functions are already user-agnostic (they use `req.customer_id` which works for both roles). We can mount the **same** noti routes at a customer-accessible path too — just add `app.use("/", notiRoutes)` alongside the existing `app.use("/agent", notiRoutes)` in server.js. This way both `/noti` (customer) and `/agent/noti` (agent) work with the same service code.

---

### 4. Frontend — Toast notification component

#### [NEW] [NotificationToast.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/NotificationToast.jsx)

A reusable toast component that:
- Listens to `socket.on("new_notification", ...)` globally.
- Renders an animated toast popup in the bottom-right corner.
- Shows the notification type icon, message, and a link to the ticket.
- Auto-dismisses after 5 seconds (with a progress bar), or click to dismiss.
- Stacks multiple toasts vertically.

#### [NEW] [NotificationToast.css](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/styles/NotificationToast.css)

Styles for the toast: slide-in animation, glassmorphism, icon colors per notification type, progress bar animation.

---

### 5. Frontend — Integrate toast into layouts

#### [MODIFY] [AgentNavbar.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentNavbar.jsx)

- Import and render `<NotificationToast />` so it appears on every agent page.
- Add a real-time unread badge counter on the "Notifications" nav link via socket.

#### [MODIFY] [TicketNavbar.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/TicketNavbar.jsx)

- Import and render `<NotificationToast />` so it appears on every customer page.
- Add a "Notifications" link to the customer navbar (with unread badge).

---

### 6. Frontend — Customer notification page

#### [NEW] [CustNoti.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/CustNoti.jsx)

A customer notifications page (similar to `AgentNoti.jsx`) listing all their notifications with read/unread filter and mark-as-read actions.

#### [NEW] [CustNoti.css](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/styles/CustNoti.css)

Styles for the customer notification page.

#### [MODIFY] [App.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/App.jsx)

Add route `/cnoti` for the customer notification page.

---

### 7. Frontend — Socket lifecycle for non-chat pages

#### [MODIFY] [socket.js](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/socket.js)

No changes needed — `autoConnect: false` is correct. The navbars will connect/disconnect the socket for notification listening.

---

## User Review Required

> [!IMPORTANT]
> **Customer notification route mounting**: I plan to mount the same `notiRoutes` at both `/agent` (existing) and `/` (new for customers). This means customers and agents share the same notification service code. The `user_id` in the DB already differentiates them. Is this acceptable, or do you want separate service functions?

> [!IMPORTANT]  
> **Toast position**: I plan to render toasts in the **bottom-right** corner with a stacking layout. Let me know if you prefer a different position (top-right, top-center, etc.).

## Open Questions

> [!NOTE]
> **Sound**: Should toasts play a notification sound? I can add a subtle chime if desired.

> [!NOTE]
> **Browser notifications**: Do you also want native browser `Notification` API popups (the ones that appear even when the tab is in the background), or just in-app toasts?

## Verification Plan

### Manual Verification
1. Log in as a **customer**, send a message on a ticket → verify the assigned **agent** receives a real-time toast + DB notification row for `CUSTOMER_REPLY`.
2. Log in as an **agent**, reply to the ticket → verify the **customer** receives a real-time toast for `AGENT_REPLY`.
3. Agent clicks "Mark as Resolved" → customer gets `TICKET_RESOLVED` toast, ticket status updates.
4. Customer replies on a resolved ticket → agent gets `TICKET_REOPENED` toast, ticket status reverts to Open.
5. Verify the customer notifications page (`/cnoti`) lists all notifications correctly.
6. Verify mark-as-read and filter work on both sides.
