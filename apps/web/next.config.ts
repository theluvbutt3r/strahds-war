import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  // Workspace packages ship TypeScript source rather than a built dist/, so Next
  // compiles them itself. This is what removes build ordering from `pnpm dev` —
  // editing @sw/ui hot-reloads the web app with no intermediate build step.
  transpilePackages: [
    "@sw/api-client",
    "@sw/authz",
    "@sw/content-render",
    "@sw/design-tokens",
    "@sw/editor",
    "@sw/schemas",
    "@sw/ui",
  ],

  typedRoutes: true,

  /**
   * Baseline security headers.
   *
   * PLAN.md §10 puts hardening in Phase 6, but these cost nothing now and two of them are
   * spoiler controls rather than generic hygiene:
   *
   * - `Referrer-Policy: no-referrer` — an entity URL is itself a spoiler. Following an
   *   outward link from a DM-only page would otherwise hand the destination a path like
   *   /npc/the-traitor-in-vallaki in the Referer header.
   * - `X-Robots-Tag: noindex, nofollow` — the same intent as the meta tag in layout.tsx,
   *   but sent as a header, so it also covers non-HTML responses that carry no meta tag.
   *   ADR 0002.
   *
   * A Content-Security-Policy is deliberately absent: a useful one needs nonces wired
   * through the rendering path, and a placeholder CSP loose enough to avoid breaking
   * anything reads as protection without being any. Phase 6.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  // Next 16 dropped the `eslint` config key along with lint-during-build, which suits us:
  // lint runs once from the repo root so the boundary rules see the whole tree. Running
  // it per app would evaluate them against a truncated view and pass things it should catch.

  // Notably absent: any DATABASE_URL. The web app holds no database credentials —
  // it reads through @sw/api-client so visibility filtering stays server-side in
  // services/api. See docs/PLAN.md §4.
};

export default config;
