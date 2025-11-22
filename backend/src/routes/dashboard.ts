// backend/src/routes/dashboard.ts
import { Router } from "express";
import * as dashboardService from "../services/dashboardService.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/summary", authMiddleware(), async (req, res) => {
  try {
    const data = await dashboardService.getSummary(5);
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("dashboard summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

router.get("/auto-closed", authMiddleware(), async (req, res) => {
  try {
    const hours = req.query.hours ? Number(req.query.hours) : 24;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const rows = await dashboardService.getRecentAutoClosed(hours, limit);
    res.json({ hours, rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("dashboard auto-closed error", err);
    res.status(500).json({ error: "failed" });
  }
});

router.get("/trends", authMiddleware(), async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 7;
    const data = await dashboardService.getTrends(days);
    res.json({ days, data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("dashboard trends error", err);
    res.status(500).json({ error: "failed" });
  }
});

router.get("/rules", authMiddleware(["admin"]), async (req, res) => {
  try {
    const rules = dashboardService.getRulesOverview();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

export default router;
