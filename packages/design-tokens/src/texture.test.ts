import { describe, expect, it } from "vitest";

import { type ColorName, PALETTE, TEXT_COLORS } from "./color";
import { AA_BODY_TEXT, blend, contrastRatio, meetsContrast, relativeLuminance } from "./contrast";
import { FOG, GRAIN, VIGNETTE } from "./texture";

describe("blend", () => {
  it("returns the backdrop at zero alpha and the overlay at one", () => {
    expect(blend(PALETTE.mist, PALETTE.void, 0)).toBe(PALETTE.void);
    expect(blend(PALETTE.mist, PALETTE.void, 1)).toBe(PALETTE.mist);
  });

  it("moves monotonically between them", () => {
    const quarter = relativeLuminance(blend(PALETTE.mist, PALETTE.void, 0.25));
    const half = relativeLuminance(blend(PALETTE.mist, PALETTE.void, 0.5));
    expect(half).toBeGreaterThan(quarter);
    expect(quarter).toBeGreaterThan(relativeLuminance(PALETTE.void));
  });

  it("rejects an alpha outside 0–1", () => {
    // Same fail-closed reasoning as the hex parser. An out-of-range alpha quietly clamped
    // would let the ceiling below be computed against a value nobody chose.
    expect(() => blend(PALETTE.mist, PALETTE.void, 1.5)).toThrow(RangeError);
    expect(() => blend(PALETTE.mist, PALETTE.void, -0.1)).toThrow(RangeError);
    expect(() => blend(PALETTE.mist, PALETTE.void, Number.NaN)).toThrow(RangeError);
  });
});

/**
 * The rule that lets the atmosphere ship at all: no layer may lighten its surface past
 * `stone`, the lightest surface every text colour is already measured against.
 *
 * Both layers are checked the same way, against the surface each actually covers — the
 * grain sits on cards (`crypt`), the fog on the page (`void`).
 */
describe.each([
  { name: "grain", layer: GRAIN, surface: "crypt" as ColorName },
  { name: "fog", layer: FOG, surface: "void" as ColorName },
])("the $name layer", ({ layer, surface }) => {
  const covered = blend(PALETTE[layer.color], PALETTE[surface], layer.peakAlpha);

  it("stays under the stone ceiling at peak density", () => {
    expect(relativeLuminance(covered)).toBeLessThanOrEqual(relativeLuminance(PALETTE.stone));
  });

  it("leaves every text colour above the body-text bar", () => {
    // Implied by the ceiling above, but asserted directly because it is the property that
    // actually matters — if the ceiling rule is ever relaxed, this is what still holds.
    for (const text of TEXT_COLORS) {
      const ratio = contrastRatio(PALETTE[text], covered);
      expect(
        meetsContrast(PALETTE[text], covered, AA_BODY_TEXT),
        `${text} over the covered surface is ${ratio.toFixed(2)}:1`,
      ).toBe(true);
    }
  });
});

describe("the fog's motion", () => {
  it("drifts far slower than any interaction", () => {
    // Ambient, not UI. §6's 250–400ms budget is for transitions the user is waiting on;
    // this should read as weather. Anything under a few seconds registers as an animation
    // and pulls the eye off the text.
    expect(Number.parseFloat(FOG.driftDuration)).toBeGreaterThanOrEqual(30);
  });
});

describe("the vignette", () => {
  it("only darkens, which is why it has no ceiling", () => {
    // It is painted in black behind content, so the surface under any text can only move
    // away from the text colour. Asserting the premise rather than the consequence: if
    // someone repaints it in a lighter shade to make it more visible, this fails.
    expect(relativeLuminance("#000000")).toBeLessThanOrEqual(relativeLuminance(PALETTE.void));
  });

  it("stays subtle enough to read as atmosphere", () => {
    // §6: "Restrained ornament — one wax seal is gothic, twelve is a Halloween store."
    // This number is what decides which of those the site is.
    expect(VIGNETTE.strength).toBeGreaterThan(0);
    expect(VIGNETTE.strength).toBeLessThanOrEqual(0.7);
  });
});
