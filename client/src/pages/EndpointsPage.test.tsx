import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { EndpointsPage } from "./EndpointsPage";

const toast = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("../context/ToastContext", () => ({ useToast: () => toast }));
vi.mock("../services/api", () => ({ api: vi.fn(), jsonBody: JSON.stringify }));

describe("endpoint management", () => {
  beforeEach(() => { vi.mocked(api).mockReset(); toast.notify.mockReset(); });

  it("shows the empty state and submits the endpoint form", async () => {
    vi.mocked(api).mockImplementation(async <T,>(_path: string, options?: RequestInit) => {
      if (options?.method === "POST") return { endpoint: { id: "endpoint-id", name: "Orders", url: "https://example.com/hook", enabled: true }, signingSecret: "whsec_once" } as T;
      return { endpoints: [] } as T;
    });
    render(<MemoryRouter><EndpointsPage /></MemoryRouter>);
    expect(await screen.findByText("No endpoints yet")).toBeInTheDocument();
    const openButtons = screen.getAllByRole("button", { name: "Create endpoint" });
    if (openButtons[0]) fireEvent.click(openButtons[0]);
    fireEvent.change(screen.getByPlaceholderText("Order service"), { target: { value: "Orders" } });
    fireEvent.change(screen.getByPlaceholderText("https://api.example.com/hooks"), { target: { value: "https://example.com/hook" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create endpoint" }));
    await waitFor(() => expect(screen.getByText("whsec_once")).toBeInTheDocument());
    expect(vi.mocked(api)).toHaveBeenCalledWith("/endpoints", expect.objectContaining({ method: "POST" }));
  });
});
