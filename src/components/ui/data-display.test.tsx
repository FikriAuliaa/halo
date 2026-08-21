import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataDisplay } from "./data-display";

describe("DataDisplay", () => {
  it("renders the value without a unit", () => {
    render(<DataDisplay value={160} />);
    expect(screen.getByText("160")).toBeInTheDocument();
  });

  it("renders the value and unit as separate, distinctly-sized nodes", () => {
    render(<DataDisplay value={160} unit="GB" />);
    const unitEl = screen.getByText("GB");
    expect(unitEl.tagName).toBe("SPAN");
    expect(unitEl.className).toContain("text-[20px]");
  });
});
