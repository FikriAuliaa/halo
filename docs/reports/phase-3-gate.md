# Phase 3 Verification Gate (B047)

## Component gallery

`src/app/(dev)/gallery/page.tsx` renders every design-system component built in Phase 3 (B032–B046) across its documented states: typography, buttons (all variants + loading/disabled), form fields (including error states), cards (unselected/selected/disabled), chips, all eight number/order status badges, progress bar (default/error tone), the reservation timer, dialogs, toasts (all four variants), the file uploader (all six states via in-page state toggles), skeletons (all four composed variants), empty states (all three presets), error states (all five variants), the step indicator (all four positions), and the responsive grid.

## Production exclusion — verified, not assumed

The route calls `notFound()` when `NODE_ENV === "production"`. Verified both ways:

- `pnpm exec next build && NODE_ENV=production pnpm exec next start` → `curl /gallery` → `404`.
- A permanent Playwright test (`e2e/gallery.spec.ts`, gated on `E2E_TARGET=production`, run via `pnpm test:e2e:prod`) automates the same check against a real production build — it is not a one-off manual check, it re-runs every time that script is invoked.

## Accessibility — two real defects found and fixed

An axe pass against the gallery (`e2e/gallery.spec.ts`) found two genuine defects, neither hypothetical:

1. **Loading `Button` had no accessible name.** The original implementation hid the visible label (`aria-hidden` + `invisible`) to make room for a centered spinner while preserving width. Both the spinner (correctly `aria-hidden`) and the label (incorrectly also `aria-hidden`) were removed from the accessibility tree simultaneously, leaving the button with zero accessible name while `aria-busy="true"` — exactly the state a screen-reader user most needs the name for. Fixed by always rendering the label in the tree; the spinner is prepended rather than replacing it. Width preservation was dropped as a requirement in favour of not shipping an unnamed interactive element — documented as a deliberate trade-off in `button.tsx` and `AGENTS.md`.
2. **`aria-label` on bare `<div>` skeleton containers.** All four composed skeletons (`NumberGridSkeleton`, `PackageScrollerSkeleton`, `OrderFormSkeleton`, `AdminTableSkeleton`) paired `aria-busy="true" aria-label="..."` on a plain `<div>` with no ARIA role — axe's `aria-prohibited-attr` rule correctly flags this, since a div has no implicit role capable of carrying a name. Fixed by adding `role="status"` to each, which is also the semantically correct role for a loading region.

Both fixes are now permanent parts of the components; the gallery's axe test (`test:e2e`) prevents regression.

## Full verification run

| Check                                                            | Result                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| `pnpm run lint`                                                  | Clean                                                     |
| `pnpm run typecheck`                                             | Clean                                                     |
| `pnpm run test:unit`                                             | 34/34                                                     |
| `pnpm run test:component`                                        | 138/138                                                   |
| `pnpm exec next build`                                           | Succeeds, `/gallery` present                              |
| `pnpm run test:e2e` (dev target)                                 | 6 passed, 2 correctly skipped (production-only assertion) |
| `pnpm run test:e2e:prod` (production target, real build + start) | 8/8 passed, including the live 404 check                  |

## Verdict

Zero serious/critical axe violations remain. Every documented component state is represented in the gallery. The gallery is confirmed unreachable in a production build by an automated, re-runnable test, not a one-time manual check. Phase 3 (design system) is complete — 16 blocks (B032–B047). Proceeding to Phase 4 (backend foundation).
