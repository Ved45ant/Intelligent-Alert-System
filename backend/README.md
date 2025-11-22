# Intelligent Alert Escalation & Resolution System - Backend

## Overview
This is the backend for an Intelligent Alert Escalation & Resolution System built with Node.js, Express, TypeScript, and MongoDB. It handles alert creation, rule-based escalation, event logging, and provides APIs for a frontend dashboard.

## Features
- Alert creation with metadata
- Rule engine for automatic escalation and auto-close based on JSON rules
- Background worker for periodic rule evaluation
- JWT-based authentication
- Server-Sent Events (SSE) for real-time updates
- RESTful APIs for alerts, events, dashboard summary

## Setup
1. Install dependencies: `npm install`
2. Set environment variables in `.env`:
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret for JWT tokens
   - `PORT`: Server port (default 5001)
   - `WORKER_CRON`: Cron expression for worker (default */2 * * * *)
3. Run in development: `npm run dev`
4. Build for production: `npm run build` then `npm start`

## API Endpoints
- `POST /api/auth/login` - Login
- `POST /api/auth/create-admin` - Create admin user
- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts
- `GET /api/alerts/:id` - Get alert by ID
- `POST /api/alerts/:id/resolve` - Resolve alert
- `GET /api/alerts/rules/list` - List rules
- `POST /api/alerts/rules/reload` - Reload rules (admin only)
- `GET /api/events` - List events
- `GET /api/events/counts` - Event counts
- `GET /api/events/stream` - SSE stream
- `GET /api/dashboard/summary` - Dashboard summary

## Rules Configuration
Rules are defined in `rules.json`. Example:
```json
{
  "overspeed": {
    "escalate_if_count": 3,
    "window_mins": 60,
    "escalate_to": "CRITICAL"
  }
}
```

## Testing
Run tests with `npm test`.

## Security
- Passwords are hashed with bcrypt
- JWT tokens for auth
- Rate limiting on sensitive endpoints
- Input validation with Zod

## Production Notes
- Use a production MongoDB instance
- Set strong JWT_SECRET
- Consider Redis for SSE in multi-node setup
- Monitor worker performance