// backend/src/routes/events.ts
import { Router } from "express";
import * as eventController from "../controllers/eventController.js";
import { getEmitter } from "../services/eventEmitter.js";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// Rate limiter for SSE to prevent abuse
const sseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many SSE connections from this IP, please try again later.",
});

/**
 * GET /api/events
 * Query params:
 *  - alertId
 *  - type (CREATED|ESCALATED|AUTO_CLOSED|RESOLVED|INFO)
 *  - since (ISO date)
 *  - until (ISO date)
 *  - limit, skip
 */
router.get("/", authMiddleware(), eventController.listEvents);

/**
 * GET /api/events/counts
 * Optional query: since, until
 */
router.get("/counts", authMiddleware(), eventController.eventCounts);

/**
 * GET /api/events/export (admin only)
 * Optional query params: alertId, type, since, until, limit (default 500)
 * Returns CSV with columns: alertId,type,ts,payload_json
 */
import { EventLogModel } from "../models/EventLog.js";
router.get("/export", authMiddleware(["admin"]), async (req, res, next) => {
  try {
    const { alertId, type, since, until, limit } = req.query as Record<string, string>;
    const q: any = {};
    if (alertId) q.alertId = alertId;
    if (type) q.type = type;
    if (since || until) {
      q.ts = {};
      if (since) q.ts.$gte = new Date(since);
      if (until) q.ts.$lte = new Date(until);
    }
    const lim = Math.min(Number(limit) || 500, 5000);
    const rows = await EventLogModel.find(q).sort({ ts: -1 }).limit(lim).lean();
    const header = ["alertId", "type", "ts", "payload_json"].join(",");
    const escape = (v: string) => '"' + v.replace(/"/g, '""') + '"';
    const lines = rows.map(r => {
      const payloadJson = r.payload ? JSON.stringify(r.payload) : "";
      return [r.alertId, r.type, new Date(r.ts).toISOString(), payloadJson].map(x => escape(String(x))).join(",");
    });
    const csv = [header, ...lines].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=eventlog_export.csv");
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * Server-Sent Events endpoint — /api/events/stream
 * Stream recent events to connected clients.
 *
 * Note: simple in-memory emitter. Not suitable for multi-node production (requires Redis/WS).
 */
router.get("/stream", authMiddleware(), sseLimiter, (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // send a ping / initial event
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      ts: new Date().toISOString(),
    })}\n\n`
  );

  const emitter = getEmitter();
  const listener = (ev: any) => {
    try {
      res.write(`event: event\ndata: ${JSON.stringify(ev)}\n\n`);
    } catch (e) {
      // ignore write errors
    }
  };

  emitter.on("event", listener);

  // when client disconnects, remove listener
  req.on("close", () => {
    emitter.off("event", listener);
  });
});

export default router;
