import { build } from "esbuild";

/**
 * Bundles the API to a single file for deployment.
 *
 * Uses esbuild's JS API rather than its CLI on purpose. pnpm generates `.bin` shims at
 * link time, but esbuild's postinstall then replaces `bin/esbuild` with a native Go
 * binary — leaving a shim that tries to run a Mach-O executable through `node`. The JS
 * API sidesteps that whole ordering problem, and it gives the bundling decisions
 * somewhere to be explained.
 *
 * Workspace packages ship TypeScript source rather than a built dist/, so they must be
 * bundled in rather than left external — there is no compiled @sw/db on disk to require
 * at runtime.
 */
await build({
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  minify: false, // Stack traces from a 1am production incident should be readable.

  // A few dependencies ship optional native bindings that a bundler cannot inline.
  // Keep the list short and justified; anything here must exist in node_modules at
  // runtime, which means it also has to be in `dependencies`, not `devDependencies`.
  //
  // Empty on purpose. `pg-native` used to be listed here, and it broke that rule: it was
  // externalised without being a dependency, so had anything ever reached for it esbuild
  // would have left the require in place and the process would have failed at startup in
  // production rather than at build time here. Nothing pulls a Postgres driver yet. Add
  // the entry and the dependency together, in the same commit, when one arrives.
  external: [],

  // ESM output that transitively pulls in a CJS dependency still needs `require`.
  banner: {
    js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },

  logLevel: "info",
});
