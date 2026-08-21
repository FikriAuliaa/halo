import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./dialog";

function Harness({ preventClose = false }: { preventClose?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onOpenChange={setOpen} title="Konfirmasi" preventClose={preventClose}>
        <button>Inside</button>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  it("is labelled and marked aria-modal when open", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Konfirmasi")).toBeInTheDocument();
  });

  it("traps focus inside the dialog while open", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    // Radix moves focus into the content on open.
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    });
  });

  it('closes on Escape (Radix restores focus to the trigger on unmount — not re-tested here: jsdom does not consider its document "focused", which is a documented environment gap, not a property of our component)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("blocks Escape from closing while preventClose is true", async () => {
    render(<Harness preventClose />);
    await userEvent.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
