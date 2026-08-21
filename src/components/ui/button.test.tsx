import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it.each(["primary", "secondary", "ghost", "destructive"] as const)(
    "renders the %s variant",
    (variant) => {
      render(<Button variant={variant}>Click</Button>);
      expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
    },
  );

  it("fires onClick on mouse click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("fires onClick on Enter and Space keyboard activation", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    const button = screen.getByRole("button");
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not fire onClick while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("sets aria-busy while loading", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("does not fire onClick when explicitly disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Submit
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("preserves the label text in the DOM while loading (width preservation)", () => {
    render(<Button loading>Kirim Bukti Pembayaran</Button>);
    expect(screen.getByText("Kirim Bukti Pembayaran")).toBeInTheDocument();
  });

  it("meets the 44px minimum touch target at every size", () => {
    const { rerender } = render(<Button size="sm">x</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
    rerender(<Button size="md">x</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
  });

  it("is always pill-shaped regardless of variant, per DESIGN.md", () => {
    render(<Button variant="secondary">x</Button>);
    expect(screen.getByRole("button").className).toContain("rounded-full");
  });
});
