import { z } from "zod";

import { entityKindSchema } from "./entities";
import { userIdSchema } from "./ids";

/**
 * One saved version of an entity. Append-only: every save writes a new row and nothing
 * ever updates one.
 *
 * From PLAN.md §5: "You will at some point overwrite something at 1am before a session,
 * and this is the thing that saves it."
 *
 * `snapshot` holds the entity's full field set at that version — every field, including
 * DM-tier ones. That makes the revision table exactly as sensitive as the content it
 * mirrors, so reading a revision goes through the same clearance projection as reading
 * the entity, and `projectFields` in entities.ts is what applies it. A revision endpoint
 * that returns raw snapshots would be a complete bypass of the visibility model, which
 * is worth stating here rather than discovering later.
 */
export const revisionSchema = z.object({
  id: z.uuid(),
  entityId: z.uuid(),
  entityKind: entityKindSchema,
  /** Monotonic per entity, starting at 1. */
  version: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()),
  /** Who saved it. Not nullable: an unattributed revision defeats the audit trail. */
  authorId: userIdSchema,
  /** Optional "why", written by the author at save time. */
  note: z.string().max(500).nullable(),
  createdAt: z.date(),
});

export type Revision = z.infer<typeof revisionSchema>;
