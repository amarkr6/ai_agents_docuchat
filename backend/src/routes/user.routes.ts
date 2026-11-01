/**
 * FILE: routes/user.routes.ts
 * PURPOSE: URL map for users.  Base path: /api/users
 */
import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { updateRoleSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/directory", userController.directory);
router.get("/", requireRole("admin"), userController.list);
router.patch("/:id/role", requireRole("admin"), validateBody(updateRoleSchema), userController.updateRole);

export default router;
