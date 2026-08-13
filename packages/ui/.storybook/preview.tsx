import { type Preview } from "@storybook/react-vite";

import "./preview.css";

/**
 * Storybook has no light mode here, and that is deliberate.
 *
 * §6: "Dark-mode-first. Not a dark variant of a light theme — the light theme, if we build
 * one, is the afterthought." Offering a light background toggle would invite reviewing
 * components against a surface the product does not have.
 */
const preview: Preview = {
  parameters: {
    // The background comes from base.css painting `body` in `void`. Storybook's own
    // backgrounds addon would paint over it with its default white.
    backgrounds: { disable: true },

    layout: "centered",

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // Report violations in the panel rather than failing the story. A hard failure here
      // would be the wrong lever: the contrast guarantee is enforced by the unit test in
      // @sw/design-tokens, which runs in CI and cannot be skipped by not opening a story.
      test: "todo",
    },
  },
};

export default preview;
