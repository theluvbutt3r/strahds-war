import { AA_BODY_TEXT } from "./contrast";

/**
 * The Barovian palette from PLAN.md §6, plus two colours that section did not have.
 *
 * ## Why there are thirteen colours and not eleven
 *
 * §6 states that `blood` (#8B1A1A) on `void` is "roughly 3.9:1" and that `ember` (#B33636)
 * "reaches about 5.3:1 and passes", so `ember` should carry all crimson text and links.
 * Measured with the WCAG formula in `contrast.ts`, the real numbers on `void` are 2.13:1
 * and 3.29:1. `ember` misses the 4.5:1 body-text bar, and `mist` — the muted-text token —
 * misses it too at 3.75:1. Of the original eleven, only `bone` and `gold` could legally
 * carry body text on any surface.
 *
 * The instinct §6 was protecting is right; only its arithmetic was off. So every original
 * hex is preserved exactly and keeps doing fills, borders and large display type, and two
 * lighter siblings were added that exist solely to carry text. The deep crimson identity is
 * untouched — `blood` and `ember` still paint every filled surface — but the words on top
 * of them are readable at 1am.
 *
 * Both additions were chosen to clear 4.5:1 against `stone`, the *lightest* of the three
 * surfaces, so they are safe on all of them rather than only on the page background.
 *
 * The full measurements and the two alternatives that lost are in
 * `docs/adr/0007-text-tier-colours.md`.
 */
export const PALETTE = {
  /** Page background — near-black, warm-shifted. */
  void: "#0B0A0C",
  /** Cards and surfaces. */
  crypt: "#141317",
  /** Raised surfaces, inputs, hover states. */
  stone: "#1F1D23",
  /** Muted grey. **Fill and border only** — 3.75:1 on `void`, below the body-text bar. */
  mist: "#6E6A75",
  /** Muted *text* — the readable sibling of `mist`. 6.22:1 on `void`, 5.25:1 on `stone`. */
  mistLit: "#948E9C",
  /** Primary text — warm off-white, not pure white. 15.45:1 on `void`. */
  bone: "#E8E3D9",
  /** Deep crimson. **Fills and borders only** — 2.13:1 on `void`. */
  blood: "#8B1A1A",
  /** Brighter crimson. **Fills and large display type only** — 3.29:1 on `void`. */
  ember: "#B33636",
  /** Crimson *text* — the readable sibling of `ember`. 5.50:1 on `void`, 4.65:1 on `stone`. */
  emberLit: "#E85550",
  /** Tarnished gold — rules, dividers, accents. Passes as text everywhere at 5.38:1+. */
  gold: "#B08D4F",
  /** Svalich woods green — secondary, nature, druidic. **Fill only** at 2.77:1. */
  moss: "#4A5D45",
  /** Muted violet — magic, arcana, the Vistani. **Fill only** at 2.65:1. */
  arcane: "#5B4B8A",
  /** Destructive actions. **Fill only** at 2.64:1 — the label on top carries the meaning. */
  danger: "#A32222",
} as const;

export type ColorName = keyof typeof PALETTE;

/** The three background layers, darkest first. Every text colour is checked against all three. */
export const SURFACE_COLORS = ["void", "crypt", "stone"] as const;
export type SurfaceColor = (typeof SURFACE_COLORS)[number];

/**
 * The only colours permitted to carry text, in any size, on any surface.
 *
 * This is a type, not a convention: `TextColor` makes `blood` a compile error where a text
 * colour is expected, so the mistake §6 warned about is caught by `tsc` rather than by
 * someone squinting at a page. Every member is asserted against every surface below.
 */
export const TEXT_COLORS = ["bone", "mistLit", "gold", "emberLit"] as const;
export type TextColor = (typeof TEXT_COLORS)[number];

/**
 * Colours used as filled backgrounds — buttons, badges, callout panels, borders.
 *
 * `gold` appears here *and* in `TEXT_COLORS`; it is bright enough for both, and it is the
 * one fill that needs dark text on top rather than `bone`. The rest are dark enough that
 * `bone` reads comfortably over them.
 */
export const FILL_COLORS = ["blood", "ember", "moss", "arcane", "danger", "gold", "mist"] as const;
export type FillColor = (typeof FILL_COLORS)[number];

/**
 * What each colour is *for*, so components name intent instead of hue.
 *
 * A component asking for `SEMANTIC.textMuted` keeps working if the muted grey is retuned;
 * a component hardcoding `mistLit` has to be found and edited. This mapping is also what
 * the Tailwind `@theme` block will be generated from in the next Phase 2 step.
 */
export const SEMANTIC = {
  /** The page itself. */
  background: "void",
  /** Cards, panels, anything sitting on the page. */
  surface: "crypt",
  /** Inputs, hover states, anything sitting on a card. */
  raised: "stone",
  /** Hairline separation between surfaces. Decorative — see the note on SHIPPED_PAIRS. */
  border: "stone",
  /** Section rules and ornamental dividers. */
  rule: "gold",
  /** Body and heading text. */
  text: "bone",
  /** Metadata, timestamps, disabled labels. */
  textMuted: "mistLit",
  /** Emphasis and callout headings. */
  textAccent: "emberLit",
  /** Links, in body copy and navigation alike. */
  link: "emberLit",
  /** Focus rings and keyboard-selection outlines. */
  focus: "gold",
  /** Text placed on top of a dark fill. */
  onFill: "bone",
  /** Text placed on top of a `gold` fill, where `bone` would drop to 2.43:1. */
  onGold: "void",
  /** Primary accent fill — buttons, seals, active states. */
  fillAccent: "blood",
  /** Nature and druidic tagging. */
  fillNature: "moss",
  /** Magic, arcana and Vistani tagging. */
  fillArcane: "arcane",
  /** Destructive buttons and error panels. */
  fillDanger: "danger",
} as const satisfies Record<string, ColorName>;

export type SemanticRole = keyof typeof SEMANTIC;

/** A foreground/background combination the design system commits to rendering. */
export interface ColorPair {
  readonly foreground: ColorName;
  readonly background: ColorName;
  /** The WCAG threshold this pair must clear. */
  readonly minimum: number;
  /** Human-readable label, used as the test name so a failure says what broke. */
  readonly usage: string;
}

/** Every text colour on every surface — the combinations a page can produce by itself. */
const TEXT_ON_SURFACES: readonly ColorPair[] = TEXT_COLORS.flatMap((foreground) =>
  SURFACE_COLORS.map((background) => ({
    foreground,
    background,
    minimum: AA_BODY_TEXT,
    usage: `${foreground} text on ${background}`,
  })),
);

/** Labels on filled elements — badges, buttons, callout headers. */
const TEXT_ON_FILLS: readonly ColorPair[] = [
  {
    foreground: "bone",
    background: "blood",
    minimum: AA_BODY_TEXT,
    usage: "button label on blood",
  },
  {
    foreground: "bone",
    background: "ember",
    minimum: AA_BODY_TEXT,
    usage: "button label on ember",
  },
  { foreground: "bone", background: "moss", minimum: AA_BODY_TEXT, usage: "tag label on moss" },
  { foreground: "bone", background: "arcane", minimum: AA_BODY_TEXT, usage: "tag label on arcane" },
  {
    foreground: "bone",
    background: "danger",
    minimum: AA_BODY_TEXT,
    usage: "destructive button label",
  },
  { foreground: "void", background: "gold", minimum: AA_BODY_TEXT, usage: "label on a gold fill" },
];

/**
 * Every pair the design system ships, checked in CI by `contrast.test.ts`.
 *
 * **What is deliberately absent:** the surface steps themselves — `crypt` on `void`, `stone`
 * on `crypt` — and the `border` role, which is `stone`. Those sit near 1.3:1 and always
 * will, because three near-black layers cannot be 3:1 apart and still read as one dark
 * theme. That is allowed: SC 1.4.11 governs boundaries a user must *find*, not decorative
 * depth. The boundaries that do carry meaning — focus rings, input outlines, selected
 * states — all use `focus`/`gold`, which is checked above at the stricter 4.5:1 text bar.
 *
 * If a component ever needs a border to convey state, it uses `gold` or `emberLit`. It does
 * not use a lighter grey, because a lighter grey would have to be added to this list and
 * would fail it.
 */
export const SHIPPED_PAIRS: readonly ColorPair[] = [...TEXT_ON_SURFACES, ...TEXT_ON_FILLS];
