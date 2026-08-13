/**
 * The atmosphere from PLAN.md §6: parchment grain, vignette, drifting fog.
 *
 * > Subtle: a fine parchment grain on card surfaces, a soft vignette at viewport edges,
 * > hairline gold rules between sections, a slow drifting fog layer on the landing page
 * > only. […] All of it behind `prefers-reduced-motion`, and the fog layer also disables on
 * > low-power devices so we don't burn a player's phone battery at the table.
 *
 * ## Why these are tokens rather than numbers in a stylesheet
 *
 * Each one changes what sits *behind* text, and this design system's entire claim is that
 * it knows what sits behind text. An overlay tuned by eye in CSS would live outside the
 * contrast test: the palette would still be provably sound while the rendered page was not.
 * Keeping the values here lets `texture.test.ts` hold them to the same bar as the palette.
 *
 * ## The one rule
 *
 * **No atmosphere layer may lighten its surface past `stone`.**
 *
 * `stone` is the lightest surface in the theme and every text colour is already measured
 * against it (SHIPPED_PAIRS). So a layer that stays under it needs no new guarantee — the
 * existing one already covers the result. Darkening is unconstrained, because light text on
 * a darker surface only gains contrast.
 *
 * That ceiling is what sets both alphas below, and it binds *before* the 4.5:1 text bar
 * does — grain would not actually break AA until about 0.16. Being bound by the stricter of
 * the two is deliberate: it means the atmosphere can be retuned without anyone having to
 * re-derive whether the palette still holds.
 */

/**
 * Fine speckling on card surfaces.
 *
 * Painted in `mist`, the palette's grey, as semi-transparent noise over the card colour.
 *
 * A purely *darkening* grain was the first attempt, since it would have needed no contrast
 * argument at all. It is invisible: multiplicative darkening of `crypt` (#141317) moves it
 * by about one value out of 255, so the texture simply does not exist on screen. Visible
 * grain on a near-black surface has to lighten, which is why this carries a cap and a test
 * instead of a proof.
 */
export const GRAIN = {
  /** Palette entry the speckles are painted in. */
  color: "mist",
  /**
   * Peak alpha of the densest speckle.
   *
   * At 0.10 the brightest point of a grained card reaches #1D1C20, just under `stone`.
   */
  peakAlpha: 0.1,
  /** Tile edge in px. Large enough that the repeat is not a visible checkerboard. */
  tileSize: 140,
  /**
   * `feTurbulence` base frequency — how fine the noise is. Higher is finer; below about
   * 0.5 it stops reading as paper fibre and starts reading as clouds.
   */
  baseFrequency: 0.8,
} as const;

/**
 * The soft darkening at the viewport edges.
 *
 * Painted in black and rendered *behind* content rather than over it. An overlay is the
 * more usual way to build a vignette and would tint every card and every word beneath it,
 * turning a measured palette back into an approximate one. Behind content it shades only
 * the exposed page background, so nothing measured changes — which is why this one has a
 * strength and no cap.
 */
export const VIGNETTE = {
  /** How dark the very corners get, 0–1. */
  strength: 0.55,
} as const;

/**
 * The drifting fog on the landing page.
 *
 * The landing page sets text directly on the page background rather than on a card, so
 * this layer is genuinely behind live text and gets the same ceiling as the grain.
 */
export const FOG = {
  /** Palette entry the fog is painted in. `mist` is the grey that exists for this. */
  color: "mist",
  /** Peak alpha of the densest part of the layer. At 0.18 the page reaches `stone`. */
  peakAlpha: 0.18,
  /** Blur radius. Large, because a sharp edge reads as a shape rather than as fog. */
  blur: "80px",
  /**
   * One full drift cycle.
   *
   * Deliberately not in `DURATIONS`: that scale is §6's 250–400ms interaction budget, and
   * dropping a 90-second ambient loop into it would make the range meaningless. Ambient
   * motion is a different thing that happens to be measured in the same unit.
   */
  driftDuration: "90s",
} as const;
