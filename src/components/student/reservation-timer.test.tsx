import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ReservationTimer } from "./reservation-timer";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReservationTimer", () => {
  it("renders the remaining time as MM:SS", () => {
    render(
      <ReservationTimer
        reservedAt={new Date("2026-08-20T09:45:00.000Z")}
        reservedUntil={new Date("2026-08-20T10:15:00.000Z")}
      />,
    );
    expect(screen.getByText("15:00")).toBeInTheDocument();
  });

  it("shifts to the error tone under the two-minute threshold", () => {
    render(
      <ReservationTimer
        reservedAt={new Date("2026-08-20T09:45:00.000Z")}
        reservedUntil={new Date("2026-08-20T10:01:30.000Z")}
      />,
    );
    const bar = screen.getByRole("progressbar").firstElementChild;
    expect(bar?.className).toContain("bg-error");
  });

  it("does not use the error tone above the two-minute threshold", () => {
    render(
      <ReservationTimer
        reservedAt={new Date("2026-08-20T09:45:00.000Z")}
        reservedUntil={new Date("2026-08-20T10:15:00.000Z")}
      />,
    );
    const bar = screen.getByRole("progressbar").firstElementChild;
    expect(bar?.className).toContain("bg-secondary-container");
  });

  it("announces at the 5-minute, 2-minute, and 30-second thresholds only, via aria-live=polite", () => {
    const { container } = render(
      <ReservationTimer
        reservedAt={new Date("2026-08-20T09:45:00.000Z")}
        reservedUntil={new Date("2026-08-20T10:05:00.000Z")}
      />,
    );
    const liveRegion = container.querySelector('[aria-live="polite"]')!;
    expect(liveRegion).toHaveTextContent("5:00 tersisa untuk menyelesaikan pesanan.");

    act(() => {
      vi.advanceTimersByTime(3 * 60_000 + 1000); // cross the 2-minute threshold
    });
    expect(liveRegion).toHaveTextContent("2:00 tersisa untuk menyelesaikan pesanan.");

    act(() => {
      vi.advanceTimersByTime(89_000); // cross the 30-second threshold
    });
    expect(liveRegion).toHaveTextContent("0:30 tersisa untuk menyelesaikan pesanan.");
  });

  it("fires onExpire exactly once when the countdown reaches zero", () => {
    const onExpire = vi.fn();
    render(
      <ReservationTimer
        reservedAt={new Date("2026-08-20T09:59:55.000Z")}
        reservedUntil={new Date("2026-08-20T10:00:05.000Z")}
        onExpire={onExpire}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
