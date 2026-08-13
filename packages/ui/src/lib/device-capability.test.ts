import { describe, expect, it } from "vitest";

import {
  canAffordAmbientMotion,
  type DeviceSignals,
  MIN_BATTERY_LEVEL,
  MIN_CORES,
  MIN_MEMORY_GB,
} from "./device-capability";

/** A capable device: modern phone or laptop, plugged in or comfortably charged. */
const CAPABLE: DeviceSignals = {
  cores: 8,
  memoryGb: 8,
  saveData: false,
  batteryLevel: 0.85,
  charging: false,
  prefersReducedMotion: false,
};

describe("canAffordAmbientMotion", () => {
  it("runs the fog on a capable device", () => {
    expect(canAffordAmbientMotion(CAPABLE)).toBe(true);
  });

  it("stops for a stated preference, whatever the hardware says", () => {
    // A workstation that asked for reduced motion still gets no fog. The preference is not
    // a performance hint — it is someone telling us that movement makes the page harder or
    // more unpleasant to use, and no amount of spare CPU overrides that.
    expect(canAffordAmbientMotion({ ...CAPABLE, prefersReducedMotion: true })).toBe(false);
    expect(canAffordAmbientMotion({ ...CAPABLE, saveData: true })).toBe(false);
  });

  it("stops on a low-end phone", () => {
    expect(canAffordAmbientMotion({ ...CAPABLE, cores: MIN_CORES - 1 })).toBe(false);
    expect(canAffordAmbientMotion({ ...CAPABLE, memoryGb: MIN_MEMORY_GB - 1 })).toBe(false);
  });

  it("treats the thresholds as inclusive floors", () => {
    // Exactly at the floor is allowed. Guards against an off-by-one that would silently
    // disable the fog on every 4-core device — which is a lot of them.
    expect(canAffordAmbientMotion({ ...CAPABLE, cores: MIN_CORES })).toBe(true);
    expect(canAffordAmbientMotion({ ...CAPABLE, memoryGb: MIN_MEMORY_GB })).toBe(true);
  });

  describe("battery", () => {
    it("stops only when the charge is low AND unplugged", () => {
      const low = MIN_BATTERY_LEVEL - 0.05;

      expect(canAffordAmbientMotion({ ...CAPABLE, batteryLevel: low, charging: false })).toBe(
        false,
      );
      // Plugged in at 15% is fine — there is no battery to protect.
      expect(canAffordAmbientMotion({ ...CAPABLE, batteryLevel: low, charging: true })).toBe(true);
      // On battery at 85% is fine.
      expect(canAffordAmbientMotion({ ...CAPABLE, batteryLevel: 0.85, charging: false })).toBe(
        true,
      );
    });

    it("ignores a charge reading with no charging state", () => {
      // `charging` is undefined on a browser that exposes neither, and a level alone cannot
      // distinguish "running down at 10%" from "plugged in and nearly full".
      expect(canAffordAmbientMotion({ cores: 8, batteryLevel: 0.05 })).toBe(true);
    });
  });

  describe("missing signals", () => {
    it("runs the fog when it learns nothing at all", () => {
      // The deliberate direction, and the opposite of how this repo treats security
      // defaults. Fail-closed is right when being wrong leaks a spoiler; here being wrong
      // costs a slightly warmer phone. Defaulting to off would disable the fog on every
      // Safari device — most phones at the table — to catch the few that would have
      // reported a problem.
      expect(canAffordAmbientMotion({})).toBe(true);
    });

    it("still acts on whichever signals did arrive", () => {
      // Safari reports cores and nothing else. That one number is enough to catch an old
      // handset, and this asserts a partial reading is not discarded wholesale.
      expect(canAffordAmbientMotion({ cores: 2 })).toBe(false);
      expect(canAffordAmbientMotion({ cores: 8 })).toBe(true);
    });
  });
});
