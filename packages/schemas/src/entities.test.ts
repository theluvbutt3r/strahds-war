import { describe, expect, it } from "vitest";

import {
  ENTITY_BASE_CLEARANCE,
  ENTITY_FIELD_CLEARANCE,
  ENTITY_FIELD_SCHEMAS,
  ENTITY_KINDS,
  type EntityKind,
  projectFields,
  slugSchema,
  visibleFieldsFor,
} from "./entities";
import { clearanceFor, ROLES } from "./roles";
import { clears, VISIBILITY_TIERS } from "./visibility";

describe("entity kinds", () => {
  it("declares field schemas and clearances for every kind", () => {
    // `satisfies Record<EntityKind, …>` makes this a compile error too. The runtime
    // assertion is here because the compile-time one disappears the moment somebody
    // widens a type to unblock themselves, and this is the map that decides what leaves
    // the server.
    for (const kind of ENTITY_KINDS) {
      expect(ENTITY_FIELD_SCHEMAS[kind], `no field schema for ${kind}`).toBeDefined();
      expect(ENTITY_FIELD_CLEARANCE[kind], `no clearance map for ${kind}`).toBeDefined();
    }
  });

  it("classifies every declared field of every kind", () => {
    // The gap this catches: a field added to a Zod schema but not to the clearance map.
    // TypeScript rejects that today, so this asserts the two stay in step at runtime as
    // well — an unclassified field would otherwise be dropped silently by
    // `visibleFieldsFor` and read as "the API just doesn't return that yet".
    for (const kind of ENTITY_KINDS) {
      const declared = Object.keys(ENTITY_FIELD_SCHEMAS[kind].shape).sort();
      const classified = Object.keys(ENTITY_FIELD_CLEARANCE[kind]).sort();
      expect(classified, `${kind}: schema and clearance map disagree`).toEqual(declared);
    }
  });

  it("assigns every field a real visibility tier", () => {
    for (const kind of ENTITY_KINDS) {
      for (const [field, tier] of Object.entries(ENTITY_FIELD_CLEARANCE[kind])) {
        expect(VISIBILITY_TIERS, `${kind}.${field} has tier "${tier}"`).toContain(tier);
      }
    }
  });
});

describe("visibleFieldsFor", () => {
  it("never returns a dm field to a player-clearance reader", () => {
    // The single most important assertion in this file. If it fails, the query layer
    // selects a DM column for a player and the campaign is spoiled.
    for (const kind of ENTITY_KINDS) {
      const visible = visibleFieldsFor(kind, "player");
      const combined = { ...ENTITY_BASE_CLEARANCE, ...ENTITY_FIELD_CLEARANCE[kind] } as Record<
        string,
        string
      >;

      for (const field of visible) {
        expect(combined[field], `${kind}.${field} leaked to player clearance`).not.toBe("dm");
      }
    }
  });

  it("hides player fields from a public-clearance reader", () => {
    for (const kind of ENTITY_KINDS) {
      const visible = visibleFieldsFor(kind, "public");
      const combined = { ...ENTITY_BASE_CLEARANCE, ...ENTITY_FIELD_CLEARANCE[kind] } as Record<
        string,
        string
      >;

      for (const field of visible) {
        expect(combined[field], `${kind}.${field} leaked to public clearance`).toBe("public");
      }
    }
  });

  it("widens monotonically as clearance rises", () => {
    // public ⊆ player ⊆ dm, for every kind. A tier that returned a field its superior
    // does not would mean the tiers are not a chain, which the whole model assumes.
    for (const kind of ENTITY_KINDS) {
      const publicFields = new Set(visibleFieldsFor(kind, "public"));
      const playerFields = new Set(visibleFieldsFor(kind, "player"));
      const dmFields = new Set(visibleFieldsFor(kind, "dm"));

      for (const field of publicFields) expect(playerFields).toContain(field);
      for (const field of playerFields) expect(dmFields).toContain(field);
    }
  });

  it("returns every declared field at dm clearance", () => {
    for (const kind of ENTITY_KINDS) {
      const expected = [
        ...Object.keys(ENTITY_BASE_CLEARANCE),
        ...Object.keys(ENTITY_FIELD_CLEARANCE[kind]),
      ].sort();
      expect(visibleFieldsFor(kind, "dm")).toEqual(expected);
    }
  });

  it("keeps every kind's secrets out of reach of every non-dm role", () => {
    // Walks roles rather than tiers, so it fails if ROLE_CLEARANCE changes even when the
    // field maps do not. Chronicler is the role this is really about: it can write lore
    // and must still never read a secret.
    const nonDmRoles = ROLES.filter((role) => !clears(clearanceFor(role), "dm"));
    expect(nonDmRoles).toEqual(["viewer", "player", "chronicler"]);

    for (const role of nonDmRoles) {
      for (const kind of ENTITY_KINDS) {
        const visible = visibleFieldsFor(kind, clearanceFor(role));
        const dmFields = Object.entries(ENTITY_FIELD_CLEARANCE[kind])
          .filter(([, tier]) => tier === "dm")
          .map(([field]) => field);

        for (const field of dmFields) {
          expect(visible, `${role} can see ${kind}.${field}`).not.toContain(field);
        }
      }
    }
  });

  it("gives every kind at least one dm-only field", () => {
    // Not a property of the model so much as a check on the content design: a kind with
    // no secrets at all is usually one where somebody forgot to classify, and this is
    // cheaper to notice here than in play.
    for (const kind of ENTITY_KINDS) {
      const dmFields = Object.values(ENTITY_FIELD_CLEARANCE[kind]).filter((t) => t === "dm");
      expect(dmFields.length, `${kind} has no dm-tier field`).toBeGreaterThan(0);
    }
  });
});

describe("projectFields", () => {
  const npcRow = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    kind: "npc" as const,
    slug: "izek-strazni",
    title: "Izek Strazni",
    epithet: "The Baron's Enforcer",
    status: "alive",
    trueAllegiance: "Obsessed with Ireena; loyal to no one else",
    secrets: "His fiend-arm is a mark of Baba Lysaga's meddling.",
    statBlock: "AC 15, HP 91",
  };

  it("strips dm fields for a player", () => {
    const projected = projectFields("npc", "player", npcRow);

    expect(projected.title).toBe("Izek Strazni");
    expect(projected.epithet).toBe("The Baron's Enforcer");
    expect(projected).not.toHaveProperty("trueAllegiance");
    expect(projected).not.toHaveProperty("secrets");
    expect(projected).not.toHaveProperty("statBlock");
  });

  it("keeps dm fields for dm clearance", () => {
    const projected = projectFields("npc", "dm", npcRow);
    expect(projected.secrets).toBe("His fiend-arm is a mark of Baba Lysaga's meddling.");
    expect(projected.trueAllegiance).toBeDefined();
  });

  it("drops fields it has no clearance rule for", () => {
    // Fails closed on the field it was never told about. An unclassified column reaching
    // a response would be exactly the leak this model exists to prevent, and "we added a
    // column and forgot the map" is the likeliest way it happens.
    const withStray = { ...npcRow, undocumentedSecret: "Strahd's true name" };
    const projected = projectFields("npc", "dm", withStray);

    expect(projected).not.toHaveProperty("undocumentedSecret");
  });

  it("does not mutate the row it was given", () => {
    const before = { ...npcRow };
    projectFields("npc", "public", npcRow);
    expect(npcRow).toEqual(before);
  });

  it("returns nothing beyond public fields for an unknown clearance value", () => {
    // Mirrors the fail-closed test on `clears`: a tier string from an old row or a typo
    // must deny rather than default to permissive.
    const bogus = "dungeon-master" as never;
    expect(projectFields("npc", bogus, npcRow)).toEqual({});
  });
});

describe("slugs", () => {
  it("accepts lowercase hyphenated words", () => {
    const rejected = ["strahd-von-zarovich", "vallaki", "tarokka-deck", "n1"].filter(
      (slug) => !slugSchema.safeParse(slug).success,
    );
    expect(rejected).toEqual([]);
  });

  it("rejects spellings that would make a wikilink miss", () => {
    // Wikilinks are typed by hand mid-session. Uppercase, spaces, and doubled or edge
    // hyphens are the near-misses that would silently create a second page.
    const accepted = ["Vallaki", "old vallaki", "-vallaki", "vallaki-", "vallaki--town", ""].filter(
      (slug) => slugSchema.safeParse(slug).success,
    );
    expect(accepted).toEqual([]);
  });
});

describe("entity kind coverage", () => {
  it("covers the nine kinds named in the plan", () => {
    const expected: EntityKind[] = [
      "npc",
      "location",
      "faction",
      "item",
      "session",
      "lore",
      "player_character",
      "handout",
      "rule",
    ];
    expect([...ENTITY_KINDS].sort()).toEqual([...expected].sort());
  });
});
