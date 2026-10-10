import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

describe("delivery display", () => {
  it("shows a readable failed status", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders an actionable empty state", () => {
    render(<EmptyState title="No endpoints yet" description="Create one to begin." action={<button>Create endpoint</button>} />);
    expect(screen.getByText("No endpoints yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create endpoint" })).toBeInTheDocument();
  });
});
