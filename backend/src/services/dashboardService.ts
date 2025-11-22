// backend/src/services/dashboardService.ts
import { AlertModel } from "../models/Alert.js";
import { EventLogModel } from "../models/EventLog.js";
import { getRules } from "./ruleEngine.js";

/**
 * Return counts by severity and top drivers (by number of alerts).
 */
export async function getSummary(limitDrivers = 5) {
  const countsAgg = await AlertModel.aggregate([
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]).exec();

  const counts: Record<string, number> = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  countsAgg.forEach((r: any) => {
    counts[r._id] = r.count;
  });

  // Top drivers (group by metadata.driverId)
  const topDriversAgg = await AlertModel.aggregate([
    { $match: { "metadata.driverId": { $exists: true } } },
    {
      $group: {
        _id: "$metadata.driverId",
        count: { $sum: 1 },
        lastSeen: { $max: "$timestamp" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limitDrivers },
  ]).exec();

  const topDrivers = topDriversAgg.map((r: any) => ({
    driverId: r._id,
    count: r.count,
    lastSeen: r.lastSeen,
  }));

  return {
    counts,
    topDrivers,
  };
}

/**
 * Recent auto-closed alerts transparency (last N hours, default 24)
 */
export async function getRecentAutoClosed(hours = 24, limit = 50) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await AlertModel.find({
    status: "AUTO-CLOSED",
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  return rows.map((r: any) => ({
    alertId: r.alertId,
    sourceType: r.sourceType,
    severity: r.severity,
    timestamp: r.timestamp,
    lastReason: r.history?.slice(-1)[0]?.reason || null,
  }));
}

/**
 * Daily trends for last N days: created, escalated, auto-closed counts.
 * Uses EventLog; groups by day.
 */
export async function getTrends(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const agg = await EventLogModel.aggregate([
    { $match: { ts: { $gte: since } } },
    {
      $group: {
        _id: {
          y: { $year: "$ts" },
          m: { $month: "$ts" },
          d: { $dayOfMonth: "$ts" },
          type: "$type",
        },
        count: { $sum: 1 },
      },
    },
  ]).exec();
  // shape: date string -> { created, escalated, autoClosed }
  const byDay: Record<string, any> = {};
  for (const row of agg) {
    const dateStr = `${row._id.y}-${String(row._id.m).padStart(2, "0")}-${String(row._id.d).padStart(2, "0")}`;
    if (!byDay[dateStr]) byDay[dateStr] = { created: 0, escalated: 0, autoClosed: 0, resolved: 0, info: 0 };
    switch (row._id.type) {
      case "CREATED":
        byDay[dateStr].created += row.count;
        break;
      case "ESCALATED":
        byDay[dateStr].escalated += row.count;
        break;
      case "AUTO_CLOSED":
        byDay[dateStr].autoClosed += row.count;
        break;
      case "RESOLVED":
        byDay[dateStr].resolved += row.count;
        break;
      default:
        byDay[dateStr].info += row.count;
    }
  }
  // ensure all days present
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay[ds]) byDay[ds] = { created: 0, escalated: 0, autoClosed: 0, resolved: 0, info: 0 };
  }
  return byDay;
}

/**
 * Return currently active sanitized rules
 */
export function getRulesOverview() {
  return getRules();
}
