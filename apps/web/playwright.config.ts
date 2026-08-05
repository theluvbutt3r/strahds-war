import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Phase 0 ships the harness with one smoke test. The suite that matters is the
 * spoiler-leak suite in Phase 6 (docs/PLAN.md §10): sign in as each of the five roles,
 * crawl every page, and assert no higher-clearance content appears in any response
 * *body* — not merely that the UI hides it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Serialised in CI to keep the runner from thrashing; locally Playwright's own
  // default (half the cores) is better than anything we'd hardcode. Spread rather
  // than `: undefined` because exactOptionalPropertyTypes rejects the latter.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Players read this on a phone at the table, so mobile is a first-class target,
    // not an afterthought checked once before release.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // `next start`, which requires an existing production build. The `test:e2e` script
    // runs `next build` first for that reason — invoking playwright directly on a clean
    // tree fails here with a server-did-not-start timeout that says nothing about the
    // actual cause. Use `test:e2e:only` to skip the build when one already exists.
    command: "pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
