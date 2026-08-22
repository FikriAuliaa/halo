"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";

export interface LoginFormProps {
  redirectTo: string;
}

/** Only ever navigates within the admin area — an unvalidated redirect
 * target from a query string is a classic open-redirect phishing vector
 * (B094). */
function isSafeAdminRedirect(target: string): boolean {
  return target.startsWith("/admin") && !target.startsWith("//");
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? "Email atau kata sandi salah.");
        setLoading(false);
        return;
      }
      const target = isSafeAdminRedirect(redirectTo) ? redirectTo : "/admin";
      router.push(target);
      router.refresh();
    } catch {
      setError("Koneksi terputus. Silakan coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-lg px-container-margin">
      <div className="flex flex-col gap-xs text-center">
        <span className="font-display text-headline-lg text-on-surface">Halo Admin</span>
        <p className="font-body text-body-sm text-on-surface-variant">
          Masuk untuk mengelola pesanan dan inventaris nomor.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-md" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <TextField
            label="Kata Sandi"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute right-sm top-[38px] font-body text-body-sm text-on-surface-variant"
          >
            {showPassword ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="font-body text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" loading={loading}>
          Masuk
        </Button>
      </form>
    </div>
  );
}
