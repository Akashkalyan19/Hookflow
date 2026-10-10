import { env } from "../config/env.js";

export function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function retryDelayMs(attemptNumber: number, retryAfter: string | null, now = Date.now()): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const parsed = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(retryAfter);
    if (Number.isFinite(parsed) && parsed > now) return Math.min(parsed - now, env.RETRY_MAX_DELAY_MS);
  }
  return Math.min(env.RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attemptNumber - 1), env.RETRY_MAX_DELAY_MS);
}
