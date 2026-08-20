# CivicPulse — Frontend

Government/policy-intelligence style frontend for CivicPulse, an AI-powered
Citizen-to-Infrastructure Intelligence Platform.

## Stack

- React + Vite (JavaScript)
- react-router-dom
- axios
- Plain modern CSS with design tokens (no UI library, no Tailwind)

## Requirements

- Node.js v18+
- The CivicPulse backend running locally (see `backend/README.md`)

## Installation

\`\`\`bash
cd frontend
npm install
\`\`\`

## Environment Setup

\`\`\`bash
cp .env.example .env
\`\`\`

`.env` contents:

\`\`\`
VITE_API_BASE_URL=http://localhost:5000/api
\`\`\`

## Running the Development Server

\`\`\`bash
npm run dev
\`\`\`

Vite will print a local URL, typically `http://localhost:5173`.

## Backend Connectivity

The sidebar shows a live **Backend: Connected / Offline** indicator, based on
`GET /api/health`. Start the backend (`npm run dev` inside `backend/`) before
or after the frontend — the indicator re-checks automatically.

## Pages

- `/` — Landing page
- `/citizen` — Citizen infrastructure request submission
- `/dashboard` — Policymaker KPI overview
- `/priorities` — Ranked priority list
- `/priorities/:id` — Priority detail breakdown

No analytics, priority scores, or recommendations are fabricated on the
frontend — all values come directly from the backend API, with explicit
loading/empty/error states when data is unavailable.--*