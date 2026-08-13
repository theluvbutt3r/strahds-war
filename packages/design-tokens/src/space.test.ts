import { describe, expect, it } from "vitest";

import { BREAKPOINTS, SPACING, Z_INDEX } from "./space";

describe("the spacing scale", () => {
  it("stays on the 4px grid", () => {
    // The grid is the whole point: every gap being a multiple of one unit is what makes
    // things line up without anyone measuring. A stray 0.3rem would break alignment in a
    // way that looks like a rendering bug rather than a token mistake.
    for (const [step, value] of Object.entries(SPACING)) {
      const pixels = Number.parseFloat(value) * 16;
      expect(pixels % 4, `SPACING.${step} is not a multiple of 4px`).toBe(0);
    }
  });

  it("matches its own key, in quarter-rem units", () => {
    // SPACING[4] must be 1rem, SPACING[6] must be 1.5rem. If the two ever disagree, every
    // mental shortcut anyone has built about the scale becomes wrong.
    for (const [step, value] of Object.entries(SPACING)) {
      expect(Number.parseFloat(value), `SPACING.${step}`).toBe(Number(step) / 4);
    }
  });
});

describe("breakpoints", () => {
  it("ascend", () => {
    let previous = 0;
    for (const [name, value] of Object.entries(BREAKPOINTS)) {
      const width = Number.parseFloat(value);
      expect(width, `${name} is not wider than the breakpoint below it`).toBeGreaterThan(previous);
      previous = width;
    }
  });
});

describe("stacking order", () => {
  it("puts the command palette above modals and toasts above everything", () => {
    // ⌘K opens *from* a modal, so it has to outrank one; a toast reporting a failed save
    // has to outrank the dialog that caused it. Both are easy to get backwards, and both
    // fail as "the thing I clicked did nothing" rather than as a visible layering bug.
    expect(Z_INDEX.commandPalette).toBeGreaterThan(Z_INDEX.modal);
    expect(Z_INDEX.toast).toBeGreaterThan(Z_INDEX.commandPalette);
    expect(Z_INDEX.atmosphere).toBeLessThan(Z_INDEX.sticky);
  });
});
