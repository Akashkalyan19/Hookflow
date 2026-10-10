import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

const auth = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), user: null }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));

describe("authentication form", () => {
  beforeEach(() => { auth.login.mockReset(); auth.register.mockReset(); auth.user = null; });

  it("submits the sign-in fields", async () => {
    auth.login.mockResolvedValue(undefined);
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "dev@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("dev@example.com", "secret-pass"));
  });
});
