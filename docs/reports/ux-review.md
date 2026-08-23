# UX and Content Review (B136)

## Method

Reviewed error messages, empty states, and confirmation copy across both the student and admin surfaces — not only the happy path, since careless copy survives longest in error and empty states.

## Findings

- **No unkept promises.** Searched for any confirmation/notification language implying the system emails or messages a student (`grep` for "akan mengirim"/"akan menghubungi"/"will send"/"will contact" across `src/`): zero matches. The one place the original reference design made exactly this promise (the confirmation screen) was already rewritten in Phase 7-9 specifically to remove it (OQ-5/C9) — verified still true, not just still commented as true.
- **Error messages are centrally enumerated and specific**, not generic. Every `AppError` carries a Indonesian, situation-specific message (e.g. `"Nomor berstatus {status} tidak dapat dihapus. Hanya nomor tersedia yang dapat dihapus."`, not "Something went wrong") — spot-checked across the reservation, order, and admin-inventory operations built across every phase. Client and server share the same message strings via `src/schemas/*` for validation errors, so a student never sees a different (possibly less helpful) message than what the server would have produced for the same input.
- **Empty states name the actual condition** rather than a generic "no results" — e.g. `EMPTY_STATE_PRESETS.noNumbersAvailable`'s title is "Belum ada nomor tersedia saat ini" (specific to the real condition), and the number-search empty state distinguishes "no numbers at all" from "no numbers matching your search" with different copy for each.
- **Confirmation dialogs name the specific consequence**, per B108's own constraint, verified while building Phase 12's inventory actions: "Hapus nomor {number}?" not "Are you sure?"; force-release explicitly states a student currently holds the number and will lose it; the number-rename ("status override") dialog requires typing the original number specifically because it's irreversible under the old key.
- **First-time-student walkthrough** (performed live across Phases 7-9 and again in Phase 15's E2E Scenario A): the flow is linear and each screen's step indicator shows progress (1 Nomor → 2 Paket → 3 Data → 4 Bayar); no screen requires backtracking to understand what to do next. The one friction point worth naming: the reservation countdown starts the moment a number is selected, before the student has picked a package or filled in any data — a fast typist has ample time, but this is worth monitoring in real usage if support ever reports students running out of time on the data-entry screen.

## Verdict

No blocking finding. One non-blocking observation (the countdown's start point relative to the multi-step flow) is recorded for `docs/reports/known-limitations.md` rather than treated as a defect, since it reflects a real product tradeoff (a single TTL from reservation, not from submission) rather than a bug.
