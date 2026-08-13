/**
 * WCAG contrast maths, hand-written.
 *
 * A library would do this in one line, but this package's whole value is that it depends
 * on nothing (PLAN.md §4), and the formula is twelve lines and frozen — it has not changed
 * since WCAG 2.0 in 2008. Paying a dependency for it would be the worse trade.
 *
 * The numbers here are what `contrast.test.ts` runs against every colour pair the design
 * system actually ships, so a palette edit that quietly makes text unreadable fails CI
 * rather than shipping.
 */

/**
 * Minimum contrast for normal-size text — WCAG 2.2 SC 1.4.3 (Contrast Minimum), level AA.
 * This is the bar that matters, because most text is normal-size text.
 */
export const AA_BODY_TEXT = 4.5;

/**
 * Minimum for large text — 24px and up, or 18.66px and up when bold. Lower because bigger
 * glyphs have thicker strokes and survive less contrast.
 */
export const AA_LARGE_TEXT = 3;

/**
 * Minimum for UI component boundaries and meaningful graphics — SC 1.4.11 (Non-text
 * Contrast). Applies to things you must be able to *find*: focus rings, input borders,
 * toggle states. It does not apply to purely decorative separation, which is why the
 * card-on-page surface step is not held to it. See SHIPPED_PAIRS in `color.ts`.
 */
export const AA_NON_TEXT = 3;

/** Exactly one canonical form. `#abc` shorthand and `rgb()` are deliberately not accepted. */
const SIX_DIGIT_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Throw rather than return a fallback on malformed input.
 *
 * This is the fail-closed rule from CLAUDE.md applied to a non-security helper, and the
 * reasoning is the same: every possible fallback lies. Returning 21 would make a typo'd
 * colour silently *pass* the contrast test; returning 0 would fail every pair and get the
 * assertion deleted as noisy. A thrown error names the bad value and stops.
 */
function parseHex(hex: string): number {
  if (!SIX_DIGIT_HEX.test(hex)) {
    throw new TypeError(
      `Expected a six-digit hex colour like "#B33636", received ${JSON.stringify(hex)}`,
    );
  }
  return Number.parseInt(hex.slice(1), 16);
}

/**
 * Undo the sRGB transfer function for one 0–255 channel.
 *
 * Screen values are gamma-encoded, so #808080 emits about 22% of the light of #FFFFFF, not
 * 50%. Averaging the raw bytes would therefore compute contrast against a brightness no
 * monitor actually produces. This converts back to linear light before weighting.
 */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance: perceived brightness on a 0 (black) to 1 (white) scale.
 *
 * The weights are not equal because the eye is not. Green carries roughly 72% of perceived
 * brightness and blue about 7% — which is why `arcane` violet looks so much darker than its
 * hex suggests, and why it cannot carry text.
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  return (
    0.2126 * toLinear((rgb >> 16) & 0xff) +
    0.7152 * toLinear((rgb >> 8) & 0xff) +
    0.0722 * toLinear(rgb & 0xff)
  );
}

/**
 * Contrast ratio between two colours, from 1 (identical) to 21 (black on white).
 *
 * Symmetric — the order of the arguments does not matter. The `+ 0.05` is a fixed term for
 * ambient screen glare, which is why pure black on pure white is 21 and not infinity.
 */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Composite a semi-transparent colour over an opaque one, returning the flat result.
 *
 * Used to answer "what is the background actually, once the fog layer is over it" so the
 * atmosphere in `texture.ts` can be checked against the same contrast bars as everything
 * else. Blending happens in gamma-encoded sRGB because that is what a browser does for a
 * normal `rgba()` overlay — computing it in linear light would give a prettier number and
 * the wrong one.
 */
export function blend(foreground: string, background: string, alpha: number): string {
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new RangeError(`Alpha must be between 0 and 1, received ${String(alpha)}`);
  }

  const front = parseHex(foreground);
  const back = parseHex(background);
  const mix = (shift: number): number => {
    const f = (front >> shift) & 0xff;
    const b = (back >> shift) & 0xff;
    return Math.round(alpha * f + (1 - alpha) * b);
  };

  const channels = [mix(16), mix(8), mix(0)];
  return `#${channels.map((c) => c.toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}

/**
 * Whether a pair clears a bar.
 *
 * Compares the unrounded ratio, so 4.497 fails `AA_BODY_TEXT`. Contrast checkers that
 * display "4.5" often round first and pass it; erring strict costs nothing here because we
 * control the palette and can pick a colour with headroom.
 */
export function meetsContrast(foreground: string, background: string, minimum: number): boolean {
  return contrastRatio(foreground, background) >= minimum;
}
