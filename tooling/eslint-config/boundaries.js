import boundaries from "eslint-plugin-boundaries";

/**
 * PLAN.md §4's dependency rule, as executable policy.
 *
 * "`apps` and `services` may depend on `packages`; `packages` may depend on packages below
 *  them in the list; nothing ever depends on an app."
 *
 * Layers, lowest first. A package may only import from strictly lower layers.
 * `schemas` and `design-tokens` sit at the bottom and import nothing internal at all,
 * which is what keeps them trivially testable.
 *
 *   0  schemas · design-tokens      pure data shapes and constants
 *   1  authz                        pure functions over schemas — no I/O, ever
 *   2  db · api-client              I/O against Postgres / the HTTP API
 *   3  content-render               editor JSON -> output
 *   4  ui                           React components
 *   5  editor                       TipTap, builds on ui
 *
 * The load-bearing rule is DB_RESTRICTED below: only `services/api` may import `@sw/db`.
 * That is what makes spoiler enforcement one auditable chokepoint instead of a property
 * you have to re-verify in every component.
 *
 * This is the second of three independent enforcement mechanisms. The others are pnpm
 * manifests (an undeclared workspace import does not resolve) and dependency-cruiser
 * (declared-but-forbidden edges, plus cycles). Boundary enforcement that rests on a single
 * mechanism tends to quietly stop working; scripts/verify-boundaries.ts writes deliberately
 * illegal code and asserts all three still bite.
 *
 * Syntax note: this uses eslint-plugin-boundaries v7's object selectors (`policies`,
 * `from.element`, `captured`). The v5 shorthand — `rules` with `["pkg", { name: "..." }]`
 * tuples — still parses but is silently downgraded, so the rules stop matching while
 * appearing to be configured. Keep this file on the object form.
 */

/** Package names as a micromatch brace alternation, e.g. "{schemas,design-tokens}". */
const anyOf = (...names) => `{${names.join(",")}}`;

// Note that `db` never appears in another package's allow-list, including packages
// nominally above it. Only `services` may reach it. Layering alone would let ui import
// db as a "lower" layer, which is precisely the edge that must not exist.
const LAYER_0 = ["schemas", "design-tokens"];
const LAYER_1 = [...LAYER_0, "authz"];
const LAYER_2 = [...LAYER_1, "api-client"];
const LAYER_3 = [...LAYER_2, "content-render"];
const LAYER_4 = [...LAYER_3, "ui"];

/** Everything an app may touch: all packages except the database layer. */
const APP_ALLOWED = [
  "schemas",
  "design-tokens",
  "authz",
  "api-client",
  "content-render",
  "ui",
  "editor",
];

/** A policy allowing element `type`+`name` to import any of `targets`. */
const allowPkgs = (from, targets, message) => ({
  from,
  allow: { to: { element: { type: "pkg", captured: { name: anyOf(...targets) } } } },
  ...(message ? { message } : {}),
});

const fromPkg = (names) => ({ element: { type: "pkg", captured: { name: anyOf(...names) } } });

export const boundariesConfig = [
  {
    files: ["apps/**/*.{ts,tsx}", "services/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      // The plugin resolves imports through eslint-module-utils, which reads this key.
      // Its default only knows .js/.json, so a relative reach like "../../db/src/index"
      // resolves to nothing and the layering rules never see the edge — the exact bypass
      // that walks around pnpm's manifests. The bundled node resolver handles it once it
      // is told which extensions exist.
      "import/resolver": {
        node: { extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] },
      },
      "boundaries/include": ["apps/**/*", "services/**/*", "packages/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "apps/*", capture: ["name"] },
        { type: "service", pattern: "services/*", capture: ["name"] },
        { type: "pkg", pattern: "packages/*", capture: ["name"] },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "{{file.type}} '{{file.name}}' may not import {{dependency.type}} '{{dependency.name}}' — see PLAN.md §4 and tooling/eslint-config/boundaries.js",
          policies: [
            // --- Apps: every package except the database layer ------------------
            allowPkgs({ element: { type: "app" } }, APP_ALLOWED),

            // --- Services: everything, including db -----------------------------
            {
              from: { element: { type: "service" } },
              allow: { to: { element: { type: "pkg" } } },
            },

            // --- Packages: strictly downward ------------------------------------
            allowPkgs(fromPkg(["authz"]), LAYER_0),
            allowPkgs(fromPkg(["db", "api-client"]), LAYER_1),
            // content-render and above deliberately do NOT get `db`, even though it is
            // a lower layer — see the note on the layer constants.
            allowPkgs(fromPkg(["content-render"]), LAYER_2),
            allowPkgs(fromPkg(["ui"]), LAYER_3),
            allowPkgs(fromPkg(["editor"]), LAYER_4),

            // Layer 0 gets no allow policy at all, so the `default: "disallow"` above
            // catches it. Spelled out explicitly for the error message.
            {
              from: fromPkg(LAYER_0),
              disallow: { to: { element: { type: "pkg" } } },
              message:
                "'{{file.name}}' is a layer-0 package and must stay pure — it may not import any other @sw package. Its value is that it depends on nothing and is therefore safe to change.",
            },
          ],
        },
      ],
    },
  },

  // --- Import restrictions by scope --------------------------------------------
  //
  // `no-restricted-imports` rather than boundaries/external: these are mostly
  // node_modules specifiers, the messages carry more context, and keeping them in core
  // ESLint means they survive a boundaries upgrade.
  //
  // THE SCOPES BELOW MUST NOT OVERLAP. Flat config replaces a rule's options wholesale
  // when a later config object names the same rule — it does not merge them. Two blocks
  // both matching packages/authz would mean the second silently disables the first, and
  // the rule appears configured while catching nothing. Each package appears exactly
  // once; add to an existing scope rather than writing a new block for it.
  //
  // Deep-import protection is absent because it is already physical: every package's
  // `exports` map declares "." and nothing else, so `@sw/ui/src/internal` does not
  // resolve at all.
  //
  // The @sw/* entries duplicate what boundaries/dependencies covers, on purpose. That
  // rule only fires on dependencies it can resolve, and an import of an undeclared
  // workspace package resolves to nothing — so the layering violation that matters most
  // (reaching for a package you were never given) is exactly the one it cannot see.
  {
    // Layer 0 — pure, depends on nothing.
    files: ["packages/schemas/**/*.{ts,tsx}", "packages/design-tokens/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Default-deny with two named exceptions, rather than an allow-list of
              // banned packages: a package added to the repo next year must be denied
              // here by default, which an enumeration would not do.
              //
              // The exceptions are the two `tooling/` configs. They are build-time only —
              // never imported by anything under src/, never present in a published
              // artifact — so they do not touch the "depends on nothing at runtime"
              // property this rule exists to protect. Excluding them by name is what
              // keeps the glob applicable to every file in the package (including
              // vitest.config.ts) instead of having to exempt whole directories.
              group: ["@sw/*", "!@sw/tsconfig", "!@sw/vitest-config"],
              message:
                "Layer-0 packages (@sw/schemas, @sw/design-tokens) must import no other @sw package. Their value is that they depend on nothing and are therefore safe to change — see PLAN.md §4.",
            },
            {
              group: ["react", "react-dom", "next", "next/*", "drizzle-orm*", "pg", "postgres"],
              message: "Layer-0 packages are plain data shapes — no framework, no I/O.",
            },
          ],
        },
      ],
    },
  },
  {
    // Layer 1 — pure policy over layer 0.
    files: ["packages/authz/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@sw/db", "@sw/api-client", "@sw/ui", "@sw/editor", "@sw/content-render"],
              message:
                "@sw/authz sits at layer 1 and may only import @sw/schemas — see PLAN.md §4.",
            },
            {
              group: [
                "react",
                "react-dom",
                "next",
                "next/*",
                "node:fs",
                "node:net",
                "node:http*",
                "node:child_process",
                "drizzle-orm*",
                "pg",
                "postgres",
                "axios",
              ],
              message:
                "@sw/authz must stay free of I/O and framework imports. Its whole value is that the permission matrix is exhaustively unit-testable — a database call or a React import here ends that.",
            },
          ],
        },
      ],
    },
  },
  {
    // Layer 2 and the API — data access, no view layer.
    files: [
      "packages/db/**/*.{ts,tsx}",
      "packages/api-client/**/*.{ts,tsx}",
      "services/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*", "@sw/ui", "@sw/editor"],
              message:
                "The API and the data packages must not depend on the view layer — that coupling is what would force the mobile app and the web app to deploy in lockstep, which is the thing a documented HTTP contract exists to avoid.",
            },
          ],
        },
      ],
    },
  },
  {
    // Everything that renders — apps and the view packages. No database, ever.
    files: [
      "apps/**/*.{ts,tsx}",
      "packages/ui/**/*.{ts,tsx}",
      "packages/editor/**/*.{ts,tsx}",
      "packages/content-render/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@sw/db", "@sw/db/*", "drizzle-orm", "drizzle-orm/*", "pg", "postgres"],
              message:
                "DB_RESTRICTED: only services/api may import @sw/db or talk to Postgres. The web app holds no database credentials by design — route this through @sw/api-client so visibility filtering stays a single server-side chokepoint. See PLAN.md §4.",
            },
          ],
        },
      ],
    },
  },
];

export default boundariesConfig;
