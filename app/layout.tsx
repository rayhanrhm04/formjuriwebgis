import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const figtree = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-italic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "MAPID WebGIS Competition 2026 — Judging System",
  description: "Official scoring and real-time leaderboard for MAPID WebGIS Competition 2026.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f8f9fd" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={figtree.variable}><body>{children}</body></html>;
}
