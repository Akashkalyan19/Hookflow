import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) return next(new AppError("Please check the submitted fields.", 400, result.error.flatten()));
    request.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) return next(new AppError("Invalid query parameters.", 400, result.error.flatten()));
    Object.assign(request, { validatedQuery: result.data });
    next();
  };
}
