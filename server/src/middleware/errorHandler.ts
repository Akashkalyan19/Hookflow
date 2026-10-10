import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next;
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ success: false, message: error.message, ...(error.details ? { errors: error.details } : {}) });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    response.status(409).json({ success: false, message: "An account with this email already exists." });
    return;
  }
  if (typeof error === "object" && error !== null && "name" in error && error.name === "ValidationError") {
    response.status(400).json({ success: false, message: "The submitted data is invalid." });
    return;
  }
  if (process.env.NODE_ENV !== "production") console.error("Unhandled request error:", error instanceof Error ? error.message : "Unknown error");
  response.status(500).json({ success: false, message: "Something went wrong." });
};
