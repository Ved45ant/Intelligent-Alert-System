import cron from "node-cron";
import config from "../config/index.js";
import { AlertModel } from "../models/Alert.js";
import { evaluateAlert, loadRules } from "./ruleEngine.js";
import * as eventService from "./eventService.js";

let task: any = null;

export function startWorker(): void {
  loadRules().catch((e) => {
    console.error("Failed to load rules at worker start", e);
  });

  const expression = config.workerCron || "*/2 * * * *";
  task = cron.schedule(expression, async () => {
    console.log(`[worker] running at ${new Date().toISOString()}`);
    try {
      await processPendingAlerts();
    } catch (err) {
      console.error("[worker] error in processPendingAlerts", err);
    }
  });

  console.log(`[worker] scheduled with cron: ${expression}`);
}

export function stopWorker(): void {
  if (task) {
    task.stop();
    task = null;
  }
}

export async function processPendingAlerts(): Promise<void> {
  const now = Date.now();
  const expiryMs = config.alertExpiryHours * 60 * 60 * 1000;
  const pending = await AlertModel.find({ status: { $in: ["OPEN", "ESCALATED"] } })
    .limit(500)
    .exec();
  for (const a of pending) {
    try {
      if (a.status === "AUTO-CLOSED" || a.status === "RESOLVED") {
        continue;
      }

      if (now - a.timestamp.getTime() >= expiryMs) {
        const result = await AlertModel.updateOne(
          {
            alertId: a.alertId,
            status: { $in: ["OPEN", "ESCALATED"] }
          },
          {
            $set: {
              status: "AUTO-CLOSED",
              lastTransitionAt: new Date(),
              lastTransitionReason: "TIME_WINDOW_EXPIRED"
            },
            $push: {
              history: {
                state: "AUTO-CLOSED",
                ts: new Date(),
                reason: "TIME_WINDOW_EXPIRED"
              }
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          await eventService.logEvent({
            alertId: a.alertId,
            type: "AUTO_CLOSED",
            ts: new Date(),
            payload: { reason: "TIME_WINDOW_EXPIRED", actor: "system" },
          });
        }
        continue;
      }
      
      await evaluateAlert(a);
    } catch (err) {
      console.error("[worker] error evaluating alert", a.alertId, err);
    }
  }
}
