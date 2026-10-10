import { model, Schema } from "mongoose";
import type { EndpointFields } from "../types/domain.js";

const endpointSchema = new Schema<EndpointFields>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, maxlength: 2048 },
    enabled: { type: Boolean, required: true, default: true },
    signingSecret: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

endpointSchema.index({ ownerId: 1, createdAt: -1 });

export const WebhookEndpoint = model<EndpointFields>("WebhookEndpoint", endpointSchema);
