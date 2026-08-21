# ADR-005: Student Order Tracking

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B022, Phase 9 (B085–B092)

## Context

Spec §6.3 specifies tracking "via email or WhatsApp," no login. Master prompt §7 forbids exposing order information through email/WhatsApp alone, requiring a secure public tracking model. Independently, the design reference (`pembayaran_updated_theme/code.html` line 242) renders a `Kode Pemesanan HALO-ABC123XYZ` **on the payment screen**, before the order is ever submitted — this is a real constraint on when the reference must be minted, not a design nicety.

## Decision

**`order_ref`** — a public, low-guessability-but-not-secret identifier, format `HALO-` + 9 characters of Crockford Base32 (excludes `I`, `L`, `O`, `U` to avoid visual ambiguity), generated via CSPRNG. **Tracking token** — a separate, high-entropy secret: 32 random bytes, base64url-encoded, also CSPRNG-generated. Only `sha256(token)` is ever persisted (`numbers.tracking_token_hash`, copied to `orders.tracking_token_hash` at submission); the plaintext exists solely in the API response shown to the student.

**Minting happens at reservation, not submission** — directly required by the payment screen's design (C7): `reserveNumber` generates both `order_ref` and the tracking token and returns them in its response; `submitOrder` copies them onto the newly-created order document rather than generating fresh ones.

**Lookup contract:** `getTrackingStatus` requires **both** `order_ref` and the tracking token; a mismatch on either returns an identical generic `NOT_FOUND` (`API_SPEC.md`) — the response never indicates which half was wrong, which would otherwise let an attacker enumerate valid `order_ref`s by observing a different error for "ref exists, token wrong" vs. "ref doesn't exist."

**Rate limiting:** per-IP and additionally per-`order_ref` (`SECURITY.md`), so even a correctly-guessed `order_ref` doesn't enable fast token brute-forcing against that one target.

**A lost token has no server-side recovery path — stated plainly, not glossed over.** Because only the hash is stored, the system cannot ever re-derive or reissue the original plaintext. `RUNBOOK.md` procedure 5 documents the admin-mediated fallback: an admin can manually relay an order's status to a requester whose identity they've independently confirmed, but cannot restore self-service tracking access.

**Explicit rejection of email/WhatsApp-only tracking (spec §6.3's literal reading):** knowing a classmate's WhatsApp number must never be sufficient to view their order — a real privacy failure the spec's literal text would have permitted. The token-based model preserves the spec's actual goal (no login required) while closing this gap.

## Alternatives considered

- **Track by email + WhatsApp, exactly as spec §6.3 states.** Rejected — master prompt §7 is explicit, and the privacy failure mode above is real, not hypothetical (a classmate, an ex, a nosy dorm-mate all plausibly know these two fields for someone).
- **Track by `order_ref` alone, no separate token.** Rejected — an `order_ref` is 9 Crockford-32 characters (~45 bits), enumerable in a practical brute-force if it were the _only_ gate; pairing it with a 256-bit token makes brute-forcing the actual protected resource computationally infeasible.
- **Mint the reference at submission, redesign the payment screen to not show it early.** Rejected — this would mean deviating from the supplied visual reference on a load-bearing detail (master prompt §59: the design is a visual _contract_, not mere inspiration) for no corresponding benefit; minting early costs nothing since the reservation is already the point at which a unique, session-bound identity exists.

## Consequences

The confirmation screen must display and let the student copy both values with an explicit "shown only once" warning (`DESIGN.md` §11) — a UI obligation this ADR creates that the reference design (C8) doesn't itself demonstrate.

## Verification

Unit test asserting `order_ref` matches `^HALO-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{9}$` and token generation draws from a CSPRNG with no observed collisions across 10,000 generations (`AGENTS.md`/B030). Integration test confirming a token-mismatch lookup and a ref-not-found lookup return byte-identical error responses.
