import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { DeliveryDetailPage } from "./DeliveryDetailPage";

const toast = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("../context/ToastContext", () => ({ useToast: () => toast }));
vi.mock("../services/api", () => ({ api: vi.fn() }));

describe("delivery replay", () => {
  beforeEach(() => { vi.mocked(api).mockReset(); toast.notify.mockReset(); });

  it("queues a replay from the detail view", async () => {
    vi.mocked(api).mockImplementation(async <T,>(path: string) => {
      if (path.endsWith("/replay")) return { deliveryId: "new-delivery" } as T;
      return { delivery: {
        id: path.split("/").at(-1) ?? "original", eventId: "evt_original", eventType: "order.created",
        endpointId: "endpoint-id", endpointName: "Orders", status: "failed", attempts: [], payload: { orderId: "ord_1" }, createdAt: new Date().toISOString(),
      } } as T;
    });
    render(<MemoryRouter initialEntries={["/deliveries/original"]}><Routes><Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Replay event" }));
    await waitFor(() => expect(vi.mocked(api)).toHaveBeenCalledWith("/deliveries/original/replay", { method: "POST" }));
  });
});
