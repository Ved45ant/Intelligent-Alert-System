// backend/src/services/ruleEngine.ts
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { AlertModel, IAlert } from "../models/Alert.js";
import * as alertsService from "./alertService.js";
import * as eventService from "./eventService.js";

export type Rules = Record<string, any>;

let rulesCache: Rules = {};

// Resolve rules.json relative to this file to avoid duplicate path segments.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.resolve(__dirname, "../../rules.json");

export async function loadRules(): Promise<Rules> {
  try {
    const raw = await fs.readFile(RULES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // sanitize: only allow known keys per rule
    const allowedKeys = new Set([
      "escalate_if_count",
      "window_mins",
      "escalate_to",
      "auto_close_if",
    ]);
    const sanitized: Rules = {};
    Object.entries(parsed || {}).forEach(([ruleName, cfg]) => {
      if (typeof cfg !== "object" || cfg === null) return;
      const clean: Record<string, any> = {};
      Object.entries(cfg).forEach(([k, v]) => {
        if (allowedKeys.has(k)) clean[k] = v;
      });
      sanitized[ruleName] = clean;
    });
    rulesCache = sanitized;
    return rulesCache;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to load rules.json", err);
    rulesCache = {};
    return rulesCache;
  }
}

export function getRules(): Rules {
  return rulesCache;
}

/**
 * Evaluate when a new alert is created.
 * This function may update alert status (e.g., ESCALATED) by appending history and logging.
 */
export async function evaluateOnCreate(
  alert: IAlert
): Promise<{ action: string; details?: any }> {
  if (!rulesCache || Object.keys(rulesCache).length === 0) {
    await loadRules();
  }
  const rule = rulesCache[alert.sourceType];
  if (!rule) return { action: "NONE" };

  // Escalation by count in window
  if (rule.escalate_if_count && rule.window_mins) {
    const windowMs = rule.window_mins * 60 * 1000;
    const windowStart = new Date(alert.timestamp.getTime() - windowMs);
    const windowEnd = alert.timestamp;
    // group key: use metadata.driverId by default, else full metadata match
    const keyFilter: any = { sourceType: alert.sourceType };
    if (alert.metadata?.driverId)
      keyFilter["metadata.driverId"] = alert.metadata.driverId;
    // count alerts in window
    const count = await alertsService.countAlertsInWindow(
      keyFilter,
      windowStart,
      windowEnd
    );
    if (count >= rule.escalate_if_count) {
      // escalate matching alerts in this group (idempotent: only update if status != ESCALATED)
      const toEscalate = await AlertModel.find({
        sourceType: alert.sourceType,
        ...(alert.metadata?.driverId
          ? { "metadata.driverId": alert.metadata.driverId }
          : {}),
      }).exec();

      for (const doc of toEscalate) {
        if (doc.status !== "ESCALATED") {
          doc.status = "ESCALATED";
          doc.history.push({
            state: "ESCALATED",
            ts: new Date(),
            reason: `rule:count:${rule.escalate_if_count}`,
          });
          await doc.save();
          // log & emit via eventService
          await eventService.logEvent({
            alertId: doc.alertId,
            type: "ESCALATED",
            ts: new Date(),
            payload: { rule },
          });
        }
      }

      // Optionally bump severity on the incoming alert
      if (rule.escalate_to) {
        // update incoming alert severity if necessary
        if ((alert as any).severity !== rule.escalate_to) {
          const incoming = await AlertModel.findOne({
            alertId: alert.alertId,
          }).exec();
          if (incoming) {
            incoming.severity = rule.escalate_to;
            await incoming.save();
            // Emit a small INFO event about severity change (optional)
            await eventService.logEvent({
              alertId: incoming.alertId,
              type: "INFO",
              ts: new Date(),
              payload: { msg: "severity_bumped", to: rule.escalate_to },
            });
          }
        }
      }

      return { action: "ESCALATE", details: { count } };
    }
  }

  // Auto-close if metadata flag present
  if (rule.auto_close_if) {
    const key = rule.auto_close_if;
    if (alert.metadata && alert.metadata[key] === true) {
      const doc = await AlertModel.findOne({ alertId: alert.alertId }).exec();
      if (doc && doc.status !== "AUTO-CLOSED") {
        doc.status = "AUTO-CLOSED";
        doc.history.push({
          state: "AUTO-CLOSED",
          ts: new Date(),
          reason: `rule:auto_close:${key}`,
        });
        await doc.save();
        // log & emit
        await eventService.logEvent({
          alertId: doc.alertId,
          type: "AUTO_CLOSED",
          ts: new Date(),
          payload: { key },
        });
        return { action: "AUTO_CLOSE", details: { key } };
      }
    }
  }

  return { action: "NONE" };
}

export async function evaluateAlert(
  alert: IAlert
): Promise<{ action: string; details?: any }> {
  // same logic as evaluateOnCreate but called for existing alert
  return evaluateOnCreate(alert);
}

export async function hotReloadRules(): Promise<void> {
  await loadRules();
}
