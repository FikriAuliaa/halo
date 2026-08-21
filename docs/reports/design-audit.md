# Design Asset Audit (B002)

Source: `stitch_telkomsel_halo_number_claim_ui.zip`, five `code.html` + `screen.png` pairs plus `premium_crimson_pulse/DESIGN.md`.

## 1. Files inventoried

| Screen dir                                    | Title                 | Role in flow                                     |
| --------------------------------------------- | --------------------- | ------------------------------------------------ |
| `pilih_nomor_refresh_animation`               | Pilih Nomor Halo      | Step 1 — number selection                        |
| `pilihan_paket_halo_horizontal_scroll_layout` | Halo+ Pilihan Paket   | Step 2 — package selection                       |
| `data_diri_updated_theme`                     | Lengkapi Data Diri    | Step 3 — personal data form                      |
| `pembayaran_updated_theme`                    | Selesaikan Pembayaran | Step 4 — payment (QRIS + upload)                 |
| `konfirmasi_pesanan_perfect_alignment`        | Order Berhasil        | Step 5 — confirmation                            |
| `premium_crimson_pulse/DESIGN.md`             | —                     | Canonical design-system prose + YAML frontmatter |

Screenshots visually confirmed against markup for screens 1 and 4 (rendered output matches the class-driven states exactly, including the single "Terkunci" active card and the stock-photo QR placeholder).

## 2. Full token comparison (every `tailwind.config.extend.colors` entry, by file)

`DESIGN.md` frontmatter and `pilih_nomor_refresh_animation` agree with each other exactly (both are the "Material tonal" generation). `pilihan_paket_halo_horizontal_scroll_layout`, `data_diri_updated_theme`, and `konfirmasi_pesanan_perfect_alignment` largely share a second, hand-tuned palette; `pembayaran_updated_theme` reverts to the first (`DESIGN.md`) palette. `konfirmasi_pesanan_perfect_alignment` matches the first palette too (background `#200e0d`, primary `#ffb3ad`).

| Token                      | DESIGN.md / pilih_nomor / pembayaran / konfirmasi | pilihan_paket / data_diri    |
| -------------------------- | ------------------------------------------------- | ---------------------------- |
| `background`               | `#200e0d`                                         | `#000000`                    |
| `surface`                  | `#200e0d`                                         | `#000000`                    |
| `surface-dim`              | `#200e0d`                                         | `#1a0000`                    |
| `surface-variant`          | `#462f2d`                                         | `#4a0000`                    |
| `surface-container`        | `#2e1a19`                                         | `#200e0d`                    |
| `surface-container-low`    | `#2a1615`                                         | `#110000`                    |
| `surface-container-lowest` | `#1a0908`                                         | `#000000`                    |
| `primary`                  | `#ffb3ad`                                         | `#ed0226`                    |
| `on-primary`               | `#68000a`                                         | `#ffffff`                    |
| `primary-container`        | `#ed0226`                                         | `#ed0226` (agrees)           |
| `on-primary-container`     | `#ffffff`                                         | `#ffffff` (agrees)           |
| `secondary-container`      | `#fe6b00`                                         | `#ff6b00` (agrees, rounding) |
| `on-secondary-container`   | `#572000`                                         | `#ffffff`                    |
| `outline-variant`          | `#5e3f3c`                                         | `#2a2a2a`                    |
| `on-background`            | `#ffdad7`                                         | `#ffffff`                    |
| `on-surface`               | `#ffdad7`                                         | `#ffffff`                    |

All other tokens (`tertiary*`, `error*`, `*-fixed*`, `inverse-*`, `outline`) are byte-identical across every file — the divergence is confined to the surface/background/primary/on-color axis, i.e. exactly the tokens that determine whether the UI reads as "deep maroon" (DESIGN.md/screens 1,4,5) or "atmospheric black" (screens 2,3). This is contradiction C12, confirmed independently.

## 3. Radius, spacing, typography

- `spacing`, `fontFamily`, `fontSize` blocks are byte-identical across all five files and match `DESIGN.md` frontmatter exactly. No divergence here — spacing and type are already canonical.
- `borderRadius` diverges: `DESIGN.md` frontmatter declares `sm 0.25rem, DEFAULT 0.5rem, md 0.75rem, lg 1rem, xl 1.5rem, full 9999px`. Every HTML file's inline config instead declares `DEFAULT 0.25rem, lg 0.5rem, xl 0.75rem, full 9999px` (three files) or additionally `2xl 1rem` (`pilihan_paket`, `data_diri`, `konfirmasi`). None of the five HTML configs match the `DESIGN.md` frontmatter's scale at all — every implementation used a smaller, differently-named scale than the document that is supposed to be canonical. Confirmed as C13; resolution deferred to B010.
- Rendered radius classes actually used: number card `rounded-xl` (0.75rem = 12px in the HTML scale), package card `rounded-2xl` (1rem = 16px), form input `rounded-t-lg` (0.5rem = 8px, top corners only — the bottom-border-as-underline pattern), primary CTA `rounded-xl` (payment/data-diri/confirmation screens) or `rounded-full` (number/package screens), QRIS/upload containers `rounded-lg`/`rounded-xl`.

## 4. Custom CSS beyond Tailwind utilities (per file)

- **All five files:** the two-layer `radial-gradient` body background (`rgba(74,0,0,0.4)` top-right, `rgba(74,0,0,0.2)` bottom-left) over `#000` — this is the "atmospheric dark foundation" and is consistent everywhere regardless of which token palette the file uses.
- **`pilih_nomor`:** `.bg-gradient-halo` / `.number-card.active` (border → `secondary-container`, `box-shadow 0 0 12px rgba(254,107,0,0.4)`, `scale(1.02)`, gradient fill) and `.locked-badge` (hidden by default, `display:flex` only inside `.active`). `@keyframes spin-once` for the refresh icon. `.no-scrollbar`.
- **`pilihan_paket`:** `.card-gradient` (`linear-gradient(180deg,#4A0000,#000)`, `1px solid #2a2a2a`), `.card-active` (orange border + glow + `scale(1.05)`), `.card-active-red` (same but red border/glow — used for non-recommended selected cards), `.text-glow`, `@keyframes slideUpFade` staggered per-card entrance (0.1s increments), `.no-scrollbar` for the horizontal `snap-x snap-mandatory` scroller.
- **`data_diri`:** input override block — dark fill `rgba(42,42,42,0.8)`, transparent 2px bottom border, focus → `border-bottom-color:#ED0226`, no ring/outline; `.form-label` in `#A0A0A0`.
- **`pembayaran`:** `.card-gradient`, `.btn-gradient` (unused in markup — declared, not applied to any element present), `.glow-border`, `.text-glow`, `@keyframes scan` (vertical scan-line sweep over the QR image, 2s loop).
- **`konfirmasi`:** `.card-gradient`, `.btn-gradient` (also declared but unused), `.glow-border`, `.text-glow`. No page-specific animation.

## 5. Component inventory per screen

**Screen 1 — Pilih Nomor:** sticky top app bar (5G/AI wordmark + "Halo" wordmark, gradient-to-transparent scrim); H2 + supporting paragraph; right-aligned pill refresh button with spin-on-click icon; vertical list of ten fixed-height (72px) number cards, phone number in grouped/spaced digits, no price/status text on unselected cards; one card can carry an orange "Terkunci" pill+lock icon simultaneously with the active/glow border; sticky bottom full-width pill CTA, disabled (grey) until a card is selected, then switches to solid primary red.

**Screen 2 — Pilihan Paket:** same app bar; H1 with a coloured `+` superscript and a supporting paragraph, both inside a horizontally-scrollable section (their overflow wrapper is arguably a markup artefact, not an intended horizontal-scroll for the text itself); horizontal snap-scroller of five package cards (`w-[85vw] max-w-[380px]`), each with a maroon header strip (price), a body split into three divider-separated stat blocks (internet quota in `data-display` type, roaming quota, voice+SMS), and a non-interactive "Pilih 1 Extra Benefit" chip; the third card carries a "Rekomendasi" ribbon, an orange gradient header, and the orange glow-border selected style by default; staggered entrance animation; sticky bottom CTA (always enabled — no card-selection gate wired to the button, unlike Screen 1).

**Screen 3 — Data Diri:** app bar; H1 + paragraph; single-column form — text input (nama), native `<select>` with a single hardcoded option "Universitas Surabaya" plus a disabled placeholder, tel input with a static "+62" prefix glyph, email input; all fields share the dark-fill/bottom-border-focus treatment; sticky bottom CTA submits the form and (in the reference JS only) shows a 1s fake-loading spinner then an `alert()`.

**Screen 4 — Pembayaran:** app bar; H1 + paragraph; summary card (selected number, package label + price, divided by a hairline); "Kode Pemesanan" block in a separate glow-bordered container with a monospace-styled order code and a copy-icon button (non-functional in the reference); QRIS card containing a **stock photograph of a phone displaying a QR code** (not an actual scannable QRIS graphic) with an animated scan-line overlay and a "Simpan QR" download link; dashed-border upload dropzone with a cloud-upload icon, title, and format/size hint text — no file input is actually wired in the markup (`<input type="file">` is absent; the dropzone has no `onclick`/`onchange`); sticky bottom CTA "Kirim Bukti Pembayaran".

**Screen 5 — Konfirmasi:** app bar; centered glowing-circle success icon + "Order Berhasil!" headline; order-detail card (selected number with a SIM icon, package with a bolt icon, then a 2-col grid of name/email — WhatsApp is collected in Screen 3 but not redisplayed here); an info banner promising email/WhatsApp confirmation (contradicts spec §4 out-of-scope — C9); sticky bottom "Selesai" button with no destination wired.

## 6. States present vs. absent

**Present in markup/screenshot:** default/unselected card, one hard-coded "selected+locked" card (Screen 1), one hard-coded "recommended, pre-selected" card (Screen 2), form default state, a client-side fake "submitting" spinner state (Screen 3 only, JS-simulated), static success state (Screen 5).

**Confirmed absent — must be designed in `DESIGN.md` (B010), not inferred from the reference:**

- Reservation countdown timer, anywhere (C6).
- Any genuinely _available_ (unselected, unlocked, interactive-hover) number card — every one of the ten cards in the shipped markup is visually identical except the one with `.active`; there is no card demonstrating hover/focus without selection.
- Empty pool ("no numbers available") state.
- Loading/skeleton state for the number grid or package scroller.
- Network/server error state, on any screen.
- Reservation-expired state (mid-flow interruption).
- File-picker wiring, upload progress, upload success/failure, file-type/size rejection message (the dropzone is decorative only).
- Desktop/tablet layout — every screen is hard-capped `max-w-[480px]` with no responsive breakpoint classes at all.
- Any admin screen — none supplied.
- Tracking-token display / "save this, shown once" warning (Screen 5 omits it entirely — C8).
- Disabled/inactive package card (e.g., sold-out tier).

## 7. Verification

Three components hand-checked against raw HTML: the Screen 1 refresh button (`#refresh-btn` handler confirmed to only trigger a CSS class toggle, no data refetch — confirms this is purely a visual/UX affordance in the reference and the real refetch behaviour is an implementation addition), the Screen 2 `selectCard()` handler (confirmed it distinguishes `data-type="recommended"` for orange-vs-red glow, matching the rendered screenshot), and the Screen 4 upload dropzone (confirmed no `<input type="file">` exists anywhere in the document — upload is 100% a build task, not a wiring task).

## Conclusion

The design ZIP is present, readable, and internally analysable. Token and radius divergence is real and is deferred to `DESIGN.md` (B010) for resolution, not resolved here. Five screens, zero admin screens, zero responsive breakpoints, zero timer — all confirmed as gaps the implementation must originate rather than trace.
