import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeDurationMs, useToastState } from "./use-toast";

describe("computeDurationMs", () => {
  it("scales with message length", () => {
    expect(computeDurationMs("hi")).toBeLessThan(computeDurationMs("a much longer message here"));
  });

  it("has a sensible minimum for very short messages", () => {
    expect(computeDurationMs("")).toBeGreaterThanOrEqual(3000);
  });
});

describe("useToastState", () => {
  it("adds a toast", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("success", "Berhasil disimpan");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe("Berhasil disimpan");
  });

  it("caps the stack at 3, dropping the oldest first", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("info", "one");
      result.current.showToast("info", "two");
      result.current.showToast("info", "three");
      result.current.showToast("info", "four");
    });
    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts.map((t) => t.message)).toEqual(["two", "three", "four"]);
  });

  it("dismisses a toast by id", () => {
    const { result } = renderHook(() => useToastState());
    let id = "";
    act(() => {
      id = result.current.showToast("info", "x");
    });
    act(() => {
      result.current.dismissToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
