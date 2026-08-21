# `src/app/(student)`

Route group for the unauthenticated student flow: number selection, package selection, personal data, payment, confirmation, and order tracking (Phase 7–9). Server Components here render read-only projections fetched from `src/server` operations — never a direct Firestore read. Client Components handle selection state, the countdown timer, and form/upload interaction.

**Must not go here:** any Firestore/Storage write, any admin-only UI, any business logic that belongs in `src/domain`.
