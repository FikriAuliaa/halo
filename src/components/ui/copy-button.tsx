"use client";

import { useState } from "react";

export interface CopyButtonProps {
  value: string;
  label?: string;
}

/** Copy-to-clipboard with a visible+announced confirmation and a fallback
 * for browsers without the async Clipboard API (B082). */
export function CopyButton({ value, label = "Salin" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Worst case, the student selects and copies the text manually.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-live="polite"
      className="inline-flex items-center gap-1 font-body text-body-sm text-secondary"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Tersalin" : label}
    </button>
  );
}
