import { ENTITY_KINDS, ENTITY_FIELD_CLEARANCE, ROLES, clearanceFor } from "@sw/schemas";
import { describe, expect, it } from "vitest";

import { roleOf, selectionFor, tiersVisibleTo } from "./queries";

/**
 * These tests need no database, and that is the point of testing at this level.
 *
 * The property that matters — "a DM column is never selected for a player" — is decided
 * entirely by `selectionFor`, before any SQL runs. Asserting it here catches the mistake
 * at its source rather than hoping an integration test happens to request the one entity
 * whose secret would have shown up.
 *
 * Integration tests against a real Neon branch still belong in the suite (PLAN.md §10);
 * they cover the half this cannot, which is whether the query Drizzle builds says what we
 * think it says.
 */

describe("tiersVisibleTo", () => {
  it("returns the tiers at or below the holder's clearance", () => {
    expect(tiersVisibleTo("public")).toEqual(["public"]);
    expect(tiersVisibleTo("player")).toEqual(["public", "player"]);
    expect(tiersVisibleTo("dm")).toEqual(["public", "player", "dm"]);
  });

  it("returns nothing for a clearance value it does not recognise", () => {
    // Feeds an `IN ()` that matches no rows. The failure mode of a bad clearance has to
    // be an empty result, never an unfiltered one.
    expect(tiersVisibleTo("dungeon-master" as never)).toEqual([]);
  });
});

describe("roleOf", () => {
  it("treats a missing role as viewer, the least capable role", () => {
    // Better Auth writes the user row before our hook assigns a role, so null is a real
    // state a live database will contain — not a defensive hypothetical.
    expect(roleOf({ role: null })).toBe("viewer");
    expect(roleOf(undefined)).toBe("viewer");
  });

  it("passes a real role through unchanged", () => {
    for (const role of ROLES) {
      expect(roleOf({ role })).toBe(role);
    }
  });
});

describe("selectionFor", () => {
  it("never selects a dm column for a player", () => {
    // The assertion this whole file exists for.
    for (const kind of ENTITY_KINDS) {
      const selected = Object.keys(selectionFor(kind, "player"));
      const dmFields = Object.entries(ENTITY_FIELD_CLEARANCE[kind])
        .filter(([, tier]) => tier === "dm")
        .map(([field]) => field);

      for (const field of dmFields) {
        expect(selected, `${kind}.${field} would be SELECTed for a player`).not.toContain(field);
      }
    }
  });

  it("never selects a dm column for any role without dm clearance", () => {
    const withoutDm = ROLES.filter((role) => clearanceFor(role) !== "dm");

    for (const role of withoutDm) {
      for (const kind of ENTITY_KINDS) {
        const selected = Object.keys(selectionFor(kind, clearanceFor(role)));
        const dmFields = Object.entries(ENTITY_FIELD_CLEARANCE[kind])
          .filter(([, tier]) => tier === "dm")
          .map(([field]) => field);

        for (const field of dmFields) {
          expect(selected, `${role} would SELECT ${kind}.${field}`).not.toContain(field);
        }
      }
    }
  });

  it("selects the dm columns for dm clearance", () => {
    // The complement. Without it, a `selectionFor` that returned nothing at all would
    // pass every assertion above.
    for (const kind of ENTITY_KINDS) {
      const selected = Object.keys(selectionFor(kind, "dm"));
      const dmFields = Object.entries(ENTITY_FIELD_CLEARANCE[kind])
        .filter(([, tier]) => tier === "dm")
        .map(([field]) => field);

      for (const field of dmFields) {
        expect(selected, `${kind}.${field} missing at dm clearance`).toContain(field);
      }
    }
  });

  it("always selects enough to identify the row", () => {
    // Every tier must get the columns a caller needs to render a link, or the endpoint is
    // useless even where it is permitted.
    for (const kind of ENTITY_KINDS) {
      for (const clearance of ["public", "player", "dm"] as const) {
        const selected = Object.keys(selectionFor(kind, clearance));
        expect(selected, `${kind} at ${clearance}`).toEqual(
          expect.arrayContaining(["id", "kind", "slug", "title"]),
        );
      }
    }
  });

  it("widens monotonically with clearance", () => {
    for (const kind of ENTITY_KINDS) {
      const atPublic = Object.keys(selectionFor(kind, "public"));
      const atPlayer = Object.keys(selectionFor(kind, "player"));
      const atDm = Object.keys(selectionFor(kind, "dm"));

      for (const field of atPublic) expect(atPlayer).toContain(field);
      for (const field of atPlayer) expect(atDm).toContain(field);
    }
  });

  it("selects nothing for an unrecognised clearance", () => {
    const withColumns = ENTITY_KINDS.filter(
      (kind) => Object.keys(selectionFor(kind, "dungeon-master" as never)).length > 0,
    );
    expect(withColumns).toEqual([]);
  });

  it("never selects the join key as if it were content", () => {
    // `entityId` duplicates `entity.id` and has no clearance entry. If it started
    // appearing in results it would be harmless here but would mean `columnsFor` had
    // begun including unclassified columns, which is the mechanism a real leak needs.
    const leaking = ENTITY_KINDS.filter((kind) =>
      Object.keys(selectionFor(kind, "dm")).includes("entityId"),
    );
    expect(leaking).toEqual([]);
  });
});
