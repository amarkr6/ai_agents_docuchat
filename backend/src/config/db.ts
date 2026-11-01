/**
 * FILE: config/db.ts
 * PURPOSE: Connect to (and disconnect from) MongoDB Atlas using Mongoose.
 *
 * Mongoose keeps ONE connection pool for the whole app, so we connect once
 * when the server starts and reuse it for every request.
 */
import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/** Opens the MongoDB connection. Throws if Atlas cannot be reached. */
export async function connectDatabase(): Promise<void> {
  // "mongodb+srv://" addresses need a DNS SRV lookup. Some routers/ISPs refuse
  // these lookups (error: querySrv ECONNREFUSED), so we can use public DNS instead.
  if (env.DNS_SERVERS) {
    dns.setServers(env.DNS_SERVERS.split(",").map((server) => server.trim()));
  }

  // Log connection problems that happen AFTER the first successful connect.
  mongoose.connection.on("error", (error) => logger.error("MongoDB error", error));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000, // fail fast (10s) if Atlas is unreachable
  });

  logger.info(`✅ Connected to MongoDB database "${env.MONGODB_DB_NAME}"`);
}

/** Closes the MongoDB connection (used during graceful shutdown). */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB connection closed");
}
