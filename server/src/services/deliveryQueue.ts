import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { Delivery } from "../models/Delivery.js";
import { WebhookEndpoint } from "../models/WebhookEndpoint.js";
import type { EventInput } from "../validators/schemas.js";
import { AppError } from "../utils/AppError.js";

export async function enqueueEvent(ownerId: string, endpointId: string, input: EventInput) {
  const endpoint = await WebhookEndpoint.findOne({ _id: endpointId, ownerId });
  if (!endpoint) throw new AppError("Endpoint not found.", 404);
  if (!endpoint.enabled) throw new AppError("Enable this endpoint before sending an event.", 409);
  const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
  const rawPayload = JSON.stringify({ id: eventId, type: input.eventType, data: input.payload });
  const delivery = await Delivery.create({
    ownerId: new Types.ObjectId(ownerId), endpointId: endpoint._id, eventId,
    eventType: input.eventType, payload: input.payload, rawPayload, status: "pending", attempts: [],
  });
  return delivery;
}
