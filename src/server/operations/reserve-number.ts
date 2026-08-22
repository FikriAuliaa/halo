import type postgres from "postgres";
import { getEffectiveStatus } from "@/domain/number-status";
import {
  computeReservedUntil,
  mintOrderRef,
  mintReservationId,
  mintTrackingToken,
} from "@/domain/reservation";
import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { withIdempotency } from "@/server/framework/idempotency";
import { configRepository } from "@/server/repositories/config-repository";
import { NumberRepository } from "@/server/repositories/number-repository";
import { SessionRepository } from "@/server/session/session-repository";

export interface ReserveNumberCommand {
  number: string;
  sessionId: string;
  idempotencyKey: string;
}

export interface ReserveNumberResult {
  number: string;
  reserved_until: string;
  order_ref: string;
  /** Server's own clock at the moment of this response — lets the client
   * compute a one-time offset against its own `Date.now()` so a device
   * with a wrong clock still counts down correctly (B074). */
  now: string;
  /** `null` when this call reused an already-live reservation on this
   * number held by this same session (acceptance #5) — the original
   * plaintext was already returned once, by the call that created the
   * reservation, and is cryptographically unrecoverable: only its hash is
   * ever persisted (B062). */
  tracking_token: string | null;
}

export interface ReserveNumberDeps {
  numberRepo: NumberRepository;
  sessionRepo: SessionRepository;
}

export function createReserveNumberDeps(): ReserveNumberDeps {
  return { numberRepo: new NumberRepository(), sessionRepo: new SessionRepository() };
}

/**
 * The operation the entire anti-double-booking guarantee rests on
 * (B063). Every guard — target number availability, A5's one-live-
 * reservation-per-session rule — is evaluated inside the single Postgres
 * transaction `withIdempotency` provides, reading the rows it needs
 * through `SELECT ... FOR UPDATE` so a concurrent attempt on the same
 * number genuinely blocks rather than racing an optimistic retry.
 */
export async function reserveNumber(
  command: ReserveNumberCommand,
  deps: ReserveNumberDeps,
): Promise<ReserveNumberResult> {
  const systemConfig = await configRepository.getSystem();
  if (!systemConfig) {
    throw new AppError("INTERNAL", "Konfigurasi sistem belum tersedia.");
  }

  // Minted once, before the transaction — see `mintTrackingToken`'s own
  // doc comment; a retried transaction body (e.g. after a serialization
  // failure) reuses the same minted values rather than wasting entropy.
  const orderRef = mintOrderRef();
  const reservationId = mintReservationId();
  const { token, hash } = await mintTrackingToken();

  // Test-only override (`.env.example`) so E2E's reservation-expiry
  // scenario can wait seconds instead of the real configured TTL —
  // never read outside of test/CI runs, and it was declared and
  // validated in `env.ts` for a long time before anything actually
  // consulted it here.
  const ttlMinutes =
    serverEnv.RESERVATION_TTL_MINUTES_OVERRIDE ?? systemConfig.reservation_ttl_minutes;

  return withIdempotency(command.idempotencyKey, "reserveNumber", (tx) =>
    reserveNumberInTransaction(
      tx,
      command,
      { orderRef, reservationId, token, hash },
      ttlMinutes,
      deps,
    ),
  );
}

async function reserveNumberInTransaction(
  tx: postgres.TransactionSql,
  command: ReserveNumberCommand,
  minted: { orderRef: string; reservationId: string; token: string; hash: string },
  ttlMinutes: number,
  deps: ReserveNumberDeps,
): Promise<ReserveNumberResult> {
  const { number, sessionId } = command;
  const now = new Date();

  const numberRow = await deps.numberRepo.getForUpdate(number, tx);
  if (numberRow === null) {
    throw new AppError("NUMBER_UNAVAILABLE", "Nomor tidak ditemukan.");
  }

  const effectiveStatus = getEffectiveStatus(numberRow, now);

  if (effectiveStatus === "reserved") {
    if (numberRow.session_id === sessionId) {
      // Acceptance #5: re-reserving a number this session already holds
      // is idempotent and extends nothing.
      return {
        number,
        reserved_until: numberRow.reserved_until!.toISOString(),
        order_ref: numberRow.order_ref!,
        tracking_token: null,
        now: now.toISOString(),
      };
    }
    throw new AppError("NUMBER_UNAVAILABLE", "Nomor sedang direservasi oleh orang lain.");
  }

  if (effectiveStatus !== "available") {
    throw new AppError(
      "NUMBER_UNAVAILABLE",
      `Nomor berstatus ${effectiveStatus} dan tidak dapat direservasi.`,
    );
  }

  // A5: refuse only if this session holds a *different*, still-live
  // reservation. Re-checked against the other number's own effective
  // status here (not trusted blindly from the session row's pointer) —
  // that pointer goes stale the moment the other reservation lazily
  // expires, and nothing else would notice until the janitor runs.
  const sessionRow = await deps.sessionRepo.getForUpdate(sessionId, tx);
  const otherReservation = sessionRow?.current_reservation ?? null;
  if (otherReservation !== null && otherReservation.number !== number) {
    const otherNumberRow = await deps.numberRepo.getForUpdate(otherReservation.number, tx);
    const otherEffectiveStatus = otherNumberRow ? getEffectiveStatus(otherNumberRow, now) : null;
    const stillOwnedByThisSession =
      otherNumberRow?.session_id === sessionId && otherEffectiveStatus === "reserved";
    if (stillOwnedByThisSession) {
      throw new AppError(
        "NUMBER_UNAVAILABLE",
        "Sesi Anda sudah memiliki reservasi aktif pada nomor lain.",
      );
    }
  }

  const reservedUntil = computeReservedUntil(now, ttlMinutes);

  await deps.numberRepo.updateFields(
    number,
    {
      status: "reserved",
      reserved_at: now,
      reserved_until: reservedUntil,
      session_id: sessionId,
      reservation_id: minted.reservationId,
      order_ref: minted.orderRef,
      tracking_token_hash: minted.hash,
    },
    tx,
  );

  await deps.sessionRepo.recordReservation(
    sessionId,
    sessionRow,
    { number, reservation_id: minted.reservationId },
    tx,
  );

  return {
    number,
    reserved_until: reservedUntil.toISOString(),
    order_ref: minted.orderRef,
    tracking_token: minted.token,
    now: now.toISOString(),
  };
}
