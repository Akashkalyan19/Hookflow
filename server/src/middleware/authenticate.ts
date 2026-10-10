import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!token) return next(new AppError("Authentication required.", 401));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return next(new AppError("Invalid or expired session.", 401));
    }
    response.locals.userId = payload.sub;
    next();
  } catch {
    next(new AppError("Invalid or expired session.", 401));
  }
};
