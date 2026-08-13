/**
 * Tailwind v4 runs as a PostCSS plugin, and that is the whole build config — there is no
 * `tailwind.config.js` in v4. The theme lives in CSS, in the `@theme` block that
 * `scripts/generate-theme.ts` writes from the TypeScript tokens.
 *
 * No autoprefixer: Tailwind v4 handles vendor prefixing itself, and adding it back makes
 * the two fight over the same declarations.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
