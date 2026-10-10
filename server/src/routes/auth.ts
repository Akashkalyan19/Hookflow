import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

function issueToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: "30m" });
}

function publicUser(user: { _id: { toString(): string }; name: string; email: string }) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

authRouter.post("/register", authLimiter, validateBody(registerSchema), asyncHandler(async (request, response) => {
  const { name, email, password } = request.body as { name: string; email: string; password: string };
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) throw new AppError("An account with this email already exists.", 409);
  const user = await User.create({ name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
  response.status(201).json({ success: true, data: { user: publicUser(user), token: issueToken(user.id) } });
}));

authRouter.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(async (request, response) => {
  const { email, password } = request.body as { email: string; password: string };
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError("Email or password is incorrect.", 401);
  response.json({ success: true, data: { user: publicUser(user), token: issueToken(user.id) } });
}));

authRouter.post("/logout", authenticate, (_request, response) => {
  response.json({ success: true, data: { loggedOut: true } });
});

authRouter.get("/me", authenticate, asyncHandler(async (_request, response) => {
  const user = await User.findById(response.locals.userId);
  if (!user) throw new AppError("User not found.", 404);
  response.json({ success: true, data: { user: publicUser(user) } });
}));
