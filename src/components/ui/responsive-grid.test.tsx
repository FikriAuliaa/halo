import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ResponsiveGrid } from "./responsive-grid";

describe("ResponsiveGrid", () => {
  it("grid-always: 1 column mobile, 2 at md, 3 at lg", () => {
    const { container } = render(
      <ResponsiveGrid behavior="grid-always">
        <div>a</div>
      </ResponsiveGrid>,
    );
    const el = container.firstElementChild!;
    expect(el.className).toContain("grid-cols-1");
    expect(el.className).toContain("md:grid-cols-2");
    expect(el.className).toContain("lg:grid-cols-3");
  });

  it("scroll-until-desktop: snap-scroll below lg, static grid at lg", () => {
    const { container } = render(
      <ResponsiveGrid behavior="scroll-until-desktop">
        <div>a</div>
      </ResponsiveGrid>,
    );
    const el = container.firstElementChild!;
    expect(el.className).toContain("snap-x");
    expect(el.className).toContain("overflow-x-auto");
    expect(el.className).toContain("lg:grid");
    expect(el.className).toContain("lg:overflow-visible");
  });
});
