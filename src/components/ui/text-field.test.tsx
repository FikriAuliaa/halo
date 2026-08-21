import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextField } from "./text-field";

describe("TextField", () => {
  it("associates the label with the input via htmlFor/id", () => {
    render(<TextField label="Nama Lengkap" />);
    expect(screen.getByLabelText("Nama Lengkap")).toBeInTheDocument();
  });

  it("wires the error message via aria-describedby and sets aria-invalid", () => {
    render(<TextField label="Nama Lengkap" error="Nama wajib diisi" />);
    const input = screen.getByLabelText("Nama Lengkap");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).toHaveTextContent("Nama wajib diisi");
    expect(errorEl).toHaveAttribute("role", "alert");
  });

  it("renders helper text when there is no error", () => {
    render(<TextField label="Nama Lengkap" helperText="Sesuai KTP" />);
    expect(screen.getByText("Sesuai KTP")).toBeInTheDocument();
  });

  it("marks the field required both visually and via the required attribute", () => {
    render(<TextField label="Nama Lengkap" required />);
    expect(screen.getByLabelText(/Nama Lengkap/)).toBeRequired();
  });
});
