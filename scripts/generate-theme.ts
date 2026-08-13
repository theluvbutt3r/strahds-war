/**
 * Generates `packages/design-tokens/theme.css` from the TypeScript tokens.
 *
 * ## Why generate rather than hand-write
 *
 * Tailwind v4 has no JavaScript config file — the theme is a CSS `@theme` block, and the
 * tokens are TypeScript, because Storybook, a future React Native StyleSheet and the
 * contrast test all need to read them as data. Something has to bridge the two, and the
 * only question is whether the CSS is written by hand or derived.
 *
 * Hand-written means two sources of truth for the same eleven-plus hexes, and the failure
 * is silent: the contrast test would keep passing against the TypeScript while the site
 * rendered whatever the CSS said. So the CSS is generated, committed, and checked — the
 * same shape as the Drizzle migrations, and for the same reason.
 *
 *     pnpm theme         rewrite the file after editing tokens
 *     pnpm theme:check   fail if the committed file is stale (runs inside `pnpm verify`)
 *
 * ## Why this lives in scripts/ and not in the package
 *
 * `@sw/design-tokens` is layer 0: plain data, no I/O, no imports. A generator that writes
 * files does not belong inside it. Root scripts sit outside `boundaries/include`, so this
 * is the one place that can read a package and write to disk without weakening that rule.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BORDER_WIDTHS,
  BREAKPOINTS,
  DURATIONS,
  EASINGS,
  FOG,
  FONT_CSS_VARIABLES,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  GRAIN,
  LETTER_SPACING,
  MEASURE,
  PALETTE,
  RADII,
  REDUCED_MOTION_DURATION,
  SEMANTIC,
  SPACING,
  TYPE_SCALE,
  VIGNETTE,
  Z_INDEX,
} from "@sw/design-tokens";

const OUTPUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "design-tokens",
  "theme.css",
);

/** kebab-cases a token key so `mistLit` becomes the CSS-idiomatic `mist-lit`. */
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** Quotes a font family name only when CSS requires it — i.e. when it contains a space. */
function quoteFamily(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name;
}

/**
 * A font stack whose first entry defers to the loaded webfont.
 *
 * `var(--font-inter, Inter)` resolves to whatever `next/font` published if the app
 * configured it, and to the bare family name otherwise. That single expression is what
 * lets the same generated CSS serve the Next app, where the faces are self-hosted, and
 * Storybook, where they are not.
 */
function fontStack(family: keyof typeof FONT_FAMILIES): string {
  const [primary, ...fallbacks] = FONT_FAMILIES[family];
  const variable = FONT_CSS_VARIABLES[family];
  return [`var(${variable}, ${quoteFamily(primary)})`, ...fallbacks.map(quoteFamily)].join(", ");
}

/**
 * The parchment grain, as an inline SVG data URI.
 *
 * Generated rather than checked in as a file for the usual reason — the speckle colour and
 * peak alpha are tokens, and a hand-drawn PNG would drift from them silently. It is also
 * about 400 bytes this way, against several KB for a noise bitmap, and it stays crisp at
 * any device pixel ratio.
 *
 * `feTurbulence` makes the noise; `feColorMatrix` throws away its colour and rebuilds it as
 * flat `mist` whose *alpha* is driven by the noise. The alpha row is scaled so the loudest
 * speckle lands exactly on GRAIN.peakAlpha, and offset so only the top ~45% of noise values
 * are visible at all — without that threshold the result is a uniform wash rather than
 * grain.
 */
function grainImage(): string {
  const [r, g, b] = [
    ((Number.parseInt(PALETTE[GRAIN.color].slice(1), 16) >> 16) & 0xff) / 255,
    ((Number.parseInt(PALETTE[GRAIN.color].slice(1), 16) >> 8) & 0xff) / 255,
    (Number.parseInt(PALETTE[GRAIN.color].slice(1), 16) & 0xff) / 255,
  ].map((value) => value.toFixed(3));

  // Only noise above this level produces any speckle at all.
  const threshold = 0.55;
  const scale = GRAIN.peakAlpha / (1 - threshold);
  const offset = -(scale * threshold);

  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN.tileSize}' height='${GRAIN.tileSize}'>`,
    `<filter id='g' x='0' y='0' width='100%' height='100%'>`,
    `<feTurbulence type='fractalNoise' baseFrequency='${GRAIN.baseFrequency}' numOctaves='4' stitchTiles='stitch'/>`,
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${scale.toFixed(4)} 0 0 0 ${offset.toFixed(4)}'/>`,
    `</filter>`,
    `<rect width='100%' height='100%' filter='url(#g)'/>`,
    `</svg>`,
  ].join("");

  // `<`, `>` and `#` are the characters that end a CSS url() early or start a fragment.
  const encoded = svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23");
  return `url("data:image/svg+xml,${encoded}")`;
}

function section(title: string, lines: string[]): string {
  // Blank separators stay genuinely blank rather than becoming two spaces. An editor or
  // pre-commit hook that trims trailing whitespace would otherwise "change" the file and
  // make `pnpm theme:check` fail on a tree nobody touched.
  const indent = (line: string) => (line === "" ? "" : `  ${line}`);
  return [`  /* ${title} */`, ...lines.map(indent), ""].join("\n");
}

/**
 * Tailwind's `--spacing` is a single base value it multiplies to build the whole numeric
 * scale, so `p-6` is `calc(var(--spacing) * 6)`. Our SPACING map is exactly n/4 rem — an
 * invariant `space.test.ts` asserts step by step — which means emitting the base value
 * reproduces every entry and also gives us the steps we never bothered to name.
 */
const SPACING_BASE = "0.25rem";

function buildThemeBlock(): string {
  const colors = [
    // Clearing a namespace with `initial` drops Tailwind's defaults before ours land.
    // Without it `bg-blue-500` and `bg-white` keep working, and a palette nobody chose is
    // one autocomplete away in every component. The Barovian set is the whole set.
    "--color-*: initial;",
    "",
    ...Object.entries(PALETTE).map(([name, hex]) => `--color-${kebab(name)}: ${hex};`),
    "",
    "/* Semantic roles — what a colour is FOR. Components should reach for these. */",
    ...Object.entries(SEMANTIC).map(
      ([role, color]) => `--color-${kebab(role)}: ${PALETTE[color]}; /* ${color} */`,
    ),
  ];

  const fonts = [
    "--font-*: initial;",
    "",
    "/* Each stack leads with the next/font variable and falls back to the plain family",
    "   name, so the loaded webfont wins where one is configured and the CSS still names",
    "   a real typeface where one is not — Storybook, for instance, loads no fonts. */",
    // `--font-sans` is what Tailwind's preflight applies to <body>, so mapping the UI face
    // onto it makes Inter the default and leaves prose to opt in with `font-serif`.
    `--font-sans: ${fontStack("ui")};`,
    `--font-serif: ${fontStack("body")};`,
    `--font-mono: ${fontStack("mono")};`,
    `--font-display: ${fontStack("display")};`,
    "",
    ...Object.entries(FONT_WEIGHTS).map(([name, weight]) => `--font-weight-${name}: ${weight};`),
  ];

  const text = [
    "--text-*: initial;",
    "",
    ...Object.entries(TYPE_SCALE).flatMap(([name, step]) => [
      `--text-${name}: ${step.size};`,
      `--text-${name}--line-height: ${step.lineHeight};`,
    ]),
  ];

  const tracking = [
    "--tracking-*: initial;",
    "",
    ...Object.entries(LETTER_SPACING).map(([name, value]) => `--tracking-${name}: ${value};`),
  ];

  const layout = [
    `--spacing: ${SPACING_BASE};`,
    "",
    "--radius-*: initial;",
    ...Object.entries(RADII).map(([name, value]) => `--radius-${name}: ${value};`),
    "",
    "--breakpoint-*: initial;",
    ...Object.entries(BREAKPOINTS).map(([name, value]) => `--breakpoint-${name}: ${value};`),
    "",
    // The `--container-*` namespace drives max-w-*, so this is `max-w-measure`.
    `--container-measure: ${MEASURE};`,
  ];

  const motion = [
    "--ease-*: initial;",
    ...Object.entries(EASINGS).map(([name, curve]) => `--ease-${name}: ${curve};`),
    "",
    // Tailwind has no `--duration-*` theme namespace, so these are plain custom properties
    // that `duration-[var(--duration-base)]` and hand-written CSS can both read.
    ...Object.entries(DURATIONS).map(([name, value]) => `--duration-${name}: ${value};`),
    "",
    "/* What a bare `transition` utility uses when nothing overrides it. */",
    "--default-transition-duration: var(--duration-quick);",
    "--default-transition-timing-function: var(--ease-standard);",
  ];

  return [
    "@theme {",
    section("Palette", colors),
    section("Typefaces and weights", fonts),
    section("Type scale", text),
    section("Letter spacing", tracking),
    section("Spacing, radii, breakpoints, measure", layout),
    section("Motion", motion),
  ]
    .join("\n")
    .replace(/\n+$/, "\n")
    .concat("}\n");
}

function buildRootBlock(): string {
  const lines = [
    "  /* Atmosphere (PLAN.md §6). Neither the grain nor the fog may lighten its surface",
    "     past `stone`, which every text colour is already measured against — that ceiling",
    "     is what sets both alphas, and texture.test.ts enforces it. Retuning these values",
    "     here rather than in the tokens puts them outside that check. */",
    `  --grain-image: ${grainImage()};`,
    `  --vignette-strength: ${VIGNETTE.strength};`,
    `  --fog-color: ${PALETTE[FOG.color]}; /* ${FOG.color} */`,
    `  --fog-peak-alpha: ${FOG.peakAlpha};`,
    `  --fog-blur: ${FOG.blur};`,
    `  --fog-drift-duration: ${FOG.driftDuration};`,
    "",
    "  /* Stacking order. Tailwind has no theme namespace for z-index, so these are read",
    "     as `z-[var(--z-modal)]` rather than as generated utilities. */",
    ...Object.entries(Z_INDEX).map(([name, value]) => `  --z-${kebab(name)}: ${value};`),
    "",
    "  /* Border widths, for hand-written CSS. Tailwind's border-2 covers the utility case. */",
    ...Object.entries(BORDER_WIDTHS).map(([name, value]) => `  --border-${name}: ${value};`),
    "",
    "  /* Named spacing steps, for CSS that cannot use a utility class. */",
    ...Object.entries(SPACING).map(([step, value]) => `  --space-${step}: ${value};`),
  ];

  return ["", ":root {", ...lines, "}", ""].join("\n");
}

/**
 * The reduced-motion override ships with the tokens rather than with each consumer.
 *
 * It is policy rather than data, so it is a judgement call — but the alternative is
 * repeating it in the web app and again in Storybook, and a preference this important
 * should not depend on every consumer remembering. Anything that opts out of it has to do
 * so deliberately.
 */
function buildReducedMotionBlock(): string {
  return [
    "",
    "@media (prefers-reduced-motion: reduce) {",
    "  *,",
    "  *::before,",
    "  *::after {",
    `    animation-duration: ${REDUCED_MOTION_DURATION} !important;`,
    "    animation-iteration-count: 1 !important;",
    `    transition-duration: ${REDUCED_MOTION_DURATION} !important;`,
    "    scroll-behavior: auto !important;",
    "  }",
    "}",
    "",
  ].join("\n");
}

function render(): string {
  const banner = [
    "/*",
    " * GENERATED FILE — do not edit.",
    " *",
    " * Written by scripts/generate-theme.ts from the TypeScript tokens in this package.",
    " * Edit src/*.ts and run `pnpm theme`; `pnpm verify` fails if this file is stale.",
    " *",
    " * Consumers import it once, after Tailwind:",
    " *",
    ' *   @import "tailwindcss";',
    ' *   @import "@sw/design-tokens/theme.css";',
    " */",
    "",
  ].join("\n");

  return banner + buildThemeBlock() + buildRootBlock() + buildReducedMotionBlock();
}

const generated = render();
const checking = process.argv.includes("--check");

if (checking) {
  let committed: string;
  try {
    committed = readFileSync(OUTPUT, "utf8");
  } catch {
    console.error("theme.css is missing. Run `pnpm theme`.");
    process.exit(1);
  }

  // Compared with line endings normalised, because .gitattributes checks the tree out as
  // LF while a Windows editor may well write CRLF. A whitespace-only difference here is
  // not staleness and should not fail the build.
  if (committed.replace(/\r\n/g, "\n") !== generated) {
    console.error(
      "theme.css is out of date with the tokens in packages/design-tokens/src.\n" +
        "Run `pnpm theme` and commit the result.",
    );
    process.exit(1);
  }

  console.log("theme.css is up to date with the tokens.");
} else {
  writeFileSync(OUTPUT, generated, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`);
}
