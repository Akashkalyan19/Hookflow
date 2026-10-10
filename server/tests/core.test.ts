import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Delivery } from "../src/models/Delivery.js";
import { User } from "../src/models/User.js";
import { signPayload, verifySignature } from "../src/services/signing.js";
import { validateDestinationUrl } from "../src/services/destinationSecurity.js";
import { startDeliveryWorker } from "../src/workers/deliveryWorker.js";

const mongo = (globalThis as typeof globalThis & { hookflowMongo: MongoMemoryServer }).hookflowMongo;
const payload = "{\"id\":\"evt_known\",\"type\":\"order.created\",\"data\":{\"amount\":4999}}";

async function register(name: string, email: string) {
  const response = await request(app).post("/api/auth/register").send({ name, email, password: "correct-horse-battery" });
  return { token: response.body.data.token as string, userId: response.body.data.user.id as string };
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 3000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error("Condition was not reached before timeout.");
}

beforeAll(async () => { await connectDatabase(); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  vi.unstubAllGlobals();
});
afterAll(async () => { await disconnectDatabase(); await mongo.stop(); });

describe("HookFlow API and delivery core", () => {
  it("hashes passwords, rejects duplicate registrations, and protects private routes", async () => {
    const created = await request(app).post("/api/auth/register").send({ name: "Riley Dev", email: "RILEY@example.com", password: "correct-horse-battery" });
    expect(created.status).toBe(201);
    const stored = await User.findOne({ email: "riley@example.com" }).select("+passwordHash");
    expect(stored?.passwordHash).not.toBe("correct-horse-battery");
    expect(await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.compare("correct-horse-battery", stored?.passwordHash ?? ""))).toBe(true);
    expect((await request(app).post("/api/auth/login").send({ email: "riley@example.com", password: "correct-horse-battery" })).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: "riley@example.com", password: "incorrect-password" })).status).toBe(401);
    expect((await request(app).post("/api/auth/register").send({ name: "Riley Dev", email: "riley@example.com", password: "correct-horse-battery" })).status).toBe(409);
    expect((await request(app).get("/api/endpoints")).status).toBe(401);
  });

  it("signs exact UTF-8 payload bytes using timestamp dot payload", () => {
    const signature = signPayload("whsec_test", "1700000000", payload);
    expect(signature).toBe("79c3ac4c49164c9e0ff9df4c7c7bfa26e268b787e08cd2e9ea3df7d60e822a88");
    expect(verifySignature("whsec_test", "1700000000", payload, `v1=${signature}`)).toBe(true);
    expect(verifySignature("whsec_wrong", "1700000000", payload, `v1=${signature}`)).toBe(false);
  });

  it("blocks loopback and private webhook destinations", async () => {
    await expect(validateDestinationUrl("http://127.0.0.1/hook")).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateDestinationUrl("http://169.254.169.254/latest/meta-data")).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateDestinationUrl("http://localhost/hook")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("isolates endpoints, reveals a secret only on creation, and persists an accepted event", async () => {
    const owner = await register("Owner", "owner@example.com");
    const stranger = await register("Stranger", "stranger@example.com");
    const created = await request(app).post("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Orders", url: "https://8.8.8.8/hooks/orders" });
    expect(created.status).toBe(201);
    expect(created.body.data.signingSecret).toMatch(/^whsec_/);
    const endpointId = created.body.data.endpoint.id as string;
    expect((await request(app).get("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)).body.data.endpoints[0]).not.toHaveProperty("signingSecret");
    expect((await request(app).get(`/api/endpoints/${endpointId}`).set("Authorization", `Bearer ${stranger.token}`)).status).toBe(404);
    const event = await request(app).post(`/api/endpoints/${endpointId}/events`).set("Authorization", `Bearer ${owner.token}`)
      .send({ eventType: "order.created", payload: { amount: 4999 } });
    expect(event.status).toBe(202);
    expect(await Delivery.countDocuments({ ownerId: owner.userId, status: "pending" })).toBe(1);
  });

  it("returns real zero-valued dashboard statistics for an empty account", async () => {
    const owner = await register("Dashboard", "dashboard@example.com");
    const response = await request(app).get("/api/dashboard/stats").set("Authorization", `Bearer ${owner.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.stats).toEqual({ totalEndpoints: 0, enabledEndpoints: 0, totalDeliveries: 0, succeeded: 0, failed: 0 });
    expect(response.body.data.recentDeliveries).toEqual([]);
  });

  it("delivers the signed body and records an HTTP success", async () => {
    const owner = await register("Sender", "sender@example.com");
    const endpoint = await request(app).post("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Receiver", url: "https://8.8.8.8/hooks" });
    const secret = endpoint.body.data.signingSecret as string;
    await request(app).post(`/api/endpoints/${endpoint.body.data.endpoint.id}/events`).set("Authorization", `Bearer ${owner.token}`)
      .send({ eventType: "order.created", payload: { amount: 4999 } });
    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      const headers = new Headers(init?.headers);
      expect(verifySignature(secret, headers.get("X-HookFlow-Timestamp") ?? "", body, headers.get("X-HookFlow-Signature") ?? "")).toBe(true);
      expect(headers.get("X-HookFlow-Event-Id")).toMatch(/^evt_/);
      return new Response("accepted", { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const worker = startDeliveryWorker({ pollIntervalMs: 5 });
    try {
      await waitFor(async () => (await Delivery.findOne({ ownerId: owner.userId }))?.status === "succeeded");
      const delivery = await Delivery.findOne({ ownerId: owner.userId });
      expect(delivery?.attempts).toHaveLength(1);
      expect(delivery?.attempts[0]?.statusCode).toBe(202);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { await worker.stop(); }
  });

  it("retries retryable responses and ends in a terminal failure", async () => {
    const owner = await register("Retry", "retry@example.com");
    const endpoint = await request(app).post("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Flaky receiver", url: "https://8.8.4.4/hooks" });
    await request(app).post(`/api/endpoints/${endpoint.body.data.endpoint.id}/events`).set("Authorization", `Bearer ${owner.token}`)
      .send({ eventType: "order.created", payload: { amount: 4999 } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("try later", { status: 503 })));
    const worker = startDeliveryWorker({ pollIntervalMs: 5 });
    try {
      await waitFor(async () => {
        const delivery = await Delivery.findOne({ ownerId: owner.userId });
        if (delivery?.status === "retry_scheduled") {
          delivery.nextRetryAt = new Date(0);
          await delivery.save();
          return true;
        }
        return false;
      });
      await waitFor(async () => {
        const delivery = await Delivery.findOne({ ownerId: owner.userId });
        if (delivery?.status === "retry_scheduled") { delivery.nextRetryAt = new Date(0); await delivery.save(); }
        return delivery?.status === "failed";
      });
      const delivery = await Delivery.findOne({ ownerId: owner.userId });
      expect(delivery?.attempts).toHaveLength(3);
      expect(delivery?.attempts.every((attempt) => attempt.statusCode === 503)).toBe(true);
    } finally { await worker.stop(); }
  });

  it("retries a network failure and records the recovery attempt", async () => {
    const owner = await register("Network", "network@example.com");
    const endpoint = await request(app).post("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Intermittent receiver", url: "https://9.9.9.9/hooks" });
    await request(app).post(`/api/endpoints/${endpoint.body.data.endpoint.id}/events`).set("Authorization", `Bearer ${owner.token}`)
      .send({ eventType: "order.created", payload: { amount: 4999 } });
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 })));
    const worker = startDeliveryWorker({ pollIntervalMs: 5 });
    try {
      await waitFor(async () => {
        const delivery = await Delivery.findOne({ ownerId: owner.userId });
        if (delivery?.status === "retry_scheduled") { delivery.nextRetryAt = new Date(0); await delivery.save(); return true; }
        return false;
      });
      await waitFor(async () => (await Delivery.findOne({ ownerId: owner.userId }))?.status === "succeeded");
      const delivery = await Delivery.findOne({ ownerId: owner.userId });
      expect(delivery?.attempts).toHaveLength(2);
      expect(delivery?.attempts[0]?.error).toBe("Network request failed.");
      expect(delivery?.attempts[1]?.succeeded).toBe(true);
    } finally { await worker.stop(); }
  });

  it("replays into a new delivery while preserving the event ID and old history", async () => {
    const owner = await register("Replay", "replay@example.com");
    const endpoint = await request(app).post("/api/endpoints").set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Replay receiver", url: "https://1.1.1.1/hooks" });
    const originalResponse = await request(app).post(`/api/endpoints/${endpoint.body.data.endpoint.id}/events`).set("Authorization", `Bearer ${owner.token}`)
      .send({ eventType: "order.created", payload: { amount: 4999 } });
    const originalId = originalResponse.body.data.deliveryId as string;
    const original = await Delivery.findById(originalId);
    if (!original) throw new Error("Missing original delivery.");
    original.status = "failed";
    await original.save();
    const replay = await request(app).post(`/api/deliveries/${originalId}/replay`).set("Authorization", `Bearer ${owner.token}`);
    expect(replay.status).toBe(202);
    expect(replay.body.data.deliveryId).not.toBe(originalId);
    expect(replay.body.data.eventId).toBe(original.eventId);
    const saved = await Delivery.findById(replay.body.data.deliveryId);
    expect(saved?.replayOf?.toString()).toBe(originalId);
    expect(saved?.status).toBe("pending");
    expect((await Delivery.findById(originalId))?.attempts).toHaveLength(0);
  });
});
