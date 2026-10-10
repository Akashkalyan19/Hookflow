import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { Delivery } from "../models/Delivery.js";
import { WebhookEndpoint } from "../models/WebhookEndpoint.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/stats", asyncHandler(async (_request, response) => {
  const ownerId = response.locals.userId;
  const [totalEndpoints, enabledEndpoints, deliveryCounts, recent] = await Promise.all([
    WebhookEndpoint.countDocuments({ ownerId }),
    WebhookEndpoint.countDocuments({ ownerId, enabled: true }),
    Delivery.aggregate<{ _id: string; count: number }>([
      { $match: { ownerId: new Types.ObjectId(ownerId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Delivery.find({ ownerId }).sort({ createdAt: -1 }).limit(6),
  ]);
  const endpointIds = [...new Set(recent.map((delivery) => delivery.endpointId.toString()))];
  const endpoints = await WebhookEndpoint.find({ _id: { $in: endpointIds }, ownerId }).select("name");
  const names = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint.name]));
  const counts = Object.fromEntries(deliveryCounts.map(({ _id, count }) => [_id, count]));
  response.json({
    success: true,
    data: {
      stats: {
        totalEndpoints, enabledEndpoints,
        totalDeliveries: Object.values(counts).reduce((sum, count) => sum + count, 0),
        succeeded: counts.succeeded ?? 0, failed: counts.failed ?? 0,
      },
      recentDeliveries: recent.map((delivery) => ({
        id: delivery.id, eventId: delivery.eventId, eventType: delivery.eventType,
        endpointId: delivery.endpointId.toString(), endpointName: names.get(delivery.endpointId.toString()) ?? "Deleted endpoint",
        status: delivery.status, attempts: delivery.attempts.length, lastStatusCode: delivery.lastStatusCode,
        createdAt: delivery.createdAt,
      })),
    },
  });
}));
