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
    if (typeof window === "undefined") return initial;
    try {
      if (key) {
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<T>;
          const hasContent = Object.values(parsed).some((v) => Boolean(v));
          if (hasContent) {
            return { ...initial, ...parsed };
          }
        }
      }

      // Fallback 1: halo_current_form_draft
      const currentRaw = window.sessionStorage.getItem("halo_current_form_draft");
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw) as Partial<T>;
        const hasContent = Object.values(parsed).some((v) => Boolean(v));
        if (hasContent) {
          if (key) window.sessionStorage.setItem(key, currentRaw);
          return { ...initial, ...parsed };
        }
      }

      // Fallback 2: search any halo_form_draft_* key in sessionStorage
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith("halo_form_draft_")) {
          const item = window.sessionStorage.getItem(k);
          if (item) {
            const parsed = JSON.parse(item) as Partial<T>;
            const hasContent = Object.values(parsed).some((v) => Boolean(v));
            if (hasContent) {
              if (key) window.sessionStorage.setItem(key, item);
              return { ...initial, ...parsed };
            }
          }
        }
      }

      return initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const str = JSON.stringify(value);
    if (key) {
      window.sessionStorage.setItem(key, str);
    }
    const hasContent = Object.values(value).some((v) => Boolean(v));
    if (hasContent) {
      window.sessionStorage.setItem("halo_current_form_draft", str);
    }
  }, [key, value]);

  function clear() {
    if (typeof window !== "undefined") {
      if (key) {
        window.sessionStorage.removeItem(key);
      }
      window.sessionStorage.removeItem("halo_current_form_draft");
      const toRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith("halo_form_draft_")) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        window.sessionStorage.removeItem(k);
      }
    }
    setValue(initial);
  }

  return { draft: value, setDraft: setValue, clearDraft: clear };
}
