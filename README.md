# HookFlow Lite

HookFlow Lite is a TypeScript webhook delivery dashboard. Create a destination, queue JSON events, sign each request with HMAC-SHA256, and inspect delivery attempts, bounded retries, and manual replays.

> **Assignment status:** This is an MVP built for a 72-hour engineering assignment. The Code0/Kiro requirement is unresolved: the implementation was created with Codex, and neither Code0 nor Kiro was used.

## Features

- Registration and login with bcrypt password hashing and short-lived JWT access tokens.
- Owner-scoped endpoint management and one-time display of signing secrets.
- Asynchronous event acceptance with MongoDB-backed polling delivery worker.
- HMAC-signed requests, HTTP timeouts, bounded response previews, and retry scheduling.
- Delivery history, attempt details, status filtering, and manual replay.
- Responsive React dashboard with real statistics and empty/loading/error states.

## Technology

React, Vite, TypeScript, Tailwind CSS, React Router, Lucide React, Express, MongoDB/Mongoose, Zod, JWT, bcryptjs, Vitest, React Testing Library, and Supertest.

## Architecture

```text
client/                 React + Vite dashboard
server/src/app.ts       Express app, importable by tests
server/src/server.ts    API process and graceful shutdown
server/src/worker-main.ts MongoDB delivery worker process
server/src/combined-main.ts API and worker in one process for Render Free
server/src/models/      User, WebhookEndpoint, and Delivery schemas
server/src/services/    Event queue, HMAC, URL checks, retry policy
server/tests/           MongoDB-backed API and worker tests
docs/TYPESCRIPT_GUIDE.md Learning notes tied to this source tree
```

The API and worker can run as separate processes and share one MongoDB database. For a Render Free deployment, `combined-main.ts` starts both in one web service so a paid background worker is not required. The Delivery document stores the event data and a bounded array of attempts. Replays create a new delivery document linked to the original delivery. The event ID and exact serialized event body stay the same across a replay; the delivery ID and attempt history are new.

## Screenshots

Screenshots have not been captured yet. Add verified screenshots here before publishing a submission that requires them.

## Requirements and setup

- Node.js 20.19+ or 22.13+ is recommended by the selected lint toolchain.
- npm 10 or later.
- MongoDB Community Server running locally, or a MongoDB Atlas connection string.

From the repository root in PowerShell:

```powershell
Copy-Item server/.env.example server/.env
npm install
```

Edit `server/.env` and replace `JWT_SECRET` with a cryptographically random value. Generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For local MongoDB, the default URI is `mongodb://127.0.0.1:27017/hookflow`. For Atlas, paste the application user's connection string into `MONGODB_URI`, URL-encode special characters in the password, and allow the app host in the Atlas network access list.

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | API port | `4000` |
| `MONGODB_URI` | MongoDB connection | Local `hookflow` database |
| `JWT_SECRET` | JWT signing key, at least 32 characters | Required |
| `FRONTEND_ORIGIN` | Exact browser origin allowed by CORS | `http://localhost:5173` |
| `WORKER_POLL_INTERVAL_MS` | Delay after an empty worker poll | `2000` |
| `DELIVERY_TIMEOUT_MS` | Per-request delivery timeout | `10000` |
| `MAX_DELIVERY_ATTEMPTS` | Total attempts including the first | `3` |
| `RETRY_BASE_DELAY_MS` | First retry delay | `5000` |
| `RETRY_MAX_DELAY_MS` | Upper bound for a retry delay | `300000` |

## Run the application

Run API, worker, and frontend together:

```powershell
npm run dev
```

Or use three terminals:

```powershell
npm run dev:api
npm run dev:worker
npm run dev:client
```

The API health endpoint is `http://localhost:4000/api/health`. The Vite development server is `http://localhost:5173` and proxies `/api` requests to port 4000.

For compiled processes after building:

```powershell
npm run build
npm run start:api
npm run start:worker
```

To run the API and worker together in one process (used by the Render Free Blueprint):

```powershell
npm run start:combined -w server
```

Serve `client/dist` from a static host and configure that host or a reverse proxy to send `/api` to the API process. Vite's development proxy is not a production reverse proxy.

### Deploy with Vercel, Render Free, and MongoDB Atlas

This repository is a monorepo. Deploy the frontend to Vercel and use the root `render.yaml` Blueprint to deploy a single free Render web service that runs both the API and delivery worker. Both use the same MongoDB Atlas database.

1. Push this repository to GitHub, then create a MongoDB Atlas cluster and database user. Copy the Atlas connection string for the application database and replace its username, password, and database name as needed.
2. In Vercel, import the GitHub repository and keep the project Root Directory at the repository root. `vercel.json` sets the frontend build command, output directory, and SPA fallback needed for direct links such as `/deliveries`. The site can be deployed before the API is connected; sign-in and API features will work after step 5.
3. In Render, create a Blueprint from this repository. Render reads the root `render.yaml` and creates one **Free Web Service**. Supply `MONGODB_URI` and the Vercel production URL as `FRONTEND_ORIGIN` when prompted or in the service's Environment settings. `JWT_SECRET` is generated by Render. The root `.node-version` pins Node.js 22.16.0.
4. In Atlas, add the Render service's outbound IP ranges to the project's Network Access list. Render shows the ranges under the service's **Connect → Outbound** panel. Atlas only accepts connections from IP addresses on its access list. If the API failed to connect while deploying, restart or redeploy it after updating the Atlas access list.
5. In Vercel, set `VITE_API_BASE_URL=https://YOUR-API.onrender.com/api` using the Render service's actual URL, then redeploy the frontend. Check `https://YOUR-API.onrender.com/api/health`, open the Vercel URL, register, create an endpoint, and send a test delivery.

Keep `MONGODB_URI` and `JWT_SECRET` private. The API's `FRONTEND_ORIGIN` must match the browser origin exactly; update it if you change the Vercel production domain or use a custom domain. On Render Free, the API and worker stop together when the web service spins down after 15 minutes without inbound traffic. Pending events stay in MongoDB and are delivered after a later request wakes the service; the first request after idle can take about a minute.

## Checks

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

The server suite uses `mongodb-memory-server`; its first run may need network access to download a MongoDB binary. It does not connect to or delete data from the configured development database. Client tests use jsdom and React Testing Library.

## REST API

All responses use `{ "success": true, "data": ... }` or `{ "success": false, "message": ..., "errors": ... }`. Private routes require `Authorization: Bearer <access-token>`. Access tokens expire after 30 minutes. The browser keeps its token in `sessionStorage` and removes it on logout; logout is client-side token removal because tokens are stateless.

### Authentication

| Method | Route | Body |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `{ "name", "email", "password" }` |
| `POST` | `/api/auth/login` | `{ "email", "password" }` |
| `POST` | `/api/auth/logout` | — |
| `GET` | `/api/auth/me` | — |

Registration requires a 10–128 character password. Emails are normalized to lowercase. Auth routes are rate-limited.

### Endpoints and events

| Method | Route | Description |
| --- | --- | --- |
| `GET`, `POST` | `/api/endpoints` | List or create a destination |
| `GET`, `PATCH`, `DELETE` | `/api/endpoints/:endpointId` | Read or manage an owned destination |
| `POST` | `/api/endpoints/:endpointId/test` | Queue a default test event or supplied event |
| `POST` | `/api/endpoints/:endpointId/events` | Queue a JSON event; returns `202` |

Example:

```json
{
  "eventType": "order.created",
  "payload": { "orderId": "ord_123", "amount": 4999, "currency": "INR" }
}
```

The receiver gets the stable serialized body `{"id":"evt_…","type":"order.created","data":{…}}`. The event is persisted before the API returns `202 Accepted`; the API does not wait for the destination. The create-endpoint response includes its signing secret once. Later endpoint responses omit it.

### Deliveries and dashboard

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/deliveries?page=1&limit=20&status=succeeded` | Bounded, paginated history and optional status filter |
| `GET` | `/api/deliveries/:deliveryId` | Payload and attempt details |
| `POST` | `/api/deliveries/:deliveryId/replay` | Queue a new delivery linked to the original |
| `GET` | `/api/dashboard/stats` | Owner-scoped endpoint and delivery counts plus recent activity |
| `GET` | `/api/health` | Process health |

Endpoint and delivery IDs are validated and every private lookup is owner-scoped on the server. A deleted endpoint does not delete its delivery records; history labels it `Deleted endpoint`.

## HMAC signing protocol

For each HTTP attempt, HookFlow creates a Unix timestamp in seconds and signs the exact UTF-8 request body bytes:

```text
message = timestamp + "." + rawPayload
digest = HMAC-SHA256(signingSecret, message).hex
signature = "v1=" + digest
```

Headers are `X-HookFlow-Event-Id`, `X-HookFlow-Timestamp`, and `X-HookFlow-Signature`. Retries use a fresh timestamp and signature while preserving the event body. A Node.js receiver can verify the raw body before parsing JSON:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

function verifyHook(req: Request, res: Response, next: () => void) {
  const timestamp = req.header("X-HookFlow-Timestamp");
  const signature = req.header("X-HookFlow-Signature")?.replace(/^v1=/, "");
  const secret = process.env.HOOKFLOW_SIGNING_SECRET;
  if (!timestamp || !signature || !secret || !Buffer.isBuffer(req.body)) {
    res.status(401).end();
    return;
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${req.body.toString("utf8")}`, "utf8")
    .digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.status(401).end();
    return;
  }
  next();
}
```

Configure the receiver's body parser to retain the raw bytes (for Express, use `express.raw({ type: "application/json" })` on the webhook route); do not parse and re-stringify JSON before checking the signature. Add timestamp age checks and replay protection in a production receiver.

## Worker, retries, and delivery semantics

The worker atomically claims `pending`, due `retry_scheduled`, or expired `processing` documents. A processing lease recovers work after a worker crash. Requests time out, redirects are not followed, and response previews are limited to 500 bytes.

The default is three total attempts. Network errors, timeouts, HTTP 408, 429, and 5xx responses can retry. Other HTTP errors are permanent. Backoff is exponential and capped; valid `Retry-After` values on 429 are honored within the configured maximum. Retry time is persisted in MongoDB.

Delivery is **at least once**, not exactly once. A receiver may have processed a request even if HookFlow times out before seeing its response. Retries and manual replays can therefore produce duplicate HTTP requests. Use `X-HookFlow-Event-Id` as an idempotency key at the receiver.

## Security and known limitations

- Passwords are hashed with bcryptjs. JWT access tokens are short-lived and sent as bearer tokens. `sessionStorage` reduces token persistence but remains accessible to same-origin JavaScript; a production app should consider secure, HttpOnly cookies and CSRF protection.
- Endpoint secrets are generated with cryptographic randomness and excluded from API reads. This MVP stores them in MongoDB without application-level encryption. Restrict database access and backups.
- Destinations must use HTTP(S); credentials, localhost names, and common IPv4/IPv6 private, loopback, link-local, metadata, and reserved ranges are rejected. DNS results are checked at endpoint save and again before delivery, redirects are disabled, and each request times out.
- DNS resolution and the HTTP client's later connection are separate operations. A DNS rebinding race is still possible; this is not complete SSRF protection. There is no private-network allow-list for local receivers. Do not expose this MVP as a public service until outbound requests use a network layer that binds the validated address to the connection and has been security-reviewed.
- There is no secret-rotation endpoint, refresh-token flow, shared queue, multi-region setup, webhook replay window enforcement, or production observability system.
- The worker is intentionally simple and uses MongoDB polling. The delivery attempt list is bounded by the configured maximum-attempt setting (capped at 10).

## AI-assisted development disclosure

Codex assisted with this implementation. Examples include drafting the Express routes and Mongoose schemas, creating the React dashboard and forms, implementing request signing and retry handling, and writing API and UI tests. Code0 or Kiro was not used; confirm with StartupMeu whether Codex is acceptable before submitting because that assignment requirement remains unresolved.

## Deployment recommendations

Use a managed MongoDB instance, a separate API and worker process, HTTPS at the edge, strong environment-managed secrets, restricted outbound networking, and centralized logs with secret redaction. Do not publish the signing secret or JWT secret. The current SSRF policy and session storage approach need a production security review before public deployment.

## Learning guide

See [docs/TYPESCRIPT_GUIDE.md](docs/TYPESCRIPT_GUIDE.md) for concepts explained with references to the actual code and short exercises.
