import type { ApiEnvelope } from "../types/api";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem("hookflow-token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Could not reach HookFlow. Check that the API is running.", 0);
  }
  const body = await response.json() as { success?: boolean; data?: T; message?: string };
  if (!response.ok || body.success !== true) throw new ApiError(body.message ?? "The request could not be completed.", response.status);
  return body.data as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export type ApiResponse<T> = ApiEnvelope<T>;
