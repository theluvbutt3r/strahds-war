import { describe, expect, it } from "vitest";

import {
  type ColorName,
  FILL_COLORS,
  PALETTE,
  SEMANTIC,
  SURFACE_COLORS,
  TEXT_COLORS,
} from "./color";

describe("the palette", () => {
  it("writes every colour in one canonical form", () => {
    // Uppercase six-digit hex, no shorthand. `contrast.ts` throws on anything else, so a
    // "#e8555" typo would otherwise surface as a stack trace from a component at render
    // time rather than as a failure here.
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(hex, `${name} is not canonical hex`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("has no duplicate values", () => {
    // Two tokens with the same hex is almost always a copy-paste slip, and it is invisible:
    // the design keeps working, but the two roles it was meant to distinguish can never be
    // told apart, and retuning one silently retunes both.
    const seen = new Map<string, ColorName>();
    for (const [name, hex] of Object.entries(PALETTE) as [ColorName, string][]) {
      expect(seen.get(hex), `${name} duplicates ${String(seen.get(hex))}`).toBeUndefined();
      seen.set(hex, name);
    }
  });
});

describe("semantic roles", () => {
  // These are the assertions the `satisfies Record<string, ColorName>` clause on SEMANTIC
  // cannot make. It proves each role names *a* palette colour; it has no idea whether the
  // colour is legible in the position the role puts it in.

  it("point every text role at a colour cleared for text", () => {
    for (const role of ["text", "textMuted", "textAccent", "link", "onFill"] as const) {
      expect(TEXT_COLORS, `SEMANTIC.${role}`).toContain(SEMANTIC[role]);
    }
  });

  it("point every fill role at a fill colour", () => {
    for (const role of ["fillAccent", "fillNature", "fillArcane", "fillDanger"] as const) {
      expect(FILL_COLORS, `SEMANTIC.${role}`).toContain(SEMANTIC[role]);
    }
  });

  it("point every layer role at a surface", () => {
    for (const role of ["background", "surface", "raised", "border"] as const) {
      expect(SURFACE_COLORS, `SEMANTIC.${role}`).toContain(SEMANTIC[role]);
    }
  });

  it("keeps the focus ring on a colour that also passes as text", () => {
    // A focus ring only has to clear AA_NON_TEXT at 3:1, but every colour that clears the
    // stricter text bar is already checked on all three surfaces by the shipped-pairs test.
    // Keeping focus inside that set means it never needs a check of its own.
    expect(TEXT_COLORS).toContain(SEMANTIC.focus);
  });
});
