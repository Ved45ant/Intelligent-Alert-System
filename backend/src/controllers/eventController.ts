import { Request, Response, NextFunction } from "express";
import * as eventService from "../services/eventService.js";

export async function listEvents(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = {
      alertId: (req.query.alertId as string) || undefined,
      type: (req.query.type as string) || undefined,
      since: (req.query.since as string) || undefined,
      until: (req.query.until as string) || undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
    };
    const events = await eventService.fetchEvents(q as any);
    return res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function eventCounts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const since = (req.query.since as string) || undefined;
    const until = (req.query.until as string) || undefined;
    const counts = await eventService.getEventCounts(since, until);
    return res.json(counts);
  } catch (err) {
    next(err);
  }
}
