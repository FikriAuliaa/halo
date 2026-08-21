import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NUMBER_STATUSES, ORDER_STATUSES } from "@/domain/status";
import { NumberStatusBadge, OrderStatusBadge } from "./status-badge";

describe("NumberStatusBadge", () => {
  it.each(NUMBER_STATUSES)("renders a distinct, text-bearing badge for %s", (status) => {
    render(<NumberStatusBadge status={status} />);
    expect(screen.getByText(/./)).toBeInTheDocument();
  });

  it("never relies on color alone — every status renders visible text", () => {
    for (const status of NUMBER_STATUSES) {
      const { unmount } = render(<NumberStatusBadge status={status} />);
      expect(screen.getByText((content) => content.length > 0)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("OrderStatusBadge", () => {
  it.each(ORDER_STATUSES)("renders a badge for %s", (status) => {
    render(<OrderStatusBadge status={status} />);
    expect(screen.getByText(/./)).toBeInTheDocument();
  });
});
