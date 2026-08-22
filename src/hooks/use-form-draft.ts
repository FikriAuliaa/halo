"use client";

import { useEffect, useState } from "react";

/**
 * Form-input-only draft persistence (B079) — `sessionStorage`, namespaced
 * by `order_ref` (minted at reservation time) so a new reservation never
 * inherits a stale draft. Never holds reservation state, a tracking
 * token, or anything the server must be authoritative about (`AGENTS.md`
 * prohibits `localStorage`/`sessionStorage` as a source of truth for
 * those) — only what the student typed.
 */
export function useFormDraft<T extends object>(namespace: string | null, initial: T) {
  const key = namespace ? `halo_form_draft_${namespace}` : null;

  const [value, setValue] = useState<T>(() => {
    if (!key || typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? { ...initial, ...(JSON.parse(raw) as Partial<T>) } : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  function clear() {
    if (key && typeof window !== "undefined") {
      window.sessionStorage.removeItem(key);
    }
    setValue(initial);
  }

  return { draft: value, setDraft: setValue, clearDraft: clear };
}
