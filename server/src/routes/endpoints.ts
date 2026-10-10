import { randomBytes } from "node:crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import { WebhookEndpoint } from "../models/WebhookEndpoint.js";
import { Delivery } from "../models/Delivery.js";
import { enqueueEvent } from "../services/deliveryQueue.js";
import { endpointView } from "../services/endpointView.js";
import { validateDestinationUrl } from "../services/destinationSecurity.js";
import { endpointCreateSchema, endpointParamsSchema, endpointUpdateSchema, eventSchema } from "../validators/schemas.js";
import type { EventInput } from "../validators/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const endpointsRouter = Router();
endpointsRouter.use(authenticate);

endpointsRouter.get("/", asyncHandler(async (_request, response) => {
  const endpoints = await WebhookEndpoint.find({ ownerId: response.locals.userId }).sort({ createdAt: -1 });
  response.json({ success: true, data: { endpoints: endpoints.map(endpointView) } });
}));

endpointsRouter.post("/", validateBody(endpointCreateSchema), asyncHandler(async (request, response) => {
  const { name, url } = request.body as { name: string; url: string };
  await validateDestinationUrl(url);
  const endpoint = await WebhookEndpoint.create({
    ownerId: new Types.ObjectId(response.locals.userId), name, url,
    signingSecret: `whsec_${randomBytes(32).toString("base64url")}`,
  });
  response.status(201).json({ success: true, data: { endpoint: endpointView(endpoint), signingSecret: endpoint.signingSecret } });
}));

endpointsRouter.get("/:endpointId", asyncHandler(async (request, response) => {
  const endpoint = await WebhookEndpoint.findOne({ _id: request.params.endpointId, ownerId: response.locals.userId });
  if (!endpoint) throw new AppError("Endpoint not found.", 404);
  const deliveries = await Delivery.find({ endpointId: endpoint._id, ownerId: response.locals.userId })
    .sort({ createdAt: -1 }).limit(8).select("eventId eventType status attempts lastStatusCode createdAt");
  response.json({ success: true, data: { endpoint: endpointView(endpoint), recentDeliveries: deliveries } });
}));

endpointsRouter.param("endpointId", (_request, _response, next, value) => {
  const result = endpointParamsSchema.safeParse({ endpointId: value });
  if (!result.success) return next(new AppError("Invalid endpoint ID.", 400));
  next();
});

endpointsRouter.patch("/:endpointId", validateBody(endpointUpdateSchema), asyncHandler(async (request, response) => {
  const updates = request.body as { name?: string; url?: string; enabled?: boolean };
  if (updates.url) await validateDestinationUrl(updates.url);
  const endpoint = await WebhookEndpoint.findOneAndUpdate(
    { _id: request.params.endpointId, ownerId: response.locals.userId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!endpoint) throw new AppError("Endpoint not found.", 404);
  response.json({ success: true, data: { endpoint: endpointView(endpoint) } });
}));

endpointsRouter.delete("/:endpointId", asyncHandler(async (request, response) => {
  const endpoint = await WebhookEndpoint.findOneAndDelete({ _id: request.params.endpointId, ownerId: response.locals.userId });
  if (!endpoint) throw new AppError("Endpoint not found.", 404);
  response.json({ success: true, data: { deleted: true } });
}));

const testEventSchema = eventSchema.or(eventSchema.partial().strict()).optional();
endpointsRouter.post("/:endpointId/test", validateBody(testEventSchema), asyncHandler(async (request, response) => {
  const body = request.body as Partial<EventInput> | undefined;
  const event = body?.eventType && body.payload
    ? { eventType: body.eventType, payload: body.payload }
    : { eventType: "hookflow.test", payload: { message: "This is a HookFlow test event." } };
  const delivery = await enqueueEvent(response.locals.userId, request.params.endpointId ?? "", event);
  response.status(202).json({ success: true, data: { deliveryId: delivery.id, eventId: delivery.eventId, status: delivery.status } });
}));

endpointsRouter.post("/:endpointId/events", validateBody(eventSchema), asyncHandler(async (request, response) => {
  const delivery = await enqueueEvent(response.locals.userId, request.params.endpointId ?? "", request.body as EventInput);
  response.status(202).json({ success: true, data: { deliveryId: delivery.id, eventId: delivery.eventId, status: delivery.status } });
}));
