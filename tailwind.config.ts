import type { Config, PluginAPI } from "tailwindcss/types/config";

/**
 * Premium Crimson Pulse tokens, encoded once here per DESIGN.md — no
 * component may hardcode a hex value (AGENTS.md, DESIGN.md "Do / Don't").
 *
 * Two color groups exist because DESIGN.md §2 resolves a real conflict in
 * the source material (contradiction C12) by keeping BOTH palettes as
 * named, purpose-driven tokens rather than collapsing them:
 *  - the base/canonical maroon palette (§2.1) — number, payment,
 *    confirmation screens
 *  - the "Atmospheric Black" variant (§2.2) — package, personal-data
 *    screens
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Base / canonical (DESIGN.md §2.1) ---
        background: "#200e0d",
        surface: "#200e0d",
        "surface-dim": "#200e0d",
        "surface-bright": "#4b3331",
        "surface-container-lowest": "#1a0908",
        "surface-container-low": "#2a1615",
        "surface-container": "#2e1a19",
        "surface-container-high": "#3a2423",
        "surface-container-highest": "#462f2d",
        "on-surface": "#ffdad7",
        "on-surface-variant": "#e9bcb8",
        outline: "#af8784",
        "outline-variant": "#5e3f3c",
        primary: "#ffb3ad",
        "on-primary": "#68000a",
        "primary-container": "#ed0226",
        "on-primary-container": "#ffffff",
        secondary: "#ffb693",
        "on-secondary": "#561f00",
        "secondary-container": "#fe6b00",
        // Canonical dark text on orange — DESIGN.md §2.4 contrast
        // remediation. Never use white here (2.86:1, fails AA).
        "on-secondary-container": "#572000",
        error: "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",

        // --- Atmospheric Black variant (DESIGN.md §2.2) ---
        "surface-black": "#000000",
        "card-gradient-start": "#4a0000",
        "card-gradient-end": "#000000",
        divider: "#2a2a2a",
        "brand-red": "#ed0226",
        "highlight-orange": "#fe6b00",
      },
      fontFamily: {
        display: ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // [fontSize, { lineHeight, fontWeight, letterSpacing }] — Tailwind
        // applies all three from this tuple. DESIGN.md §3.
        "display-lg": ["36px", { lineHeight: "1.1", fontWeight: "800", letterSpacing: "-0.02em" }],
        "headline-lg": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.2", fontWeight: "700" }],
        "title-md": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-bold": ["12px", { lineHeight: "1", fontWeight: "700", letterSpacing: "0.05em" }],
        "data-display": ["48px", { lineHeight: "1", fontWeight: "800" }],
      },
      spacing: {
        base: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "container-margin": "20px",
        gutter: "12px",
      },
      borderRadius: {
        // DESIGN.md §5 — per-component, not a generic small/medium/large
        // scale, because the reference itself assigns radius by role.
        field: "8px",
        card: "12px",
        package: "16px",
        modal: "16px",
      },
      backgroundImage: {
        "card-gradient": "linear-gradient(180deg, #4A0000 0%, #000000 100%)",
      },
      boxShadow: {
        "glow-orange": "0 0 12px rgba(254, 107, 0, 0.4)",
        "glow-orange-lg": "0 0 20px rgba(255, 107, 0, 0.3)",
        "glow-red": "0 0 20px rgba(237, 2, 38, 0.4)",
      },
    },
  },
  plugins: [
    function noScrollbar({ addUtilities }: PluginAPI) {
      addUtilities({
        ".no-scrollbar": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".no-scrollbar::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};

export default config;
