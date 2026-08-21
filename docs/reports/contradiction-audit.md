# Contradiction Audit (B004)

Independent verification of the planning document's C1–C20, plus new findings from a direct read of the specification, all five `code.html` files, and `premium_crimson_pulse/DESIGN.md`. Verdicts are **CONFIRMED**, **NOT CONFIRMED**, or **PARTIAL**, each with cited evidence from both sides of the conflict.

## Verified from the planning document

**C1 — Seed data is clean, not contaminated — CONFIRMED (planner's finding upheld).**
Spec §11 table (`KONTEKS...md` lines 230–279) lists exactly 96 rows. Independent extraction (see `seed-reconciliation.md`, B006) found 96 distinct values, 0 duplicates, all 12-digit, all `08`-prefixed. The four numbers named as "removed" (line 228) each appear exactly once among the 96 (positions 30, 39, 40, 43). This is the expected shape of a post-deduplication list, not evidence of contamination. Owner: ADR-008.

**C2 — Package prices are TBD in spec, concrete in design — CONFIRMED.**
Spec §9 (lines 206–212): every price cell reads "TBD". `pilihan_paket_halo_horizontal_scroll_layout/code.html` lines 197, 226, 258, 287, 316 render `Rp 100/120/150/200/300 ribu` respectively, plus quota/roaming/voice/SMS figures nowhere in the spec. Owner: ADR/`PROJECT_DECISIONS.md`, `price_status: draft` field.

**C3 — Package schema too narrow — CONFIRMED.** Spec §8.3 defines `config/packages` as `(id, label, price)` only; the design card requires internet quota, roaming quota, voice minutes, SMS count, and a recommended flag (`data-type="recommended"`, line 252 of the package HTML). Owner: `DATA_MODEL.md`.

**C4 — "Pilih 1 Extra Benefit" undefined — CONFIRMED.** Appears on every package card (lines 216–219, 245–248, 277–280, 306–309, 335–338) as a static, non-interactive `<div>` — no `onclick`, no state, no catalogue anywhere in spec or design. Owner: OQ-3, out of scope v1.

**C5 — Phone format — CONFIRMED.** Spec §8.2 requires `08xxxxxxxxxx` for `orders.whatsapp`; `data_diri_updated_theme/code.html` line 181 hardcodes a `+62` prefix glyph in front of a `tel` input expecting the local 8-digit-group format without the leading `0`. Both are real constraints on the same logical field and must be reconciled by normalisation, not by picking one.

**C6 — No countdown timer in the design — CONFIRMED.** Full-text search of all five HTML files for "menit", "countdown", "timer", "expir" returns only the package screen's voice-minute labels ("200 Menit" etc.) — zero timer-related markup anywhere. Screen 1's only relevant copy is the subtitle "Nomor yang dipilih akan otomatis diamankan untuk Anda selama sesi ini" (line 246), which promises persistence with no stated bound. Confirmed as a design gap requiring net-new UI (`DESIGN.md`, B010).

**C7 — Order reference precedes order existence — CONFIRMED.** `pembayaran_updated_theme/code.html` line 242 renders `HALO-ABC123XYZ` inside "Kode Pemesanan" on the _payment_ screen, i.e. before "Kirim Bukti Pembayaran" (line 286, the actual submission action) has been pressed. The reference must therefore be minted at reservation time, not at submission. Owner: ADR-005 / A.4.

**C8 — Confirmation omits tracking credentials — CONFIRMED.** `konfirmasi_pesanan_perfect_alignment/code.html` (full file read) shows number, package, name, email — no `order_ref`, no token, no copy-to-clipboard for either. Given C7's reference is already minted and shown once on the payment screen, and the master prompt's no-login tracking model needs a secret the student can present later, the confirmation screen is the wrong place to have dropped it. Owner: `DESIGN.md` + confirmation-screen implementation blocks.

**C9 — Confirmation promises a notification channel spec puts out of scope — CONFIRMED.** Screen 5 line 195: "Konfirmasi Nomor akan kami kirim melalui Email atau Whatsapp, Bisa Dicek secara berkala yaa :)". Spec §4 non-goals (line 90): "SMS or email notifications (nice-to-have, not core)". The design's copy actively promises the excluded feature. Owner: copy rewrite in implementation block, `RUNBOOK.md` manual-follow-up note.

**C10 — Status model, four vs five states — CONFIRMED.** Spec §7 table (lines 153–158) lists exactly four statuses. Spec §6.5 (line 149) references `SOLD_OFFLINE` as a value an admin can set, which does not appear in the §7 table at all. This is REQ-041/REQ-048 in the requirement register. Owner: ADR-003.

**C11 — Internal self-contradiction on submission behaviour — CONFIRMED, and this is the most operationally dangerous item in the set.** §6.2 (line 121): "Student completes order before timer expires → Order saved as PENDING · **Number stays RESERVED**." §7 (line 156): RESERVED's listed transitions are "AVAILABLE (timer expired) · **PENDING** (order submitted)" — i.e. the number itself moves to PENDING, it does not stay RESERVED under a submitted order. These two sections describe different states for the _same_ moment (order submitted, payment not yet verified). If the number "stays RESERVED" per §6.2 while the _janitor_ only ever looks at `reserved_until` to decide expiry, a slow-to-verify admin queue would let the reservation TTL lapse and the janitor would release the number back to AVAILABLE **while a real order is pending review** — a live double-sell path. §7's reading (move to PENDING, which the janitor never touches) closes that path. Resolution: §7 wins. Owner: ADR-003, ADR-004.

**C12 — Token palette divergence — CONFIRMED**, full comparison table in `design-audit.md` §2. Owner: `DESIGN.md` (B010).

**C13 — Radius scale divergence — CONFIRMED**, and stronger than the planning document stated: not one of the five HTML files' inline `borderRadius` config matches `DESIGN.md`'s own frontmatter scale (`design-audit.md` §3). Owner: `DESIGN.md` (B010).

**C14 — Ten-of-96 with Refresh, no search/pagination — CONFIRMED.** Screen 1 renders exactly ten static cards (verified by counting `<div class="number-card...">` blocks, lines 258–356) plus a refresh control whose handler (lines 393–407) only replays a CSS spin animation — it performs no data fetch in the reference. The real refetch-on-refresh behaviour is therefore an implementation addition, not a traced pattern. No search input, no page-count indicator anywhere. Owner: implementation decision recorded in `DESIGN.md`.

**C15 — Every card renders "Terkunci" capable, only one is shown active — CONFIRMED**, and clarified by the screenshot: the screenshot shows nine plain cards and exactly one with the orange border + "Terkunci" badge (card 4, matching `.active` in the markup, line 288). This is a **selected-by-me** indicator, not an "unavailable to others" indicator — the reference never demonstrates how a genuinely-taken-by-someone-else number should look. `DESIGN.md` must specify both states distinctly. Owner: `DESIGN.md`.

**C16 — Mobile-only, no admin screens — CONFIRMED.** `grep`-level check: `max-w-[480px]` appears in the outer wrapper of every one of the five files; zero occurrences of `md:`, `lg:`, or any other responsive Tailwind prefix in any of the five files (the one `md:grid-cols-2` on the confirmation screen, line 179, is the sole responsive class in the entire ZIP, and it governs an internal 2-field grid, not page layout). No admin-facing markup exists anywhere in the ZIP.

**C17 — Tracking mechanism conflict — CONFIRMED**, spec vs. master prompt as stated; master prompt wins per source-priority rule 1.

**C18 — Admin access model conflict — CONFIRMED**, spec §12 item 2 explicitly marks this "TBD" (not even a firm recommendation), so there is no real tension to reconcile — the master prompt's requirement (Firebase Auth + RBAC) simply fills a genuine gap rather than overriding a firm decision.

**C19 — Proof retention conflict — CONFIRMED**, spec §10 vs. master prompt §24, resolved via ADR-006's 90-day default.

**C20 — `config/system` needed — CONFIRMED.** Nothing in spec §8.3's three `config` documents has a home for `reservation_ttl_minutes`, the per-session reservation cap, or the proof size/type limits (5 MB and JPG/PNG/WEBP live only as prose in §10, not as a config document). Addition documented in `DATA_MODEL.md`.

## New findings from direct inspection (not in the planning document)

**C21 — The package screen's CTA is not gated on selection, unlike the number screen's — NEW, CONFIRMED.** `pilih_nomor.../code.html` explicitly disables `#action-btn` until a card is clicked (lines 385–388 style it grey/disabled by default, `actionBtn.disabled = false` only fires inside the click handler). `pilihan_paket.../code.html`'s bottom CTA (lines 345–350) carries no `disabled` attribute and no id-based gating logic at all — it is enabled from page load, even though the third card is only _pre-selected by markup_, not by a user action. Since a package must in fact be chosen for `package_id` to be valid, the implementation must add the same selection-gating pattern here that the reference already demonstrates on screen 1, rather than copying screen 2's markup as-is. Owner: implementation blocks for the package-selection screen; note added to `DESIGN.md`'s "implementation decisions" section.

**C22 — The QRIS image in the reference is a stock photograph, not a QR code — NEW, CONFIRMED.** `pembayaran_updated_theme/code.html` line 256 sources the QR image from a `googleusercontent.com` asset whose own `data-alt` text describes it as "a high contrast... QR code graphic" — but the actual downloaded asset (confirmed via screenshot review) is a photo of a hand holding a phone that is itself displaying a bank-app QRIS payment screen, complete with a visible "Rp 145.800" amount and merchant name — i.e. it is unrelated placeholder stock imagery, not a scannable code and not even the right amount. This strengthens OQ-6 (real QRIS asset location) from "nice to know" to "the payment screen is non-functional until this is replaced" and confirms the upload dropzone has zero JS wiring (`<input type="file">` is absent from the document entirely — grep-verified).

**C23 — Two declared CSS classes are dead code in the reference — NEW, CONFIRMED, low impact.** `.btn-gradient` is defined in both `pembayaran_updated_theme` (line 182) and `konfirmasi_pesanan_perfect_alignment` (line 116) but is applied to zero elements in either file (both primary CTAs use flat `bg-primary-container` instead). Not a product risk, but worth noting in `design-audit.md` so the implementation doesn't treat an unused class as a meaningful design signal.

## Disagreement with the planner

None found. Every C1–C20 verdict upholds the planning document's original finding; this audit's contribution is citation-level evidence and three additional low-to-medium-impact findings (C21–C23) the original pass did not surface.

## Owning ADR / block summary

C1→ADR-008 · C2,C3→DATA_MODEL.md · C4→OQ-3 · C5→normalizePhone utility (B030) · C6,C8,C15,C21→DESIGN.md (B010) · C7→ADR-005 · C9→copy rewrite blocks · C10,C11→ADR-003/004 · C12,C13→DESIGN.md (B010) · C14→DESIGN.md implementation-decision section · C16→DESIGN.md responsive section · C17→ADR-005 · C18→ADR-002 · C19→ADR-006 · C20→DATA_MODEL.md · C22→OQ-6, upload implementation blocks · C23→design-audit.md note only, no action block required.

No finding here invalidates the recommended architecture.
