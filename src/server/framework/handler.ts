import type { z } from "zod";
import { AppError } from "@/lib/errors";
import type { AdminRole } from "@/schemas/admin";
import { verifyAdminSession, verifyAdminToken } from "@/server/auth/admin-auth";
import {
  applyAdminSessionCookie,
  createAdminSessionCookie,
  readAdminSessionToken,
  type AdminSessionCookieAttributes,
} from "@/server/auth/session-cookie";
import { createLogger, generateCorrelationId, type Logger } from "./logger";
import { resolveSessionId, type SessionCookieAttributes } from "./session";
import { toHttpResponse } from "./errors";

/**
 * `Object.fromEntries(searchParams)` silently keeps only the *last*
 * value for a repeated key (`?exclude=a&exclude=b` becomes
 * `{ exclude: "b" }`) — a real, live bug found by a user clicking
 * "Refresh" on the number list once enough numbers were already shown
 * to produce more than one `exclude` param: `getAvailableNumbersQuerySchema`
 * expects `exclude` to be a real array, so validation failed with a
 * generic `422` the moment a second number needed excluding (and, less
 * visibly, even a *single* `exclude` value failed too, since a bare
 * string was never a valid array either). This groups every repeated
 * key into an array and leaves single-occurrence keys as plain
 * strings, so existing scalar query schemas (`status`, `search`,
 * `sort_field`, ...) are unaffected.
 */
export function parseQueryParams(url: URL): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    result[key] = values.length > 1 ? values : values[0]!;
  }
  return result;
}

export interface AdminContext {
  uid: string;
  role: AdminRole;
}

export interface HandlerContext<TInput> {
  input: TInput;
  /** Resolved Next.js dynamic route segments (e.g. `{ id: "..." }` for
   * `/api/admin/numbers/[id]`) — empty for routes with none. */
  params: Record<string, string>;
  sessionId: string;
  correlationId: string;
  logger: Logger;
  admin: AdminContext | null;
  request: Request;
}

/** Next.js 15's own shape for a dynamic route's second handler argument —
 * `params` is a Promise there, not a plain object (B058). */
export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export interface CreateHandlerOptions<TSchema extends z.ZodTypeAny> {
  /** Validated against the JSON body (or, for GET, the query string). */
  schema?: TSchema;
  /** No token, or a token without this role, gets FORBIDDEN/UNAUTHENTICATED. */
  requireRole?: AdminRole | "any";
  /** Defaults to 200. `submitOrder` (B085) is the one caller that needs
   * `201 Created`. */
  successStatus?: number;
}

/**
 * Resolves the admin caller from the `halo_admin_session` cookie first
 * (the normal path for the admin UI, B093/B094) — verified, and silently
 * refreshed via the paired refresh token if the access token had expired
 * — falling back to a raw `Authorization: Bearer` header (scripts,
 * service-to-service, and the login-exchange route itself before any
 * cookie exists). Role always comes from the verified token's subject,
 * looked up in `admin_users` — never from the request body.
 */
async function resolveAdmin(
  request: Request,
): Promise<{ admin: AdminContext | null; refreshedCookie: AdminSessionCookieAttributes | null }> {
  const session = readAdminSessionToken(request.headers.get("cookie"));
  if (session) {
    const verified = await verifyAdminSession(session);
    if (verified) {
      return {
        admin: { uid: verified.uid, role: verified.role },
        refreshedCookie: verified.refreshedSession
          ? createAdminSessionCookie(verified.refreshedSession)
          : null,
      };
    }
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const verified = await verifyAdminToken(authHeader.slice("Bearer ".length));
    if (verified) {
      return { admin: { uid: verified.uid, role: verified.role }, refreshedCookie: null };
    }
  }

  return { admin: null, refreshedCookie: null };
}

function parseInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema | undefined,
  rawBody: unknown,
): z.infer<TSchema> {
  if (!schema) return undefined as z.infer<TSchema>;
  return schema.parse(rawBody);
}

/**
 * The wrapper every Route Handler uses (B051): resolves the session
 * cookie, validates the request body against `schema`, enforces the role
 * requirement, runs `handler`, and maps both success and failure into the
 * shared response envelope — with a correlation ID on every response,
 * success or failure, so a student's bug report and the server log can be
 * connected.
 */
export function createHandler<TSchema extends z.ZodTypeAny, TResult>(
  options: CreateHandlerOptions<TSchema>,
  handler: (ctx: HandlerContext<z.infer<TSchema>>) => Promise<TResult>,
) {
  return async function routeHandler(
    request: Request,
    routeContext: RouteContext,
  ): Promise<Response> {
    const correlationId = generateCorrelationId();
    const logger = createLogger(correlationId);

    try {
      const params = await routeContext.params;
      const { admin, refreshedCookie } = await resolveAdmin(request);

      if (options.requireRole) {
        if (!admin) {
          throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
        }
        if (options.requireRole !== "any" && admin.role !== options.requireRole) {
          throw new AppError("FORBIDDEN", "Anda tidak memiliki izin untuk tindakan ini.");
        }
      }

      let rawBody: unknown = undefined;
      if (options.schema && request.method !== "GET" && request.method !== "HEAD") {
        rawBody = await request.json().catch(() => ({}));
      } else if (options.schema) {
        rawBody = parseQueryParams(new URL(request.url));
      }
      const input = parseInput(options.schema, rawBody);

      const cookieHeader = request.headers.get("cookie");
      const { sessionId, cookie } = resolveSessionId(cookieHeader);

      const result = await handler({
        input,
        params,
        sessionId,
        correlationId,
        logger,
        admin,
        request,
      });

      const response = Response.json(result ?? {}, {
        status: options.successStatus ?? 200,
        headers: { "x-correlation-id": correlationId },
      });
      if (cookie) {
        applySessionCookie(response, cookie);
      }
      if (refreshedCookie) {
        applyAdminSessionCookie(response, refreshedCookie);
      }
      return response;
    } catch (error) {
      return toHttpResponse(error, correlationId, logger);
    }
  };
}

function applySessionCookie(response: Response, cookie: SessionCookieAttributes): void {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `Path=${cookie.path}`,
    `Max-Age=${cookie.maxAge}`,
    "HttpOnly",
    `SameSite=${cookie.sameSite === "lax" ? "Lax" : cookie.sameSite}`,
  ];
  if (cookie.secure) parts.push("Secure");
  response.headers.append("Set-Cookie", parts.join("; "));
}
