import { Delivery } from "../models/Delivery.js";
import { WebhookEndpoint } from "../models/WebhookEndpoint.js";
import type { DeliveryAttempt } from "../types/domain.js";
import { validateDestinationUrl } from "../services/destinationSecurity.js";
import { signPayload } from "../services/signing.js";
import { isRetryableStatus, retryDelayMs } from "../services/retryPolicy.js";
import { env } from "../config/env.js";

const RESPONSE_PREVIEW_LIMIT = 500;
const PROCESSING_LEASE_MS = 60_000;

async function responsePreview(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (bytesRead < RESPONSE_PREVIEW_LIMIT) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = RESPONSE_PREVIEW_LIMIT - bytesRead;
    const chunk = value.subarray(0, remaining);
    chunks.push(chunk);
    bytesRead += chunk.byteLength;
    if (chunk.byteLength < value.byteLength) {
      await reader.cancel();
      break;
    }
  }
  if (bytesRead === RESPONSE_PREVIEW_LIMIT) await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function claimNextDelivery() {
  const now = new Date();
  const abandonedBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);
  return Delivery.findOneAndUpdate(
    {
      $or: [
        { status: "pending" },
        { status: "retry_scheduled", nextRetryAt: { $lte: now } },
        { status: "processing", processingStartedAt: { $lt: abandonedBefore } },
      ],
    },
    { $set: { status: "processing", processingStartedAt: now }, $unset: { nextRetryAt: 1 } },
    { new: true, sort: { createdAt: 1 } },
  ).select("+rawPayload");
}

async function processDelivery(delivery: NonNullable<Awaited<ReturnType<typeof claimNextDelivery>>>): Promise<void> {
  const endpoint = await WebhookEndpoint.findOne({ _id: delivery.endpointId, ownerId: delivery.ownerId }).select("+signingSecret");
  const attemptNumber = delivery.attempts.length + 1;
  const attemptedAt = new Date();
  const started = Date.now();
  let statusCode: number | undefined;
  let preview: string | undefined;
  let error: string | undefined;
  let retryable = false;

  if (!endpoint || !endpoint.enabled) {
    error = endpoint ? "Endpoint is disabled." : "Endpoint was deleted.";
  } else {
    try {
      const url = await validateDestinationUrl(endpoint.url);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = signPayload(endpoint.signingSecret, timestamp, delivery.rawPayload);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-HookFlow-Event-Id": delivery.eventId,
          "X-HookFlow-Timestamp": timestamp,
          "X-HookFlow-Signature": `v1=${signature}`,
        },
        body: delivery.rawPayload,
        redirect: "manual",
        signal: AbortSignal.timeout(env.DELIVERY_TIMEOUT_MS),
      });
      statusCode = response.status;
      preview = await responsePreview(response);
      if (!response.ok) {
        error = `Destination returned HTTP ${response.status}.`;
        retryable = isRetryableStatus(response.status);
      }
      const succeeded = response.ok;
      await finishAttempt(delivery, {
        attemptNumber, attemptedAt, durationMs: Date.now() - started, succeeded,
        ...(statusCode !== undefined ? { statusCode } : {}),
        ...(error ? { error } : {}), ...(preview ? { responsePreview: preview } : {}),
      }, retryable, response.headers.get("retry-after"));
      return;
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AppError") {
        error = caught.message;
      } else {
        error = caught instanceof Error && caught.name === "TimeoutError" ? "Request timed out." : "Network request failed.";
        retryable = true;
      }
    }
  }

  await finishAttempt(delivery, {
    attemptNumber, attemptedAt, durationMs: Date.now() - started, succeeded: false,
    ...(statusCode !== undefined ? { statusCode } : {}), ...(error ? { error } : {}),
    ...(preview ? { responsePreview: preview } : {}),
  }, retryable, null);
}

async function finishAttempt(
  delivery: NonNullable<Awaited<ReturnType<typeof claimNextDelivery>>>,
  attempt: DeliveryAttempt,
  retryable: boolean,
  retryAfter: string | null,
): Promise<void> {
  delivery.attempts.push(attempt);
  if (attempt.statusCode !== undefined) delivery.lastStatusCode = attempt.statusCode;
  else delete delivery.lastStatusCode;
  if (attempt.error !== undefined) delivery.lastError = attempt.error;
  else delete delivery.lastError;
  delete delivery.processingStartedAt;

  if (attempt.succeeded) {
    delivery.status = "succeeded";
    delivery.completedAt = new Date();
  } else if (retryable && attempt.attemptNumber < env.MAX_DELIVERY_ATTEMPTS) {
    delivery.status = "retry_scheduled";
    delivery.nextRetryAt = new Date(Date.now() + retryDelayMs(attempt.attemptNumber, retryAfter));
  } else {
    delivery.status = "failed";
    delivery.completedAt = new Date();
  }
  await delivery.save();
}

export interface WorkerOptions {
  pollIntervalMs?: number;
  onError?: (error: unknown) => void;
}

export function startDeliveryWorker(options: WorkerOptions = {}) {
  let stopping = false;
  let currentTimer: ReturnType<typeof setTimeout> | undefined;
  let activeRun: Promise<void> = Promise.resolve();
  const pollIntervalMs = options.pollIntervalMs ?? env.WORKER_POLL_INTERVAL_MS;

  const run = async (): Promise<void> => {
    if (stopping) return;
    let foundWork = false;
    try {
      const delivery = await claimNextDelivery();
      if (delivery) {
        foundWork = true;
        await processDelivery(delivery);
      }
    } catch (error) {
      options.onError?.(error);
      if (!options.onError) console.error("Delivery worker error:", error instanceof Error ? error.message : "Unknown error");
    }
    if (!stopping) currentTimer = setTimeout(() => { activeRun = run(); }, foundWork ? 0 : pollIntervalMs);
  };

  currentTimer = setTimeout(() => { activeRun = run(); }, 0);
  return {
    async stop(): Promise<void> {
      stopping = true;
      if (currentTimer) clearTimeout(currentTimer);
      await activeRun;
    },
    get pollIntervalMs() { return pollIntervalMs; },
  };
}
