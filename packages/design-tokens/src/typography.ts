/**
 * The four typefaces from PLAN.md §6 and the scale they are set at.
 *
 * Families are stacks, not single names. `next/font` will self-host the real faces and hand
 * us a CSS variable per family in the next Phase 2 step — that variable goes in front of
 * these entries, which then act as the fallback while the font file loads and forever on the
 * one device where it fails to.
 */
export const FONT_FAMILIES = {
  /** Cinzel — Roman inscriptional capitals, reads as carved stone. Page and section titles only. */
  display: ["Cinzel", "Georgia", "Times New Roman", "serif"],
  /** Spectral — bookish and screen-legible. Long-form lore and read-aloud text. */
  body: ["Spectral", "Georgia", "Times New Roman", "serif"],
  /** Inter — navigation, forms, admin panel. Legibility beats atmosphere for functional text. */
  ui: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  /** JetBrains Mono — stat blocks, dice notation, mechanics. */
  mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

/**
 * The CSS custom property each family's loaded webfont is published under.
 *
 * This is a contract with two ends. `apps/web/src/app/layout.tsx` configures `next/font`
 * with these exact variable names, and `scripts/generate-theme.ts` writes each font stack
 * as `var(--font-inter, Inter), system-ui, …` so the loaded face wins when it is present
 * and the plain family name is used when it is not.
 *
 * Naming them here rather than in either consumer is what makes that agreement checkable:
 * a typo on one side is a stack that silently renders in the fallback, which looks like a
 * design choice rather than a bug.
 */
export const FONT_CSS_VARIABLES = {
  display: "--font-cinzel",
  body: "--font-spectral",
  ui: "--font-inter",
  mono: "--font-jetbrains-mono",
} as const satisfies Record<FontFamily, string>;

/** One step of the type scale: a size and the leading that goes with it. */
export interface TypeStep {
  /** Font size in `rem`, so it scales with the reader's browser setting. */
  readonly size: string;
  /** Line height — unitless where it should scale with size, `rem` where it should not. */
  readonly lineHeight: string;
}

/**
 * The type scale, ×1.25 (a major third) from a 16px base.
 *
 * This is deliberately the same set of values Tailwind ships by default. A bespoke scale
 * would look more considered and would mean every `text-lg` in a vendored shadcn/ui
 * component silently changed size when it landed in `packages/ui` — the boring choice buys
 * a whole class of surprise we would otherwise have to debug.
 *
 * `base` is the exception: 28px of leading rather than Tailwind's 24px, because the body
 * face is Spectral set at a 72ch measure, and long serif lines need the extra air to stay
 * trackable. Everything above `xl` tightens, because display type at loose leading drifts.
 */
export const TYPE_SCALE = {
  /** 12px — table captions, footnotes. The floor; nothing ships smaller. */
  xs: { size: "0.75rem", lineHeight: "1rem" },
  /** 14px — metadata, form hints, dense UI. */
  sm: { size: "0.875rem", lineHeight: "1.25rem" },
  /** 16px — body prose. */
  base: { size: "1rem", lineHeight: "1.75rem" },
  /** 18px — lead paragraphs and read-aloud boxes. */
  lg: { size: "1.125rem", lineHeight: "1.875rem" },
  /** 20px — h4. */
  xl: { size: "1.25rem", lineHeight: "1.75rem" },
  /** 24px — h3. Also the size at which AA_LARGE_TEXT starts to apply. */
  "2xl": { size: "1.5rem", lineHeight: "2rem" },
  /** 30px — h2, section headers. */
  "3xl": { size: "1.875rem", lineHeight: "2.25rem" },
  /** 36px — h1, entity titles. */
  "4xl": { size: "2.25rem", lineHeight: "2.5rem" },
  /** 48px — the landing page, and nothing else. */
  "5xl": { size: "3rem", lineHeight: "1.1" },
} as const satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof TYPE_SCALE;

/**
 * Four weights, which is all we load.
 *
 * Every weight is a font file a player downloads on hotel wifi at the table. Cinzel ships
 * regular and bold only; asking for `medium` in a display face would get synthesised by the
 * browser and look smeared.
 */
export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FontWeight = keyof typeof FONT_WEIGHTS;

/**
 * Letter-spacing. Display type gets positive tracking because Cinzel is all-capitals, and
 * capitals set tight read as a single block — inscriptions on real stone are spaced out for
 * exactly this reason.
 */
export const LETTER_SPACING = {
  tight: "-0.015em",
  normal: "0",
  display: "0.04em",
  /** Small-caps labels and section eyebrows. */
  wide: "0.12em",
} as const;

/**
 * Maximum line length for prose, from PLAN.md §7.
 *
 * `ch` is the width of a "0" in the current font, so this tracks the body face rather than a
 * pixel guess. Roughly 65–75 characters is the readable band; past it the eye loses the
 * return sweep to the next line.
 */
export const MEASURE = "72ch";
