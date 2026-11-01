/**
 * FILE: app.ts
 * PURPOSE: Build and configure the Express application (but don't start it).
 *
 * Keeping "app" separate from "server" makes the app easy to test
 * (e.g. with supertest) without opening a real network port.
 *
 * Middleware order matters — a request flows through them top to bottom:
 *   security headers -> CORS -> JSON parser -> request log -> routes -> 404 -> error handler
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  const app = express();

  // Trust the proxy (Render/Nginx) so rate limiting sees the real client IP
  app.set("trust proxy", 1);

  // 1. Security headers (XSS, clickjacking protection, …)
  app.use(helmet());

  // 2. CORS: only our React app may call this API from a browser
  app.use(cors({ origin: env.clientUrls, credentials: true }));

  // 3. Parse JSON request bodies (limit protects against huge payloads)
  app.use(express.json({ limit: "1mb" }));

  // 4. Simple request logger: "POST /api/chats/ask 200 1532ms"
  app.use((req, res, next) => {
    const start = performance.now();
    res.on("finish", () => {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(performance.now() - start)}ms`);
    });
    next();
  });

  // 5. All API routes live under /api
  app.use("/api", apiRoutes);

  // 6. Unknown URL -> 404, then any error -> JSON error response
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
