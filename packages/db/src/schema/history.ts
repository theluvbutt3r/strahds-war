import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { roleEnum, user } from "./auth";
import { entity, entityKindEnum } from "./content";

/**
 * The two append-only histories: what the content used to say, and who did what.
 *
 * Neither table is ever UPDATEd. That is a property the application has to maintain —
 * Postgres has no "append-only" switch short of a trigger or a restricted role — so it is
 * stated here and enforced by there being no update helper in ../queries.ts.
 */

/**
 * One saved version of an entity.
 *
 * `snapshot` holds every field at that version, **including DM-tier ones**. That makes
 * this table exactly as sensitive as the content it mirrors: a revision endpoint that
 * returned raw snapshots would bypass the entire visibility model in one step. Reading a
 * revision has to run the snapshot through `projectFields` from @sw/schemas first.
 */
export const revision = pgTable(
  "revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    entityKind: entityKindEnum("entity_kind").notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    /**
     * `set null` rather than `cascade`: deleting a user must not delete the history of
     * what they changed. An unattributed revision is still evidence.
     */
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Version numbers are per entity and must not collide. Two concurrent saves that
    // both computed "next version = 4" produce one success and one constraint violation,
    // which is the correct outcome: the loser retries against the row that won rather
    // than overwriting it.
    uniqueIndex("revision_entity_version_idx").on(table.entityId, table.version),
    index("revision_entity_idx").on(table.entityId),
  ],
);

/**
 * Every mutation, forever.
 *
 * `actorRole` is stored rather than joined, because the question this table answers is
 * "what were they allowed to do at the time" and roles change. Joining to the user's
 * current role would rewrite history every time somebody is promoted.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorRole: roleEnum("actor_role").notNull(),
    /** Set when the action was taken inside an impersonated session. */
    impersonatedBy: text("impersonated_by").references(() => user.id, { onDelete: "set null" }),
    /**
     * Plain text, not an enum, and deliberately so.
     *
     * An enum would make renaming or retiring a capability retroactively invalidate every
     * historical row that mentions it. These rows record what was actually done, and they
     * were true when written; a later vocabulary change must not be able to falsify them.
     */
    action: text("action").notNull(),
    subjectKind: text("subject_kind").notNull(),
    subjectId: uuid("subject_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_actor_idx").on(table.actorId),
    index("audit_log_subject_idx").on(table.subjectKind, table.subjectId),
    // The audit log is read newest-first, always.
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);
