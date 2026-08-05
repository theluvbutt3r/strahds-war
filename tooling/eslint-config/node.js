import globals from "globals";

/**
 * Shared by anything running server-side: services/api, scripts, the non-view packages.
 *
 * SCOPE IS PART OF THE POLICY. These globs name server code specifically rather than
 * `**\/*.ts`. The blanket form was wrong in a way that only shows up later: it banned
 * `window` and `document` in every `.ts` file in the repo, apps/web included, with the
 * message "Server-side code has no window." That is false in a Next.js app, where a
 * client-side utility module — a media-query helper, a localStorage wrapper for
 * bookmarks, the Phase 5 PWA install prompt — is a `.ts` file that legitimately touches
 * both. `.tsx` escaped only because the glob did not match it.
 *
 * The cost of a rule that is wrong in a real scope is not the error itself; it is the
 * inline `eslint-disable` someone writes to get past it, which then suppresses genuine
 * findings on that line forever. Enable a rule exactly where its message is true.
 */
const SERVER_FILES = [
  "services/**/*.ts",
  "scripts/**/*.ts",
  "packages/db/**/*.ts",
  "packages/schemas/**/*.ts",
  "packages/authz/**/*.ts",
  "packages/api-client/**/*.ts",
];

export const node = [
  {
    files: SERVER_FILES,
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "Server-side code has no window." },
        { name: "document", message: "Server-side code has no document." },
      ],
    },
  },
  {
    // Node globals, without the browser-global ban, for build tooling and configs — which
    // run under Node regardless of which package they happen to live in.
    files: ["**/*.config.{ts,js,mjs,cjs}", "**/build.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];

export default node;
