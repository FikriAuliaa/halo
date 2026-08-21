import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, EMPTY_STATE_PRESETS } from "./empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Belum ada pesanan" description="Detail" />);
    expect(screen.getByText("Belum ada pesanan")).toBeInTheDocument();
    expect(screen.getByText("Detail")).toBeInTheDocument();
  });

  it("renders an action only when both label and handler are provided", () => {
    const { rerender } = render(<EmptyState title="x" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<EmptyState title="x" actionLabel="Muat Ulang" onAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Muat Ulang" })).toBeInTheDocument();
  });

  it("calls onAction when the action is clicked", async () => {
    const onAction = vi.fn();
    render(<EmptyState title="x" actionLabel="Muat Ulang" onAction={onAction} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it.each(Object.entries(EMPTY_STATE_PRESETS))("renders the %s preset", (_key, preset) => {
    render(<EmptyState {...preset} />);
    expect(screen.getByText(preset.title)).toBeInTheDocument();
  });
});
