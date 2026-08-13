/**
 * @sw/design-tokens — the Barovian palette, type scale, spacing and motion, as plain data.
 *
 * Layer 0 and framework-agnostic on purpose: Tailwind's `@theme` block, raw CSS, Storybook
 * and a future React Native StyleSheet all read the same values, so the phone app cannot
 * drift from the web app's colours. Nothing here imports anything.
 *
 * The one rule worth knowing before using it: **a colour is either a text colour or a fill
 * colour, and the type system enforces which.** `blood`, `ember`, `moss`, `arcane`, `danger`
 * and `mist` are all too dark to read words on top of a dark surface — see the note in
 * `color.ts` for the measurements. Reach for `SEMANTIC` roles rather than raw hues and the
 * question does not come up.
 */

export {
  type ColorName,
  type ColorPair,
  type FillColor,
  FILL_COLORS,
  PALETTE,
  SEMANTIC,
  type SemanticRole,
  SHIPPED_PAIRS,
  type SurfaceColor,
  SURFACE_COLORS,
  type TextColor,
  TEXT_COLORS,
} from "./color";

export {
  AA_BODY_TEXT,
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  blend,
  contrastRatio,
  meetsContrast,
  relativeLuminance,
} from "./contrast";

export { FOG, GRAIN, VIGNETTE } from "./texture";

export {
  FONT_CSS_VARIABLES,
  type FontFamily,
  FONT_FAMILIES,
  type FontWeight,
  FONT_WEIGHTS,
  LETTER_SPACING,
  MEASURE,
  TYPE_SCALE,
  type TypeStep,
  type TypeStepName,
} from "./typography";

export {
  BORDER_WIDTHS,
  type Breakpoint,
  BREAKPOINTS,
  type Radius,
  RADII,
  SPACING,
  type SpacingStep,
  Z_INDEX,
  type ZIndexLayer,
} from "./space";

export { type Duration, DURATIONS, type Easing, EASINGS, REDUCED_MOTION_DURATION } from "./motion";
