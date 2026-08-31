# SupportIQ

A full-stack customer support ticketing platform built to demonstrate real-world helpdesk workflows — ticket lifecycle management, role-based access control, real-time agent-customer communication, and AI-assisted response generation.

**Status:** Core ticketing, real-time chats, and AI response generation are fully functional. Additional automation features are in planning/design.

---

## Why This Project

Support teams at growing companies lose time to manual triage, unclear ticket ownership, and slow response cycles. SupportIQ is built to address the core challenges of helpdesk software — stateless JWT authentication, complex relational relational schemas (users, agents, tickets, messages, CSAT feedback), real-time bidirectional messaging, and AI-assisted triage/agent workflows.

---

## Key Features

**Authentication & Access Control**
- JWT-based authorization with role separation (Customer vs. Agent)
- Protected frontend routes via React Router and backend route-guard middleware
- Encrypted password storage using `bcrypt`

**Ticket Lifecycle Management**
- Create, categorize, and prioritize customer support tickets
- Status tracking (`Open` → `In Progress` → `Resolved` → `Closed`)
- File uploads for ticket attachments using `Multer`
- Daily auto-closure background job (`node-cron`) that automatically archives tickets resolved for more than 5 days

**Agent Workflow & Collaboration**
- Agent dashboard split into Assigned and Unassigned ticket queues
- One-click ticket self-assignment
- Real-time agent-to-customer communication

**AI Copilot Integration**
- Live SSE (Server-Sent Events) streaming of AI-suggested responses using Gemini 1.5 Flash
- Tone presets (Professional, Empathetic, Concise) directly selectable from the chat panel
- Instant insertion of suggestions into the active chat input
- Offline context-aware mock streaming fallback if Gemini keys are not configured

**Real-Time Communication**
- Chat threads between customers and agents powered by `Socket.IO`
- Live typing indicators and message delivery/read receipts (`Seen`/`Delivered` indicators)
- Instant real-time user notifications on replies or status updates

**Performance & Analytics Dashboard**
- Personalized metrics for agents, tracking resolved ticket counts and active workloads
- Average Resolution Time tracking (computed in hours via Postgres epoch time queries)
- Average Customer Satisfaction (CSAT) score calculations
- Data visualizations including a 30-day Resolution Trend area chart and rating distribution bar chart (powered by `Recharts`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Vite, React Router, Axios, Recharts, Socket.io-client |
| **Backend** | Node.js, Express.js, Node-cron, Resend |
| **Database** | PostgreSQL |
| **Real-time** | Socket.IO |
| **Auth** | JWT, Bcrypt |
| **File Handling**| Multer |

---

## Architecture

```
SupportIQ/
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API config
│   │   ├── assets/         # Static assets
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # SocketContext provider
│   │   ├── pages/          # Route-level views (customer/ & agent/)
│   │   ├── styles/         # CSS styles
│   │   ├── App.jsx         # Routes definition
│   │   └── main.jsx        # App mounting
│
├── server/
│   ├── bg_jobs/            # Auto-close daily cron jobs
│   ├── config/             # DB pool setup
│   ├── middleware/         # Auth, upload, and error middleware
│   ├── routes/             # API routing & controllers
│   ├── services/           # Email (Resend) & Notification services
│   ├── uploads/            # Uploaded ticket attachments
│   └── queries.sql         # Database schema
│
└── README.md
```

---

## Roadmap

Actively planned, in priority order:

- [ ] Automatic ticket categorization & priority prediction (ML classification)
- [ ] Semantic search over historical tickets (RAG-based knowledge retrieval)
- [ ] Admin/Manager dashboard with SLA breach monitoring
- [ ] Email notifications for new ticket updates (replies and status changes)
- [ ] Docker containerization and cloud deployment

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database instance

### 1. Database Setup
Create tables and database schemas by running the SQL scripts in `server/queries.sql` in your Postgres database.

### 2. Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file (see `.env.example` inside the `server` directory) with database credentials, `JWT_SECRET`, `RESEND_API_KEY`, `GROQ_API_KEY`, and AWS S3 credentials.
4. Start the server:
   ```bash
   node server.js
   ```

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file (see `.env.example` inside the `frontend` directory):
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

