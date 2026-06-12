# SupportIQ Pre-Phase Audit Report

> **Auditor perspective**: Senior Staff Engineer · Penetration Tester · QA Lead · SaaS Architect
> **Date**: 2026-06-12
> **Codebase snapshot**: All server + frontend source read at time of audit

---

## 1. Critical Bug Audit

| Severity | Module | Issue | Impact | Reproduction Scenario | Recommended Fix |
|----------|--------|-------|--------|----------------------|-----------------|
| **CRITICAL** | [tickets.js:57-66](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L57-L66) | `GET /ticket/:id` — no `try/catch` around the `pool.query`. If the DB throws (connection lost, invalid id type), Express 5 will crash or return an unhandled rejection. | **500 crash, possible server restart** | Send `GET /ticket/abc` (non-numeric ID) | Wrap in `try/catch`, return `500` |
| **CRITICAL** | [tickets.js:70-78](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L70-L78) | `GET /ticket/:id/messages` — no `try/catch`, no ownership check. Any authenticated user can read any ticket's messages by guessing ticket IDs. | **Full conversation data leak** | Customer A calls `GET /ticket/42/messages` for a ticket they don't own | Add `try/catch` + ownership verification query |
| **CRITICAL** | [tickets.js:83-98](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L83-L98) | `POST /ticket/:id/message` — no `try/catch`; `status.rows[0].status` crashes with `TypeError: Cannot read properties of undefined` if ticket ID doesn't exist. | **Server crash on invalid ticket** | `POST /ticket/999999/message` with body `{message: "hi"}` | Add existence check + `try/catch` |
| **CRITICAL** | [tickets.js:103-113](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L103-L113) | `PUT /ticket/:id/status` — no `try/catch`. Unhandled promise rejection if DB fails. | **Silent 500 error or crash** | DB connection timeout during request | Wrap in `try/catch` |
| **CRITICAL** | [tickets.js:117-127](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L117-L127) | `DELETE /ticket/message/:id/` — no `try/catch`. Unhandled rejection. | **Server crash** | Send invalid message_id | Wrap in `try/catch` |
| **CRITICAL** | [server.js:116](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L116) | Socket `send_message` handler: `check_resolve.rows[0].status` — crashes with `TypeError` if the ticket was deleted between the insert and this query. | **Crashes socket handler, disrupts all socket connections** | Delete a ticket concurrently while a customer is replying | Add null-check: `check_resolve.rows[0]?.status` |
| **HIGH** | [agent.js:77-109](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L77-L109) | `GET /agent/agenttickets/:id` — line 83 runs `select * from tickets` but discards the result (no variable assignment), then does the actual ownership check on line 89-93. This is a **wasted query on every request**. | **Performance degradation, confusing code** | Every agent ticket view fires 3 queries instead of 2 | Remove the orphan query on line 83 |
| **HIGH** | [agent.js:146-181](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L146-L181) | `PUT /unassigned/assign` — notification insert runs **before** checking if assignment succeeded (`result.rows.length === 0` check on line 172). A notification is inserted even when the ticket was already assigned. | **Ghost notification for failed assignment** | Two agents click "Assign to Self" simultaneously — the loser still gets a notification | Move the notification insert **after** the success check |
| **HIGH** | [server.js:175-177](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L175-L177) | `mark_seen` handler: for agents, `receiveId` is set to `socket.user.agent_id`, but the JWT payload uses `customer_id` (which maps to `users.id` for both roles, as the code comment on line 59-60 states). `socket.user.agent_id` is `undefined`. | **`receiveId` is always `undefined` for agents, mark_seen effectively no-ops** — agent message read receipts are broken | Agent opens a ticket, mark_seen fires but `receiveId` is garbage | Use `socket.user.customer_id` for both roles (it maps to `users.id`) |
| **HIGH** | [server.js:171-192](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L171-L192) | `mark_seen` — no `try/catch` around the `pool.query`. DB error crashes the socket handler. | **Socket handler crash** | DB timeout during mark_seen | Add `try/catch` |
| **MEDIUM** | [server.js:56-153](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L56-L153) | Socket `send_message` performs **4-6 sequential DB queries** with no transaction. If the server crashes mid-way, messages can be saved without notifications, or status changes can occur without messages. | **Inconsistent state after partial failure** | Server crashes after message insert but before notification insert | Wrap in a `BEGIN/COMMIT` transaction |
| **MEDIUM** | [autoClose.js](file:///d:/CCE/WebDev_Course/supportiq/server/bg_jobs/autoClose.js) | The cron job is defined but **never imported or required** anywhere in `server.js`. It never executes. | **Resolved tickets never auto-close** | Wait 5 days after resolving a ticket — nothing happens | Add `require("./bg_jobs/autoClose")` in server.js |
| **MEDIUM** | [emailService.js:4-26](file:///d:/CCE/WebDev_Course/supportiq/server/services/emailService.js#L4-L26) | `SendEmail` does not handle the Resend API error. If the API key is invalid or the email fails, the error propagates up and is caught generically as "Invalid Email" by the caller. | **Misleading error messages, silent email failures** | Set an invalid RESEND_API_KEY | Add error handling, return success/failure status |

---

## 2. Business Logic Audit

### Ticket Assignment

| Scenario | Root Cause | User Impact | Recommended Fix |
|----------|-----------|-------------|-----------------|
| **Two agents claiming the same ticket** | The `WHERE assigned_agent_id IS NULL` clause on [agent.js:159](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L159) provides basic protection, but the notification on line 163-170 fires **before** the success check on line 172. The losing agent receives a "You have been assigned" notification for a ticket they didn't get. | Agent gets false notification, navigates to ticket, gets 404 error. Confusing UX. | Move notification insert after the `result.rows.length === 0` check. |
| **Agent self-assignment with no role check** | `PUT /agent/unassigned/assign` at [agent.js:146](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L146) has no `req.role !== "agent"` guard. A customer with a valid token could call this endpoint and assign a ticket to themselves. | **Customer can become an agent by assigning tickets** | Add `if (req.role !== "agent") return res.status(403)` |
| **No reassignment mechanism** | Once assigned, there is no endpoint to reassign a ticket to a different agent or unassign it. The only way is direct DB manipulation. | Agent leaves the company → tickets are orphaned forever | Add a reassignment/unassign endpoint |
| **Lost ownership on auto-close** | [autoClose.js](file:///d:/CCE/WebDev_Course/supportiq/server/bg_jobs/autoClose.js) closes resolved tickets without notifying the customer or agent. If the cron were running, customers would find tickets silently closed. | Customer returns to find ticket closed with no notification | Add notification insert in the cron job |

### Ticket Lifecycle / State Machine

| Scenario | Root Cause | User Impact | Recommended Fix |
|----------|-----------|-------------|-----------------|
| **No formal state machine — ANY status is accepted** | [tickets.js:103-113](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L103-L113): `PUT /ticket/:id/status` takes any string in `req.body.status` and writes it directly to DB. No validation of allowed transitions. | Customer can set status to `"Admin"`, `"Deleted"`, or any arbitrary string, corrupting the ticket state. The DB `status` column has no CHECK constraint. | Add a whitelist of valid statuses + valid transition map. Add CHECK constraint to DB. |
| **Closed tickets can receive messages** | Socket `send_message` handler at [server.js:56](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L56) has **no check for ticket status**. Messages can be inserted into closed tickets. | Messages appear after closure, violating the closed-ticket contract. The customer UI hides the input, but the socket endpoint is still open. | Check ticket status before inserting message. Reject if Closed. |
| **Conflicting reopen logic** | The socket handler [server.js:116-119](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L116-L119) reopens "Resolved" tickets to "Open" on customer reply. But [tickets.js:89-92](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L89-L92) reopens them to "In Progress". Two code paths for the same business logic yield different statuses. | Ticket status after customer reply on a resolved ticket is non-deterministic — depends on which code path fires. | Consolidate reopen logic to a single canonical location. |
| **Agent can resolve already-closed tickets** | [agent.js:112-143](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L112-L143): `POST /agent/agenttickets/:id/resolved` has no status check. It will happily set a Closed ticket back to "Resolved". | **Zombie ticket resurrection** — closed tickets reappear as resolved | Check current status before allowing resolve. Block if Closed. |
| **No agent ownership check on resolve** | The resolve endpoint at [agent.js:112](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L112) does not verify that the requesting agent owns the ticket. Any agent can resolve any ticket. | Agent A resolves Agent B's ticket. | Add `WHERE assigned_agent_id = $agentId` to the update query. |

### Messaging

| Scenario | Root Cause | User Impact | Recommended Fix |
|----------|-----------|-------------|-----------------|
| **Duplicate messages** | Both a REST endpoint (`POST /ticket/:id/message`) and a socket event (`send_message`) can insert messages. The frontend uses the socket, but the REST endpoint is still exposed. A malicious client could use both. | Duplicate messages in conversation. | Either remove the REST message endpoint or guard against double-writes. |
| **No message authorization on socket** | The socket `send_message` handler trusts the `sender` field from the client payload [server.js:56](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L56). A customer could send `sender: "Agent"` and messages would appear as agent messages. | **Message spoofing** — customer messages appear as agent replies, fooling the other party. | Derive `sender` from `socket.user.role` instead of trusting client input. |
| **No ticket ownership check on socket messages** | The socket handler does not verify that the `sender_id` (from JWT) is either the ticket's `customer_id` or `assigned_agent_id`. Any authenticated user can inject messages into any ticket. | **Cross-ticket message injection** | Verify ownership before inserting. |

### Notifications

| Scenario | Root Cause | User Impact | Recommended Fix |
|----------|-----------|-------------|-----------------|
| **Duplicate notifications on customer reply to resolved ticket** | [server.js:100-132](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L100-L132): When a customer replies to a resolved ticket, the handler inserts a `CUSTOMER_REPLY` notification **and** a `TICKET_REOPENED` notification — two notifications for one action. | Agent gets notification spam for a single customer reply. | Consolidate into a single notification or make them conditional. |
| **Notifications not scoped to user** | [noti.js](file:///d:/CCE/WebDev_Course/supportiq/server/routes/noti.js) is mounted at both `/` and `/agent` [server.js:205-207](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L205-L207). All notification queries filter by `user_id = req.customer_id`, which is fine — but the same notification service is shared. If a customer and agent have the same `users.id` (impossible with SERIAL, but the system doesn't enforce role separation at the DB level), they could see each other's notifications. | Low risk but architecturally messy. | Consider separate notification tables or add role filtering. |

---

## 3. Authorization & Security Audit

### Authentication

| Severity | Exploit Scenario | Business Impact | Recommended Fix |
|----------|-----------------|-----------------|-----------------|
| **CRITICAL** | [.env:3](file:///d:/CCE/WebDev_Course/supportiq/server/.env#L3): `JWT_SECRET= suprasecret123` — hardcoded, trivially guessable secret. Any attacker can forge valid JWTs for any user. | **Complete authentication bypass.** Attacker creates tokens for any user/role. | Use a strong random secret (≥256-bit). Load from secure secrets manager. |
| **CRITICAL** | [.env:6](file:///d:/CCE/WebDev_Course/supportiq/server/.env#L6): `RESEND_API_KEY` is committed to source. | **API key leak** — attacker can send emails as your application, phishing users. | Remove from version control. Use environment variable injection. |
| **CRITICAL** | [.env:1](file:///d:/CCE/WebDev_Course/supportiq/server/.env#L1): Database credentials (`postgres:mgl123`) committed to source. | **Database compromise** — anyone with repo access can connect to the DB. | Remove from version control. |
| **HIGH** | JWT tokens expire in 1 hour ([auth.js:43](file:///d:/CCE/WebDev_Course/supportiq/server/routes/auth.js#L43), [auth.js:96](file:///d:/CCE/WebDev_Course/supportiq/server/routes/auth.js#L96)) but there is **no refresh token mechanism**. Once expired, the user is logged out. The frontend clears storage on 401/403, but there's no graceful re-auth. | Users lose their session mid-work, losing unsent messages. | Implement refresh token rotation. |
| **HIGH** | Password reset token at [auth.js:126-136](file:///d:/CCE/WebDev_Course/supportiq/server/routes/auth.js#L126-L136) uses the **same `JWT_SECRET`** as auth tokens. The reset token is a valid JWT that could be decoded to obtain user IDs. Also, the reset link is returned in the API response body [auth.js:145](file:///d:/CCE/WebDev_Course/supportiq/server/routes/auth.js#L145). | An attacker calling `/forgot-pwd` gets the reset link directly in the response — no need to intercept email. **Account takeover.** | Remove `reset_link` from the response body. Use a separate signing secret for reset tokens. |

### Authorization (IDOR & Broken Access Control)

| Severity | Exploit Scenario | Business Impact | Recommended Fix |
|----------|-----------------|-----------------|-----------------|
| **CRITICAL** | `GET /ticket/:id/messages` at [tickets.js:70-78](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L70-L78) — **NO ownership check**. Any authenticated user (customer or agent) can read messages for any ticket by changing the ID in the URL. | **Full conversation data leak** for all tickets. | Add `WHERE ticket_id = $1 AND (customer_id = $2 OR assigned_agent_id = $2)` |
| **CRITICAL** | `POST /ticket/:id/message` at [tickets.js:83-98](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L83-L98) — no ownership check. Any authenticated user can post messages to any ticket, always as "Customer". | **Message injection** into any ticket. | Add ownership verification. |
| **CRITICAL** | `PUT /ticket/:id/status` at [tickets.js:103-113](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L103-L113) — checks `customer_id` so only the owning customer can change status, BUT there is **no validation on the status value**. Customer can set any arbitrary string. | **State corruption** — set status to anything. | Whitelist valid statuses. |
| **CRITICAL** | `DELETE /ticket/message/:id/` at [tickets.js:117-127](file:///d:/CCE/WebDev_Course/supportiq/server/routes/tickets.js#L117-L127) — checks `sender_id = req.customer_id`, but `customer_id` in the JWT is `users.id`. If an agent's `users.id` happens to match the `sender_id` of a customer's message, the agent could delete customer messages. More critically, the endpoint is accessible to agents who could enumerate message IDs. | **Message deletion by unauthorized users** | Add explicit role + ownership check. |
| **HIGH** | `GET /agent/unassigned` at [agent.js:21-32](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L21-L32) — **NO role check**. Any authenticated customer can view all unassigned tickets including full details (`SELECT *`). | **Customer can see all other customers' tickets** (titles, descriptions, categories). | Add `if (req.role !== "agent") return res.status(403)`. |
| **HIGH** | `GET /agent/ahome` at [agent.js:8-19](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L8-L19) — checks `req.role !== "agent"`, but returns **all assigned tickets** (not just the requesting agent's). The query has no `WHERE assigned_agent_id = $1` filter. | Agent can see all other agents' tickets. | Add agent ID filter to the query. |
| **HIGH** | `POST /agent/agenttickets/:id/resolved` at [agent.js:112-143](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js#L112-L143) — **no role check, no ownership check**. Any authenticated user can resolve any ticket. | **Customer resolves their own ticket**, bypassing agent workflow. Or one agent resolves another's ticket. | Add role check + ownership verification. |
| **HIGH** | Socket `send_message` — trusts client-supplied `sender` field. A customer can send `{sender: "Agent", ...}` to impersonate an agent. | **Agent impersonation** in conversations. | Derive sender from `socket.user.role`. |
| **MEDIUM** | [auth.js:11-58](file:///d:/CCE/WebDev_Course/supportiq/server/routes/auth.js#L11-L58) — signup accepts **any role from the client** including `"agent"` and `"manager"`. There is no admin approval flow. | **Anyone can register as an agent or manager** and access all agent/manager functionality. | Restrict signup roles to `"customer"` only. Require admin invite for agent/manager accounts. |
| **MEDIUM** | [PrivateRoute.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/PrivateRoute.jsx) — most agent routes don't pass `role='agent'` prop (only `/agent/ahome` does). All other agent pages are accessible to any authenticated user. | **Customer can access agent dashboard, tickets, unassigned queue, performance page** via URL. | Add `role='agent'` to all agent PrivateRoutes. (This is defense-in-depth; the real fix must be server-side.) |

### Input Validation

| Severity | Exploit Scenario | Business Impact | Recommended Fix |
|----------|-----------------|-----------------|-----------------|
| **HIGH** | **Stored XSS** — message content (`m.message`) is rendered directly in React JSX via `{m.message}` in both [ViewTicket.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/ViewTicket.jsx#L191) and [AgentTicketView.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentTicketView.jsx#L147). React auto-escapes JSX, so **this is safe against XSS by default**. However, notification `message_content` is constructed via string concatenation with `ticket_id` (an integer), so no injection there either. **LOW RISK currently** but fragile — any future use of `dangerouslySetInnerHTML` would be exploitable. | Currently safe due to React's default escaping. | Continue avoiding `dangerouslySetInnerHTML`. Add server-side sanitization as defense-in-depth. |
| **HIGH** | **File upload** — [upload.js](file:///d:/CCE/WebDev_Course/supportiq/server/middleware/upload.js) has **no file type validation, no file size limit**. An attacker can upload `.exe`, `.php`, `.html` files of any size. | **Arbitrary file upload** — disk exhaustion, potential RCE if files are served by a web server that executes them. | Add `fileFilter` for allowed MIME types, add `limits: { fileSize: 5 * 1024 * 1024 }`. |
| **MEDIUM** | **SQL Injection** — all queries use parameterized queries (`$1`, `$2`), so **SQL injection is mitigated**. | Safe. | No action needed. |
| **MEDIUM** | Server-side input validation is minimal. `title`, `category`, `description` have no length limits beyond the DB column sizes. A 10MB `description` field would be accepted. | **Payload abuse**, potential DB performance issues. | Add `express-validator` or manual length checks. |

### Exposed Secrets

> [!CAUTION]
> The `.env` file at [server/.env](file:///d:/CCE/WebDev_Course/supportiq/server/.env) contains:
> - Database password: `mgl123`
> - JWT secret: `suprasecret123`
> - Resend API key: `re_hgEDWPpU_Dt4dEkZSmwcxWVMu4CreUuKs`
>
> If this `.env` has ever been committed to git, **rotate ALL credentials immediately**.

---

## 4. Database Audit

### Schema Issues

| Issue | Severity | Table | Detail | Fix |
|-------|----------|-------|--------|-----|
| **Missing CHECK on `tickets.status`** | CRITICAL | `tickets` | Column `status VARCHAR(20) DEFAULT 'Open'` has no CHECK constraint. Any string is valid. | `ALTER TABLE tickets ADD CONSTRAINT valid_status CHECK (status IN ('Open','In Progress','Resolved','Closed'));` |
| **Missing FK on `Notifications.user_id`** | HIGH | `Notifications` | Schema references `Users(id)` but actual table is `users` (lowercase). Also, `AUTO_INCREMENT` is MySQL syntax — this should be `SERIAL` for PostgreSQL. | Fix FK reference, use `SERIAL`. |
| **Duplicate `ticket_feedback` CREATE** | MEDIUM | `ticket_feedback` | [queries.sql:80-101](file:///d:/CCE/WebDev_Course/supportiq/server/queries.sql#L80-L101) defines `ticket_feedback` twice (identical DDL). | Remove duplicate. |
| **Missing NOT NULL on `ticket_messages.sender_id`** | HIGH | `ticket_messages` | `sender_id INT` allows NULL. System messages may not have a sender, but customer/agent messages should always have one. | Add NOT NULL or add a CHECK that `sender_id IS NOT NULL WHEN sender_type IN ('Customer','Agent')`. |
| **Missing NOT NULL on `ticket_messages.delivered/seen`** | MEDIUM | `ticket_messages` | Schema doesn't show `delivered` or `seen` columns, but they're used extensively in code. If they were added later without NOT NULL + DEFAULT, NULLs may exist. | Ensure `delivered BOOLEAN DEFAULT false NOT NULL, seen BOOLEAN DEFAULT false NOT NULL`. |
| **Missing `is_deleted` column in schema** | MEDIUM | `ticket_messages` | Code references `is_deleted` but it's not in the CREATE TABLE statement. | Add to schema DDL. |
| **No index on `tickets.assigned_agent_id`** | HIGH | `tickets` | Every agent dashboard, ticket listing, and performance query filters by `assigned_agent_id`. Without an index, these are full table scans. | `CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);` |
| **No index on `tickets.status`** | MEDIUM | `tickets` | Filtered queries on status (open, resolved, etc.) require index for scale. | `CREATE INDEX idx_tickets_status ON tickets(status);` |
| **No index on `tickets.customer_id`** | MEDIUM | `tickets` | `mytickets` queries filter by `customer_id`. | `CREATE INDEX idx_tickets_customer ON tickets(customer_id);` |
| **No index on `Notifications.user_id`** | HIGH | `Notifications` | Every notification fetch filters by `user_id`. | `CREATE INDEX idx_noti_user ON Notifications(user_id);` |
| **No index on `ticket_messages.ticket_id`** | HIGH | `ticket_messages` | Message history queries filter by `ticket_id`. | `CREATE INDEX idx_msgs_ticket ON ticket_messages(ticket_id);` |
| **`tickets.updated_at` never updated** | MEDIUM | `tickets` | Column exists with `DEFAULT CURRENT_TIMESTAMP` but no trigger or application code ever updates it. | Add a trigger: `CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;` |

### Data Integrity Risks

| Risk | Detail |
|------|--------|
| **Orphan messages** | If a user is deleted from `users`, their `sender_id` in `ticket_messages` has no FK constraint. Messages reference a nonexistent sender. |
| **No transaction boundaries** | All multi-query operations (message + notification + status update) run without transactions. Partial failures create inconsistent state. |
| **Orphan notifications** | `Notifications.ticket_id` references `Tickets(ticket_id)` but without `ON DELETE CASCADE`. If a ticket is deleted, notifications persist with dangling references. |
| **Race condition on unassigned count** | No SELECT FOR UPDATE or advisory lock on the assignment query. Under high concurrency, `assigned_agent_id IS NULL` could match for two concurrent requests before either commits. PostgreSQL's MVCC handles this correctly for single-row updates, but the notification logic still fires for the loser. |

### Performance Risks

| Risk | Endpoint | Detail |
|------|----------|--------|
| **N+1 query pattern** | `GET /agent/agenttickets/:id` | Fires 3 queries (orphan `SELECT *`, ownership check, messages). Should be 2 queries max. |
| **SELECT * anti-pattern** | Multiple endpoints | `SELECT *` returns all columns including potentially large `description` and `image_url` in list views where only summary fields are needed. |
| **No pagination** | All list endpoints | `GET /mytickets`, `GET /agent/agenttickets`, `GET /agent/unassigned`, `GET /agent/ahome`, `GET /noti` — all return every row. At 10K tickets, these queries will time out. |
| **6 sequential queries** | `GET /agent/performance` | Fires 6 independent queries sequentially. Could be parallelized with `Promise.all()`. |

---

## 5. Socket.IO / Real-Time Audit

| Issue | Severity | How It Happens | User Experience | Fix |
|-------|----------|---------------|-----------------|-----|
| **Singleton socket shared across components** | HIGH | [socket.js](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/socket.js) exports a single socket instance. Both [ViewTicket.jsx:82](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/ViewTicket.jsx#L82) and [NotificationToast.jsx:103](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/NotificationToast.jsx#L103) call `socket.connect()`. ViewTicket also calls `socket.disconnect()` on cleanup. **This disconnects the notification toast.** | User leaves a ticket view → notification toast stops working until they navigate to another ticket. | Don't disconnect the global socket. Use `socket.leave(room)` instead, or use room management without disconnect. |
| **Multiple connect() calls** | HIGH | NotificationToast calls `socket.connect()` if not connected. ViewTicket also calls `socket.connect()`. AgentTicketView does the same. Each mount could attempt a reconnect. | Race condition on auth token — if the token is refreshed between mounts, the socket may use the old token. | Centralize socket connection management in a single provider/context. |
| **Event listener accumulation** | MEDIUM | Every time a user navigates between ticket views, new listeners are registered. The cleanup in the `return` function calls `socket.off("event_name")` which removes ALL listeners for that event, including those from NotificationToast. | Notification toast `new_notification` listener could be accidentally removed if ViewTicket registered one with the same name. | Use specific function references in `socket.off(event, specificFn)`. |
| **No reconnection handling** | MEDIUM | If the socket disconnects (network blip), the user is not re-joined to their ticket room. The `join_ticket` event only fires on initial `connect`. | Messages stop appearing until the user refreshes the page. | Listen for the `reconnect` event and re-emit `join_ticket`. |
| **`window.typingTimer` collision** | MEDIUM | Both [ViewTicket.jsx:218-224](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/ViewTicket.jsx#L218-L224) and [AgentTicketView.jsx:168-174](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentTicketView.jsx#L168-L174) use `window.typingTimer`. If two tabs are open, they share the same global variable and clear each other's timers. | Typing indicator flickers or never stops in multi-tab scenario. | Use a `useRef` per component instead of `window.typingTimer`. |
| **mark_seen marks ALL messages from the other party** | MEDIUM | [server.js:184-188](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L184-L188) marks **all** messages from the opposite sender type in the ticket as seen, not just unseen ones. This is idempotent but inefficient. | No user-visible issue, but generates unnecessary DB writes. | Add `AND seen = false` to the WHERE clause. |
| **No socket authentication refresh** | HIGH | If the JWT expires (1 hour), the socket connection remains alive with the old token. The server validated the token at connection time only. | User continues to send/receive messages with an expired token. The socket middleware doesn't re-validate on each event. | Implement periodic token re-validation or disconnect on expiry. |
| **Ticket room IDs are plain integers** | LOW | `socket.join(ticket_id)` — ticket_id is a plain integer like `42`. Any socket client can emit `join_ticket` with any integer and eavesdrop on conversations. | **Cross-ticket message eavesdropping** via socket. | Verify ticket ownership before joining the room. |

---

## 6. Architecture Decisions That Become Expensive Later

### Audit/Event Model

> [!WARNING]
> **There is NO audit trail.** The system cannot answer:
> - Who assigned the ticket?
> - Who changed the status?
> - When was it reassigned?
> - What was the previous status?
>
> This is a **showstopper** for any enterprise customer and will require a major refactor later.

**Recommendation**: Add a `ticket_events` table:
```sql
CREATE TABLE ticket_events (
    event_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id),
    actor_id INT NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- 'CREATED','ASSIGNED','STATUS_CHANGED','RESOLVED','CLOSED','REOPENED'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pagination Strategy

> [!CAUTION]
> **No endpoint is paginated.** Every list endpoint returns all records:
> - `GET /mytickets` — all customer tickets
> - `GET /agent/agenttickets` — all agent tickets
> - `GET /agent/unassigned` — all unassigned tickets
> - `GET /agent/ahome` — all assigned tickets
> - `GET /ticket/:id/messages` — all messages
> - `GET /noti` — all notifications
>
> At scale (>1000 tickets), this will cause **timeout errors** and **browser memory exhaustion**.

**Recommendation**: Add `LIMIT $N OFFSET $M` or cursor-based pagination to all list endpoints.

### Rate Limiting Strategy

> [!CAUTION]
> **No rate limiting exists anywhere.**
> - Login: No brute-force protection. Attacker can try thousands of passwords per second.
> - Signup: No limit. Attacker can create thousands of accounts.
> - Forgot password: No limit. Attacker can flood any email address with reset links.
> - Ticket creation: No limit. Attacker can spam thousands of tickets.
> - Message sending: No limit on socket events. Attacker can flood a ticket with messages.

**Recommendation**: Add `express-rate-limit` middleware:
```javascript
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/login', loginLimiter);
app.use('/signup', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));
app.use('/forgot-pwd', rateLimit({ windowMs: 15 * 60 * 1000, max: 3 }));
```

### Ownership Model

| Issue | Detail |
|-------|--------|
| `customer_id` naming confusion | The JWT payload uses `customer_id` to store `users.id` for ALL roles. This is confusing and error-prone (see `mark_seen` bug where `socket.user.agent_id` is referenced but doesn't exist). |
| Single `users` table | Agents, customers, and managers share a single `users` table with a `role` column. There's no separate agents/customers table despite the schema referencing `customers(customer_id)` and `agents(agent_id)`. The FK references in `queries.sql` don't match the actual table structure. |
| No role hierarchy | There's no concept of Manager > Agent > Customer permissions. A Manager role exists in signup but has no special endpoints or capabilities. |

### State Machine Design

> [!WARNING]
> **No state machine exists.** The valid states are `Open → In Progress → Resolved → Closed`, but:
> - Any user can set any status string via `PUT /ticket/:id/status`
> - An agent can set Closed → Resolved via the resolve endpoint
> - A customer can set Resolved → Open (socket) or Resolved → In Progress (REST) — inconsistently
> - There is no explicit transition validation anywhere
>
> **This will cause data inconsistency and customer confusion.**

**Recommended state machine:**
```
Open → In Progress (on first agent reply)
Open → Resolved (agent action)
In Progress → Resolved (agent action)
Resolved → Open (customer reply / reopen)
Resolved → Closed (customer accepts + rates)
Closed → (terminal, no transitions)
```

---

## 7. Frontend Audit

| Issue | Severity | Component | User-Visible Consequence | Fix |
|-------|----------|-----------|-------------------------|-----|
| **Socket disconnects kill notification toast** | HIGH | [ViewTicket.jsx:82](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/ViewTicket.jsx#L82), [AgentTicketView.jsx:64](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentTicketView.jsx#L64) | User leaves ticket view → all real-time notifications stop globally. | Remove `socket.disconnect()` from component cleanup. Manage socket lifecycle globally. |
| **No loading states for ticket lists** | MEDIUM | [Mytickets.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/Mytickets.jsx), [AgentTickets.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentTickets.jsx) | User sees empty table while data is loading. AgentTickets has a `loading` state but **never sets it to `true`** (line 11 initializes to `false`). | Initialize `loading: true` and show spinner. |
| **No error states** | MEDIUM | All list pages | If API calls fail, the user sees an empty page with no error message. | Add error state + retry button. |
| **`window.typingTimer` is global** | MEDIUM | ViewTicket.jsx, AgentTicketView.jsx | Multi-tab: typing indicators break. Two tabs clear each other's timers. | Use `useRef()` for the timer ID. |
| **Stale UI on optimistic update failure** | MEDIUM | [AgentTicketView.jsx:96-106](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentTicketView.jsx#L96-L106) | Agent clicks "Mark as Resolved" → `handleResolve` fires → `.then()` updates local state, but if the API fails, the `.catch()` shows an alert but the ticket status in UI may already reflect the optimistic update from a socket event. | Reconcile local state with server response. |
| **Auto-dismiss timer leak** | LOW | [NotificationToast.jsx:114-121](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/NotificationToast.jsx#L114-L121) | Every time the `toasts` array changes, new timers are created for ALL non-exiting toasts, including ones that already have timers. This creates redundant `setTimeout` calls. | Track which toasts already have timers. Use a Map of timer IDs keyed by toast ID. |
| **No logout on customer pages** | LOW | [TicketNavbar.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/TicketNavbar.jsx) | Customer has no way to log out from the UI. They must clear localStorage manually. | Add a logout button. |
| **Missing `/unauth` route** | LOW | [PrivateRoute.jsx:11](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/components/PrivateRoute.jsx#L11) | If a customer tries to access an agent-only route, they're redirected to `/unauth` which doesn't exist → blank page. | Add a 403 page or redirect to `/`. |
| **`formData` not reset on login mode** | LOW | [LS_cust.jsx:124](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/customer/LS_cust.jsx#L124), [LS_Reps.jsx:123](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/LS_Reps.jsx#L123) | After submit (success or failure), form data is cleared including `role`. But clearing happens AFTER navigation, so it's effectively a no-op on success. On failure, the user loses all their input. | Only clear on success; don't clear on error. |
| **CORS fully open** | MEDIUM | [server.js:17](file:///d:/CCE/WebDev_Course/supportiq/server/server.js#L17) | `app.use(cors())` with no options = accepts requests from ANY origin. While Socket.IO cors is configured, the Express CORS is wide open. | Match Express CORS to the Socket.IO config: `app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))` |

---

## Top 10 Critical Issues

1. **Secrets committed to source** — JWT secret, DB password, Resend API key all in `.env` checked into git
2. **No ownership check on `GET /ticket/:id/messages`** — any user reads any conversation
3. **Socket `sender` field is client-controlled** — customer can impersonate agent
4. **No role check on multiple agent endpoints** — customers access agent functions
5. **No ticket status CHECK constraint or validation** — arbitrary strings accepted as status
6. **`mark_seen` uses nonexistent `socket.user.agent_id`** — read receipts broken for agents
7. **Password reset link returned in API response body** — trivial account takeover
8. **No `try/catch` on 5 route handlers** — server crashes on invalid input
9. **Anyone can signup as agent/manager** — no role restriction on registration
10. **Closed tickets still accept socket messages** — violates ticket lifecycle

## Top 10 Security Risks

1. **Trivially guessable JWT secret** (`suprasecret123`) — full auth bypass
2. **Reset link in response body** — account takeover without email access
3. **No role restriction on signup** — privilege escalation to agent/manager
4. **IDOR on messages endpoint** — read any customer's conversation
5. **IDOR on message insert** — inject messages into any ticket
6. **Socket message spoofing** — impersonate agent role
7. **Unrestricted file uploads** — no type/size validation
8. **No rate limiting** — brute force login, credential stuffing, spam
9. **CORS wide open** — cross-origin attacks possible
10. **Socket room join without auth** — eavesdrop on any ticket

## Top 10 Business Logic Flaws

1. **No state machine** — any status string is accepted, no transition validation
2. **Conflicting reopen logic** — socket sets "Open", REST sets "In Progress"
3. **Agent resolves any ticket** — no ownership check on resolve endpoint
4. **Customer modifies ticket status freely** — can set to any value
5. **Notification fires before assignment check** — ghost notifications for failed assignments
6. **Closed tickets still messageable via socket** — zombie conversations
7. **Agent can resurrect closed tickets** — resolve endpoint has no status guard
8. **No reassignment mechanism** — tickets orphaned if agent leaves
9. **autoClose cron never runs** — module never imported
10. **Duplicate REST + Socket message paths** — two ways to insert messages with different behaviors

---

## Must Fix Before Next Phase

> [!CAUTION]
> These are **production blockers**. Do not ship without fixing:

1. Rotate all secrets (JWT, DB password, Resend API key). Remove `.env` from git.
2. Add ownership checks to ALL ticket/message endpoints (IDOR fixes)
3. Add role checks to all agent endpoints
4. Add `try/catch` to every route handler
5. Derive `sender` from JWT, not from client payload
6. Remove `reset_link` from forgot-password API response
7. Restrict signup to `customer` role only
8. Add ticket status CHECK constraint + server-side validation
9. Add file upload validation (type + size)
10. Fix `socket.user.agent_id` bug in mark_seen
11. Block messages on Closed tickets
12. Fix CORS — restrict to frontend origin only

## Can Fix Later

1. Add pagination to all list endpoints
2. Add rate limiting
3. Add audit trail (`ticket_events` table)
4. Add refresh token mechanism
5. Add database indexes
6. Consolidate reopen logic (socket vs REST)
7. Add transaction boundaries to multi-query operations
8. Implement socket reconnection handling
9. Fix frontend loading/error states
10. Add customer logout button
11. Add reassignment endpoint
12. Import autoClose cron job

## Technical Debt Being Created

| Debt | Future Cost |
|------|-------------|
| No audit trail | Every enterprise customer will demand it. Requires new table + retrofitting all endpoints. |
| No pagination | Will cause timeouts at ~1K tickets. Every endpoint must be modified. |
| Singleton socket pattern | Will cause increasingly complex bugs with multi-tab and reconnection. Needs full refactor to context/provider pattern. |
| Single users table for all roles | Will become unmanageable when role-specific fields are needed. May require table-per-role migration. |
| No state machine | Every new status transition requires careful checking of 3-4 different code paths. Will accumulate inconsistencies. |
| `customer_id` naming in JWT | Confusing name causes bugs (see mark_seen). Every developer will make this mistake. |
| No integration tests | Zero test coverage means every change risks regression. |
| Hardcoded notification templates | Future i18n will require touching every notification INSERT. |

---

## Scores

### Architecture Risk Score: 72/100
> High risk. No audit trail, no pagination, no state machine, no rate limiting. The foundation will require significant rework for production scale.

### Security Risk Score: 88/100
> **Critical risk.** Committed secrets, multiple IDOR vulnerabilities, no role enforcement on most endpoints, unrestricted signup, message spoofing. An attacker with basic skills can compromise the entire system in minutes.

### Production Readiness Score: 18/100
> **Not production-ready.** The application has critical security vulnerabilities, no error handling on multiple routes, broken business logic (mark_seen, reopen inconsistency), and zero rate limiting. Deploying this would be a liability.
