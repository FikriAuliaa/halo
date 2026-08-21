import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectableCard } from "./selectable-card";

describe("SelectableCard", () => {
  it("renders as a button with role radio", () => {
    render(
      <SelectableCard selected={false} onSelect={vi.fn()}>
        0811-1234-5678
      </SelectableCard>,
    );
    const el = screen.getByRole("radio");
    expect(el.tagName).toBe("BUTTON");
  });

  it("exposes selection via aria-checked, not color alone", () => {
    const { rerender } = render(
      <SelectableCard selected={false} onSelect={vi.fn()}>
        card
      </SelectableCard>,
    );
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
    rerender(
      <SelectableCard selected onSelect={vi.fn()}>
        card
      </SelectableCard>,
    );
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onSelect on click", async () => {
    const onSelect = vi.fn();
    render(
      <SelectableCard selected={false} onSelect={onSelect}>
        card
      </SelectableCard>,
    );
    await userEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onSelect via keyboard activation (Enter/Space)", async () => {
    const onSelect = vi.fn();
    render(
      <SelectableCard selected={false} onSelect={onSelect}>
        card
      </SelectableCard>,
    );
    const el = screen.getByRole("radio");
    el.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("does not call onSelect when disabled", async () => {
    const onSelect = vi.fn();
    render(
      <SelectableCard selected={false} disabled onSelect={onSelect}>
        card
      </SelectableCard>,
    );
    await userEvent.click(screen.getByRole("radio"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies a border-weight signifier in addition to color when selected", () => {
    render(
      <SelectableCard selected onSelect={vi.fn()}>
        card
      </SelectableCard>,
    );
    const surface = screen.getByRole("radio").firstElementChild;
    expect(surface?.className).toContain("border-2");
  });
});
