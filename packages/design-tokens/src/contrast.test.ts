import { describe, expect, it } from "vitest";

import { PALETTE, SHIPPED_PAIRS, SURFACE_COLORS, TEXT_COLORS } from "./color";
import { AA_BODY_TEXT, contrastRatio, meetsContrast, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("anchors at the ends of the scale", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
  });

  it("weights green far above blue", () => {
    // Not decoration: this is why `arcane` violet measures darker than its hex looks, and
    // therefore why it is a fill colour. If someone "simplifies" the formula to an average
    // of the three channels, these two become equal and the palette rules stop holding.
    expect(relativeLuminance("#00FF00")).toBeGreaterThan(relativeLuminance("#0000FF") * 9);
  });

  it("is case-insensitive about the hex digits", () => {
    expect(relativeLuminance("#b33636")).toBe(relativeLuminance("#B33636"));
  });
});

describe("contrastRatio", () => {
  it("spans 1 to 21", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#B33636", "#B33636")).toBe(1);
  });

  it("does not care which colour is named first", () => {
    expect(contrastRatio(PALETTE.bone, PALETTE.void)).toBe(
      contrastRatio(PALETTE.void, PALETTE.bone),
    );
  });

  it("throws on anything that is not a six-digit hex", () => {
    // Fail closed. Every fallback value lies here: 21 would make a typo'd colour silently
    // pass the shipped-pairs test below, and 0 would fail every pair until someone deleted
    // the assertion as noise.
    expect(() => contrastRatio("#FFF", "#000000")).toThrow(TypeError);
    expect(() => contrastRatio("B33636", "#000000")).toThrow(TypeError);
    expect(() => contrastRatio("rgb(0,0,0)", "#000000")).toThrow(TypeError);
    expect(() => contrastRatio("#GGGGGG", "#000000")).toThrow(TypeError);
    expect(() => contrastRatio("", "#000000")).toThrow(TypeError);
  });
});

describe("meetsContrast", () => {
  it("does not round a near-miss up to a pass", () => {
    // #767676 on white is 4.5378:1 and passes; #777777 is 4.4779:1, which a checker that
    // rounds to one decimal would report as "4.5" and wave through.
    expect(meetsContrast("#767676", "#FFFFFF", AA_BODY_TEXT)).toBe(true);
    expect(meetsContrast("#777777", "#FFFFFF", AA_BODY_TEXT)).toBe(false);
  });
});

/**
 * The CI contrast test from PLAN.md §6 and §9.
 *
 * This is the assertion the design system exists to keep true. A palette edit that makes
 * any shipped combination unreadable fails here, by name, with the measured ratio.
 */
describe("every shipped colour pair", () => {
  it.each([...SHIPPED_PAIRS])("$usage clears $minimum:1", (pair) => {
    const ratio = contrastRatio(PALETTE[pair.foreground], PALETTE[pair.background]);
    expect(ratio).toBeGreaterThanOrEqual(pair.minimum);
  });

  it("covers every text colour against every surface", () => {
    // Guards the list rather than the ratios: adding a colour to TEXT_COLORS without adding
    // its pairs would leave it unchecked, and an unchecked text colour is exactly the state
    // this whole file exists to prevent.
    const covered = new Set(SHIPPED_PAIRS.map((pair) => `${pair.foreground}/${pair.background}`));
    const required = TEXT_COLORS.flatMap((text) =>
      SURFACE_COLORS.map((surface) => `${text}/${surface}`),
    );

    expect(required.filter((pair) => !covered.has(pair))).toEqual([]);
  });
});

describe("the fill-only colours", () => {
  it("records the measurements that made the text tier necessary", () => {
    // PLAN.md §6 states these as ~3.9:1 for blood and ~5.3:1 for ember, and concludes that
    // ember can carry body text. Both figures are wrong, which is why `emberLit` and
    // `mistLit` exist. Pinning the real numbers means the claim in the docs can never drift
    // from the palette again without a test saying so.
    //
    // If you deliberately retune one of these to pass AA, this test failing is the intended
    // prompt to move it into TEXT_COLORS rather than to loosen the number here.
    expect(contrastRatio(PALETTE.blood, PALETTE.void)).toBeCloseTo(2.13, 2);
    expect(contrastRatio(PALETTE.ember, PALETTE.void)).toBeCloseTo(3.29, 2);
    expect(contrastRatio(PALETTE.mist, PALETTE.void)).toBeCloseTo(3.75, 2);
  });

  it("is why bone, not mist, carries labels on a dark fill", () => {
    for (const fill of ["blood", "moss", "arcane", "danger"] as const) {
      expect(meetsContrast(PALETTE.bone, PALETTE[fill], AA_BODY_TEXT)).toBe(true);
      expect(meetsContrast(PALETTE.mistLit, PALETTE[fill], AA_BODY_TEXT)).toBe(false);
    }
  });

  it("is why a gold fill takes dark text instead", () => {
    // The one inversion in the palette, and an easy mistake to make by pattern-matching the
    // other fills: bone on gold is 2.43:1.
    expect(meetsContrast(PALETTE.bone, PALETTE.gold, AA_BODY_TEXT)).toBe(false);
    expect(meetsContrast(PALETTE.void, PALETTE.gold, AA_BODY_TEXT)).toBe(true);
  });
});
