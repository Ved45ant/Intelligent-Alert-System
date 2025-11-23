import { Router } from "express";
import passport from "../config/passport.js";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const createAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many create-admin attempts from this IP, please try again later.",
});

router.post("/login", authController.login);
router.post("/create-admin", createAdminLimiter, authController.createAdmin);
router.get('/me', authMiddleware(), authController.me);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err || !user) {
        const errorMsg = err?.message || "Authentication failed";
        return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}?error=${encodeURIComponent(errorMsg)}`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  authController.googleCallback
);

export default router;
