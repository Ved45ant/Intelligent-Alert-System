import { Router } from "express";
import * as alertController from "../controllers/alertControllers.js";
import { hotReloadRules, getRules } from "../services/ruleEngine.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { createAlertSchema } from "../utils/validation.js";

const router = Router();

router.post("/ingest", authMiddleware(), alertController.ingestAlert);
router.post("/", authMiddleware(), validateBody(createAlertSchema), alertController.createAlert);
router.get("/:id", authMiddleware(), alertController.getAlert);

router.get("/:id/history", authMiddleware(), async (req, res, next) => {
  const dashboardController = await import('../controllers/dashboardController.js');
  return dashboardController.getAlertHistory(req, res, next);
});

router.get("/auto-closed", authMiddleware(), async (req, res, next) => {
  const dashboardController = await import('../controllers/dashboardController.js');
  return dashboardController.getAutoClosed(req, res, next);
});

router.get("/", authMiddleware(), alertController.listAlerts);
router.post("/:id/resolve", authMiddleware(), alertController.resolveAlert);
router.patch("/:id/metadata", authMiddleware(), alertController.updateAlertMetadata);

router.get("/rules/list", authMiddleware(["admin"]), (_, res) => {
  res.json(getRules());
});

router.post("/rules/reload", authMiddleware(["admin"]), async (req, res) => {
  try {
    await hotReloadRules();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "reload failed" });
  }
});

export default router;
