import type { Types } from "mongoose";

export type DeliveryStatus = "pending" | "processing" | "retry_scheduled" | "succeeded" | "failed";

export interface UserFields {
  name: string;
  email: string;
  passwordHash: string;
}

export interface EndpointFields {
  ownerId: Types.ObjectId;
  name: string;
  url: string;
  enabled: boolean;
  signingSecret: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  statusCode?: number;
  durationMs: number;
  succeeded: boolean;
  error?: string;
  responsePreview?: string;
}

export interface DeliveryFields {
  ownerId: Types.ObjectId;
  endpointId: Types.ObjectId;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  rawPayload: string;
  status: DeliveryStatus;
  attempts: DeliveryAttempt[];
  lastStatusCode?: number;
  lastError?: string;
  nextRetryAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  replayOf?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown;
}
