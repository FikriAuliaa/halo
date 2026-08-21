import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailField } from "./email-field";

describe("EmailField", () => {
  it("renders a native email input with autocomplete", () => {
    render(<EmailField label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autoComplete", "email");
  });

  it("wires the error message via aria-describedby", () => {
    render(<EmailField label="Email" error="Format email tidak valid" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Format email tidak valid");
  });
});
