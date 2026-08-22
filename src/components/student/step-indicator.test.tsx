import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepIndicator } from "./step-indicator";

describe("StepIndicator", () => {
  it("renders as a list, not interactive links", () => {
    render(<StepIndicator currentStep={2} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("marks exactly the current step with aria-current=step", () => {
    render(<StepIndicator currentStep={2} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).not.toHaveAttribute("aria-current");
    expect(items[3]).not.toHaveAttribute("aria-current");
  });

  it('announces "step 2 of 4: Paket" via the accessible label', () => {
    render(<StepIndicator currentStep={2} />);
    expect(screen.getByLabelText("Langkah 2 dari 4: Paket")).toBeInTheDocument();
  });

  it("shows a checkmark for completed steps", () => {
    render(<StepIndicator currentStep={3} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("✓");
    expect(items[1]).toHaveTextContent("✓");
    expect(items[2]).not.toHaveTextContent("✓");
  });

  it.each([1, 2, 3, 4] as const)("renders without error for step %i", (step) => {
    render(<StepIndicator currentStep={step} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
