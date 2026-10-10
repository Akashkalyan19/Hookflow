import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { DashboardPage } from "./DashboardPage";
import type { DashboardStats, DeliverySummary } from "../types/api";

vi.mock("../services/api", () => ({ api: vi.fn() }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DashboardData {
  stats: DashboardStats;
  recentDeliveries: DeliverySummary[];
}

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    totalEndpoints: 3,
    enabledEndpoints: 2,
    totalDeliveries: 10,
    succeeded: 8,
    failed: 2,
    ...overrides,
  };
}

function makeDelivery(id: string, overrides: Partial<DeliverySummary> = {}): DeliverySummary {
  return {
    id,
    eventId: `evt_${id}`,
    eventType: "order.created",
    endpointId: "ep_1",
    endpointName: "Orders",
    status: "succeeded",
    attempts: 1,
    createdAt: new Date("2026-01-01T12:00:00Z").toISOString(),
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  // Ensure each test starts with a clean DOM even when vitest globals are off.
  afterEach(() => {
    cleanup();
  });

  // -- Loading state ---------------------------------------------------------

  it("shows a loading state while the API request is in-flight", () => {
    // Never resolves during this test
    vi.mocked(api).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // -- Statistics cards ------------------------------------------------------

  it("renders all four statistic cards with correct values", async () => {
    const data: DashboardData = {
      stats: makeStats({
        totalEndpoints: 5,
        enabledEndpoints: 3,
        totalDeliveries: 40,
        succeeded: 35,
        failed: 5,
      }),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    const section = await screen.findByRole("region", { name: "Delivery statistics" });
    const articles = section.querySelectorAll("article");

    // Total endpoints card
    const endpointsCard = articles[0]!;
    expect(endpointsCard).toHaveTextContent("Total endpoints");
    expect(endpointsCard).toHaveTextContent("5");
    expect(endpointsCard).toHaveTextContent("3 enabled");

    // Total deliveries card
    const deliveriesCard = articles[1]!;
    expect(deliveriesCard).toHaveTextContent("Total deliveries");
    expect(deliveriesCard).toHaveTextContent("40");

    // Successful card
    const successCard = articles[2]!;
    expect(successCard).toHaveTextContent("Successful");
    expect(successCard).toHaveTextContent("35");

    // Failed card
    const failedCard = articles[3]!;
    expect(failedCard).toHaveTextContent("Failed");
    expect(failedCard).toHaveTextContent("5");
  });

  it("shows the correct success percentage when there are deliveries", async () => {
    const data: DashboardData = {
      stats: makeStats({ totalDeliveries: 20, succeeded: 15, failed: 5 }),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    // 15/20 = 75%
    await screen.findByText("75% of deliveries");
  });

  it("shows 'No deliveries yet' in the success card when totalDeliveries is 0", async () => {
    const data: DashboardData = {
      stats: makeStats({ totalDeliveries: 0, succeeded: 0, failed: 0 }),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("No deliveries yet");
  });

  it("shows 'Nothing to fix' in the failed card when failed count is 0", async () => {
    const data: DashboardData = {
      stats: makeStats({ failed: 0 }),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    const section = await screen.findByRole("region", { name: "Delivery statistics" });
    const failedCard = section.querySelectorAll("article")[3]!;
    expect(failedCard).toHaveTextContent("Nothing to fix");
  });

  it("shows 'Needs a closer look' in the failed card when failed > 0", async () => {
    const data: DashboardData = {
      stats: makeStats({ failed: 3 }),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    const section = await screen.findByRole("region", { name: "Delivery statistics" });
    const failedCard = section.querySelectorAll("article")[3]!;
    expect(failedCard).toHaveTextContent("Needs a closer look");
  });

  // -- Recent activity -------------------------------------------------------

  it("renders the recent deliveries table when deliveries exist", async () => {
    const data: DashboardData = {
      stats: makeStats(),
      recentDeliveries: [
        makeDelivery("d1", { eventType: "order.created", endpointName: "Orders", status: "succeeded" }),
        makeDelivery("d2", { eventType: "payment.failed", endpointName: "Billing", status: "failed" }),
      ],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("order.created");
    expect(screen.getByText("payment.failed")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    // Scope badge assertions to the delivery table so the "Failed" stat card
    // cannot satisfy the assertion.
    const table = screen.getByRole("table");
    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(table).toHaveTextContent("Failed");
  });

  it("renders accessible row links to each delivery detail page", async () => {
    const data: DashboardData = {
      stats: makeStats(),
      recentDeliveries: [
        makeDelivery("d99", { eventType: "user.signup" }),
      ],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("user.signup");
    const link = screen.getByRole("link", { name: "View user.signup" });
    expect(link).toHaveAttribute("href", "/deliveries/d99");
  });

  // -- Empty state -----------------------------------------------------------

  it("shows the empty state when there are no recent deliveries", async () => {
    const data: DashboardData = {
      stats: makeStats(),
      recentDeliveries: [],
    };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("Nothing delivered yet");
    expect(
      screen.getByText("Create an endpoint and send a test event to see its delivery appear here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up an endpoint" })).toBeInTheDocument();
  });

  // -- API error state -------------------------------------------------------

  it("displays the error message when the API rejects with an Error", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Service unavailable"));
    renderDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Service unavailable");
  });

  it("displays a fallback message when the API rejects with a non-Error value", async () => {
    vi.mocked(api).mockRejectedValue("unexpected");
    renderDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load dashboard.");
  });

  // -- Navigation links ------------------------------------------------------

  it("renders the 'All deliveries' link pointing to /deliveries", async () => {
    const data: DashboardData = { stats: makeStats(), recentDeliveries: [] };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("Nothing delivered yet");
    expect(screen.getByRole("link", { name: /all deliveries/i })).toHaveAttribute(
      "href",
      "/deliveries",
    );
  });

  it("renders the 'Add endpoint' link pointing to /endpoints?create=1", async () => {
    const data: DashboardData = { stats: makeStats(), recentDeliveries: [] };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await screen.findByText("Nothing delivered yet");
    expect(screen.getByRole("link", { name: /add endpoint/i })).toHaveAttribute(
      "href",
      "/endpoints?create=1",
    );
  });

  // -- API call --------------------------------------------------------------

  it("calls /dashboard/stats exactly once on mount", async () => {
    const data: DashboardData = { stats: makeStats(), recentDeliveries: [] };
    vi.mocked(api).mockResolvedValue(data);
    renderDashboard();

    await waitFor(() => expect(vi.mocked(api)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api)).toHaveBeenCalledWith("/dashboard/stats");
  });
});
