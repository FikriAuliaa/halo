/**
 * A discriminated union for operations that fail *expectedly* (a validation
 * failure, a business-rule violation) as opposed to *exceptionally* (a bug,
 * a downstream outage). Prefer this over throwing when the caller is
 * expected to handle the failure as a normal code path rather than an
 * exceptional one — e.g. src/domain's pure validators return a Result so
 * a form can render a field error without a try/catch.
 *
 * AppError (errors.ts) is still used for failures a Route Handler turns
 * directly into an HTTP error response — the two are complementary, not
 * competing: a Result's `Err` value is often an AppError.
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
