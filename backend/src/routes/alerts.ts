import { Router } from "express";
import * as alertController from "../controllers/alertControllers.js";
import { hotReloadRules, getRules } from "../services/ruleEngine.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { createAlertSchema } from "../utils/validation.js";

const router = Router();

// All alert routes now require a valid JWT

// Create alert
router.post("/", authMiddleware(), validateBody(createAlertSchema), alertController.createAlert);

// Get alert by alertId
router.get("/:id", authMiddleware(), alertController.getAlert);

// List alerts (query params support)
router.get("/", authMiddleware(), alertController.listAlerts);

// Resolve an alert (manual)
router.post("/:id/resolve", authMiddleware(), alertController.resolveAlert);

// Update alert metadata then re-evaluate rules
router.patch("/:id/metadata", authMiddleware(), alertController.updateAlertMetadata);

// Rules endpoints
router.get("/rules/list", authMiddleware(["admin"]), (_, res) => {
  // return sanitized in-memory rules
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
