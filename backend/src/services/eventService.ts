import { EventLogModel, IEventLog } from "../models/EventLog.js";
import { emitEvent, OutgoingEvent } from "./eventEmitter.js";
import * as cache from "../lib/cache.js";

export async function logEvent(payload: {
  alertId: string;
  type: "CREATED" | "ESCALATED" | "AUTO_CLOSED" | "RESOLVED" | "INFO";
  ts?: Date;
  payload?: Record<string, any>;
}): Promise<IEventLog> {
  const doc = await EventLogModel.create({
    alertId: payload.alertId,
    type: payload.type,
    ts: payload.ts || new Date(),
    payload: payload.payload || {},
  });

  const outgoing: OutgoingEvent = {
    alertId: doc.alertId,
    type: doc.type as OutgoingEvent["type"],
    ts: (doc.ts as Date).toISOString(),
    payload: doc.payload || {},
  };

  emitEvent(outgoing);

  try {
    await cache.delPattern('dashboard:*');
  } catch (e) {}

  return doc;
}

export async function fetchEvents(query: any = {}): Promise<IEventLog[]> {
  const q: any = {};
  if (query.alertId) q.alertId = query.alertId;
  if (query.type) q.type = query.type.toUpperCase();
  if (query.since || query.until) {
    q.ts = {};
    if (query.since) q.ts.$gte = new Date(query.since);
    if (query.until) q.ts.$lte = new Date(query.until);
  }
  const limit = Math.min(1000, Number(query.limit || 200));
  const skip = Number(query.skip || 0);
  const docs = await EventLogModel.find(q)
    .sort({ ts: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return docs as unknown as IEventLog[];
}

export async function getEventCounts(
  since?: string,
  until?: string
): Promise<Record<string, number>> {
  const match: any = {};
  if (since || until) {
    match.ts = {};
    if (since) match.ts.$gte = new Date(since);
    if (until) match.ts.$lte = new Date(until);
  }

  const agg = await EventLogModel.aggregate([
    { $match: match },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]).exec();

  const out: Record<string, number> = {};
  agg.forEach((r: any) => (out[r._id] = r.count));
  return out;
}
