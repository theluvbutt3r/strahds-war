import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

/**
 * Both shared Vitest configs live in one module deliberately.
 *
 * Vite loads a vitest.config.ts by bundling it, but externalises anything resolved
 * through node_modules — which every workspace package is, via pnpm's symlinks. A
 * relative `./base` import inside this package therefore gets handed to Node's ESM
 * resolver at runtime, where it fails: there is no extensionless file, and Node will
 * not apply TypeScript resolution on our behalf. Keeping it to a single file with no
 * internal imports sidesteps that entirely.
 */

/**
 * Node-environment defaults for pure packages (schemas, authz, db, api-client).
 *
 * Coverage thresholds are deliberately absent here; `packages/authz` will set its own
 * in Phase 1, because it is pure, small, and security-critical — a gap in its coverage
 * is a gap in the permission matrix.
 */
export const baseConfig = defineConfig({
  test: {
    environment: "node",
    globals: false,
    clearMocks: true,
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/**/index.ts"],
    },
  },
});

/** For packages that render components: ui, editor, content-render, web. */
export const reactConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/index.ts"],
      },
    },
  }),
);
