/**
 * FILE: routes/metrics.routes.ts
 * PURPOSE: URL map for monitoring.  Base path: /api/metrics
 */
import { Router } from "express";
import * as metricsController from "../controllers/metrics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { evaluateSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", metricsController.summary);
// Evaluation calls OpenAI for every case, so restrict it to admin/editor
router.post("/evaluate", requireRole("admin", "editor"), validateBody(evaluateSchema), metricsController.evaluate);

export default router;
