import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { createLogger } from "./logger";
import { toHttpResponse, zodErrorToAppError } from "./errors";

function silentLogger() {
  return createLogger("test-correlation");
}

describe("zodErrorToAppError", () => {
  it("names the first offending field", () => {
    const schema = z.object({ email: z.string().email("Format email tidak valid") });
    const result = schema.safeParse({ email: "not-an-email" });
    if (result.success) throw new Error("expected failure");
    const appError = zodErrorToAppError(result.error);
    expect(appError.code).toBe("VALIDATION_FAILED");
    expect(appError.field).toBe("email");
    expect(appError.message).toBe("Format email tidak valid");
  });
});

describe("toHttpResponse", () => {
  it("maps an AppError to its own status and code", async () => {
    const error = new AppError("NUMBER_UNAVAILABLE", "Nomor ini sudah tidak tersedia.");
    const response = toHttpResponse(error, "corr-1", silentLogger());
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("NUMBER_UNAVAILABLE");
    expect(body.error.message).toBe("Nomor ini sudah tidak tersedia.");
  });

  it("maps a ZodError to VALIDATION_FAILED (422)", async () => {
    const schema = z.object({ name: z.string().min(2, "Terlalu pendek") });
    const result = schema.safeParse({ name: "A" });
    if (result.success) throw new Error("expected failure");
    const response = toHttpResponse(result.error, "corr-2", silentLogger());
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("reduces an unexpected error to a generic INTERNAL message, never the raw message", async () => {
    const logger = silentLogger();
    const errorSpy = vi.spyOn(logger, "error");
    const raw = new Error("Firestore: permission denied at /numbers/secret-internal-path");
    const response = toHttpResponse(raw, "corr-3", logger);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("Firestore");
    expect(body.error.message).not.toContain("secret-internal-path");
    // The full detail is still captured server-side for debugging.
    expect(errorSpy).toHaveBeenCalledWith(
      "unhandled_exception",
      expect.objectContaining({ message: expect.stringContaining("secret-internal-path") }),
    );
  });

  it("always includes the correlation ID in the response body and header", async () => {
    const response = toHttpResponse(new AppError("NOT_FOUND", "x"), "corr-4", silentLogger());
    expect(response.headers.get("x-correlation-id")).toBe("corr-4");
    const body = await response.json();
    expect(body.correlation_id).toBe("corr-4");
  });
});
