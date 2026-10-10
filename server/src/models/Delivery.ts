import { model, Schema } from "mongoose";
import type { DeliveryFields } from "../types/domain.js";

const attemptSchema = new Schema(
  {
    attemptNumber: { type: Number, required: true },
    attemptedAt: { type: Date, required: true },
    statusCode: Number,
    durationMs: { type: Number, required: true },
    succeeded: { type: Boolean, required: true },
    error: { type: String, maxlength: 300 },
    responsePreview: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const deliverySchema = new Schema<DeliveryFields>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpointId: { type: Schema.Types.ObjectId, ref: "WebhookEndpoint", required: true },
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, maxlength: 120 },
    payload: { type: Schema.Types.Mixed, required: true },
    rawPayload: { type: String, required: true, maxlength: 65536, select: false },
    status: {
      type: String,
      enum: ["pending", "processing", "retry_scheduled", "succeeded", "failed"],
      required: true,
      default: "pending",
    },
    attempts: { type: [attemptSchema], default: [] },
    lastStatusCode: Number,
    lastError: { type: String, maxlength: 300 },
    nextRetryAt: Date,
    processingStartedAt: Date,
    completedAt: Date,
    replayOf: { type: Schema.Types.ObjectId, ref: "Delivery" },
  },
  { timestamps: true },
);

deliverySchema.index({ status: 1, nextRetryAt: 1, processingStartedAt: 1, createdAt: 1 });
deliverySchema.index({ ownerId: 1, createdAt: -1 });
deliverySchema.index({ endpointId: 1, createdAt: -1 });
deliverySchema.index({ ownerId: 1, status: 1, createdAt: -1 });

export const Delivery = model<DeliveryFields>("Delivery", deliverySchema);
