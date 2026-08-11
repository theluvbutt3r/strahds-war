import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import turbo from "eslint-plugin-turbo";
import globals from "globals";
import tseslint from "typescript-eslint";

import {
  ALL_RESTRICTED_SYNTAX,
  NO_DIRECT_ROLE_COMPARISON,
  ROLE_LITERAL_EXEMPT_FILES,
} from "./restricted-syntax.js";

/**
 * Rules that apply to every line of TypeScript in the repo, regardless of runtime.
 *
 * Deliberately not type-aware (no `projectService`) — type-aware linting roughly triples
 * lint time and the rules we actually depend on for correctness here are structural, not
 * type-driven. `tsc --noEmit` already runs per package in the `typecheck` task and catches
 * everything a type-aware rule would.
 */
export const base = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "import-x": importX, turbo },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: ["tsconfig.json", "*/*/tsconfig.json"],
          // One tsconfig per workspace is the point of the layout; the resolver's
          // suggestion to consolidate into project references would undo it.
          noWarnOnMultipleProjects: true,
        }),
      ],
    },
    rules: {
      // Turborepo: using an env var the task graph doesn't declare produces
      // silently-wrong cache hits. This is the rule that prevents that class of bug.
      "turbo/no-undeclared-env-vars": "error",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",

      "import-x/no-cycle": ["error", { maxDepth: Infinity }],
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          pathGroups: [{ pattern: "@sw/**", group: "internal", position: "before" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Spoiler safety, as a lint rule. Authorization decisions are made by `can()` in
      // @sw/authz — a bare role comparison is how a permission check silently stops
      // matching the matrix when a sixth role is added.
      //
      // Spread from ./restricted-syntax.js rather than written inline. That file explains
      // why: flat config replaces this rule's options wholesale, so an inline literal in
      // any other config block would delete these selectors without any sign that it had.
      "no-restricted-syntax": ["error", ...ALL_RESTRICTED_SYNTAX],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "error",
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "warn",
      // Tests legitimately reach for `any` when constructing bad input on purpose.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  {
    files: ["**/*.config.{ts,js,mjs,cjs}", "scripts/**/*.ts", "tooling/**/*.js"],
    rules: {
      "no-console": "off",
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  {
    // Process entry points may log lifecycle events at info level.
    //
    // The default allow-list is warn/error, which is right for library and request-path
    // code but wrong here: "listening on :3001" and "drained cleanly" are neither
    // warnings nor errors, and the only way to emit them under the default was
    // `console.warn`, which is what the original server.ts did. Mislabelled levels are
    // worse than no rule — they train you to ignore warnings. Phase 6 replaces this with
    // pino (PLAN.md §10); until then, let the level be honest.
    // `*-cli.ts` is included on the same reasoning: a seed script that reports what it
    // wrote is a process entry point announcing a lifecycle event, not a library logging
    // from the request path. The alternative was `console.warn("Seeded 18 entities")`,
    // which is precisely the mislabelling this exemption exists to avoid.
    files: ["services/*/src/server.ts", "packages/*/src/*-cli.ts"],
    rules: {
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
    },
  },
  prettier,
);

/**
 * Lifts the literal-based role selectors for the few files that must name roles.
 *
 * MUST BE APPENDED LAST in the root config — after `nextConfig(...)` — because it works by
 * redeclaring `no-restricted-syntax` with a narrower set, and flat config resolves that by
 * last-one-wins. Placed earlier, a later block covering the same file would put the full
 * set back and the exemption would silently not apply.
 *
 * Note what is *not* lifted: `NO_DIRECT_ROLE_COMPARISON` stays on. Even the permission
 * matrix may name roles only as data — never as `actor.role === "overlord"`.
 */
export const roleLiteralExemptions = [
  {
    files: ROLE_LITERAL_EXEMPT_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...NO_DIRECT_ROLE_COMPARISON],
    },
  },
];

export default base;
