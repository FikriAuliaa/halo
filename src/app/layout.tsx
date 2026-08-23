/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { hankenGrotesk, inter } from "@/lib/fonts";
import { RouteFocusManager } from "@/components/route-focus-manager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halo Kampus",
  description: "Telkomsel Halo Number Ordering System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${hankenGrotesk.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="font-body">
        <RouteFocusManager />
        {children}
      </body>
    </html>
  );
}
