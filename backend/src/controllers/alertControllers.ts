import { Request, Response, NextFunction } from 'express';
import * as alertsService from '../services/alertService.js';
import { evaluateAlert } from '../services/ruleEngine.js';
import * as eventService from '../services/eventService.js';
import { v4 as uuidv4 } from 'uuid';

export async function ingestAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { sourceType, severity, timestamp, metadata } = req.body;
    
    if (!sourceType) {
      return res.status(400).json({ error: 'sourceType is required' });
    }
    
    const normalized = {
      alertId: req.body.alertId || uuidv4(),
      sourceType,
      severity: severity || 'WARNING',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: metadata || {},
      status: 'OPEN' as const
    };
    
    const alert = await alertsService.createAlert(normalized);
    
    return res.status(201).json({ 
      alertId: alert.alertId,
      status: alert.status,
      severity: alert.severity 
    });
  } catch (err) {
    next(err);
  }
}

export async function createAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const alert = await alertsService.createAlert(payload);
    return res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
}

export async function getAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const alert = await alertsService.getAlert(id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    return res.json(alert);
  } catch (err) {
    next(err);
  }
}

export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      sourceType: req.query.sourceType as string | undefined,
      driverId: req.query.driverId as string | undefined,
      limit: Number(req.query.limit || 50),
      skip: Number(req.query.skip || 0)
    };
    const list = await alertsService.listAlerts(filters);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function resolveAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const reason = req.body.reason as string | undefined;
    const updated = await alertsService.resolveAlert(id, reason);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateAlertMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const alert = await alertsService.getAlert(id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    alert.metadata = { ...alert.metadata, ...(req.body.metadata || {}) };
    await (alert as any).save();
    const result = await evaluateAlert(alert as any);
    if (result.action === 'AUTO_CLOSE') {
      await eventService.logEvent({
        alertId: alert.alertId,
        type: 'AUTO_CLOSED',
        ts: new Date(),
        payload: { trigger: 'metadata_update' }
      });
    }
    return res.json({ alert, evaluation: result });
  } catch (err) {
    next(err);
  }
}
