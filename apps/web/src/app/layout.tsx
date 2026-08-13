import { Vignette } from "@sw/ui";
import { Cinzel, Inter, JetBrains_Mono, Spectral } from "next/font/google";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

/**
 * The four faces from PLAN.md §6, self-hosted.
 *
 * `next/font` downloads each face at build time and serves it from our own origin. That
 * removes a request to Google on every page load — which is a privacy improvement, and for
 * this project also a spoiler one in a small way: a third party learns nothing about when
 * the campaign wiki is being read.
 *
 * `variable` publishes each family as a CSS custom property rather than a class, and the
 * names have to match FONT_CSS_VARIABLES in @sw/design-tokens — the generated theme reads
 * them as `var(--font-inter, Inter)`. A mismatch here is silent: the stack falls through to
 * the fallback and the site simply renders in Georgia.
 *
 * `display: "swap"` shows the fallback immediately and swaps when the real face arrives,
 * rather than holding the text invisible. At the table on hotel wifi, text in the wrong
 * font beats no text.
 */
const display = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const body = Spectral({
  subsets: ["latin"],
  // Spectral is not a variable font, so every weight and style is a separate file and has
  // to be asked for by name. Kept to two weights plus italic: read-aloud boxes are set in
  // italic, and everything else in prose is regular or a bolded run.
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${ui.variable} ${mono.variable}`}
    >
      <body>
        {/*
          Site-wide, once. It renders behind everything at --z-atmosphere, so it shades the
          exposed page background and never the cards or text on top of it — which is what
          keeps the measured contrast ratios true.
        */}
        <Vignette />
        {children}
      </body>
    </html>
  );
}
