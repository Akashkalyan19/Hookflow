import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { startDeliveryWorker } from "./workers/deliveryWorker.js";

await connectDatabase();
console.log("HookFlow delivery worker started.");
const worker = startDeliveryWorker();

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await worker.stop();
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
