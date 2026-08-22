import {
  generateOrderRef,
  generateReservationId,
  generateTrackingToken,
  hashTrackingToken,
} from "@/lib/id";

/**
 * What a reservation *is* (B062). The payment screen shows `order_ref`
 * and a copy button **before** submission (contradiction C7) — so
 * `order_ref` and the tracking secret are minted here, at reservation
 * time, not later at order creation. `reservation_id` is distinct from
 * `order_ref`: it's how `validateReservation` tells "this session's own
 * reservation, still live" apart from "the number now belongs to a
 * different reservation" (`taken_over`), a distinction `order_ref` alone
 * can't make once a number has been reserved, released, and re-reserved
 * by someone else.
 */
export interface Reservation {
  number: string;
  session_id: string;
  reservation_id: string;
  reserved_at: Date;
  reserved_until: Date;
  order_ref: string;
  tracking_token_hash: string;
}

/** `HALO-XXXXXXXXX`, Crockford Base32, CSPRNG — see `src/lib/id.ts`. */
export function mintOrderRef(): string {
  return generateOrderRef();
}

/**
 * Mints the tracking secret. The plaintext `token` is returned to the
 * caller exactly once — the caller must return it to the student
 * immediately and never write it anywhere (not Firestore, not a log, not
 * an analytics event). Only `hash` is ever persisted.
 */
export async function mintTrackingToken(): Promise<{ token: string; hash: string }> {
  const token = generateTrackingToken();
  const hash = await hashTrackingToken(token);
  return { token, hash };
}

export function mintReservationId(): string {
  return generateReservationId();
}

export function computeReservedUntil(now: Date, ttlMinutes: number): Date {
  return new Date(now.getTime() + ttlMinutes * 60_000);
}

/**
 * The single expiry predicate (mirrors `getEffectiveStatus` in
 * `number-status.ts`, which applies the same `<=` boundary to the
 * `numbers` document directly — this is the `Reservation`-shaped
 * equivalent for code that already has a `Reservation`, not a raw doc).
 * Boundary-correct: a reservation expiring at exactly `now` is expired,
 * not live for one more instant.
 */
export function isExpired(reservation: { reserved_until: Date }, now: Date): boolean {
  return reservation.reserved_until.getTime() <= now.getTime();
}
