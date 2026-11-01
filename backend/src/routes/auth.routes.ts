/**
 * FILE: routes/auth.routes.ts
 * PURPOSE: URL map for authentication.  Base path: /api/auth
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, registerSchema } from "../validators/schemas.js";

const router = Router();

// Brute-force protection: max 20 login/register attempts per IP every 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { success: false, message: "Too many attempts, please try again in 15 minutes" },
});

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.get("/me", requireAuth, authController.me);

export default router;
