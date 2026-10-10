# TypeScript learning guide for HookFlow Lite

This guide follows the code that is in this repository. Start with the domain types and schemas before reading the request handlers and React pages.

## 1. Interfaces and type aliases

In `server/src/types/domain.ts`, `UserFields` and `DeliveryAttempt` are interfaces that describe structured records. `DeliveryStatus` is a type alias for a finite union of string values. Interfaces work well for object shapes; aliases also represent unions and other composed types.

**Exercise:** Add a `WebhookEvent` interface containing an event ID, event type, and JSON payload. Use it as the return type of a helper in `server/src/services/deliveryQueue.ts`.

## 2. Inference and explicit annotations

`client/src/pages/DashboardPage.tsx` lets TypeScript infer the types of values returned by `map`, while `useState<DashboardData | null>(null)` explicitly describes state that begins empty and is filled asynchronously.

**Exercise:** Add a second derived statistic to `DashboardPage` and let TypeScript infer its type from the existing `DashboardStats` values.

## 3. Union types and narrowing

`DeliveryStatus` in `server/src/types/domain.ts` restricts delivery state to five named values. `server/src/services/retryPolicy.ts` branches on a numeric status code; in `server/src/workers/deliveryWorker.ts`, the response and error paths narrow the work to a success, retry, or terminal failure.

**Exercise:** Add a small function that accepts `DeliveryStatus` and returns whether the status is terminal. Let TypeScript flag any missing status branch.

## 4. Typed React props and state

`client/src/components/StatusBadge.tsx` accepts a `DeliveryStatus` prop. `client/src/pages/EndpointsPage.tsx` stores `Endpoint[]` state and uses a typed `FormEvent<HTMLFormElement>` for submission.

**Exercise:** Add an optional `compact` boolean prop to `StatusBadge` and adjust its padding while preserving the status type.

## 5. Context typing

`client/src/context/AuthContext.tsx` defines `AuthContextValue` with a `User | null`, a loading flag, and typed async functions. It creates the context as nullable, then `useAuth` checks for a provider before returning the value.

**Exercise:** Add a `refreshUser(): Promise<void>` method to the context and implement it using `/api/auth/me`.

## 6. Express handler and middleware typing

`server/src/middleware/authenticate.ts` uses Express's `RequestHandler` type and stores the verified JWT subject in `response.locals.userId`. `server/src/utils/asyncHandler.ts` wraps an Express handler and forwards rejected promises to the centralized error middleware.

**Exercise:** Add a typed middleware that logs the request method and path without logging request bodies, authorization headers, or secrets.

## 7. Runtime validation with Zod

`server/src/validators/schemas.ts` validates registration, endpoint updates, event bodies, IDs, and delivery filters. `server/src/middleware/validate.ts` runs schemas against incoming bodies and query parameters before routes use them. `z.infer<typeof eventSchema>` produces the compile-time `EventInput` type from the runtime schema.

**Exercise:** Add an optional `source` string to the event schema, cap it at 80 characters, and show how the inferred `EventInput` type changes.

## 8. Mongoose schema and reference typing

`server/src/models/WebhookEndpoint.ts` creates a `Schema<EndpointFields>` and declares `ownerId` as a reference to `User`. `server/src/models/Delivery.ts` embeds the bounded attempt subdocument schema and indexes worker and history queries.

**Exercise:** Add a non-sensitive `description` field to an endpoint, validate its maximum length, and include it in `endpointView`.

## 9. API input types versus response types

`server/src/validators/schemas.ts` describes accepted request input. `server/src/services/endpointView.ts` deliberately maps a database document into a safe endpoint response shape without the signing secret. On the frontend, `client/src/types/api.ts` describes those API response DTOs separately from form values.

**Exercise:** Add an endpoint response type for the one-time creation result that includes `signingSecret`, while keeping ordinary `Endpoint` responses secret-free.

## 10. Async functions and errors

`server/src/services/destinationSecurity.ts` awaits DNS resolution and throws an `AppError` for rejected destinations. `server/src/utils/asyncHandler.ts` forwards async route failures. `server/src/middleware/errorHandler.ts` converts known application errors into consistent JSON responses without returning internal exception details.

**Exercise:** Add a unit test for an invalid URL and verify the route returns a `400` JSON error.

## 11. Delivery status types

`DeliveryStatus` is the same five-state union in server domain types and frontend API types. `client/src/components/StatusBadge.tsx` uses a `Record<DeliveryStatus, string>` so adding a new status requires adding its display label as well.

**Exercise:** Add a deliberate temporary status to the union and observe the compiler identify the UI map that needs updating; then remove it.

## 12. Strict compiler checks

Both `client/tsconfig.json` and `server/tsconfig.json` set `strict: true`. The client also enables `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`; the server enables strict null checks through strict mode and the latter two safeguards.

**Exercise:** Temporarily remove the null check for the optional dashboard response in `client/src/pages/DashboardPage.tsx`, run type checking, and inspect the diagnostic. Restore the check afterward.

## 13. How to run type checking

From the repository root, run:

```powershell
npm run typecheck
```

This runs the frontend project build check and the backend TypeScript compiler in strict mode.

## Suggested reading order

1. `server/src/types/domain.ts` and `server/src/validators/schemas.ts`
2. `server/src/middleware/validate.ts` and `server/src/services/signing.ts`
3. `server/src/routes/auth.ts` and `server/src/routes/endpoints.ts`
4. `server/src/services/deliveryQueue.ts`, `server/src/services/retryPolicy.ts`, and `server/src/workers/deliveryWorker.ts`
5. `client/src/types/api.ts`, `client/src/context/AuthContext.tsx`, and `client/src/components/StatusBadge.tsx`
6. `client/src/pages/EndpointsPage.tsx`, `client/src/pages/DeliveriesPage.tsx`, and `client/src/pages/DeliveryDetailPage.tsx`
