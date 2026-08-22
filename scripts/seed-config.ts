#!/usr/bin/env tsx
/**
 * Seeds `config/packages`, `config/universities`, `config/system`, and a
 * `config/payment` placeholder (B075/B078; the payment placeholder folded
 * in here rather than as a separate B081 script, since it's one more row
 * in the same table and needs no dedicated logic of its own). Idempotent —
 * every row is a full replace keyed by `key`, safe to re-run.
 */
import { configRepository } from "@/server/repositories/config-repository";

const PACKAGES = [
  {
    id: "pkg_70gb",
    label: "Halo+ 100K",
    price: 100_000,
    price_status: "draft" as const,
    quota_internet_gb: 70,
    quota_roaming_gb: 1,
    voice_minutes: 200,
    sms_count: 200,
    recommended: false,
    active: true,
    display_order: 0,
  },
  {
    id: "pkg_120gb",
    label: "Halo+ 120K",
    price: 120_000,
    price_status: "draft" as const,
    quota_internet_gb: 120,
    quota_roaming_gb: 2,
    voice_minutes: 300,
    sms_count: 300,
    recommended: false,
    active: true,
    display_order: 1,
  },
  {
    id: "pkg_160gb",
    label: "Halo+ 150K",
    price: 150_000,
    price_status: "draft" as const,
    quota_internet_gb: 160,
    quota_roaming_gb: 2,
    voice_minutes: 400,
    sms_count: 400,
    recommended: true,
    active: true,
    display_order: 2,
  },
  {
    id: "pkg_220gb",
    label: "Halo+ 200K",
    price: 200_000,
    price_status: "draft" as const,
    quota_internet_gb: 220,
    quota_roaming_gb: 3,
    voice_minutes: 500,
    sms_count: 500,
    recommended: false,
    active: true,
    display_order: 3,
  },
  {
    id: "pkg_300gb",
    label: "Halo+ 300K",
    price: 300_000,
    price_status: "draft" as const,
    quota_internet_gb: 300,
    quota_roaming_gb: 5,
    voice_minutes: 1000,
    sms_count: 1000,
    recommended: false,
    active: true,
    display_order: 4,
  },
];

// OQ-2 default: a small placeholder list (the design's own hardcoded
// "Universitas Surabaya" example), admin-editable via config/universities.
const UNIVERSITIES = [
  { name: "Universitas Surabaya", active: true },
  { name: "Universitas Airlangga", active: true },
  { name: "Institut Teknologi Sepuluh Nopember", active: true },
  { name: "Universitas Kristen Petra", active: true },
  { name: "Universitas Ciputra", active: true },
];

export async function seedConfig(): Promise<void> {
  await configRepository.setPackages({ packages: PACKAGES });
  await configRepository.setUniversities({ list: UNIVERSITIES });
  await configRepository.setSystem({
    reservation_ttl_minutes: 15,
    max_active_reservations_per_session: 1,
    proof_max_size_mb: 5,
    proof_allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    reservations_paused: false,
  });
  // Dev placeholder (OQ-6: no real QRIS asset yet) — a visibly-fake QR
  // path an admin must replace before production (B131 readiness check).
  await configRepository.setPayment({
    qr_image_path: "placeholders/qris-dev-placeholder.png",
    payment_label: "QRIS Telkomsel Kampus (Placeholder)",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedConfig()
    .then(() => {
      console.log("Config seeded: packages, universities, system, payment (placeholder).");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Config seed failed:", error);
      process.exit(1);
    });
}
