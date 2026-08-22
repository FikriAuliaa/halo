-- Private payment-proof bucket (B083). No policies on `storage.objects`
-- for it — the service-role connection is the only access path, same
-- deny-by-default posture as every other table. Students have no
-- credentials to be granted Storage access with in the first place; the
-- upload passes through the server, which re-encodes it before it ever
-- reaches this bucket.
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- Public bucket for admin-uploaded, non-sensitive payment assets (the
-- QRIS image) — unlike a payment proof, this is meant to be visible to
-- anyone, so it's served as a plain public URL rather than a signed one.
insert into storage.buckets (id, name, public)
values ('payment-assets', 'payment-assets', true)
on conflict (id) do nothing;
