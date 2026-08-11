import {
  ENTITY_FIELD_CLEARANCE,
  ENTITY_FIELD_SCHEMAS,
  slugSchema,
  VISIBILITY_TIERS,
} from "@sw/schemas";
import { describe, expect, it } from "vitest";

import { SEED_ENTITIES, SEED_LINKS } from "./seed-data";

/**
 * What is worth asserting about a seed.
 *
 * Not "does it insert" — that needs a database and is the migration's problem. What
 * matters here is that the seed is *useful as a test fixture*: if every row were
 * player-visible, every spoiler test downstream would pass without proving anything, and
 * the suite would look green while checking nothing.
 */

describe("seed coverage", () => {
  it("spans all three clearance tiers", () => {
    const tiers = new Set(SEED_ENTITIES.map((entity) => entity.visibility));
    expect([...tiers].sort()).toEqual([...VISIBILITY_TIERS].sort());
  });

  it("includes at least one unpublished draft", () => {
    // The draft path is a separate gate from the tier gate, and a seed with nothing
    // unpublished cannot exercise it.
    const drafts = SEED_ENTITIES.filter((entity) => !entity.published);
    expect(drafts.length).toBeGreaterThan(0);
  });

  it("includes entities that are public overall but carry dm-only fields", () => {
    // The case the whole per-field model exists for: a record simultaneously readable and
    // secret. A seed without one would let a per-entity filter pass every test while the
    // per-field filter was broken.
    const mixed = SEED_ENTITIES.filter((entity) => {
      if (entity.visibility === "dm") return false;
      const clearance = ENTITY_FIELD_CLEARANCE[entity.kind] as Record<string, string>;
      return Object.entries(entity.detail).some(
        ([field, value]) => clearance[field] === "dm" && value !== null,
      );
    });

    expect(mixed.length).toBeGreaterThan(0);
  });

  it("gives every entity a valid slug", () => {
    const invalid = SEED_ENTITIES.filter((entity) => !slugSchema.safeParse(entity.slug).success);
    expect(invalid.map((entity) => entity.slug)).toEqual([]);
  });

  it("has no duplicate slugs within a kind", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const entity of SEED_ENTITIES) {
      const key = `${entity.kind}/${entity.slug}`;
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }

    expect(duplicates).toEqual([]);
  });

  it("only sets detail fields the kind actually declares", () => {
    // Catches a seed entry written against the wrong kind's shape — which would fail at
    // insert time with a Postgres error naming a column, rather than here naming the
    // entry.
    const problems: string[] = [];

    for (const entity of SEED_ENTITIES) {
      const declared = Object.keys(ENTITY_FIELD_SCHEMAS[entity.kind].shape);
      for (const field of Object.keys(entity.detail)) {
        if (!declared.includes(field)) {
          problems.push(`${entity.kind}/${entity.slug}: unknown field "${field}"`);
        }
      }
    }

    expect(problems).toEqual([]);
  });
});

describe("seed links", () => {
  it("only references entities that are seeded", () => {
    const slugs = new Set(SEED_ENTITIES.map((entity) => entity.slug));
    const dangling = SEED_LINKS.filter((link) => !slugs.has(link.from) || !slugs.has(link.to));

    expect(dangling.map((link) => `${link.from} -> ${link.to}`)).toEqual([]);
  });

  it("includes a dm-tier edge between two player-visible entities", () => {
    // The property that makes edge filtering testable at all: Ireena and Tatyana are both
    // visible, and the connection between them is the secret. A seed without such an edge
    // would let "filter the nodes, return every edge" pass unnoticed.
    const bySlug = new Map(SEED_ENTITIES.map((entity) => [entity.slug, entity]));

    const hiddenEdgesBetweenVisibleNodes = SEED_LINKS.filter((link) => {
      const from = bySlug.get(link.from);
      const to = bySlug.get(link.to);
      return link.visibility === "dm" && from?.visibility !== "dm" && to?.visibility !== "dm";
    });

    expect(hiddenEdgesBetweenVisibleNodes.length).toBeGreaterThan(0);
  });

  it("has no self-referencing edges", () => {
    const loops = SEED_LINKS.filter((link) => link.from === link.to);
    expect(loops).toEqual([]);
  });
});
