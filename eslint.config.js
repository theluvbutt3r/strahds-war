import { base, roleLiteralExemptions } from "@sw/eslint-config/base";
import { boundariesConfig } from "@sw/eslint-config/boundaries";
import { nextConfig } from "@sw/eslint-config/next";
import { node } from "@sw/eslint-config/node";

/**
 * ESLint runs once, from the repo root, over every workspace.
 *
 * This is deliberate rather than per-package: eslint-plugin-boundaries reasons about
 * paths relative to a single project root, so running it per package would evaluate the
 * layering rules against a truncated view of the tree and quietly pass everything.
 * Lint here is a few seconds for a repo this size; per-package caching isn't worth
 * weakening the one check that enforces §4.
 */
export default [
  ...base,
  ...node,
  ...boundariesConfig,
  ...nextConfig([
    "apps/web/**/*.{ts,tsx}",
    "packages/ui/**/*.{ts,tsx}",
    "packages/editor/**/*.{ts,tsx}",
  ]),

  // MUST STAY LAST. Lifts the literal-based role selectors for the handful of files that
  // legitimately name roles — the canonical role list, @sw/authz, and tests. It works by
  // redeclaring `no-restricted-syntax` with a narrower set, and flat config resolves
  // that last-one-wins, so any block appended after this one would put the full set back
  // and the exemption would silently stop applying.
  ...roleLiteralExemptions,
];
