/**
 * Spacing, radii and breakpoints.
 *
 * All spacing is a multiple of 4px expressed in `rem`. The grid matters more than the
 * individual values: when every gap is a multiple of one unit, things line up without
 * anyone measuring, and "this looks slightly off" stops being a design conversation.
 */
export const SPACING = {
  0: "0",
  /** 4px — icon-to-label, the smallest gap that reads as intentional. */
  1: "0.25rem",
  /** 8px — inside a badge or a tight control. */
  2: "0.5rem",
  /** 12px — between form label and input. */
  3: "0.75rem",
  /** 16px — the default. Card padding on mobile, paragraph spacing. */
  4: "1rem",
  5: "1.25rem",
  /** 24px — card padding on desktop. */
  6: "1.5rem",
  /** 32px — between cards. */
  8: "2rem",
  10: "2.5rem",
  /** 48px — between content sections. */
  12: "3rem",
  /** 64px — around a page's main region. */
  16: "4rem",
  20: "5rem",
  /** 96px — landing-page breathing room. */
  24: "6rem",
} as const;

export type SpacingStep = keyof typeof SPACING;

/**
 * Corner radii, kept deliberately tight.
 *
 * §6 asks for "an artifact recovered from the Amber Temple, not a fantasy-themed SaaS
 * dashboard", and generous rounding is most of what makes an interface read as the latter.
 * Carved stone and bound leather have edges. `full` exists only for avatars and pills.
 */
export const RADII = {
  none: "0",
  /** 2px — inputs, tags. Barely there, which is the point. */
  sm: "0.125rem",
  /** 3px — buttons. */
  md: "0.1875rem",
  /** 4px — cards and panels. */
  lg: "0.25rem",
  /** Circles: avatars, status dots. */
  full: "9999px",
} as const;

export type Radius = keyof typeof RADII;

/** Border widths. `hairline` is the gold rule between sections; `heavy` marks a callout edge. */
export const BORDER_WIDTHS = {
  none: "0",
  hairline: "1px",
  medium: "2px",
  heavy: "3px",
} as const;

/**
 * The three layouts from PLAN.md §7, as min-widths.
 *
 * Mobile is everything below `tablet` and has no entry, because the CSS is written
 * mobile-first: the base rules are the phone layout and each breakpoint adds to it. A
 * `mobile` token would invite `@media (max-width: …)` rules that fight the ones above them.
 */
export const BREAKPOINTS = {
  /** 768px — right rail collapses into tabs, left rail becomes a drawer. Two columns. */
  tablet: "768px",
  /** 1280px — the full three-column layout. */
  desktop: "1280px",
  /** 1536px — caps the content column on very wide monitors. */
  wide: "1536px",
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Stacking order, named so nobody writes `z-index: 9999`.
 *
 * The gaps are intentional: inserting something between `dropdown` and `modal` later should
 * not require renumbering everything above it.
 */
export const Z_INDEX = {
  /**
   * The fog layer and the vignette. Negative on purpose — they must sit behind content.
   *
   * A vignette rendered *over* the page would darken cards and text along with the
   * background, quietly changing every ratio the contrast test measured. Behind content it
   * shades only the exposed background, so the palette's guarantees survive untouched.
   *
   * This works because the page background lives on `html` rather than on `body`: the root
   * background paints to the canvas first, then a negative-z child of `body`, then content.
   * Moving that background to `body` would hide both layers completely.
   */
  atmosphere: -1,
  base: 0,
  /** Sticky page header. */
  sticky: 100,
  dropdown: 200,
  modal: 300,
  /** The ⌘K command palette, which must sit above an open modal. */
  commandPalette: 400,
  toast: 500,
} as const;

export type ZIndexLayer = keyof typeof Z_INDEX;
