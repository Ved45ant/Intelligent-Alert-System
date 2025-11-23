import { Request, Response, NextFunction } from 'express';
import { AlertModel } from '../models/Alert.js';
import { EventLogModel } from '../models/EventLog.js';
import * as cache from '../lib/cache.js';

export async function getCounts(req: Request, res: Response, next: NextFunction) {
  try {
    const key = 'dashboard:counts';
    const cached = await cache.get(key);
    if (cached) return res.json(cached);

    const result = await AlertModel.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const counts: Record<string, number> = { CRITICAL: 0, WARNING: 0, INFO: 0 };
    result.forEach((r: any) => {
      counts[r._id] = r.count;
    });

    const response = { counts };
    await cache.set(key, response, 15);
    return res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getTopDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(50, Number(req.query.limit || 5));
    const key = `dashboard:top-drivers:${limit}`;
    const cached = await cache.get(key);
    if (cached) return res.json(cached);

    const result = await AlertModel.aggregate([
      {
        $match: {
          'metadata.driverId': { $exists: true },
          status: { $in: ['OPEN', 'ESCALATED'] }
        }
      },
      {
        $group: {
          _id: '$metadata.driverId',
          count: { $sum: 1 },
          lastSeen: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    const drivers = result.map((r: any) => ({
      driverId: r._id,
      count: r.count,
      lastSeen: r.lastSeen
    }));

    const response = { drivers };
    await cache.set(key, response, 30);
    return res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const fromStr = req.query.from as string;
    const toStr = req.query.to as string;
    
    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date();

    const key = `dashboard:trends:${from.toISOString()}:${to.toISOString()}`;
    const cached = await cache.get(key);
    if (cached) return res.json(cached);

    const result = await EventLogModel.aggregate([
      { $match: { ts: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            year: { $year: '$ts' },
            month: { $month: '$ts' },
            day: { $dayOfMonth: '$ts' },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const byDay: Record<string, any> = {};
    for (const row of result) {
      const dateStr = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
      if (!byDay[dateStr]) {
        byDay[dateStr] = { created: 0, escalated: 0, autoClosed: 0, resolved: 0 };
      }
      const type = row._id.type.toLowerCase();
      if (type === 'created') byDay[dateStr].created += row.count;
      else if (type === 'escalated') byDay[dateStr].escalated += row.count;
      else if (type === 'auto_closed') byDay[dateStr].autoClosed += row.count;
      else if (type === 'resolved') byDay[dateStr].resolved += row.count;
    }

    const response = { trends: byDay };
    await cache.set(key, response, 60);
    return res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getAlertHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const alertId = req.params.id;
    
    // Get from alert.history
    const alert = await AlertModel.findOne({ alertId }).lean();
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Also get from EventLog for full details
    const events = await EventLogModel.find({ alertId })
      .sort({ ts: -1 })
      .limit(100)
      .lean();

    return res.json({
      alertId,
      currentStatus: alert.status,
      history: alert.history || [],
      events: events.map((e: any) => ({
        type: e.type,
        timestamp: e.ts,
        payload: e.payload
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function getAutoClosed(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = (req.query.filter as string) || '24h';
    const hours = filter === '7d' ? 168 : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const key = `dashboard:auto-closed:${filter}`;
    const cached = await cache.get(key);
    if (cached) return res.json(cached);

    const alerts = await AlertModel.find({
      status: 'AUTO-CLOSED',
      lastTransitionAt: { $gte: since }
    })
      .sort({ lastTransitionAt: -1 })
      .limit(50)
      .lean();

    const result = alerts.map((a: any) => ({
      alertId: a.alertId,
      sourceType: a.sourceType,
      severity: a.severity,
      timestamp: a.timestamp,
      lastTransitionAt: a.lastTransitionAt,
      lastTransitionReason: a.lastTransitionReason
    }));

    const response = { alerts: result };
    await cache.set(key, response, 30);
    return res.json(response);
  } catch (err) {
    next(err);
  }
}
