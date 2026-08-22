import Link from "next/link";
import { Button } from "@/components/ui/button";

/** 403 page (B096) — explains the role requirement without leaking what
 * exists behind it (no mention of specific data, counts, or endpoints). */
export default function AdminUnauthorizedPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-md px-container-margin text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-[64px] text-error">
        lock
      </span>
      <h1 className="font-display text-headline-lg text-on-surface">Akses Ditolak</h1>
      <p className="font-body text-body-sm text-on-surface-variant">
        Akun kamu tidak memiliki peran yang diperlukan untuk mengakses halaman ini.
      </p>
      <Link href="/admin">
        <Button variant="secondary" size="md">
          Kembali ke Dashboard
        </Button>
      </Link>
    </div>
  );
}
