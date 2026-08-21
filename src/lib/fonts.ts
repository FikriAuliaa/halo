import { Hanken_Grotesk, Inter } from "next/font/google";

/**
 * Self-hosted via next/font (no render-blocking Google Fonts <link>, no
 * layout shift — next/font matches fallback metrics automatically).
 * DESIGN.md §3: Hanken Grotesk for display/headline/title/data, Inter for
 * body/label.
 */
export const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-inter",
  display: "swap",
});
