import { z } from "zod";

import { userIdSchema } from "./ids";
import { roleSchema } from "./roles";

/**
 * An append-only record of every mutation. Non-negotiable once more than one person can
 * edit (PLAN.md §5).
 *
 * WHY `action` AND `subjectKind` ARE PLAIN STRINGS rather than the enums from @sw/authz.
 *
 * Two reasons, and the second is the important one.
 *
 * 1. Layering. `schemas` is layer 0 and imports nothing internal, including `authz`.
 *
 * 2. A log of what happened must stay readable after the vocabulary moves on. If this
 *    column were `z.enum(ACTIONS)`, then renaming an action — or removing one — would
 *    make every historical row referring to it fail validation. The rows are the record
 *    of what was actually done, and they were true when written; a schema change must
 *    not be able to retroactively invalidate them. Widening the type here is the cost of
 *    that, and it is the right trade for an append-only table.
 *
 * `actorRole` is stored rather than joined to the user's current role for the same
 * reason: the question the log answers is "what could they do at the time", and roles
 * change.
 */
export const auditEntrySchema = z.object({
  id: z.uuid(),
  actorId: userIdSchema,
  /** The actor's role *at the time of the action*, not their role now. */
  actorRole: roleSchema,
  /**
   * Set when an Overlord performed this while impersonating someone. Without it, an
   * impersonated action is indistinguishable from one the impersonated user took
   * themselves, which would make impersonation a way to act without attribution.
   */
  impersonatedBy: userIdSchema.nullable(),
  action: z.string().min(1).max(64),
  subjectKind: z.string().min(1).max(64),
  /** Null for actions with no single subject, e.g. a bulk import. */
  subjectId: z.uuid().nullable(),
  /** Field-level before/after. Null on create and delete respectively. */
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  /** Nullable: a request through a proxy may not carry a usable address. */
  ip: z.string().max(45).nullable(),
  createdAt: z.date(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
