import { type StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * Storybook runs over @sw/ui rather than over the Next app.
 *
 * The point is to review a component without a page, a session or an API around it — so it
 * lives with the components, and it builds with Vite rather than dragging Next's build into
 * the loop. What it must not become is a second styling environment: it imports the same
 * generated theme and the same base.css the web app does, so "looks right in Storybook" and
 * "looks right in the product" cannot drift apart.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  addons: [
    // Runs axe against every story as you view it. It cannot check what the contrast test
    // in @sw/design-tokens checks — that one proves the *tokens* are sound, this one
    // catches a component that reached past them, or a missing label on an icon button.
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  // Matches the posture the CI workflow already takes with TURBO_TELEMETRY_DISABLED and
  // DO_NOT_TRACK: no build tool in this repo phones home about a private campaign wiki.
  core: { disableTelemetry: true },

  viteFinal(viteConfig) {
    // Tailwind v4 is a Vite plugin here and a PostCSS plugin in the Next app. Different
    // wiring, same compiler and the same @theme block — the app has a PostCSS pipeline
    // already and Storybook does not, so each uses whichever costs less config.
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
