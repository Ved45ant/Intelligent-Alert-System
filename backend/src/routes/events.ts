import { Router } from "express";
import * as eventController from "../controllers/eventController.js";
import { getEmitter } from "../services/eventEmitter.js";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middlewares/auth.js";
import { EventLogModel } from "../models/EventLog.js";

const router = Router();

const sseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many SSE connections from this IP, please try again later.",
});

router.get("/", authMiddleware(), eventController.listEvents);
router.get("/counts", authMiddleware(), eventController.eventCounts);
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

router.get("/stream", authMiddleware(), sseLimiter, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      ts: new Date().toISOString(),
    })}\n\n`
  );

  const emitter = getEmitter();
  const listener = (ev: any) => {
    try {
      res.write(`event: event\ndata: ${JSON.stringify(ev)}\n\n`);
    } catch (e) {}
  };

  emitter.on("event", listener);

  req.on("close", () => {
    emitter.off("event", listener);
  });
});

export default router;
