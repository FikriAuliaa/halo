import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  it.each(["network", "server", "not-found", "forbidden", "expired"] as const)(
    "renders the %s preset via role=alert",
    (variant) => {
      render(<ErrorState variant={variant} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    },
  );

  it("offers retry for network errors", async () => {
    const onRetry = vi.fn();
    render(<ErrorState variant="network" onRetry={onRetry} />);
    await userEvent.click(screen.getByText("Coba Lagi"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers 'pilih nomor lain', never 'coba lagi', for an expired reservation", () => {
    render(<ErrorState variant="expired" onRetry={vi.fn()} />);
    expect(screen.getByText("Pilih Nomor Lain")).toBeInTheDocument();
    expect(screen.queryByText("Coba Lagi")).not.toBeInTheDocument();
  });

  it("does not offer a retry action for not-found or forbidden", () => {
    const { rerender } = render(<ErrorState variant="not-found" onRetry={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<ErrorState variant="forbidden" onRetry={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("never renders a raw error code or stack trace, only the safe preset text", () => {
    render(<ErrorState variant="server" />);
    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at\s+\w+\s*\(/)).not.toBeInTheDocument();
  });

  it("shows a correlation ID only when explicitly provided (admin context)", () => {
    const { rerender } = render(<ErrorState variant="server" />);
    expect(screen.queryByText(/ID:/)).not.toBeInTheDocument();
    rerender(<ErrorState variant="server" correlationId="abc-123" />);
    expect(screen.getByText("ID: abc-123")).toBeInTheDocument();
  });
});
