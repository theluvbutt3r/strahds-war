/**
 * dependency-cruiser — the third boundary mechanism, and the only one that catches the
 * failure mode PLAN.md §3 actually names: circular dependencies. Cycles are the concrete
 * way "editing one thing breaks everything" happens, and neither pnpm's manifests nor
 * ESLint's layering rules see them.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "A cycle means these modules are really one module with extra steps, and the blast radius of a change stops being knowable.",
      from: {},
      to: { circular: true },
    },
    {
      name: "db-only-from-api",
      severity: "error",
      comment:
        "Only services/api may import @sw/db. The web app holds no database credentials by design — this is what makes spoiler enforcement one auditable chokepoint. See PLAN.md §4.",
      from: { pathNot: "^(services/api|packages/db)/" },
      to: { path: "^packages/db/" },
    },
    {
      name: "no-orm-outside-db",
      severity: "error",
      comment:
        "Drizzle and raw Postgres clients belong behind @sw/db, which lives behind services/api.",
      from: { pathNot: "^(packages/db|services/api)/" },
      to: { path: "node_modules/(drizzle-orm|drizzle-kit|pg|postgres)/" },
    },
    {
      name: "nothing-depends-on-apps",
      severity: "error",
      comment: "Apps are leaves. If something needs code from an app, it belongs in a package.",
      from: { pathNot: "^apps/" },
      to: { path: "^apps/" },
    },
    {
      name: "nothing-depends-on-services",
      severity: "error",
      comment: "Services are leaves too — share code via packages/, not by reaching into the API.",
      from: { pathNot: "^services/" },
      to: { path: "^services/" },
    },
    {
      name: "pure-packages-stay-pure",
      severity: "error",
      comment:
        "@sw/schemas and @sw/design-tokens are layer 0. Their whole value is that they depend on nothing and are therefore safe to change.",
      from: { path: "^packages/(schemas|design-tokens)/" },
      to: { path: "^packages/(?!(schemas|design-tokens)/)" },
    },
    {
      name: "authz-has-no-io",
      severity: "error",
      comment:
        "@sw/authz must stay a pure function of its arguments — that is what makes the permission matrix exhaustively testable.",
      from: { path: "^packages/authz/" },
      to: {
        path: "node_modules/(drizzle-orm|pg|postgres|axios|node-fetch)/|^node:(fs|net|http|https|child_process)",
      },
    },
    {
      name: "no-view-layer-in-api",
      severity: "error",
      comment:
        "The API must not depend on React. That coupling is what would force the mobile app and the web app to deploy in lockstep — the thing a documented HTTP contract exists to avoid.",
      from: { path: "^(services/|packages/(schemas|authz|db|api-client))/" },
      to: { path: "node_modules/(react|react-dom|next)/" },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "Production code importing a devDependency breaks the moment it is deployed.",
      from: {
        path: "^(apps|services|packages)/",
        // Tests, build scripts and tool configs never ship, so a devDependency is
        // exactly what they should be using.
        pathNot: "\\.(test|spec)\\.(ts|tsx)$|\\.config\\.(ts|js|mjs|cjs)$|/build\\.ts$",
      },
      // `npm-peer` is excluded because a peer dependency is not a dev-only dependency: the
      // consuming app supplies it at runtime, which is the entire contract. packages/ui lists
      // react in BOTH peerDependencies (what apps/web must provide) and devDependencies (so
      // the package can typecheck and run Storybook on its own) — the standard shape for a
      // component library, and dependency-cruiser reports both types for it. Without this,
      // the first component to import a React *value* rather than a type trips the rule.
      //
      // The protection is intact, and that was checked rather than assumed: react reports
      // dependencyTypes ["npm-dev","npm-peer","import"] and is now allowed, while a runtime
      // import of @playwright/test from apps/web reports ["npm-dev","import"] and is still
      // rejected. Only a declared peer gets through.
      //
      // Worth knowing while you are in here: this rule can only judge imports the resolver
      // below actually resolves, and it silently drops the ones it cannot. `vite`,
      // `vitest` and `@vitejs/plugin-react` never appear in the graph at all, so a runtime
      // import of any of them from shipping source would pass unnoticed. That is a
      // pre-existing gap in `enhancedResolveOptions`, not a consequence of this exemption.
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only", "npm-peer"],
      },
    },
    {
      name: "no-deprecated-core",
      severity: "warn",
      from: {},
      to: { dependencyTypes: ["core"], path: "^(punycode|domain|sys)$" },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    // NOTE: the boundary fixtures written by scripts/verify-boundaries.ts are deliberately
    // NOT excluded here. They are written into the real package directories precisely so
    // that this cruise sees them and rejects them — excluding them would turn Mechanism 3
    // into a check that always passes. (An earlier version of this config excluded a
    // `scripts/__boundary-fixtures__/` path that has never existed; it was harmless but
    // read as though fixtures were being skipped, which is the opposite of the design.)
    // Build output only. Every exclusion here is a directory a bundler wrote — the source
    // that produced it is still cruised, so no rule is weakened by any of them.
    // `storybook-static/` joins the list for the same reason `dist/` is on it: bundled
    // vendor code is full of legitimate cycles that say nothing about our layering.
    exclude: {
      path: "(\\.test\\.(ts|tsx)$|\\.spec\\.(ts|tsx)$|/e2e/|/dist/|/\\.next/|/coverage/|/storybook-static/)",
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      // Workspace packages export TypeScript source under the "types"/"default"
      // conditions, so both must be present or @sw/* resolves to nothing and every
      // rule below silently passes.
      conditionNames: ["import", "require", "node", "types", "default"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
