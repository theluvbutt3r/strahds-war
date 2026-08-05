import { describe, expect, it } from "vitest";

import { clearanceFor, ROLES } from "./roles";
import {
  clears,
  DEFAULT_VISIBILITY,
  maxClearance,
  type Visibility,
  VISIBILITY_TIERS,
} from "./visibility";

describe("clears", () => {
  it("grants access at or below the holder's tier", () => {
    expect(clears("dm", "public")).toBe(true);
    expect(clears("dm", "player")).toBe(true);
    expect(clears("dm", "dm")).toBe(true);
    expect(clears("player", "public")).toBe(true);
    expect(clears("player", "player")).toBe(true);
    expect(clears("public", "public")).toBe(true);
  });

  it("refuses access above the holder's tier", () => {
    expect(clears("player", "dm")).toBe(false);
    expect(clears("public", "player")).toBe(false);
    expect(clears("public", "dm")).toBe(false);
  });

  it("is reflexive across every tier", () => {
    for (const tier of VISIBILITY_TIERS) {
      expect(clears(tier, tier)).toBe(true);
    }
  });
});

describe("maxClearance", () => {
  it("returns the highest tier granted", () => {
    expect(maxClearance(["public", "dm", "player"])).toBe("dm");
    expect(maxClearance(["public", "player"])).toBe("player");
  });

  it("falls back to public when nothing is granted", () => {
    expect(maxClearance([])).toBe("public");
  });
});

describe("defaults", () => {
  it("defaults new content to player, not public", () => {
    // Guards the fail-closed property in ADR 0002. If this ever flips to "public",
    // every entity created without an explicit visibility becomes world-readable.
    expect(DEFAULT_VISIBILITY).toBe("player");
  });

  it("grants dm clearance to exactly co-dm and overlord", () => {
    // This replaces an assertion that could not fail. The previous version was
    //
    //   for (const role of ROLES) expect(VISIBILITY_TIERS).toContain(clearanceFor(role));
    //
    // under the name "gives no role clearance beyond dm" — but `clearanceFor` returns a
    // `Visibility`, so membership in VISIBILITY_TIERS is guaranteed by the type and the
    // loop asserted nothing about the bound the name promised. A test whose name and
    // assertion disagree is worse than no test: it occupies the slot where the real one
    // would go, and reads as coverage.
    const withDmClearance = ROLES.filter((role) => clears(clearanceFor(role), "dm"));
    expect(withDmClearance).toEqual(["co-dm", "overlord"]);
  });

  it("grants every role at least public clearance", () => {
    for (const role of ROLES) {
      expect(clears(clearanceFor(role), "public")).toBe(true);
    }
  });

  it("keeps chronicler below dm clearance", () => {
    // A chronicler writes lore but must never read secrets — the case most likely
    // to be broken by someone treating the role list as a single ascending scale.
    expect(clears(clearanceFor("chronicler"), "dm")).toBe(false);
  });
});

describe("fail-closed behaviour on unvalidated input", () => {
  // `clears` and `maxClearance` are typed to accept a Visibility, but the values they
  // will actually be handed at runtime come from a database column and a JSON payload.
  // A tier string that never passed Zod validation — a typo, a renamed tier, a row
  // written by an older deploy — has to deny access rather than grant it.
  //
  // This works today by arithmetic rather than by intent: an unknown key yields
  // `undefined` from the rank table, and every comparison against `undefined` is false.
  // That is exactly the kind of property that survives until someone makes the lookup
  // "safer" with a `?? 0` default and silently turns every unknown tier into `public`.
  // Pinning it here means that change fails a test instead of opening a door.

  const bogus = "dungeon-master" as Visibility;

  it("denies a holder whose clearance is not a known tier", () => {
    expect(clears(bogus, "public")).toBe(false);
    expect(clears(bogus, "dm")).toBe(false);
  });

  it("denies access to content whose required tier is not known", () => {
    expect(clears("dm", bogus)).toBe(false);
  });

  it("ignores unknown tiers when picking the highest clearance", () => {
    expect(maxClearance([bogus])).toBe("public");
    expect(maxClearance([bogus, "player"])).toBe("player");
  });
});
