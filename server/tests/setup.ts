import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "hookflow-test-secret-at-least-32-characters";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.RETRY_BASE_DELAY_MS = "100";
process.env.RETRY_MAX_DELAY_MS = "1000";
process.env.MAX_DELIVERY_ATTEMPTS = "3";
process.env.DELIVERY_TIMEOUT_MS = "1000";

const memoryServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = memoryServer.getUri();
(globalThis as typeof globalThis & { hookflowMongo?: MongoMemoryServer }).hookflowMongo = memoryServer;
