import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter for create-admin to prevent abuse
const createAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: "Too many create-admin attempts from this IP, please try again later.",
});

router.post("/login", authController.login);

// create-admin (demo — in prod protect this endpoint)
router.post("/create-admin", createAdminLimiter, authController.createAdmin);

// return current token subject (username, role) - protected so req.user is populated
router.get('/me', authMiddleware(), authController.me);

export default router;
