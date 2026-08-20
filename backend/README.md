# CivicPulse — Backend

AI-Powered Citizen-to-Infrastructure Intelligence Platform.

## Purpose

This is the backend service for CivicPulse, built with Node.js, Express, and MongoDB.
This step establishes only the core backend foundation (server, config, health check).

## Requirements

- Node.js (v18+)
- npm
- MongoDB running locally or accessible via connection string

## Installation

\`\`\`bash
cd backend
npm install
\`\`\`

## Environment Setup

Copy the example env file and edit as needed:

\`\`\`bash
cp .env.example .env
\`\`\`

`.env` contents:

\`\`\`
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civicpulse
\`\`\`

## Running the Development Server

\`\`\`bash
npm run dev
\`\`\`

## Health Endpoint

\`\`\`
GET http://localhost:5000/api/health
\`\`\`

### Expected Response

\`\`\`json
{
  "success": true,
  "message": "CivicPulse API is running",
  "timestamp": "2026-08-17T10:00:00.000Z"
}
\`\`\`

## AI Architecture Principle

AI understands citizen language. It does not determine policy priority.

Citizen Voice/Text → AI → Structured Request → Trusted Data →
Deterministic Analytics → Priority Score → Policy Recommendation

The AI layer (`backend/src/services/ai/`) only performs semantic extraction:
language detection, translation, category/subcategory/problem extraction,
location extraction, and urgency classification — all validated against
strict allow-lists in `backend/src/utils/requestValidation.js` before being
trusted.

The AI never calculates population, infrastructure indexes, investment
figures, investment gap, or priority scores. Those come exclusively from
the deterministic engine in `backend/src/services/` (demand, infrastructure,
population, investment, priority services), operating on structured
datasets. This separation is intentional and permanent — it is NOT:

Citizen → LLM → "Government should build this"
All demographic, infrastructure and investment values used in the MVP are synthetic demonstration data unless otherwise explicitly sourced.

## Production Environment Notes

- Set `MONGODB_URI` to your MongoDB Atlas (or other hosted) connection string — no code change required, `connectDB()` already reads it from the environment.
- Set `CORS_ORIGIN` to your deployed frontend's exact origin (e.g. `https://civicpulse.example.com`). Multiple origins can be comma-separated. Never set this to `*` in production.
- Set `AI_MOCK_MODE=false` and provide a real `LLM_API_KEY` + `LLM_MODEL` to use the real AI provider instead of the deterministic mock.
- `.env` is git-ignored; never commit real credentials. Use your hosting platform's environment variable settings instead.
- Start the server in production mode with `npm start` (runs `node src/server.js`, no nodemon/file-watching overhead).