import {
  ENTITY_KINDS,
  HANDOUT_TYPES,
  ITEM_RARITIES,
  LOCATION_TYPES,
  LORE_CATEGORIES,
  NPC_STATUSES,
  RELATION_KINDS,
  VISIBILITY_TIERS,
} from "@sw/schemas";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * The content tables.
 *
 * SHAPE: one shared `entity` table carrying everything true of all nine kinds, plus a
 * detail table per kind holding that kind's structured fields. The alternative — a single
 * table with a `jsonb` blob of kind-specific fields — was rejected because it gives up
 * exactly what PLAN.md §5 says the typed model is for: a foreign key from an NPC to their
 * faction, so that deleting a faction cannot silently orphan NPCs, and so that "every NPC
 * in Vallaki loyal to Strahd" is a query rather than a scan.
 *
 * Every enum here is derived from the corresponding list in @sw/schemas rather than
 * retyped. One definition per fact: adding a status to `NPC_STATUSES` changes the Zod
 * schema, the database type, and the generated migration together.
 */

export const visibilityEnum = pgEnum("visibility", VISIBILITY_TIERS);
export const entityKindEnum = pgEnum("entity_kind", ENTITY_KINDS);
export const relationKindEnum = pgEnum("relation_kind", RELATION_KINDS);
export const npcStatusEnum = pgEnum("npc_status", NPC_STATUSES);
export const locationTypeEnum = pgEnum("location_type", LOCATION_TYPES);
export const itemRarityEnum = pgEnum("item_rarity", ITEM_RARITIES);
export const loreCategoryEnum = pgEnum("lore_category", LORE_CATEGORIES);
export const handoutTypeEnum = pgEnum("handout_type", HANDOUT_TYPES);

/**
 * Everything common to all nine kinds.
 *
 * `visibility` gates the record as a whole. It is `notNull` with a `player` default, and
 * both halves of that matter: a row cannot exist without a clearance, and the clearance
 * it gets when nobody said is the hidden one (ADR 0002). The default lives in the
 * database rather than only in Zod so that an INSERT from a migration, a seed, or a
 * psql session gets it too.
 */
export const entity = pgTable(
  "entity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: entityKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body").notNull().default(""),
    visibility: visibilityEnum("visibility").notNull().default("player"),
    published: boolean("published").notNull().default(false),
    /**
     * `set null` rather than `cascade`: deleting a user must not delete the campaign
     * they wrote. The authorship is lost, which is the lesser harm and the recoverable
     * one — the audit log still records who created what.
     */
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Slugs are unique per kind, not globally: a location and a faction may both
    // reasonably be called "vallaki".
    uniqueIndex("entity_kind_slug_idx").on(table.kind, table.slug),
    index("entity_kind_idx").on(table.kind),
    // The index the read path actually uses — every list query filters on both.
    index("entity_visibility_published_idx").on(table.visibility, table.published),
  ],
);

/** Shorthand for the FK every detail table shares. */
const entityRef = () =>
  uuid("entity_id")
    .primaryKey()
    .references(() => entity.id, { onDelete: "cascade" });

export const npc = pgTable(
  "npc",
  {
    entityId: entityRef(),
    epithet: text("epithet"),
    status: npcStatusEnum("status").notNull().default("unknown"),
    locationId: uuid("location_id").references(() => entity.id, { onDelete: "set null" }),
    factionId: uuid("faction_id").references(() => entity.id, { onDelete: "set null" }),
    portraitUrl: text("portrait_url"),
    trueAllegiance: text("true_allegiance"),
    secrets: text("secrets"),
    statBlock: text("stat_block"),
  },
  (table) => [
    index("npc_faction_idx").on(table.factionId),
    index("npc_location_idx").on(table.locationId),
  ],
);

export const location = pgTable("location", {
  entityId: entityRef(),
  locationType: locationTypeEnum("location_type").notNull(),
  parentLocationId: uuid("parent_location_id").references(() => entity.id, {
    onDelete: "set null",
  }),
  mapUrl: text("map_url"),
  approach: text("approach"),
  secrets: text("secrets"),
  dmNotes: text("dm_notes"),
});

export const faction = pgTable("faction", {
  entityId: entityRef(),
  motto: text("motto"),
  headquartersLocationId: uuid("headquarters_location_id").references(() => entity.id, {
    onDelete: "set null",
  }),
  leaderNpcId: uuid("leader_npc_id").references(() => entity.id, { onDelete: "set null" }),
  statedGoals: text("stated_goals"),
  trueGoals: text("true_goals"),
  secrets: text("secrets"),
});

export const item = pgTable("item", {
  entityId: entityRef(),
  rarity: itemRarityEnum("rarity").notNull().default("common"),
  requiresAttunement: boolean("requires_attunement").notNull().default(false),
  ownerNpcId: uuid("owner_npc_id").references(() => entity.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => entity.id, { onDelete: "set null" }),
  properties: text("properties"),
  curse: text("curse"),
  secrets: text("secrets"),
});

export const gameSession = pgTable(
  "game_session",
  {
    entityId: entityRef(),
    sessionNumber: integer("session_number").notNull(),
    playedOn: timestamp("played_on", { withTimezone: true }),
    recap: text("recap"),
    dmNotes: text("dm_notes"),
  },
  // "session" is taken by Better Auth, hence the table name `game_session`. Worth an
  // index anyway: session numbers are the natural ordering of the campaign timeline.
  (table) => [uniqueIndex("game_session_number_idx").on(table.sessionNumber)],
);

export const lore = pgTable("lore", {
  entityId: entityRef(),
  category: loreCategoryEnum("category").notNull(),
  source: text("source"),
  /** Nullable and DM-tier: whether a piece of Barovian folklore is actually true. */
  isAccurate: boolean("is_accurate"),
  secrets: text("secrets"),
});

export const playerCharacter = pgTable("player_character", {
  entityId: entityRef(),
  /**
   * The account that owns this character.
   *
   * Distinct from `entity.authorId`, which records who typed the page. They are usually
   * the same person and must not be assumed to be: a DM who creates a character page on
   * a player's behalf is the author, while the player is the owner, and it is the owner
   * that `can(actor, "update", …)` must eventually respect.
   */
  playerUserId: text("player_user_id").references(() => user.id, { onDelete: "set null" }),
  ancestry: text("ancestry"),
  characterClass: text("character_class"),
  level: integer("level").notNull().default(1),
  backstory: text("backstory"),
  dmHooks: text("dm_hooks"),
});

export const handout = pgTable("handout", {
  entityId: entityRef(),
  handoutType: handoutTypeEnum("handout_type").notNull(),
  assetUrl: text("asset_url"),
  revealedAt: timestamp("revealed_at", { withTimezone: true }),
  secrets: text("secrets"),
});

export const rule = pgTable("rule", {
  entityId: entityRef(),
  replaces: text("replaces"),
  mechanics: text("mechanics"),
  dmGuidance: text("dm_guidance"),
});

/**
 * The relationship graph.
 *
 * `visibility` on the edge is load-bearing and easy to leave out. "Ireena — related_to →
 * Tatyana" is a spoiler even when both endpoints are player-visible, because the
 * connection itself is the secret. Filtering nodes but returning every edge would leak
 * the shape of the plot while looking like it hid it.
 */
export const entityLink = pgTable(
  "entity_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromEntityId: uuid("from_entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    toEntityId: uuid("to_entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    relation: relationKindEnum("relation").notNull(),
    note: text("note"),
    visibility: visibilityEnum("visibility").notNull().default("player"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entity_link_unique_idx").on(table.fromEntityId, table.toEntityId, table.relation),
    index("entity_link_from_idx").on(table.fromEntityId),
    index("entity_link_to_idx").on(table.toEntityId),
  ],
);
