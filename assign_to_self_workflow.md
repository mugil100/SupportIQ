# Assign to Self Workflow

This document explains the complete flow of how the "Assign to Self" feature works in the SupportIQ application, from the frontend click to the database update.

## 1. Frontend (`AgentUnassigned.jsx`)

1. **User Interaction**: The agent views the list of unassigned tickets on the `/agent/unassigned` page. For each ticket, there is an "Assign to Self" button.
2. **Event Trigger**: When the button is clicked, the `handleAssign(ticket_id)` function is invoked.
3. **API Request**: 
   - A `PUT` request is made to the backend endpoint: `/agent/unassigned/assign`.
   - The payload sent in the request body is simply `{ ticket_id }`.
   - The agent's JWT token is included in the `Authorization` header (handled automatically by the Axios interceptor and explicitly in the function).
4. **UI Update**: 
   - Upon a successful response from the backend, the frontend triggers a fresh `GET` request to `/agent/unassigned` to retrieve the updated list of tickets.
   - The `tickets` state is updated, which causes the UI to re-render. Since the ticket now has an assigned agent, it will no longer appear in this unassigned list.

## 2. Backend (`server/routes/agent.js`)

1. **Authentication**: The request hits the `PUT /unassigned/assign` route and first passes through the `verifyToken` middleware. This middleware decodes the JWT token and attaches the agent's ID to `req.customer_id`.
2. **Data Extraction**: The route handler extracts the `ticket_id` from the request body (`req.body`) and the `agentId` from `req.customer_id`.
3. **Database Query**: The backend executes the following SQL query using the `pool`:
   ```sql
   UPDATE tickets 
   SET assigned_agent_id = $1 
   WHERE ticket_id = $2 AND assigned_agent_id IS NULL 
   RETURNING *
   ```
   - `$1` is the `agentId` and `$2` is the `ticket_id`.
   - **Race Condition Prevention**: The clause `AND assigned_agent_id IS NULL` ensures that if two agents click "Assign to Self" at the exact same time, only the first one succeeds, preventing an already assigned ticket from being overwritten.
4. **Response**: 
   - If the ticket was successfully updated, it returns a `200 OK` JSON response with a success message.
   - If the ticket was not found or already assigned, it returns a `400 Bad Request` error.

## 3. Database (`tickets` table)

- The `tickets` table initially has the `assigned_agent_id` column set to `NULL` for new tickets.
- The SQL `UPDATE` statement modifies the row corresponding to the `ticket_id` and changes the `assigned_agent_id` to the agent's actual ID.
- Once this field is populated, the ticket is officially assigned. It will now appear on that specific agent's dashboard (via the `/agent/agenttickets` route) and disappear from the general unassigned queue.
