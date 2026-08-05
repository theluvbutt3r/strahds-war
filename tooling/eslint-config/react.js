import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

import { ALL_RESTRICTED_SYNTAX, NO_USE_CLIENT } from "./restricted-syntax.js";

/**
 * Shared by anything rendering React: apps/web, packages/ui, packages/editor.
 *
 * Exported as a factory rather than a plain array because ESLint 10's flat config has no
 * `extends` — the only way to scope a shared config to a subset of the monorepo is to
 * stamp `files` onto every object in it.
 *
 * @param {string[]} files - globs this config applies to
 */
export function react(files) {
  return [
    {
      files,
      languageOptions: {
        globals: { ...globals.browser, ...globals.serviceworker },
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    // v7 still ships `configs.recommended` in the legacy eslintrc shape (plugins as an
    // array), which flat config rejects outright. `configs.flat.recommended` is the
    // flat-native one.
    { ...reactHooks.configs.flat.recommended, files },
    {
      files,
      rules: {
        // Adds the 'use client' ban to the selectors base.js already installed.
        //
        // The spread is not stylistic. This block previously declared only the
        // 'use client' selector, which — because flat config replaces a rule's options
        // rather than merging them — silently deleted the role-comparison ban across
        // apps/web, packages/ui and packages/editor: the whole view layer, and the place
        // a stray `user.role === "co-dm"` is most likely to be written. Anything added
        // here must spread ALL_RESTRICTED_SYNTAX first. Mechanism 4 of
        // scripts/verify-boundaries.ts fails the build if this regresses.
        "no-restricted-syntax": ["error", ...ALL_RESTRICTED_SYNTAX, NO_USE_CLIENT],
      },
    },
  ];
}

export default react;
