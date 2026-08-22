import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentShell } from "./student-shell";

describe("StudentShell", () => {
  it("uses header/main landmarks", () => {
    render(
      <StudentShell>
        <p>content</p>
      </StudentShell>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the timer slot only when provided", () => {
    const { rerender } = render(
      <StudentShell>
        <p>content</p>
      </StudentShell>,
    );
    expect(screen.queryByText("00:15")).not.toBeInTheDocument();
    rerender(
      <StudentShell timerSlot={<span>00:15</span>}>
        <p>content</p>
      </StudentShell>,
    );
    expect(screen.getByText("00:15")).toBeInTheDocument();
  });

  it("adds bottom padding to main when a bottom bar is present, so content is never obscured", () => {
    render(
      <StudentShell bottomBar={<button>Lanjut</button>}>
        <p>content</p>
      </StudentShell>,
    );
    expect(screen.getByRole("main").className).toContain("pb-[120px]");
    expect(screen.getByRole("button", { name: "Lanjut" })).toBeInTheDocument();
  });

  it("respects the safe-area inset on the fixed bottom bar", () => {
    render(
      <StudentShell bottomBar={<button>Lanjut</button>}>
        <p>content</p>
      </StudentShell>,
    );
    const bar = screen.getByRole("button", { name: "Lanjut" }).parentElement;
    expect(bar?.getAttribute("style")).toContain("safe-area-inset-bottom");
  });

  it("defaults to the narrow 480px column", () => {
    const { container } = render(
      <StudentShell>
        <p>content</p>
      </StudentShell>,
    );
    expect(container.firstElementChild?.className).toContain("max-w-[480px]");
    expect(container.firstElementChild?.className).not.toContain("md:max-w-[720px]");
  });

  it("grows the column at md/lg breakpoints when width='wide' (grid-bearing screens)", () => {
    const { container } = render(
      <StudentShell width="wide">
        <p>content</p>
      </StudentShell>,
    );
    expect(container.firstElementChild?.className).toContain("md:max-w-[720px]");
    expect(container.firstElementChild?.className).toContain("lg:max-w-[960px]");
  });

  it("the bottom bar becomes static (in-flow) from md, not fixed, since desktop doesn't need it pinned", () => {
    render(
      <StudentShell bottomBar={<button>Lanjut</button>}>
        <p>content</p>
      </StudentShell>,
    );
    const bar = screen.getByRole("button", { name: "Lanjut" }).parentElement;
    expect(bar?.className).toContain("fixed");
    expect(bar?.className).toContain("md:static");
  });
});
