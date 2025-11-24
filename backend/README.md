# Intelligent Alert System – Backend

Small Node.js + Express + TypeScript service for creating alerts from events, deciding severity with simple rules, and exposing REST APIs for a React dashboard. Keeps things practical and easy to read.

## What it does
- Creates alerts with metadata and severity
- Applies JSON rules to set severity, escalate, or auto‑close
- Runs a background worker on a schedule (expiry, reevaluation)
- Logs a simple event history for each alert
- Exposes minimal REST endpoints used by the frontend

## Quick start
```bash
npm install
npm run dev
```
Defaults: server on `http://localhost:5001`, MongoDB on local instance. Make sure MongoDB is running or set a connection string.

## Minimal env (.env)
- `MONGO_URI` – MongoDB connection (default local)
- `PORT` – API port (default 5001)
- `ALERT_EXPIRY_HOURS` – auto‑close age window (default 24)
- `WORKER_CRON` – cron for worker (default `*/2 * * * *`)

## Core endpoints (short)
- `GET /health` – service check
- `GET /api/alerts` – list alerts (supports `severity`, `sourceType`, etc.)
- `GET /api/alerts/:id` – alert details
- `POST /api/alerts` – create alert
- `POST /api/alerts/:id/resolve` – resolve alert
- `POST /api/alerts/rules/reload` – reload rules (admin)

## Rules (simple example)
Rules live in `rules.json`. New format supports an array plus escalation/auto‑close sections:
```json
{
  "rules": [
    {
      "ruleId": "speed_high",
      "eventTypes": ["driver"],
      "severity": "CRITICAL",
      "condition": { "speed": { "$gt": 120 } }
    }
  ],
  "escalation": {
    "driver": { "escalate_if_count": 5, "window_mins": 10, "escalate_to": "CRITICAL" }
  },
  "auto_close": {
    "document": { "auto_close_if": "document_valid", "check_field": "document_valid" }
  }
}
```
The app hot‑reloads rules if the file changes.

## Worker (background)
Runs on the cron set in `WORKER_CRON` (default every 2 minutes):
- Auto‑closes alerts older than `ALERT_EXPIRY_HOURS` (if still open)
- Re‑evaluates alerts for escalation/auto‑close

## Auth (basic)
JWT‑style auth is supported for protected routes. For the case study, the focus is the alert flow; keep secrets in `.env`.