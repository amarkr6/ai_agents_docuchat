/**
 * FILE: utils/AppError.ts
 * PURPOSE: A custom Error class that also carries an HTTP status code.
 *
 * Anywhere in the code we can write:
 *     throw new AppError("Document not found", 404);
 * and the global error middleware turns it into a proper JSON response:
 *     404 { "success": false, "message": "Document not found" }
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
