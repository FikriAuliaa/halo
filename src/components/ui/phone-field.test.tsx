import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneField } from "./phone-field";

function ControlledPhoneField() {
  const [value, setValue] = useState("");
  return <PhoneField label="Nomor WhatsApp" value={value} onValueChange={setValue} />;
}

describe("PhoneField", () => {
  it("shows the fixed +62 prefix affordance", () => {
    render(<PhoneField label="Nomor WhatsApp" value="" onValueChange={vi.fn()} />);
    expect(screen.getByText("+62")).toBeInTheDocument();
  });

  it("uses inputMode numeric for the correct mobile keyboard", () => {
    render(<PhoneField label="Nomor WhatsApp" value="" onValueChange={vi.fn()} />);
    expect(screen.getByLabelText("Nomor WhatsApp")).toHaveAttribute("inputMode", "numeric");
  });

  it.each([
    // The fixed "+62" affordance is rendered separately, never part of the
    // field's own value — so the normalised value re-displayed here must
    // never re-add a "0" or "62" prefix, or it would visually double up
    // with that affordance (e.g. "+62081234567890").
    ["81234567890", "81234567890"],
    ["081234567890", "81234567890"],
    ["+6281234567890", "81234567890"],
    ["6281234567890", "81234567890"],
  ])("normalises %s to %s on blur", async (typed, expected) => {
    render(<ControlledPhoneField />);
    const input = screen.getByLabelText("Nomor WhatsApp");
    await userEvent.clear(input);
    await userEvent.type(input, typed);
    await userEvent.tab();
    expect(input).toHaveValue(expected);
  });

  it("leaves clearly-invalid input untouched on blur rather than crashing", async () => {
    render(<ControlledPhoneField />);
    const input = screen.getByLabelText("Nomor WhatsApp");
    await userEvent.type(input, "abc");
    await userEvent.tab();
    expect(input).toHaveValue("abc");
  });
});
