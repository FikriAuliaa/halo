import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/server/framework/session";
import {
  createValidateReservationDeps,
  validateReservation,
} from "@/server/operations/validate-reservation";

export interface ValidReservation {
  number: string;
  reserved_until: string;
  order_ref: string;
  remaining_seconds: number;
}

/**
 * Server-side flow guard (B071) — runs before render in every step-2-
 * onward page's Server Component, so an expired student never sees a form
 * they can't submit. Client flow state (`src/lib/flow-state.ts`) is
 * convenience only; this is the actual gate, and it always re-asks the
 * server, never trusts anything the client claims.
 */
export async function requireReservation(): Promise<ValidReservation> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    redirect("/?reason=no-reservation");
  }

  const result = await validateReservation(sessionId, createValidateReservationDeps());

  if (result.status === "not_found") {
    redirect("/?reason=no-reservation");
  }
  if (result.status === "expired") {
    redirect("/?reason=expired");
  }
  if (result.status === "taken_over") {
    redirect("/?reason=taken-over");
  }

  return result;
}
