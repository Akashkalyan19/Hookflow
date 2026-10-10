export type DeliveryStatus = "pending" | "processing" | "retry_scheduled" | "succeeded" | "failed";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverySummary {
  id: string;
  eventId: string;
  eventType: string;
  endpointId: string;
  endpointName: string;
  status: DeliveryStatus;
  attempts: number;
  lastStatusCode?: number;
  lastError?: string;
  nextRetryAt?: string;
  createdAt: string;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  attemptedAt: string;
  statusCode?: number;
  durationMs: number;
  succeeded: boolean;
  error?: string;
  responsePreview?: string;
}

export interface Delivery extends Omit<DeliverySummary, "attempts"> {
  attempts: DeliveryAttempt[];
  payload: Record<string, unknown>;
  endpointId: string;
  completedAt?: string;
  replayOf?: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DashboardStats {
  totalEndpoints: number;
  enabledEndpoints: number;
  totalDeliveries: number;
  succeeded: number;
  failed: number;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}
