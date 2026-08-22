import Link from "next/link";
import { Card } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/admin/konfigurasi/paket",
    title: "Paket",
    description: "Harga, kuota, status aktif, dan urutan tampil paket.",
  },
  {
    href: "/admin/konfigurasi/kampus",
    title: "Universitas",
    description: "Daftar universitas yang dapat dipilih siswa.",
  },
  {
    href: "/admin/konfigurasi/pembayaran",
    title: "Pembayaran",
    description: "Gambar QRIS dan label pembayaran.",
  },
];

/** `/admin/konfigurasi` (B110-B111) — a simple index; each section is
 * its own screen since they touch unrelated config rows with different
 * role rules. */
export default function ConfigurationPage() {
  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-headline-lg text-on-surface">Konfigurasi</h1>
      <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="flex h-full flex-col gap-1 transition-colors hover:bg-surface-container-high">
              <h2 className="font-display text-title-md text-on-surface">{section.title}</h2>
              <p className="font-body text-body-sm text-on-surface-variant">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
