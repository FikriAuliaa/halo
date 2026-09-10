import type { Metadata, Viewport } from "next";
import { hankenGrotesk, inter } from "@/lib/fonts";
import { RouteFocusManager } from "@/components/route-focus-manager";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ed0226",
};

export const metadata: Metadata = {
  title: "Halo Kampus",
  description: "Telkomsel Halo Number Ordering System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Halo Kampus",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${hankenGrotesk.variable} ${inter.variable}`}>
      <body className="font-body">
        <RouteFocusManager />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
