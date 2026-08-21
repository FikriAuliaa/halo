import type { Metadata } from "next";
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
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
