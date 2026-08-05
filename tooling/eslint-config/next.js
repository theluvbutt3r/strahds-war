import next from "@next/eslint-plugin-next";

import { react } from "./react.js";
import { ALL_RESTRICTED_SYNTAX } from "./restricted-syntax.js";

/**
 * @param {string[]} files - globs this config applies to
 */
export function nextConfig(files) {
  return [
    ...react(files),
    {
      files,
      plugins: { "@next/next": next },
      // Lint runs from the repo root, so the plugin needs telling where the app is —
      // without it, no-html-link-for-pages warns on every run and people learn to
      // scroll past ESLint output, which is how real findings get missed.
      settings: { next: { rootDir: "apps/web" } },
      rules: {
        ...next.configs.recommended.rules,
        ...next.configs["core-web-vitals"].rules,
      },
    },
    {
      // Leaf client components are where interactivity is supposed to live, so the
      // blanket 'use client' ban from ./react.js is lifted for files that opt in by name.
      //
      // Lifted by *re-declaring the rule without that one selector* — not by turning the
      // rule off. `"no-restricted-syntax": "off"` was the previous form, and it disabled
      // every other policy too, including the role-comparison ban, in precisely the files
      // most likely to contain a role check: interactive components deciding whether to
      // render an Edit button. Opting in to 'use client' is not opting out of spoiler
      // safety.
      files: ["**/*.client.tsx", "**/components/client/**/*.tsx"],
      rules: { "no-restricted-syntax": ["error", ...ALL_RESTRICTED_SYNTAX] },
    },
  ];
}

export default nextConfig;
