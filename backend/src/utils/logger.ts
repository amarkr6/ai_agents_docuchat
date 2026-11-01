/**
 * FILE: utils/logger.ts
 * PURPOSE: A tiny logger that adds a timestamp and level to every log line.
 *
 * In a bigger project you would swap this for "pino" or "winston"; because the
 * rest of the code only calls logger.info/warn/error, that swap is one file.
 */

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info: (message: string, ...extra: unknown[]) =>
    console.log(`[${timestamp()}] INFO  ${message}`, ...extra),

  warn: (message: string, ...extra: unknown[]) =>
    console.warn(`[${timestamp()}] WARN  ${message}`, ...extra),

  error: (message: string, ...extra: unknown[]) =>
    console.error(`[${timestamp()}] ERROR ${message}`, ...extra),
};
