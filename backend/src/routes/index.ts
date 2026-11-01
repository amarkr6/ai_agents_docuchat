/**
 * FILE: routes/index.ts
 * PURPOSE: Combine all route files under /api.
 *
 *   /api/health     -> is the server alive?
 *   /api/auth       -> register / login / me
 *   /api/documents  -> upload, list, share, delete
 *   /api/chats      -> ask questions, chat history, feedback
 *   /api/metrics    -> response time, cost, retrieval accuracy
 *   /api/users      -> user directory + admin role management
 */
import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes.js";
import documentRoutes from "./document.routes.js";
import chatRoutes from "./chat.routes.js";
import metricsRoutes from "./metrics.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

// Health check — used by hosting platforms / load balancers
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.use("/auth", authRoutes);
router.use("/documents", documentRoutes);
router.use("/chats", chatRoutes);
router.use("/metrics", metricsRoutes);
router.use("/users", userRoutes);

export default router;
