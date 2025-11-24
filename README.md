# Intelligent Alert System (Case Study)

This is a small, working demo that turns raw events into alerts. It sets a severity (CRITICAL, WARNING, INFO), lets you filter and resolve alerts, and does simple background actions like escalation and auto-close. The focus is clarity over complexity.

## What’s inside
- Backend (Node + Express + TypeScript + MongoDB)
- Frontend (React + TypeScript + Vite)
- File‑driven rules to decide severity and behavior
- Background worker to expire/auto-close alerts

## Key features
- Create alerts from events (or use the demo generator)
- Severity via rule engine (e.g., CRITICAL if a condition matches)
- Resolve alerts with an optional reason
- Escalation if many similar alerts happen in a short time
- Auto-close based on flags or age
- Filter by severity on the dashboard
- Basic counts, top drivers, trends, and a history timeline

## Quick start
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../client
npm install
npm run dev
```
By default the backend runs on `http://localhost:5001` and the frontend on `http://localhost:5173`.

Ensure MongoDB is running locally, or set a connection string with `MONGO_URI`.

## Minimal config
Backend (see `backend/src/config/index.ts`):
- `MONGO_URI` (default: local)
- `PORT` (default: 5001)
- `ALERT_EXPIRY_HOURS` (default: 24)
- `WORKER_CRON` (default: every 2 mins)

Frontend:
- `VITE_BACKEND_BASE` (backend URL, default points to localhost:5001)

## How it works (short)
- Rules: `rules.json` contains simple conditions (like `$gt`, `$lt`) tied to `eventTypes`. First matching rule sets the alert severity.
- Worker: runs on a schedule to expire old alerts and re-evaluate rules (for escalation/auto-close).
- History: every important change logs an event so you can see a timeline for each alert.

## Using the app
1. Start both servers.
2. Open the frontend URL.
3. Use the demo tool to generate alerts, or connect real sources.
4. Filter by severity to focus on CRITICAL/WARNING/INFO.
5. Click an alert to view details, history, and resolve it if needed.

## Project structure (brief)
```
backend/  # API, rules, worker, models
client/   # React dashboard
```
