import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

function Harness({
  onConfirm,
  typedConfirmationPhrase,
}: {
  onConfirm: () => void;
  typedConfirmationPhrase?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Tandai Terjual Offline?"
      description="Tindakan ini tidak dapat dibatalkan."
      onConfirm={onConfirm}
      {...(typedConfirmationPhrase ? { typedConfirmationPhrase } : {})}
    />
  );
}

describe("ConfirmDialog", () => {
  it("defaults focus away from the destructive action (cancel is not auto-focused destructively)", async () => {
    render(<Harness onConfirm={vi.fn()} />);
    await screen.findByRole("dialog");
    // The destructive confirm button must not be the initially-focused element.
    const confirmButton = screen.getByRole("button", { name: "Konfirmasi" });
    expect(document.activeElement).not.toBe(confirmButton);
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Konfirmasi" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables confirm until the typed confirmation phrase matches exactly", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} typedConfirmationPhrase="HAPUS" />);
    const confirmButton = screen.getByRole("button", { name: "Konfirmasi" });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText('Ketik "HAPUS" untuk melanjutkan');
    await userEvent.type(input, "salah");
    expect(confirmButton).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, "HAPUS");
    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
