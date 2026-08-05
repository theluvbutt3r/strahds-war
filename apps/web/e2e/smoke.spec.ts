import { expect, test } from "@playwright/test";

test("the app boots and renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("STRAHD");
});

test("nothing is marked indexable", async ({ page }) => {
  // The wiki is login-gated (ADR 0002). A crawler indexing an entity title would be a
  // spoiler on its own, so this asserts the meta tag survives future layout edits.
  await page.goto("/");
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
});
