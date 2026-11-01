/**
 * FILE: server.ts
 * PURPOSE: ENTRY POINT of the backend. Run with `npm run dev` or `npm start`.
 *
 * Steps:
 *   1. Load + validate env variables (importing env.ts does this)
 *   2. Connect to MongoDB Atlas
 *   3. Start the HTTP server
 *   4. Shut down gracefully on Ctrl+C / container stop (close DB, finish requests)
 */
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API running at http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting new requests, then close the database
  async function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force exit if something hangs for more than 10 seconds
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGINT", () => void shutdown("SIGINT")); // Ctrl+C
  process.on("SIGTERM", () => void shutdown("SIGTERM")); // docker stop / hosting platform
}

// Last-resort safety nets: log the error instead of crashing silently
process.on("unhandledRejection", (reason) => logger.error("Unhandled promise rejection", reason));

startServer().catch((error) => {
  logger.error("❌ Failed to start server", error);
  process.exit(1);
});
