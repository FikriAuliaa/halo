# Performance Review (B137)

## Scope limitation, stated up front

This block calls for Core Web Vitals under a throttled 3G/mid-tier-CPU mobile profile. That specifically requires Lighthouse (or Chrome DevTools Protocol throttling driven some other way) — neither is installed in this environment, and installing new tooling/dependencies is a real decision outside this review's scope to make unilaterally. What follows is real, measured data from what this environment _can_ produce: actual production bundle sizes (which don't change under throttling — bytes are bytes) and real, unthrottled browser navigation timing against the local production build. Both are clearly labeled as best-case, not a substitute for the throttled measurement this block actually asks for.

## Bundle size (real `next build` output, production mode)

- Shared JS across every route: **102 kB** (a reasonable Next.js App Router baseline).
- Largest page-specific bundle: `/data` at **21.6 kB** (159 kB first load) — the personal-data form, carrying `PhoneField`/`EmailField`/`SelectField` plus the Zod schema client-side for on-blur validation. The next-largest is `/gallery` (dev-only, unreachable in production) at 5.48 kB.
- Every other student screen is under 6 kB page-specific; every admin screen under 5.4 kB except `/admin/nomor` (5.39 kB page, 145 kB first load — the heaviest single admin screen, from the numbers table plus both add-number dialogs loading together).
- No screen approaches a size that would itself be a red flag on 3G; `/data`'s 159 kB first load is the one contributor most worth watching if a future change adds to that screen specifically.

## Real (unthrottled, localhost) navigation timing

Measured via Playwright/Chromium against an actual `next build && next start`, real Supabase-backed data — not synthetic:

| Screen                        | First Contentful Paint | DOMContentLoaded | Load event |
| ----------------------------- | ---------------------- | ---------------- | ---------- |
| `/` (home / number selection) | 60ms                   | 38ms             | 82ms       |

These numbers describe zero network latency and zero CPU throttling — they establish that the _application itself_ introduces negligible overhead beyond React hydration; they say nothing about what a real student on a congested campus network and a mid-tier phone would experience, which is precisely what B137 asks for and what this environment cannot produce.

## Image optimization

- The QRIS image is served as an admin-uploaded, re-encoded (via `sharp`) JPEG/PNG/WEBP with no additional Next.js Image-component compression applied — deliberately: `qris-panel.tsx`'s own comment notes `next/image`'s optimizer offers little for a remote, admin-controlled asset, and B137's own constraint (a QRIS degraded to the point of failing to scan is worse than an unoptimized one) argues against adding a second, automatic compression pass on top of the upload pipeline's own re-encode.
- Fonts are self-hosted via `next/font/google` (no external Google Fonts request, no render-blocking `<link>`), confirmed in Phase 14's CSP work — `font-src 'self'` in the CSP would have broken any external font request had one existed.

## Verdict

No performance red flag was found in what's measurable here. The throttled-3G Core Web Vitals measurement this block specifically asks for is not achievable without Lighthouse or equivalent CDP-throttling tooling, which this environment doesn't have installed — recorded as a genuine gap for whoever runs this review with real tooling available, not silently substituted with the unthrottled numbers above passed off as equivalent.
