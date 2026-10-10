import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv.config({ path: resolve(process.cwd(), "server/.env") });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/hookflow"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).default(2000),
  DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(500).default(10000),
  MAX_DELIVERY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().min(100).default(5000),
  RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1000).default(300000),
});

export const env = envSchema.parse(process.env);
