import { z } from "zod";
import { AppError, toErrorResponseBody, type ErrorResponseBody } from "@/lib/errors";
import type { Logger } from "./logger";

/**
 * Converts a Zod validation failure into the shared `VALIDATION_FAILED`
 * envelope, naming the first offending field — the client and server
 * schemas are the same objects (AGENTS.md), so this message is always the
 * one the client-side form already showed for the same input.
 */
export function zodErrorToAppError(error: z.ZodError): AppError {
  const firstIssue = error.issues[0];
  return new AppError(
    "VALIDATION_FAILED",
    firstIssue?.message ?? "Data yang dikirim tidak valid.",
    firstIssue ? firstIssue.path.join(".") : null,
  );
}

/**
 * The single place an unknown thrown value becomes an HTTP response.
 * Unexpected errors are logged in full server-side and reduced to a
 * generic `INTERNAL` + correlation ID for the caller — never their raw
 * message, which could contain a Firestore path or other internal detail
 * (SECURITY.md "secure error messaging", B051).
 */
export function toHttpResponse(error: unknown, correlationId: string, logger: Logger): Response {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof z.ZodError) {
    appError = zodErrorToAppError(error);
  } else {
    logger.error("unhandled_exception", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    appError = new AppError("INTERNAL", "Terjadi kesalahan pada server.");
  }

  if (appError.code === "INTERNAL" && !(error instanceof AppError)) {
    // already logged above
  } else if (appError.httpStatus >= 500) {
    logger.error("app_error", { code: appError.code, message: appError.message });
  } else {
    logger.info("app_error", { code: appError.code, message: appError.message });
  }

  const body: ErrorResponseBody & { correlation_id: string } = {
    ...toErrorResponseBody(appError),
    correlation_id: correlationId,
  };

  return Response.json(body, {
    status: appError.httpStatus,
    headers: { "x-correlation-id": correlationId },
  });
}
