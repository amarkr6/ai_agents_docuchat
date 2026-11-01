/**
 * FILE: routes/document.routes.ts
 * PURPOSE: URL map for documents.  Base path: /api/documents
 *
 * Permissions:
 *   - Everyone logged in can LIST documents they have access to
 *   - Only admin/editor can UPLOAD (viewers are read-only)
 *   - Share/delete are further checked in the service (owner or admin only)
 */
import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { uploadSingleFile } from "../middleware/upload.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { shareDocumentSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth); // every route below needs a logged-in user

router.get("/", documentController.list);
router.post("/", requireRole("admin", "editor"), uploadSingleFile, documentController.upload);
router.patch("/:id/sharing", requireRole("admin", "editor"), validateBody(shareDocumentSchema), documentController.updateSharing);
router.delete("/:id", requireRole("admin", "editor"), documentController.remove);

export default router;
