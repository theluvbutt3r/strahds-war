import { z } from "zod";

import { userIdSchema } from "./ids";
import { clears, DEFAULT_VISIBILITY, type Visibility, visibilitySchema } from "./visibility";

/**
 * The nine content types from docs/PLAN.md §5.
 *
 * Typed entities rather than freeform pages: structure is what makes "every NPC in
 * Vallaki loyal to Strahd" answerable, and the rich body is what makes it readable.
 */
export const ENTITY_KINDS = [
  "npc",
  "location",
  "faction",
  "item",
  "session",
  "lore",
  "player_character",
  "handout",
  "rule",
] as const;

export const entityKindSchema = z.enum(ENTITY_KINDS);
export type EntityKind = z.infer<typeof entityKindSchema>;

/**
 * A URL-safe identifier, unique per kind. Lowercase because a wiki link typed at 1am
 * should not miss on capitalisation.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words joined by single hyphens");

/**
 * Fields every entity carries, whatever its kind.
 *
 * `visibility` gates the record as a whole — whether the reader may know the entity
 * exists at all. Individual fields are gated separately by the clearance maps below,
 * which is what lets an NPC be publicly known by name while their allegiance is not.
 *
 * `body` is the prose. In Phase 1 it is plain Markdown and carries the entity's own
 * clearance; the per-block DM-only regions described in PLAN.md §5 arrive with the
 * editor in Phase 4. Until then, DM prose belongs in each kind's `secrets` field, which
 * is a separately-gated column — not in the body with a note asking readers to look away.
 */
export const entityBaseSchema = z.object({
  id: z.uuid(),
  kind: entityKindSchema,
  slug: slugSchema,
  title: z.string().min(1).max(200),
  /** One-line description, used in lists, search results and hover cards. */
  summary: z.string().max(500).nullable(),
  body: z.string(),
  visibility: visibilitySchema.default(DEFAULT_VISIBILITY),
  /** Unpublished entities are drafts: visible to their author and to anyone who can publish. */
  published: z.boolean().default(false),
  authorId: userIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EntityBase = z.infer<typeof entityBaseSchema>;

// ---------------------------------------------------------------------------
// Per-kind structured fields
// ---------------------------------------------------------------------------

export const NPC_STATUSES = ["alive", "dead", "undead", "missing", "unknown"] as const;
export const npcStatusSchema = z.enum(NPC_STATUSES);

export const npcFieldsSchema = z.object({
  /** "The Burgomaster of Vallaki" — the epithet, distinct from the name in `title`. */
  epithet: z.string().max(200).nullable(),
  status: npcStatusSchema,
  /** Where they are usually found. */
  locationId: z.uuid().nullable(),
  /** The allegiance they profess. What is actually true is `trueAllegiance`. */
  factionId: z.uuid().nullable(),
  portraitUrl: z.url().nullable(),
  /**
   * The allegiance that is actually true, when it differs from the professed one.
   *
   * This field is the reason the whole architecture is shaped the way it is: an NPC
   * record has to be simultaneously readable and secret, so the split is per field
   * rather than per page.
   */
  trueAllegiance: z.string().max(200).nullable(),
  /** DM prose: motives, betrayals, what happens if the party pushes. */
  secrets: z.string().nullable(),
  /** 5e stat block, as Markdown until the editor's stat-block node lands in Phase 4. */
  statBlock: z.string().nullable(),
});

export const LOCATION_TYPES = [
  "region",
  "settlement",
  "building",
  "dungeon",
  "landmark",
  "wilderness",
] as const;

export const locationFieldsSchema = z.object({
  locationType: z.enum(LOCATION_TYPES),
  /** Locations nest: a room in a castle in a valley. */
  parentLocationId: z.uuid().nullable(),
  mapUrl: z.url().nullable(),
  /** What the party can see on arrival. */
  approach: z.string().nullable(),
  /** Traps, ambushes, what is really down there. */
  secrets: z.string().nullable(),
  /** Encounter budget and pacing notes for running the place. */
  dmNotes: z.string().nullable(),
});

export const factionFieldsSchema = z.object({
  motto: z.string().max(300).nullable(),
  headquartersLocationId: z.uuid().nullable(),
  leaderNpcId: z.uuid().nullable(),
  /** What the faction says it wants. */
  statedGoals: z.string().nullable(),
  /** What it actually wants, when those differ. */
  trueGoals: z.string().nullable(),
  secrets: z.string().nullable(),
});

export const ITEM_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
] as const;

export const itemFieldsSchema = z.object({
  rarity: z.enum(ITEM_RARITIES),
  requiresAttunement: z.boolean(),
  /** Who holds it now, if anyone. */
  ownerNpcId: z.uuid().nullable(),
  locationId: z.uuid().nullable(),
  /** Mechanical properties the party learns on identifying it. */
  properties: z.string().nullable(),
  /** Barovia runs on cursed gifts; the curse is not on the label. */
  curse: z.string().nullable(),
  secrets: z.string().nullable(),
});

export const sessionFieldsSchema = z.object({
  sessionNumber: z.number().int().positive(),
  playedOn: z.date().nullable(),
  /** The recap players may read afterwards. */
  recap: z.string().nullable(),
  /** Prep, contingencies, and what the party missed. */
  dmNotes: z.string().nullable(),
});

export const LORE_CATEGORIES = [
  "history",
  "religion",
  "rumour",
  "prophecy",
  "folklore",
  "cosmology",
] as const;

export const loreFieldsSchema = z.object({
  category: z.enum(LORE_CATEGORIES),
  /** Where the party heard it — a Vistani, a drunk, a book. */
  source: z.string().max(300).nullable(),
  /**
   * Whether the lore is actually true.
   *
   * Deliberately nullable and DM-only. Half of Barovian folklore is wrong, and which
   * half is exactly the thing a player must not be able to look up.
   */
  isAccurate: z.boolean().nullable(),
  secrets: z.string().nullable(),
});

export const playerCharacterFieldsSchema = z.object({
  /** The account that owns this character. */
  playerUserId: userIdSchema.nullable(),
  ancestry: z.string().max(100).nullable(),
  characterClass: z.string().max(100).nullable(),
  level: z.number().int().min(1).max(20),
  /** Written by the player, read by the table. */
  backstory: z.string().nullable(),
  /** Hooks the DM intends to pull on. The player must not read their own. */
  dmHooks: z.string().nullable(),
});

export const HANDOUT_TYPES = ["letter", "map", "image", "prop", "tarokka"] as const;

export const handoutFieldsSchema = z.object({
  handoutType: z.enum(HANDOUT_TYPES),
  assetUrl: z.url().nullable(),
  /** Null until the handout is given out in play. */
  revealedAt: z.date().nullable(),
  /** What the handout actually means. */
  secrets: z.string().nullable(),
});

export const ruleFieldsSchema = z.object({
  /** The official rule this homebrew replaces, if any. */
  replaces: z.string().max(200).nullable(),
  /** The mechanic, as the table plays it. */
  mechanics: z.string().nullable(),
  /** Why it exists and how to adjudicate the edge cases. */
  dmGuidance: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Field-level clearance
// ---------------------------------------------------------------------------

/**
 * The clearance a reader needs for each individual field of a kind.
 *
 * `Record<keyof T, Visibility>` rather than a partial map, and that is the whole point:
 * adding a field to a schema above without classifying it here is a **compile error**,
 * not a field that quietly defaults to something. There is no safe default to pick —
 * defaulting to `dm` hides fields nobody meant to hide, defaulting to `player` leaks —
 * so the type system asks the question instead of an unwritten convention answering it.
 *
 * Note this describes *fields*, not the record. Whether a reader may see the entity at
 * all is `entity.visibility`; this decides which columns come back once they may.
 */
export type FieldClearance<T> = Readonly<Record<keyof T, Visibility>>;

export const ENTITY_BASE_CLEARANCE: FieldClearance<EntityBase> = {
  id: "public",
  kind: "public",
  slug: "public",
  title: "public",
  summary: "public",
  body: "player",
  visibility: "public",
  published: "public",
  authorId: "player",
  createdAt: "public",
  updatedAt: "public",
};

export const NPC_FIELD_CLEARANCE: FieldClearance<z.infer<typeof npcFieldsSchema>> = {
  epithet: "public",
  status: "player",
  locationId: "player",
  factionId: "player",
  portraitUrl: "public",
  trueAllegiance: "dm",
  secrets: "dm",
  statBlock: "dm",
};

export const LOCATION_FIELD_CLEARANCE: FieldClearance<z.infer<typeof locationFieldsSchema>> = {
  locationType: "public",
  parentLocationId: "public",
  mapUrl: "player",
  approach: "player",
  secrets: "dm",
  dmNotes: "dm",
};

export const FACTION_FIELD_CLEARANCE: FieldClearance<z.infer<typeof factionFieldsSchema>> = {
  motto: "public",
  headquartersLocationId: "player",
  leaderNpcId: "player",
  statedGoals: "player",
  trueGoals: "dm",
  secrets: "dm",
};

export const ITEM_FIELD_CLEARANCE: FieldClearance<z.infer<typeof itemFieldsSchema>> = {
  rarity: "player",
  requiresAttunement: "player",
  ownerNpcId: "dm",
  locationId: "dm",
  properties: "player",
  curse: "dm",
  secrets: "dm",
};

export const SESSION_FIELD_CLEARANCE: FieldClearance<z.infer<typeof sessionFieldsSchema>> = {
  sessionNumber: "player",
  playedOn: "player",
  recap: "player",
  dmNotes: "dm",
};

export const LORE_FIELD_CLEARANCE: FieldClearance<z.infer<typeof loreFieldsSchema>> = {
  category: "player",
  source: "player",
  isAccurate: "dm",
  secrets: "dm",
};

export const PLAYER_CHARACTER_FIELD_CLEARANCE: FieldClearance<
  z.infer<typeof playerCharacterFieldsSchema>
> = {
  playerUserId: "player",
  ancestry: "player",
  characterClass: "player",
  level: "player",
  backstory: "player",
  dmHooks: "dm",
};

export const HANDOUT_FIELD_CLEARANCE: FieldClearance<z.infer<typeof handoutFieldsSchema>> = {
  handoutType: "player",
  assetUrl: "player",
  revealedAt: "player",
  secrets: "dm",
};

export const RULE_FIELD_CLEARANCE: FieldClearance<z.infer<typeof ruleFieldsSchema>> = {
  replaces: "player",
  mechanics: "player",
  dmGuidance: "dm",
};

/** Every kind's structured-field schema, keyed by kind. */
export const ENTITY_FIELD_SCHEMAS = {
  npc: npcFieldsSchema,
  location: locationFieldsSchema,
  faction: factionFieldsSchema,
  item: itemFieldsSchema,
  session: sessionFieldsSchema,
  lore: loreFieldsSchema,
  player_character: playerCharacterFieldsSchema,
  handout: handoutFieldsSchema,
  rule: ruleFieldsSchema,
} as const satisfies Record<EntityKind, z.ZodObject>;

/**
 * Every kind's field clearances, keyed by kind.
 *
 * `satisfies Record<EntityKind, …>` makes a new entity kind fail to compile until its
 * clearances are written down, the same way the maps above do for individual fields.
 */
export const ENTITY_FIELD_CLEARANCE = {
  npc: NPC_FIELD_CLEARANCE,
  location: LOCATION_FIELD_CLEARANCE,
  faction: FACTION_FIELD_CLEARANCE,
  item: ITEM_FIELD_CLEARANCE,
  session: SESSION_FIELD_CLEARANCE,
  lore: LORE_FIELD_CLEARANCE,
  player_character: PLAYER_CHARACTER_FIELD_CLEARANCE,
  handout: HANDOUT_FIELD_CLEARANCE,
  rule: RULE_FIELD_CLEARANCE,
} as const satisfies Record<EntityKind, Readonly<Record<string, Visibility>>>;

/**
 * The field names a reader at `clearance` may receive for `kind` — base fields and the
 * kind's own, together, because a caller building a query needs one list.
 *
 * This is the list `services/api` turns into a column selection. Fields above the
 * reader's clearance are absent from the SQL, so they are never fetched, never
 * serialised, and cannot be leaked by a later refactor of the response shape.
 *
 * Sorted so that callers and snapshots see a stable order regardless of key insertion.
 */
export function visibleFieldsFor(kind: EntityKind, clearance: Visibility): readonly string[] {
  const combined: Record<string, Visibility> = {
    ...ENTITY_BASE_CLEARANCE,
    ...ENTITY_FIELD_CLEARANCE[kind],
  };

  return Object.keys(combined)
    .filter((field) => clears(clearance, combined[field]!))
    .sort();
}

/**
 * Drops every field of `record` that sits above `clearance`.
 *
 * A defence in depth, not the primary mechanism. The primary mechanism is that the
 * query never selects those columns (see `visibleFieldsFor`); this exists for the paths
 * where a full row is already in hand — a revision snapshot, a seeded fixture, an audit
 * diff — and for tests that want to assert the stripping independently of SQL.
 *
 * Unknown fields are dropped rather than passed through. A key with no declared
 * clearance is a field somebody added without classifying, and the safe reading of that
 * is "not cleared".
 */
export function projectFields<T extends Record<string, unknown>>(
  kind: EntityKind,
  clearance: Visibility,
  record: T,
): Partial<T> {
  const allowed = new Set(visibleFieldsFor(kind, clearance));
  const out: Partial<T> = {};

  for (const key of Object.keys(record) as (keyof T & string)[]) {
    if (allowed.has(key)) out[key] = record[key];
  }

  return out;
}
