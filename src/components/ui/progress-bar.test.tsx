import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("exposes value via the progressbar role and aria-value* attributes", () => {
    render(<ProgressBar percent={60} aria-label="Sisa waktu" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "60");
    expect(el).toHaveAttribute("aria-valuemin", "0");
    expect(el).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps values outside 0-100", () => {
    render(<ProgressBar percent={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("uses the error tone class under the caller's chosen tone", () => {
    render(<ProgressBar percent={10} tone="error" />);
    const fill = screen.getByRole("progressbar").firstElementChild;
    expect(fill?.className).toContain("bg-error");
  });
});
