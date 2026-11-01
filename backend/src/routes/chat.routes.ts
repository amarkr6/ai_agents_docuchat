/**
 * FILE: routes/chat.routes.ts
 * PURPOSE: URL map for chats and questions.  Base path: /api/chats
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as chatController from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { askQuestionSchema, feedbackSchema, renameChatSchema } from "../validators/schemas.js";

const router = Router();

// Protect the OpenAI bill: max 30 questions per minute per IP
const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { success: false, message: "Too many questions, please slow down" },
});

router.use(requireAuth);

router.post("/ask", askLimiter, validateBody(askQuestionSchema), chatController.ask);
router.get("/", chatController.list);
router.get("/:id", chatController.getOne);
router.patch("/:id", validateBody(renameChatSchema), chatController.rename);
router.delete("/:id", chatController.remove);
router.post("/messages/:messageId/feedback", validateBody(feedbackSchema), chatController.feedback);

export default router;
