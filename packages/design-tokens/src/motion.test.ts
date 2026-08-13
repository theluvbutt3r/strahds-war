import { describe, expect, it } from "vitest";

import { DURATIONS, EASINGS, REDUCED_MOTION_DURATION } from "./motion";

// `instant` is split out rather than skipped inside the loop below, because an `if` around
// an assertion can stop asserting without the test ever going red — the failure mode
// vitest/no-conditional-expect exists to catch.
const { instant, ...ATMOSPHERIC } = DURATIONS;

describe("durations", () => {
  it("stay inside the range §6 asks for", () => {
    // 250–400ms is the atmosphere budget, spent only on motion the eye is already following.
    for (const [name, value] of Object.entries(ATMOSPHERIC)) {
      const ms = Number.parseFloat(value);
      expect(ms, `DURATIONS.${name} is below the 250ms floor`).toBeGreaterThanOrEqual(250);
      expect(ms, `DURATIONS.${name} exceeds the 400ms ceiling`).toBeLessThanOrEqual(400);
    }
  });

  it("keep click and hover feedback out of that range", () => {
    // Hover and focus repeat constantly; slowness there reads as lag, not as a crypt door.
    expect(Number.parseFloat(instant)).toBeLessThan(250);
  });

  it("never collapse reduced motion all the way to zero", () => {
    // A 0s transition fires no `transitionend` in some browsers, so code waiting on one to
    // unmount a dialog hangs — a bug only reduced-motion users would ever hit.
    expect(Number.parseFloat(REDUCED_MOTION_DURATION)).toBeGreaterThan(0);
  });
});

describe("easings", () => {
  it("keep every curve inside a legal cubic-bezier", () => {
    // The two time values must be in 0–1; the browser silently drops the whole declaration
    // if they are not, and the transition then snaps with no warning anywhere.
    for (const [name, curve] of Object.entries(EASINGS)) {
      if (curve === "linear") continue;

      const points = curve.match(/-?\d*\.?\d+/g) ?? [];
      expect(points, `EASINGS.${name}`).toHaveLength(4);
      for (const index of [0, 2]) {
        const time = Number.parseFloat(points[index] ?? "NaN");
        expect(time, `EASINGS.${name} control point ${index}`).toBeGreaterThanOrEqual(0);
        expect(time, `EASINGS.${name} control point ${index}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
