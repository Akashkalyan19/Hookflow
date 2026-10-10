import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { validateQuery } from "../middleware/validate.js";
import { Delivery } from "../models/Delivery.js";
import { WebhookEndpoint } from "../models/WebhookEndpoint.js";
import { deliveryParamsSchema, deliveryQuerySchema } from "../validators/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const deliveriesRouter = Router();
deliveriesRouter.use(authenticate);
deliveriesRouter.param("deliveryId", (_request, _response, next, value) => {
  const result = deliveryParamsSchema.safeParse({ deliveryId: value });
  if (!result.success) return next(new AppError("Invalid delivery ID.", 400));
  next();
});

deliveriesRouter.get("/", validateQuery(deliveryQuerySchema), asyncHandler(async (request, response) => {
  const query = (request as typeof request & { validatedQuery: { status?: string; page: number; limit: number } }).validatedQuery;
  const filter = { ownerId: response.locals.userId, ...(query.status ? { status: query.status } : {}) };
  const [deliveries, total] = await Promise.all([
    Delivery.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    Delivery.countDocuments(filter),
  ]);
  const endpointIds = [...new Set(deliveries.map((delivery) => delivery.endpointId.toString()))];
  const endpoints = await WebhookEndpoint.find({ _id: { $in: endpointIds }, ownerId: response.locals.userId }).select("name");
  const names = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint.name]));
  response.json({
    success: true,
    data: {
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id, eventId: delivery.eventId, eventType: delivery.eventType,
        endpointId: delivery.endpointId.toString(), endpointName: names.get(delivery.endpointId.toString()) ?? "Deleted endpoint",
        status: delivery.status, attempts: delivery.attempts.length, lastStatusCode: delivery.lastStatusCode,
        lastError: delivery.lastError, nextRetryAt: delivery.nextRetryAt, createdAt: delivery.createdAt,
      })),
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    },
  });
}));

deliveriesRouter.get("/:deliveryId", asyncHandler(async (request, response) => {
  const delivery = await Delivery.findOne({ _id: request.params.deliveryId, ownerId: response.locals.userId });
  if (!delivery) throw new AppError("Delivery not found.", 404);
  const endpoint = await WebhookEndpoint.findOne({ _id: delivery.endpointId, ownerId: response.locals.userId }).select("name url enabled");
  response.json({
    success: true,
    data: {
      delivery: {
        id: delivery.id, eventId: delivery.eventId, eventType: delivery.eventType,
        endpointId: delivery.endpointId.toString(), endpointName: endpoint?.name ?? "Deleted endpoint",
        status: delivery.status, payload: delivery.payload, attempts: delivery.attempts,
        lastStatusCode: delivery.lastStatusCode, lastError: delivery.lastError,
        nextRetryAt: delivery.nextRetryAt, createdAt: delivery.createdAt,
        completedAt: delivery.completedAt, replayOf: delivery.replayOf?.toString(),
      },
    },
  });
}));

deliveriesRouter.post("/:deliveryId/replay", asyncHandler(async (request, response) => {
  const original = await Delivery.findOne({ _id: request.params.deliveryId, ownerId: response.locals.userId }).select("+rawPayload");
  if (!original) throw new AppError("Delivery not found.", 404);
  const endpoint = await WebhookEndpoint.findOne({ _id: original.endpointId, ownerId: response.locals.userId });
  if (!endpoint) throw new AppError("The original endpoint no longer exists.", 409);
  if (!endpoint.enabled) throw new AppError("Enable the endpoint before replaying this delivery.", 409);
  const replay = await Delivery.create({
    ownerId: new Types.ObjectId(response.locals.userId), endpointId: original.endpointId,
    eventId: original.eventId, eventType: original.eventType, payload: original.payload,
    rawPayload: original.rawPayload, status: "pending", attempts: [], replayOf: original._id,
  });
  response.status(202).json({ success: true, data: { deliveryId: replay.id, eventId: replay.eventId, replayOf: original.id, status: replay.status } });
}));
