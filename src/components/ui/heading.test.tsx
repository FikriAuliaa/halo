import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Heading } from "./heading";

describe("Heading", () => {
  it.each(["h1", "h2", "h3", "h4"] as const)("renders as <%s> when as='%s' is given", (tag) => {
    render(
      <Heading as={tag} variant="title-md">
        hello
      </Heading>,
    );
    expect(screen.getByText("hello").tagName).toBe(tag.toUpperCase());
  });

  it("decouples semantics from appearance: an h2 can carry display-lg styling", () => {
    render(
      <Heading as="h2" variant="display-lg">
        big
      </Heading>,
    );
    const el = screen.getByText("big");
    expect(el.tagName).toBe("H2");
    expect(el.className).toContain("text-display-lg");
  });

  it("applies both the mobile and desktop headline classes for headline-responsive", () => {
    render(
      <Heading as="h1" variant="headline-responsive">
        title
      </Heading>,
    );
    const el = screen.getByText("title");
    expect(el.className).toContain("text-headline-lg-mobile");
    expect(el.className).toContain("md:text-headline-lg");
  });
});
