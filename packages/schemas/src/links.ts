import { z } from "zod";

import { DEFAULT_VISIBILITY, visibilitySchema } from "./visibility";

/**
 * How one entity relates to another.
 *
 * Relations are directed and named rather than a generic "related to", because the
 * campaign questions worth asking are directional: who serves Strahd is a different
 * query from who Strahd serves.
 */
export const RELATION_KINDS = [
  "located_in",
  "member_of",
  "leads",
  "allied_with",
  "opposes",
  "owns",
  "appears_in",
  "parent_of",
  "related_to",
] as const;

export const relationKindSchema = z.enum(RELATION_KINDS);
export type RelationKind = z.infer<typeof relationKindSchema>;

/**
 * An edge in the entity graph.
 *
 * Edges carry their own visibility, and that is not incidental. "Ireena Kolyana —
 * related_to → Tatyana" is a spoiler even when both entities are player-visible and the
 * edge reveals nothing else; the existence of the connection *is* the secret. Filtering
 * only the nodes and returning every edge would leak the shape of the plot while
 * appearing to hide it — the failure mode ADR 0002 rejects for pages, arriving through
 * the graph instead.
 *
 * Defaults to `player` for the same fail-closed reason as content.
 */
export const entityLinkSchema = z.object({
  id: z.uuid(),
  fromEntityId: z.uuid(),
  toEntityId: z.uuid(),
  relation: relationKindSchema,
  /** Optional prose shown on the edge, e.g. "under duress". */
  note: z.string().max(300).nullable(),
  visibility: visibilitySchema.default(DEFAULT_VISIBILITY),
  createdAt: z.date(),
});

export type EntityLink = z.infer<typeof entityLinkSchema>;
