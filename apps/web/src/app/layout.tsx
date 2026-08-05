import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Strahd's War",
    template: "%s · Strahd's War",
  },
  description: "A campaign wiki for the lands of Barovia.",
  // The wiki is login-gated (ADR 0002); there is nothing here for a crawler to index,
  // and a search result leaking an entity title would be a spoiler in itself.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B0A0C",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
