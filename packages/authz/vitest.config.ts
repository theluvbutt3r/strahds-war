import { baseConfig } from "@sw/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

/**
 * @sw/authz sets coverage thresholds where no other package does, as anticipated by the
 * comment in tooling/vitest-config.
 *
 * The justification is specific rather than a general belief in high coverage numbers:
 * this package is pure, it is small, and every branch in it is a decision about who may
 * read campaign secrets. An uncovered branch here is not a gap in test discipline, it is
 * a row of the permission matrix nobody checked — and the matrix is exactly the artefact
 * whose value depends on being complete.
 *
 * 100% is reachable precisely because the package has no I/O to mock. If a future change
 * makes it unreachable, that is a signal the change does not belong in this package.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  }),
);
