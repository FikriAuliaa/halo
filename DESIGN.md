# DESIGN.md — Premium Crimson Pulse, Implementation Specification

This is the engineering counterpart to the supplied `premium_crimson_pulse/DESIGN.md` style prose. Where the reference is ambiguous or internally inconsistent (see `docs/reports/design-audit.md` and `docs/reports/contradiction-audit.md`, C12/C13/C21/C22), this document resolves it once, here, so no component has to decide on its own.

Every section below is tagged **[SOURCE]**, **[DECISION]**, or **[ASSUMPTION]**:

- **[SOURCE]** — traceable directly to the ZIP (the reference `DESIGN.md` frontmatter, or a `code.html` file).
- **[DECISION]** — added by this implementation to resolve a conflict or fill a gap the reference leaves open, with the reasoning stated.
- **[ASSUMPTION]** — a default chosen where the source is silent and no strong signal exists either way; cheap to revisit.

## 1. Brand personality — [SOURCE]

Authoritative yet dynamic. An "Atmospheric Dark" foundation makes red and orange accents read as glowing light sources rather than flat UI color. Corporate-modern precision (tight alignment, crisp type, purposeful whitespace) fused with high-contrast digital energy. This is a flagship, post-paid-feeling product, not a budget SKU — density and confidence, not friendliness.

> **Implementation status (B032):** every token below is now live in `tailwind.config.ts` (colors, radius, spacing, typography) and mirrored as CSS custom properties in `src/app/globals.css`. `tailwind.config.test.ts` regression-tests the resolved values against this document, including the §2.4 contrast remediation. Fonts load via `src/lib/fonts.ts` (`next/font/google`, no render-blocking `<link>`).

## 2. Color tokens — [DECISION: resolves C12]

**Canonical source:** `premium_crimson_pulse/DESIGN.md` frontmatter. Three of the five reference screens (`pilih_nomor`, `pembayaran`, `konfirmasi`) already match it exactly. The other two (`pilihan_paket`, `data_diri`) used a second, hand-tuned "atmospheric black" palette that diverges on exactly the surface/background/primary axis. Rather than pick a winner and lose the other palette's intent, both are kept as **purpose-named tokens** layered on top of the canonical base — the black-background, red-primary treatment was clearly deliberate for the payment-adjacent screens (package, form) and is preserved as a named variant, not discarded.

### 2.1 Base tokens (canonical — use these everywhere unless §2.2 applies)

| Token                                                           | Value                                         | Role                                                              |
| --------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `background` / `surface`                                        | `#200e0d`                                     | Page background                                                   |
| `surface-dim`                                                   | `#200e0d`                                     | Same as surface (no separate dim state in source)                 |
| `surface-bright`                                                | `#4b3331`                                     | Elevated/lightened surface accent                                 |
| `surface-container-lowest`                                      | `#1a0908`                                     | Deepest recess (input wells, QR frame background)                 |
| `surface-container-low`                                         | `#2a1615`                                     | Low-elevation container                                           |
| `surface-container`                                             | `#2e1a19`                                     | Default card/number-row background                                |
| `surface-container-high`                                        | `#3a2423`                                     | Raised container (hover state)                                    |
| `surface-container-highest`                                     | `#462f2d`                                     | Header scrim start color                                          |
| `on-surface`                                                    | `#ffdad7`                                     | Primary text on `surface`                                         |
| `on-surface-variant`                                            | `#e9bcb8`                                     | Secondary text on `surface`                                       |
| `outline`                                                       | `#af8784`                                     | Default borders                                                   |
| `outline-variant`                                               | `#5e3f3c`                                     | Subtle dividers on maroon surfaces                                |
| `primary`                                                       | `#ffb3ad`                                     | Light-red accent (icon tints, subtle emphasis)                    |
| `on-primary`                                                    | `#68000a`                                     | Text on `primary`-filled elements                                 |
| `primary-container`                                             | `#ed0226`                                     | Telkomsel Red — primary CTA fill                                  |
| `on-primary-container`                                          | `#ffffff`                                     | Text/icon on `primary-container`                                  |
| `secondary`                                                     | `#ffb693`                                     | Light-orange accent (order-code text, links)                      |
| `on-secondary`                                                  | `#561f00`                                     | Text on `secondary`-filled elements                               |
| `secondary-container`                                           | `#fe6b00`                                     | Vibrant Orange — selection/highlight fill                         |
| `on-secondary-container`                                        | `#572000`                                     | **Text on `secondary-container` — see §2.4 contrast remediation** |
| `error` / `on-error` / `error-container` / `on-error-container` | `#ffb4ab` / `#690005` / `#93000a` / `#ffdad6` | Error states                                                      |
| `background` (page, atmospheric)                                | radial gradients over `#000` — see §5         | Body background layer                                             |

### 2.2 Named variant: "Atmospheric Black" surface treatment

Used on the package-selection and personal-data screens in the reference. Kept as an explicit, opt-in variant rather than merged into the base tokens:

| Token                   | Value                | Role                                                                                                                                                      |
| ----------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--surface-black`       | `#000000`            | Page background for this variant                                                                                                                          |
| `--card-gradient-start` | `#4a0000`            | Top stop of the card gradient (see §6)                                                                                                                    |
| `--card-gradient-end`   | `#000000`            | Bottom stop of the card gradient                                                                                                                          |
| `--divider`             | `#2a2a2a`            | Hairline dividers inside cards on this variant                                                                                                            |
| `--brand-red`           | `#ed0226`            | Same value as `primary-container`, named separately because this variant uses it as the sole primary-action color rather than the lighter `primary` token |
| `--input-fill`          | `rgba(42,42,42,0.8)` | Form field background                                                                                                                                     |
| `--input-placeholder`   | `#A0A0A0`            | Placeholder / secondary label text                                                                                                                        |

**When to use which:** the number-selection, payment, and confirmation screens use the base maroon palette (§2.1). The package-selection and personal-data-form screens use the Atmospheric Black variant (§2.2). This is a deliberate per-screen choice inherited from the reference, not something a shared theme toggle should collapse into one — both are legitimate expressions of the same brand, applied where each reads best (a scrolling comparison grid of five cards benefits from higher contrast against pure black; the reservation/confirmation screens benefit from the softer maroon that already carries an "in-progress, held for you" warmth).

### 2.3 The body background gradient — [SOURCE, present in all five files identically]

```css
background-color: #000;
background-image:
  radial-gradient(circle at top right, rgba(74, 0, 0, 0.4) 0%, transparent 40%),
  radial-gradient(circle at bottom left, rgba(74, 0, 0, 0.2) 0%, transparent 40%);
background-attachment: fixed;
```

Applied at the document root on every screen, under both palette variants.

### 2.4 Contrast audit — [DECISION: new finding, not in the source design system]

All text/background pairs actually used in the reference, measured (WCAG relative luminance):

| Pair                                                                                | Ratio      | AA normal text (4.5:1) | AA large/bold text (3:1) |
| ----------------------------------------------------------------------------------- | ---------- | ---------------------- | ------------------------ |
| `on-surface` on `background`                                                        | 14.39:1    | Pass                   | Pass                     |
| `on-surface-variant` on `background`                                                | 10.93:1    | Pass                   | Pass                     |
| white on black (Atmospheric Black headings)                                         | 21.0:1     | Pass                   | Pass                     |
| gray-300 (`#d1d5db`) body text on black                                             | 14.25:1    | Pass                   | Pass                     |
| gray-400 (`#9ca3af`) fine print on black                                            | 8.27:1     | Pass                   | Pass                     |
| white on `primary-container` (#ed0226, CTA button)                                  | 4.53:1     | Pass (marginal)        | Pass                     |
| `on-primary` (#68000a) on `primary` (#ffb3ad)                                       | 7.72:1     | Pass                   | Pass                     |
| **canonical** `on-secondary-container` (#572000) on `secondary-container` (#fe6b00) | 4.54:1     | Pass (marginal)        | Pass                     |
| **package-screen override**: white on `#ff6b00`                                     | **2.86:1** | **Fail**               | **Fail**                 |

**Remediation (mandatory):** the package-selection screen's "Rekomendasi" ribbon and any other orange-fill badge/chip must use the **canonical** `on-secondary-container` (dark text, `#572000` or darker — `#1a0a00` is acceptable and used for the "Terkunci" badge for extra margin) rather than the white text the reference HTML applies to that one ribbon. This is a real accessibility defect in the supplied reference, caught by direct measurement, not by inspection — every orange-background label in the implementation uses dark text, full stop, with no per-instance override.

## 3. Typography — [SOURCE]

`Hanken Grotesk` for display/headline/title/data — high-impact, premium weight. `Inter` for body/label — clinical legibility at small sizes. Both loaded via `next/font/google` (self-hosted through Next.js, not a runtime Google Fonts request) to avoid a render-blocking third-party font fetch and to keep the app's CSP simple.

| Style                | Family         | Size | Weight | Line-height | Tracking |
| -------------------- | -------------- | ---- | ------ | ----------- | -------- |
| `display-lg`         | Hanken Grotesk | 36px | 800    | 1.1         | -0.02em  |
| `headline-lg`        | Hanken Grotesk | 28px | 700    | 1.2         | —        |
| `headline-lg-mobile` | Hanken Grotesk | 24px | 700    | 1.2         | —        |
| `title-md`           | Hanken Grotesk | 20px | 600    | 1.4         | —        |
| `body-lg`            | Inter          | 16px | 400    | 1.6         | —        |
| `body-sm`            | Inter          | 14px | 400    | 1.5         | —        |
| `label-bold`         | Inter          | 12px | 700    | 1.0         | 0.05em   |
| `data-display`       | Hanken Grotesk | 48px | 800    | 1.0         | —        |

`headline-lg-mobile` is used below the 768px breakpoint; `headline-lg` above it (see §9). Data points (quota figures, prices) always use `data-display` or `headline-lg-mobile` — never a smaller weight — per the reference's own "Data Hierarchy" rule.

## 4. Spacing — [SOURCE, byte-identical across every reference file, no divergence found]

4px baseline grid: `base 4px · xs 8px · sm 12px · md 16px · lg 24px · xl 32px`. Layout constants: `container-margin 20px`, `gutter 12px`.

## 5. Radius — [DECISION: resolves C13]

None of the five reference HTML files' inline `borderRadius` config matches the reference `DESIGN.md` frontmatter's own scale — every implementation used a smaller, differently-named scale than its own style guide claims. Rather than trust either scale's _names_, this specification defines radius **by component**, using the actual rendered values observed:

| Component                                              | Radius                                                                                                              | Rationale                                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Number card                                            | 12px (`rounded-xl` in the reference's own scale)                                                                    | Matches every rendered number card                                                                                                                                 |
| Package card                                           | 16px (`rounded-2xl`)                                                                                                | Matches every rendered package card                                                                                                                                |
| Form input                                             | 8px top corners only (`rounded-t-lg`), square bottom — the bottom edge is a 2px accent border, not a rounded corner | Matches the underline-style input pattern                                                                                                                          |
| Primary CTA (number, package screens)                  | Full pill (`rounded-full`)                                                                                          | Matches reference; also the shape rule stated in the reference `DESIGN.md` prose ("Buttons: Fully pill-shaped")                                                    |
| Primary CTA (data-diri, payment, confirmation screens) | 12px (`rounded-xl`)                                                                                                 | Reference renders these as a rounded rectangle, not a pill — kept as the documented exception rather than forced into false consistency with the other two screens |
| QRIS frame / upload dropzone                           | 8–12px (`rounded-lg`/`rounded-xl`)                                                                                  | Matches reference                                                                                                                                                  |
| Chips / badges                                         | Full pill                                                                                                           | Matches "Terkunci" badge, extra-benefit chip, Rekomendasi ribbon corners                                                                                           |
| Modal (new, no reference)                              | 16px                                                                                                                | Consistent with package-card weight, appropriate for the largest overlay surface — see §8                                                                          |

## 6. Elevation & gradients — [SOURCE]

No drop shadows on pure black — they read as muddy. Depth comes from tonal gradients and a single glow rule:

- **Level 0 (base):** flat `background` or `#000`.
- **Level 1 (surface):** card gradient `linear-gradient(180deg, #4A0000 0%, #000000 100%)`, `1px solid #2a2a2a` border where the Atmospheric Black variant is active; on the base maroon variant, flat `surface-container` (#2e1a19) fill with no gradient (matches the reference's number-card treatment, which is flat until selected).
- **Level 2 (active/selected):** 1–2px glowing border. Orange (`secondary-container`, `box-shadow 0 0 12–20px rgba(255,107,0,0.3–0.4)`) for the default selected state; red (`primary-container`, same shadow formula with `rgba(237,2,38,0.3)`) for a second selected element when more than one selection concept exists on a screen simultaneously (only occurs on the package screen, where the pre-selected recommended card uses orange and any other user-selected card uses red — reproduced from `card-active` vs. `card-active-red` in the reference).
- **Overlays:** 60% opacity black backdrop, `blur(20px)`.

## 7. Interaction, selection, and state matrix

The reference demonstrates a handful of these states per screen; most of this table is a **[DECISION]** filling gaps the source leaves open (see design-audit.md §6 for the full list of what was absent).

| State                                                                    | Number card                                                                                                                                                                                           | Package card                                                                 | Form field                                                                                                                                                         | Primary CTA                                                                                                                          | Upload dropzone                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Default                                                                  | `surface-container` fill, `outline-variant` border                                                                                                                                                    | `card-gradient` fill, `#2a2a2a` border                                       | `--input-fill`, transparent 2px bottom border                                                                                                                      | Disabled grey (`surface-variant` fill, `on-surface-variant` text) until a valid selection exists upstream, per screen                | Dashed `#2a2a2a` border                        |
| Hover _(new — not in reference)_                                         | Border brightens to `outline`; cursor pointer                                                                                                                                                         | `scale(1.02)`, border brightens                                              | —                                                                                                                                                                  | Slight `brightness(1.05)`                                                                                                            | Border → `secondary` at 50% opacity            |
| Focus (keyboard) _(new)_                                                 | 2px solid `secondary-container` outline, offset 2px                                                                                                                                                   | Same                                                                         | Existing bottom-border-to-red pattern retained; **add** a visible 2px focus ring for keyboard users, since a color-only border change is insufficient (WCAG 2.4.7) | 2px outline offset 2px                                                                                                               | 2px outline offset 2px                         |
| Selected                                                                 | Orange glow border, `scale(1.02)`, "Terkunci"-style badge showing _this session's own reservation_                                                                                                    | Orange (`card-active`) or red (`card-active-red`) glow border, `scale(1.05)` | —                                                                                                                                                                  | Enabled: `primary-container` fill                                                                                                    | —                                              |
| **Unavailable to this session** _(new — the reference never shows this)_ | Reduced opacity (60%), `cursor: not-allowed`, muted "Sedang Dipesan" label in `on-surface-variant` — visually distinct from _this session's_ selected/locked card, which uses the orange glow instead | Same pattern if a package tier is ever disabled                              | —                                                                                                                                                                  | —                                                                                                                                    | —                                              |
| Loading _(new)_                                                          | Skeleton block, `surface-container` at pulsing 40–70% opacity, same 72px height as a real card, no text                                                                                               | Skeleton block matching card dimensions                                      | Disabled + spinner suffix                                                                                                                                          | Spinner replaces label (reference already demonstrates this exact pattern on the data-diri screen's submit button — reused verbatim) | Progress bar replacing the dropzone icon/text  |
| Empty _(new)_                                                            | Centered icon + "Belum ada nomor tersedia saat ini" + retry action                                                                                                                                    | N/A (packages are static, never empty)                                       | —                                                                                                                                                                  | —                                                                                                                                    | —                                              |
| Error _(new)_                                                            | Centered icon + message + retry, replaces the whole list                                                                                                                                              | Inline banner above the scroller                                             | Red bottom-border + `body-sm` error text below the field, `role="alert"`, referenced by the input's `aria-describedby`                                             | —                                                                                                                                    | Red-tinted dropzone border + inline error text |
| Disabled                                                                 | N/A (unavailable numbers are hidden from the served page, not shown disabled — see `DESIGN.md` §11 implementation decision)                                                                           | Reduced-opacity card, no glow, "Habis" badge                                 | `disabled` attribute, `on-surface-variant` text, no focus ring                                                                                                     | Grey fill, `cursor: not-allowed`, `aria-disabled="true"`                                                                             | —                                              |

## 8. Component specifications

**Buttons.** Primary: solid `primary-container` fill, `on-primary-container` text, `label-bold`/`title-md` depending on context, full pill or 12px radius per §5. Secondary: transparent fill, `outline` border, `on-surface` text. Icon buttons (copy, download, refresh): 44×44px minimum hit target regardless of visible icon size (accessibility floor, §12).

**Inputs.** Dark fill (`--input-fill` on the Atmospheric Black variant, `surface-container-lowest` on the base variant), 2px bottom border, transparent at rest, `primary-container` red on focus, plus the new keyboard-focus ring from §7. Label always above the field (`--input-placeholder` color), never placeholder-as-label.

**Cards.** Number card: flat, 72px fixed height, single line of grouped digits. Package card: gradient fill, three divider-separated stat blocks, `85vw`/`380px` max width, snap-scroll child. Both variants documented in §6.

**Chips/badges.** Pill shape, `secondary-container` fill with the corrected dark text from §2.4, used for "Terkunci," "Rekomendasi," and status badges (`PENDING`/`VERIFIED`/`REJECTED`/`SOLD_OFFLINE` in the admin UI — see §10).

**Progress / countdown timer.** _(New component — the reference has none; this is the direct implementation of the DESIGN.md prose's "dual-tone bars using a dark red base and a bright red or orange progress indicator.")_ A horizontal bar, `surface-container-high` track, `secondary-container` (orange) fill draining left-to-right as time elapses, switching to `error` fill under 2 minutes remaining. Numeric `mm:ss` label in `label-bold` alongside the bar. `aria-live="polite"` region announcing "5 menit tersisa" / "1 menit tersisa" at threshold crossings only — not every tick, which would flood screen readers.

**Implementation status (B038):** built as `ProgressBar` (`src/components/ui/progress-bar.tsx`, presentational, reused by any future determinate-progress use) plus `ReservationTimer` (`src/components/student/reservation-timer.tsx`) on top of `useCountdown` (`src/hooks/use-countdown.ts`). The hook recomputes remaining time from wall-clock on every tick rather than decrementing a stored counter — verified by a fake-timer test suite covering a simulated tab suspension and confirming `onExpire` still fires exactly once even when the tab wakes long after the reservation has already expired. The timer itself never releases a reservation; `onExpire` only triggers a server revalidation in the parent (ADR-004).

**Modal.** _(New.)_ 60%-opacity black backdrop blur, 16px-radius panel, `surface-container-high` fill, used for admin destructive-action confirmations (Radix `Dialog` primitive, styled to these tokens).

**Toast.** _(New.)_ Bottom-anchored on mobile, top-right on desktop, `surface-container-high` fill, colored left border (`primary-container` for errors, `secondary-container` for success — orange reads as "positive/active" throughout this system, not red).

**Uploader.** Dashed dropzone matching the reference exactly for the default state; add (not in reference) a file-selected preview thumbnail, a remove/replace affordance, an upload-progress bar reusing the timer component's visual language, and inline validation errors per §7.

## 9. Responsive behavior — [DECISION: the reference is 480px-only end to end]

Mobile-first is retained as canonical — every layout is designed at 480px first. Above that:

- **768px (tablet):** the student flow's 480px column is centered with the ambient radial-gradient field extending to fill the viewport around it (not stretched — the column stays fixed-width). Number grid becomes 2 columns. Package scroller keeps horizontal snap-scroll (comparison-shopping benefits from the scroll metaphor even with room for a grid; a grid is used only at 1024px+).
- **1024px+ (desktop):** number grid becomes 3 columns. Package scroller becomes a static 3+2 grid, no scroll. Admin screens (no student-flow constraint) use the full viewport width with a persistent left-side navigation rail, reusing every token and radius rule above at a visually denser, smaller-type scale appropriate for data tables.

## 10. Admin UI — [DECISION: no reference exists; same tokens, higher density]

Same color tokens, same typography scale, same radius language as the student flow. Differences are density and layout only: tighter row heights (36–44px vs. the student flow's 72px cards), data tables instead of card lists, a persistent nav rail instead of a bottom sticky CTA, and status badges reusing the chip component (§8) with one color mapping per lifecycle state: `available` → `outline` border only, `reserved` → `secondary` text, `pending` → `secondary-container` fill, `sold` → `primary-container` fill, `sold_offline` → `on-surface-variant` fill (visually muted — it's informational, not actionable).

## 11. Implementation decisions beyond the reference (consolidated)

- **Available-vs-hidden number cards (REQ-019):** the server never sends a card for a number that isn't AVAILABLE — there is no "greyed out, visible but unselectable" state for other students' numbers, because the numbers endpoint only ever returns a sampled page of currently-available numbers (see C14 / `API_SPEC.md` `getAvailableNumbers`). The "unavailable" visual state in §7 exists only for the narrow window between a client-side click and the server's authoritative response.
- **Package-card CTA gating (C21):** the bottom CTA on the package screen is disabled until a card is selected, matching the number screen's already-correct pattern, even though the reference HTML for the package screen ships the button always-enabled.
- **Reservation timer:** net-new component, §8, present on screens 1–4 once a reservation is active.
- **Search-by-suffix on the number screen:** a text input filtering the sampled page by trailing digits, added because ten cards is not a real strategy for finding a memorable number among 96 (C14).
- **Tracking reference + token display on the confirmation screen (C7/C8):** a new card block showing `order_ref`, a masked/revealed tracking token, a copy button for each, and an explicit "disimpan hanya sekali — simpan sebelum meninggalkan halaman ini" warning.
- **Confirmation copy rewrite (C9):** the promised-notification line is replaced with tracking instructions pointing at the reference/token just captured.

## 12. Accessibility baseline

Semantic HTML first — `<button>` for actions, `<label for>` for every input, native `<select>` retained (not reimplemented as a styled div). All interactive targets ≥44×44px. All color-only signals (selected/error/success) are paired with a text or icon signal, never color alone — the existing "Terkunci" badge already does this correctly and is the pattern to replicate. Reduced motion: every animation in §13 has a `prefers-reduced-motion: reduce` fallback that disables the animation and applies the end state instantly.

## 13. Animation

`slideUpFade` staggered card entrance (0.1s increments, package screen), `spin-once` refresh icon (0.5s), `scan` QR scan-line sweep (2s loop, decorative only — must not imply real-time verification is happening), timer bar transition (linear, tied to actual elapsed time, never simulated). All disabled under `prefers-reduced-motion: reduce`.

## Do / Don't

**Do** keep the maroon and Atmospheric Black variants on the screens the reference assigns them to. **Don't** merge them into one "the app's color" — that erases a deliberate choice. **Do** use dark text on every orange fill. **Don't** reuse the package screen's white-on-orange ribbon styling anywhere (§2.4). **Do** treat the countdown timer as visible on every screen from selection through payment. **Don't** let the timer's visual countdown be the source of truth for whether a reservation is still valid — it is a presentation layer over server-authoritative state (`ARCHITECTURE.md`).
