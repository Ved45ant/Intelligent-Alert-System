// backend/src/services/alertsService.ts
import { AlertModel, IAlert } from "../models/Alert.js";
import { EventLogModel } from "../models/EventLog.js"; // keep for types only if desired
import * as eventService from "./eventService.js";
import { evaluateOnCreate } from "./ruleEngine.js";

/**
 * Create an alert and evaluate rules for it.
 */
export async function createAlert(payload: any): Promise<IAlert> {
  const now = new Date();
  const toSave = {
    alertId: payload.alertId,
    sourceType: payload.sourceType,
    severity: payload.severity || "WARNING",
    timestamp: payload.timestamp ? new Date(payload.timestamp) : now,
    metadata: payload.metadata || {},
    history: [{ state: "OPEN", ts: now }],
  };
  const created = await AlertModel.create(toSave);

  // log & emit the CREATED event via central eventService
  await eventService.logEvent({
    alertId: created.alertId,
    type: "CREATED",
    ts: new Date(),
    payload: { metadata: created.metadata },
  });

  // Evaluate rules (may update alert status)
  await evaluateOnCreate(created);

  return created;
}

export async function getAlert(alertId: string): Promise<IAlert | null> {
  return AlertModel.findOne({ alertId })
    .lean()
    .exec() as Promise<IAlert | null>;
}

export async function listAlerts(filters: any): Promise<IAlert[]> {
  const q: any = {};
  if (filters.status) q.status = filters.status;
  if (filters.sourceType) q.sourceType = filters.sourceType;
  if (filters.driverId) q["metadata.driverId"] = filters.driverId;
  const list = (await AlertModel.find(q)
    .sort({ timestamp: -1 })
    .skip(filters.skip || 0)
    .limit(filters.limit || 50)
    .lean()
    .exec()) as unknown as IAlert[];
  return list;
}

export async function resolveAlert(
  alertId: string,
  reason?: string
): Promise<IAlert | null> {
  const a = await AlertModel.findOne({ alertId });
  if (!a) return null;
  a.status = "RESOLVED";
  a.history.push({
    state: "RESOLVED",
    ts: new Date(),
    reason: reason || "manual",
  });
  await a.save();

  // log & emit
  await eventService.logEvent({
    alertId: a.alertId,
    type: "RESOLVED",
    ts: new Date(),
    payload: { reason },
  });

  return a.toObject() as IAlert;
}

/**
 * Append a history entry and log event.
 */
export async function appendHistory(
  alertId: string,
  state: string,
  reason?: string
): Promise<void> {
  const a = await AlertModel.findOne({ alertId });
  if (!a) return;
  (a as any).history.push({ state, ts: new Date(), reason });
  await a.save();

  // log & emit
  await eventService.logEvent({
    alertId: a.alertId,
    type: state as any,
    ts: new Date(),
    payload: { reason },
  });
}

/**
 * Find count of alerts with given filter in time window.
 * Key example: { 'metadata.driverId': 'DR1' }
 */
export async function countAlertsInWindow(
  filter: Record<string, any>,
  windowStart: Date,
  windowEnd: Date
): Promise<number> {
  const query = {
    ...filter,
    timestamp: { $gte: windowStart, $lte: windowEnd },
  };
  return AlertModel.countDocuments(query).exec();
}
