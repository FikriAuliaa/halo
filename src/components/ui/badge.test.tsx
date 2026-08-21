import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";
import { Chip } from "./chip";

describe("Badge", () => {
  it("renders the required text content", () => {
    render(<Badge>Terkunci</Badge>);
    expect(screen.getByText("Terkunci")).toBeInTheDocument();
  });

  it.each(["orange", "red", "outline", "neutral"] as const)(
    "renders the %s variant without error",
    (variant) => {
      render(<Badge variant={variant}>x</Badge>);
      expect(screen.getByText("x")).toBeInTheDocument();
    },
  );
});

describe("Chip", () => {
  it("renders its content", () => {
    render(<Chip>Pilih 1 Extra Benefit</Chip>);
    expect(screen.getByText("Pilih 1 Extra Benefit")).toBeInTheDocument();
  });
});
