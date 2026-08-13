import { describe, expect, it } from "vitest";

import { FONT_FAMILIES, MEASURE, TYPE_SCALE } from "./typography";

/** CSS generic families — the last resort that guarantees *something* legible renders. */
const GENERIC_FAMILIES = ["serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy"];

describe("font stacks", () => {
  it("end in a generic family", () => {
    // Without one, a stack whose named faces all fail falls back to the browser default —
    // which is a sans-serif, so lore prose set in a broken Spectral stack would silently
    // stop being a serif at all rather than degrading to Georgia.
    for (const [name, stack] of Object.entries(FONT_FAMILIES)) {
      expect(GENERIC_FAMILIES, `${name} stack`).toContain(stack[stack.length - 1]);
    }
  });

  it("name a real fallback before the generic", () => {
    // A stack of ["Cinzel", "serif"] would work but wastes the chance to pick a *close*
    // fallback, which is what keeps layout shift small while the webfont loads.
    for (const [name, stack] of Object.entries(FONT_FAMILIES)) {
      expect(stack.length, `${name} stack`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the type scale", () => {
  it("increases at every step", () => {
    // Object key order is the declaration order here, so this also catches a step inserted
    // in the wrong place — which would make `text-xl` smaller than `text-lg` and produce a
    // bug nobody thinks to look for in a token file.
    let previous = 0;
    for (const [name, step] of Object.entries(TYPE_SCALE)) {
      const size = Number.parseFloat(step.size);
      expect(size, `${name} is not larger than the step below it`).toBeGreaterThan(previous);
      previous = size;
    }
  });

  it("sizes everything in rem", () => {
    // px sizes ignore the reader's browser font-size setting outright. For a wiki read on a
    // phone at a dark table, that setting is an accessibility feature people actually use.
    for (const [name, step] of Object.entries(TYPE_SCALE)) {
      expect(step.size, `${name} size`).toMatch(/rem$/);
    }
  });

  it("gives body prose looser leading than its own size", () => {
    const size = Number.parseFloat(TYPE_SCALE.base.size);
    const leading = Number.parseFloat(TYPE_SCALE.base.lineHeight);
    expect(leading / size).toBeGreaterThanOrEqual(1.5);
  });
});

describe("the measure", () => {
  it("stays inside the readable band", () => {
    // 65–75 characters. Below it the eye hits a line break too often to build rhythm; above
    // it the return sweep starts landing on the wrong line.
    const characters = Number.parseFloat(MEASURE);
    expect(MEASURE).toMatch(/ch$/);
    expect(characters).toBeGreaterThanOrEqual(65);
    expect(characters).toBeLessThanOrEqual(75);
  });
});
