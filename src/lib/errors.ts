/**
 * The centrally-enumerated error codes from API_SPEC.md. Every Route
 * Handler maps its failures to exactly one of these — never a raw
 * Firestore/Storage error message (SECURITY.md's "secure error messaging").
 */
export const ERROR_CODES = [
  "NUMBER_UNAVAILABLE",
  "RESERVATION_EXPIRED",
  "RESERVATION_NOT_FOUND",
  "SESSION_MISMATCH",
  "INVALID_FILE_TYPE",
  "FILE_TOO_LARGE",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "FORBIDDEN",
  "UNAUTHENTICATED",
  "RATE_LIMITED",
  "CONFLICT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  NUMBER_UNAVAILABLE: 409,
  RESERVATION_EXPIRED: 410,
  RESERVATION_NOT_FOUND: 404,
  SESSION_MISMATCH: 403,
  INVALID_FILE_TYPE: 422,
  FILE_TOO_LARGE: 413,
  VALIDATION_FAILED: 422,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * Thrown by src/domain and src/server code for any expected failure. Route
 * Handlers catch this and serialize it via `toErrorResponseBody` — an
 * AppError's `message` is always safe to show a student or admin (never a
 * stack trace or a Firestore path), per SECURITY.md.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly field: string | null;

  constructor(code: ErrorCode, message: string, field: string | null = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.field = field;
  }
}

export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    field: string | null;
  };
}

export function toErrorResponseBody(error: AppError): ErrorResponseBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      field: error.field,
    },
  };
}
