import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { AlertModel, IAlert } from "../models/Alert.js";
import * as alertsService from "./alertService.js";
import * as eventService from "./eventService.js";

export type Rules = Record<string, any>;

let rulesCache: Rules = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.resolve(__dirname, "../../rules.json");

export async function loadRules(): Promise<Rules> {
  try {
    const raw = await fs.readFile(RULES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    
    // Support new rules format with rules array and separate escalation/auto_close configs
    if (parsed.rules && Array.isArray(parsed.rules)) {
      rulesCache = {
        rules: parsed.rules,
        escalation: parsed.escalation || {},
        auto_close: parsed.auto_close || {}
      };
    } else {
      // Legacy format - keep for backward compatibility
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
    }
    console.log(`✓ Loaded ${Array.isArray(rulesCache.rules) ? rulesCache.rules.length : Object.keys(rulesCache).length} rules`);
    return rulesCache;
  } catch (err) {
    console.error("Failed to load rules.json", err);
    rulesCache = {};
    return rulesCache;
  }
}

export function getRules(): Rules {
  return rulesCache;
}

export async function evaluateOnCreate(
  alert: IAlert
): Promise<{ action: string; details?: any }> {
  if (!rulesCache || Object.keys(rulesCache).length === 0) {
    await loadRules();
  }
  
  // Use escalation config from new format or legacy format
  const escalationRules = rulesCache.escalation || rulesCache;
  const autoCloseRules = rulesCache.auto_close || rulesCache;
  
  const rule = escalationRules[alert.sourceType];
  if (!rule) return { action: "NONE" };

  if (rule.escalate_if_count && rule.window_mins) {
    const windowMs = rule.window_mins * 60 * 1000;
    const windowStart = new Date(alert.timestamp.getTime() - windowMs);
    const windowEnd = alert.timestamp;
    
    const keyFilter: any = { sourceType: alert.sourceType };
    if (alert.metadata?.driverId)
      keyFilter["metadata.driverId"] = alert.metadata.driverId;
    
    const count = await alertsService.countAlertsInWindow(
      keyFilter,
      windowStart,
      windowEnd
    );
    
    if (count >= rule.escalate_if_count) {
      const toEscalate = await AlertModel.find({
        sourceType: alert.sourceType,
        ...(alert.metadata?.driverId
          ? { "metadata.driverId": alert.metadata.driverId }
          : {}),
      }).exec();

      for (const doc of toEscalate) {
        if (doc.status !== "ESCALATED") {
          const reason = `RULE_COUNT_${rule.escalate_if_count}_IN_${rule.window_mins}MIN`;
          doc.status = "ESCALATED";
          doc.lastTransitionAt = new Date();
          doc.lastTransitionReason = reason;
          doc.history.push({
            state: "ESCALATED",
            ts: new Date(),
            reason: reason,
          });
          await doc.save();
          
          await eventService.logEvent({
            alertId: doc.alertId,
            type: "ESCALATED",
            ts: new Date(),
            payload: { rule, reason, actor: "system" },
          });
        }
      }

      if (rule.escalate_to) {
        if ((alert as any).severity !== rule.escalate_to) {
          const incoming = await AlertModel.findOne({
            alertId: alert.alertId,
          }).exec();
          if (incoming) {
            incoming.severity = rule.escalate_to;
            await incoming.save();
            
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

  // Check auto-close rules
  const autoCloseRule = autoCloseRules[alert.sourceType];
  if (autoCloseRule?.auto_close_if) {
    const key = autoCloseRule.check_field || autoCloseRule.auto_close_if;
    const shouldAutoClose = 
      alert.metadata?.[key] === true || 
      alert.metadata?.document_valid === true ||
      alert.metadata?.document_renewed === true;
      
    if (shouldAutoClose) {
      const reason = `DOCUMENT_RENEWED`;
      const result = await AlertModel.updateOne(
        {
          alertId: alert.alertId,
          status: { $nin: ["AUTO-CLOSED", "RESOLVED"] }
        },
        {
          $set: {
            status: "AUTO-CLOSED",
            lastTransitionAt: new Date(),
            lastTransitionReason: reason
          },
          $push: {
            history: {
              state: "AUTO-CLOSED",
              ts: new Date(),
              reason: reason
            }
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        await eventService.logEvent({
          alertId: alert.alertId,
          type: "AUTO_CLOSED",
          ts: new Date(),
          payload: { reason, key, actor: "system" },
        });
        return { action: "AUTO_CLOSE", details: { key, reason } };
      }
    }
  }

  return { action: "NONE" };
}

export async function evaluateAlert(
  alert: IAlert
): Promise<{ action: string; details?: any }> {
  return evaluateOnCreate(alert);
}

export async function hotReloadRules(): Promise<void> {
  await loadRules();
}
