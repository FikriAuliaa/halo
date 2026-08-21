import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Text } from "./text";

describe("Text", () => {
  it("renders as a <p> by default", () => {
    render(<Text>hello</Text>);
    const el = screen.getByText("hello");
    expect(el.tagName).toBe("P");
  });

  it("renders as a <span> when as='span' is given, decoupling element from style", () => {
    render(
      <Text as="span" variant="label-bold">
        hello
      </Text>,
    );
    const el = screen.getByText("hello");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toContain("text-label-bold");
  });

  it.each([
    ["body-lg", "text-body-lg"],
    ["body-sm", "text-body-sm"],
    ["label-bold", "text-label-bold"],
  ] as const)("applies the %s variant class", (variant, expectedClass) => {
    render(<Text variant={variant}>x</Text>);
    expect(screen.getByText("x").className).toContain(expectedClass);
  });
});
