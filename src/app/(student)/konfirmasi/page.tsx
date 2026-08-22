"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";
import { ConfirmationCard } from "@/components/student/confirmation-card";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

interface ConfirmationData {
  order_ref: string;
  number: string;
  package_label: string;
  full_name: string;
  email: string;
  submitted_at: string;
}

const STORAGE_KEY = "halo_confirmation";

/**
 * The confirmation screen (B088). The reference (`konfirmasi_pesanan_
 * perfect_alignment`) promises an email/WhatsApp confirmation the system
 * never sends (spec §4 excludes notifications) — **rewritten** here to
 * describe self-service tracking instead, so the copy never promises
 * something no code keeps (C8/C9). The tracking token itself isn't shown
 * again: it was already shown exactly once, at reservation time
 * (`TrackingTokenDialog`), and is cryptographically unrecoverable now.
 */
export default function ConfirmationPage() {
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [orderRefFromUrl, setOrderRefFromUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderRefFromUrl(params.get("ref"));

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setData(JSON.parse(raw) as ConfirmationData);
      } catch {
        // Malformed/stale entry — fall back to the URL's ?ref= only.
      }
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const orderRef = data?.order_ref ?? orderRefFromUrl;

  return (
    <StudentShell>
      <div className="flex flex-col items-center gap-md py-xl text-center">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[64px] text-secondary-container"
        >
          check_circle
        </span>
        <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Pesanan Berhasil Dikirim
        </h1>
        <p className="font-body text-body-sm text-on-surface-variant">
          Bukti pembayaran kamu sedang ditinjau oleh admin. Periksa status pesanan kapan saja
          melalui halaman Lacak Pesanan, menggunakan kode dan token pelacakan yang sudah kamu
          simpan.
        </p>

        {orderRef ? (
          <div className="flex items-center gap-sm rounded-field bg-surface-container-high px-md py-sm">
            <span className="font-display text-title-md text-on-surface">{orderRef}</span>
            <CopyButton value={orderRef} />
          </div>
        ) : null}

        <p className="font-body text-body-sm text-on-surface-variant">
          Token pelacakan sudah ditampilkan satu kali saat kamu memesan nomor dan tidak dapat
          ditampilkan ulang di sini.
        </p>

        {data ? (
          <ConfirmationCard
            number={data.number}
            packageLabel={data.package_label}
            fullName={data.full_name}
            email={data.email}
            submittedAt={data.submitted_at}
          />
        ) : null}

        <Link href="/lacak" className="w-full">
          <Button variant="primary" size="lg" className="w-full">
            Lacak Pesanan
          </Button>
        </Link>
      </div>
    </StudentShell>
  );
}
