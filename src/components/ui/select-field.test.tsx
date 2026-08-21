import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectField } from "./select-field";

const OPTIONS = [
  { value: "unair", label: "Universitas Airlangga" },
  { value: "its", label: "Institut Teknologi Sepuluh Nopember" },
];

describe("SelectField", () => {
  it("renders a labelled trigger showing the placeholder when no value is selected", () => {
    render(
      <SelectField
        label="Universitas"
        placeholder="Pilih universitas Anda"
        value={undefined}
        onValueChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    expect(screen.getByText("Pilih universitas Anda")).toBeInTheDocument();
  });

  it("is keyboard-reachable and opens on Enter", async () => {
    render(
      <SelectField
        label="Universitas"
        value={undefined}
        onValueChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Universitas" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("Universitas Airlangga")).toBeInTheDocument();
  });

  it("calls onValueChange when an option is selected via click", async () => {
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="Universitas"
        value={undefined}
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Universitas" }));
    await userEvent.click(await screen.findByText("Universitas Airlangga"));
    expect(onValueChange).toHaveBeenCalledWith("unair");
  });
});
