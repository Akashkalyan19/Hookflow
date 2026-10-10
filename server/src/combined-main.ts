import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { startDeliveryWorker } from "./workers/deliveryWorker.js";

await connectDatabase();
const worker = startDeliveryWorker();
const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`HookFlow API and delivery worker listening on port ${env.PORT}`);
});

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await worker.stop();
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
