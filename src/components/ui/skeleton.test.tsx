import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./skeleton";
import { NumberGridSkeleton } from "./skeletons/number-grid-skeleton";
import { PackageScrollerSkeleton } from "./skeletons/package-scroller-skeleton";
import { OrderFormSkeleton } from "./skeletons/order-form-skeleton";
import { AdminTableSkeleton } from "./skeletons/admin-table-skeleton";

describe("Skeleton", () => {
  it("is individually aria-hidden", () => {
    const { container } = render(<Skeleton className="h-4 w-4" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("only animates under motion-safe (disabled for prefers-reduced-motion via Tailwind's variant)", () => {
    const { container } = render(<Skeleton className="h-4 w-4" />);
    expect(container.firstElementChild?.className).toContain("motion-safe:animate-pulse");
  });
});

describe("composed skeletons announce loading once via aria-busy on the container, not per item", () => {
  it("NumberGridSkeleton", () => {
    const { container } = render(<NumberGridSkeleton count={6} />);
    const busyContainers = container.querySelectorAll('[aria-busy="true"]');
    expect(busyContainers).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6);
    // Matches the real 72px number-card height exactly (DESIGN.md §7).
    const first = container.querySelector('[aria-hidden="true"]');
    expect(first?.className).toContain("h-[72px]");
  });

  it("PackageScrollerSkeleton", () => {
    const { container } = render(<PackageScrollerSkeleton count={5} />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
  });

  it("OrderFormSkeleton renders 4 field placeholders", () => {
    const { container } = render(<OrderFormSkeleton />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    // 4 fields x 2 skeletons (label + input) each.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(8);
  });

  it("AdminTableSkeleton renders the requested rows/columns", () => {
    const { container } = render(<AdminTableSkeleton rows={3} columns={4} />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(12);
  });
});
