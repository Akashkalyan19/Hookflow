import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { endpointsRouter } from "./routes/endpoints.js";
import { deliveriesRouter } from "./routes/deliveries.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.FRONTEND_ORIGIN, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "64kb", strict: true }));

app.get("/api/health", (_request, response) => {
  response.json({ success: true, data: { status: "ok" } });
});
app.use("/api/auth", authRouter);
app.use("/api/endpoints", endpointsRouter);
app.use("/api/deliveries", deliveriesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use((_request, response) => response.status(404).json({ success: false, message: "Route not found." }));
app.use(errorHandler);
