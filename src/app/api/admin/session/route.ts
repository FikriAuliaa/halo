import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createScopedAuthClient, supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminRole } from "@/server/auth/admin-auth";
import {
  applyAdminSessionCookie,
  clearedAdminSessionCookie,
  createAdminSessionCookie,
  readAdminSessionToken,
} from "@/server/auth/session-cookie";
import { checkRateLimit, hashIp } from "@/server/framework/rate-limit";
import { createLogger, generateCorrelationId } from "@/server/framework/logger";
import { toHttpResponse } from "@/server/framework/errors";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * `POST /api/admin/session` (B094) — the login exchange. Written as a
 * plain Route Handler, not through `createHandler`, because it needs to
 * set the admin session cookie on a genuinely fresh login response, which
 * `createHandler`'s single "reuse the caller's already-established
 * session" cookie path isn't shaped for. Password verification happens
 * entirely server-side (`createScopedAuthClient().auth.signInWithPassword`), so the
 * password is never handled by client-side Supabase code, and rate
 * limiting / the identical wrong-password-vs-unknown-account message are
 * enforceable in exactly one place.
 */
export async function POST(request: Request): Promise<Response> {
  const correlationId = generateCorrelationId();
  const logger = createLogger(correlationId);

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError(
        "VALIDATION_FAILED",
        issue?.message ?? "Data tidak valid.",
        (issue?.path[0] as string | undefined) ?? null,
      );
    }
    const { email, password } = parsed.data;

    const ipHash = await hashIp(clientIp(request));
    const perIp = await checkRateLimit(
      ipHash,
      { operation: "adminLogin", limit: 10, windowSeconds: 300, failClosed: true },
      logger,
    );
    if (!perIp.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.");
    }
    const perEmail = await checkRateLimit(
      `email:${email.toLowerCase()}`,
      { operation: "adminLogin", limit: 10, windowSeconds: 300, failClosed: true },
      logger,
    );
    if (!perEmail.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.");
    }

    // Identical failure for "wrong password" and "no such account" —
    // both collapse to the same generic message below, so the endpoint
    // can't be used to enumerate which admin emails exist.
    //
    // Uses a scoped, throwaway client, never the shared `supabaseAdmin`
    // singleton: `signInWithPassword` sets that client's internal
    // session, and every later `supabaseAdmin.storage`/PostgREST call
    // would then run as this admin's own JWT instead of the service
    // role (see `createScopedAuthClient`'s doc comment for the bug this
    // caused live).
    const { data, error } = await createScopedAuthClient().auth.signInWithPassword({
      email,
      password,
    });
    const invalidCredentials = () =>
      new AppError("UNAUTHENTICATED", "Email atau kata sandi salah.");

    if (error || !data.session || !data.user) {
      throw invalidCredentials();
    }
    const role = await getAdminRole(data.user.id);
    if (!role) {
      // A real Supabase account with no admin_users row — same generic
      // message; this endpoint never confirms an email exists at all.
      throw invalidCredentials();
    }

    const response = Response.json(
      { role },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
    applyAdminSessionCookie(
      response,
      createAdminSessionCookie({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
    );
    return response;
  } catch (error) {
    return toHttpResponse(error, correlationId, logger);
  }
}

/** Logout (B096) — revokes the session **server-side** (Supabase's
 * `signOut` invalidates the refresh token), not merely clearing the
 * cookie client-side; a stolen cookie dies with the session. */
export async function DELETE(request: Request): Promise<Response> {
  const correlationId = generateCorrelationId();
  const logger = createLogger(correlationId);

  try {
    const session = readAdminSessionToken(request.headers.get("cookie"));
    if (session) {
      await supabaseAdmin.auth.admin.signOut(session.access_token, "global").catch((error) => {
        logger.warn("admin_logout_revoke_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    const response = Response.json(
      {},
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
    applyAdminSessionCookie(response, clearedAdminSessionCookie());
    return response;
  } catch (error) {
    return toHttpResponse(error, correlationId, logger);
  }
}
