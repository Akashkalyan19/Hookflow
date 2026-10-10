import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

await connectDatabase();
const server = app.listen(env.PORT, () => console.log(`HookFlow API listening on http://localhost:${env.PORT}`));

async function shutdown(): Promise<void> {
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
