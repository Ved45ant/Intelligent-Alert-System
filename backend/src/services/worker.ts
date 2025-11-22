import cron from "node-cron";
import config from "../config/index.js";
import { AlertModel } from "../models/Alert.js";
import { evaluateAlert, loadRules } from "./ruleEngine.js";
import * as eventService from "./eventService.js";

let task: any = null;

export function startWorker(): void {
  // ensure rules are loaded first
  loadRules().catch((e) => {
    // eslint-disable-next-line no-console
    console.error("Failed to load rules at worker start", e);
  });

  const expression = config.workerCron || "*/2 * * * *";
  task = cron.schedule(expression, async () => {
    // eslint-disable-next-line no-console
    console.log(`[worker] running at ${new Date().toISOString()}`);
    try {
      await processPendingAlerts();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[worker] error in processPendingAlerts", err);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[worker] scheduled with cron: ${expression}`);
}

export function stopWorker(): void {
  if (task) {
    task.stop();
    task = null;
  }
}

export async function processPendingAlerts(): Promise<void> {
  // find alerts that are OPEN or ESCALATED for re-evaluation & expiry check
  const now = Date.now();
  const expiryMs = config.alertExpiryHours * 60 * 60 * 1000;
  const pending = await AlertModel.find({ status: { $in: ["OPEN", "ESCALATED"] } })
    .limit(500)
    .exec();
  for (const a of pending) {
    try {
      // auto-close by age (time window expired)
      if (now - a.timestamp.getTime() >= expiryMs) {
        if (a.status !== "AUTO-CLOSED") {
          a.status = "AUTO-CLOSED";
          a.history.push({ state: "AUTO-CLOSED", ts: new Date(), reason: "time_window_expired" });
          await a.save();
          await eventService.logEvent({
            alertId: a.alertId,
            type: "AUTO_CLOSED",
            ts: new Date(),
            payload: { reason: "time_window_expired" },
          });
          continue; // skip further evaluation
        }
      }
      await evaluateAlert(a);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[worker] error evaluating alert", a.alertId, err);
    }
  }
}
