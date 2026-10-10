import { z } from "zod";

const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const endpointCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.string().trim().url().max(2048),
}).strict();

export const endpointUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  url: z.string().trim().url().max(2048).optional(),
  enabled: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

const jsonRecordSchema = z.record(z.unknown()).refine((value) => {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= 60_000;
  } catch {
    return false;
  }
}, "Payload must be valid JSON smaller than 60 KB.");

export const eventSchema = z.object({
  eventType: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9_.-]+$/),
  payload: jsonRecordSchema,
}).strict();

export const deliveryQuerySchema = z.object({
  status: z.enum(["pending", "processing", "retry_scheduled", "succeeded", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export const endpointParamsSchema = z.object({ endpointId: z.string().regex(/^[0-9a-f]{24}$/i) }).strict();
export const deliveryParamsSchema = z.object({ deliveryId: z.string().regex(/^[0-9a-f]{24}$/i) }).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EndpointCreateInput = z.infer<typeof endpointCreateSchema>;
export type EndpointUpdateInput = z.infer<typeof endpointUpdateSchema>;
export type EventInput = z.infer<typeof eventSchema>;
