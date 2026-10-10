import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(secret: string, timestamp: string, rawPayload: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawPayload}`, "utf8").digest("hex");
}

export function verifySignature(secret: string, timestamp: string, rawPayload: string, signature: string): boolean {
  const supplied = signature.startsWith("v1=") ? signature.slice(3) : "";
  const expected = signPayload(secret, timestamp, rawPayload);
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
