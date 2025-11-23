import { AlertModel, IAlert } from "../models/Alert.js";
import { EventLogModel } from "../models/EventLog.js";
import * as eventService from "./eventService.js";
import { evaluateOnCreate } from "./ruleEngine.js";

export async function createAlert(payload: any): Promise<IAlert> {
  const now = new Date();
  const toSave = {
    alertId: payload.alertId,
    sourceType: payload.sourceType,
    severity: payload.severity || "WARNING",
    timestamp: payload.timestamp ? new Date(payload.timestamp) : now,
    metadata: payload.metadata || {},
    history: [{ state: "OPEN", ts: now }],
    lastTransitionAt: now,
    lastTransitionReason: "CREATED",
  };
  const created = await AlertModel.create(toSave);

  await eventService.logEvent({
    alertId: created.alertId,
    type: "CREATED",
    ts: new Date(),
    payload: { metadata: created.metadata },
  });

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
  const resolveReason = reason || "MANUAL_RESOLVE";
  a.status = "RESOLVED";
  a.lastTransitionAt = new Date();
  a.lastTransitionReason = resolveReason;
  a.history.push({
    state: "RESOLVED",
    ts: new Date(),
    reason: resolveReason,
  });
  await a.save();

  await eventService.logEvent({
    alertId: a.alertId,
    type: "RESOLVED",
    ts: new Date(),
    payload: { reason: resolveReason, actor: "user" },
  });

  return a.toObject() as IAlert;
}

export async function appendHistory(
  alertId: string,
  state: string,
  reason?: string
): Promise<void> {
  const a = await AlertModel.findOne({ alertId });
  if (!a) return;
  (a as any).history.push({ state, ts: new Date(), reason });
  await a.save();

  await eventService.logEvent({
    alertId: a.alertId,
    type: state as any,
    ts: new Date(),
    payload: { reason },
  });
}

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
