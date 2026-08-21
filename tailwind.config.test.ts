import { describe, expect, it } from "vitest";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "./tailwind.config";

// Asserts the resolved config matches DESIGN.md's token values exactly —
// a regression here means a token drifted from the spec without anyone
// updating DESIGN.md's contrast-ratio table alongside it (DESIGN.md §2.4).
const resolved = resolveConfig(tailwindConfig);

describe("design tokens match DESIGN.md", () => {
  it("base palette colors", () => {
    const colors = resolved.theme.colors as unknown as Record<string, string>;
    expect(colors.background).toBe("#200e0d");
    expect(colors["on-surface"]).toBe("#ffdad7");
    expect(colors["primary-container"]).toBe("#ed0226");
    expect(colors["secondary-container"]).toBe("#fe6b00");
    // The contrast remediation from DESIGN.md §2.4 — must stay dark, never
    // revert to the reference's failing white-on-orange (2.86:1).
    expect(colors["on-secondary-container"]).toBe("#572000");
  });

  it("atmospheric black variant tokens", () => {
    const colors = resolved.theme.colors as unknown as Record<string, string>;
    expect(colors["surface-black"]).toBe("#000000");
    expect(colors["card-gradient-start"]).toBe("#4a0000");
    expect(colors.divider).toBe("#2a2a2a");
    expect(colors["brand-red"]).toBe("#ed0226");
    expect(colors["highlight-orange"]).toBe("#fe6b00");
  });

  it("radius scale matches per-component assignments", () => {
    const radius = resolved.theme.borderRadius as unknown as Record<string, string>;
    expect(radius.field).toBe("8px");
    expect(radius.card).toBe("12px");
    expect(radius.package).toBe("16px");
  });

  it("spacing scale matches the 4px baseline system", () => {
    const spacing = resolved.theme.spacing as unknown as Record<string, string>;
    expect(spacing.base).toBe("4px");
    expect(spacing["container-margin"]).toBe("20px");
    expect(spacing.gutter).toBe("12px");
  });

  it("typography scale carries size, weight, and line-height together", () => {
    const fontSize = resolved.theme.fontSize as Record<string, unknown>;
    const dataDisplay = fontSize["data-display"] as [string, { fontWeight: string }];
    expect(dataDisplay[0]).toBe("48px");
    expect(dataDisplay[1].fontWeight).toBe("800");
  });
});
