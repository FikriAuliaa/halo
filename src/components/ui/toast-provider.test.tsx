import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ToastProvider } from "./toast-provider";
import { useToast } from "@/hooks/use-toast";

function Trigger() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast("success", "Berhasil")}>Success</button>
      <button onClick={() => showToast("error", "Gagal mengunggah")}>Error</button>
      <button onClick={() => showToast("info", "Info")}>Info</button>
    </div>
  );
}

// Radix also renders its own hidden aria-live announcer element sharing
// role="status" with the visible toast — every assertion below scopes to
// the toast's own text (rendered as a <div>) rather than the ambiguous
// role alone.
const byToastText = (text: string) => screen.queryByText(text, { selector: "div" });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider / useToast", () => {
  it("renders a success toast with role=status on its own element", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByText("Success").click();
    });
    const toastText = byToastText("Berhasil");
    expect(toastText).toBeInTheDocument();
    expect(toastText?.closest('[role="status"]')).toBeInTheDocument();
  });

  it("renders an error toast with role=alert on its own element", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByText("Error").click();
    });
    const toastText = byToastText("Gagal mengunggah");
    expect(toastText).toBeInTheDocument();
    expect(toastText?.closest('[role="alert"]')).toBeInTheDocument();
  });

  it("auto-dismisses a non-error toast after its computed duration", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByText("Info").click();
    });
    expect(byToastText("Info")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(byToastText("Info")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss an error toast", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      screen.getByText("Error").click();
    });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(byToastText("Gagal mengunggah")).toBeInTheDocument();
  });

  it("caps the visible stack at 3", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      for (let i = 0; i < 4; i++) {
        screen.getByText("Error").click();
      }
    });
    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });
});
