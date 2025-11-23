import { Router } from "express";
import * as dashboardService from "../services/dashboardService.js";
import * as dashboardController from "../controllers/dashboardController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/counts", authMiddleware(), dashboardController.getCounts);
router.get("/top-drivers", authMiddleware(), dashboardController.getTopDrivers);
router.get("/trends", authMiddleware(), dashboardController.getTrends);

router.get("/summary", authMiddleware(), async (req, res) => {
  try {
    const data = await dashboardService.getSummary(5);
    res.json(data);
  } catch (err) {
    console.error("dashboard summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

router.get("/auto-closed", authMiddleware(), dashboardController.getAutoClosed);

router.get("/rules", authMiddleware(["admin"]), async (req, res) => {
  try {
    const rules = dashboardService.getRulesOverview();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

export default router;
