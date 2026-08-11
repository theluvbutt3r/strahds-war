import {
  clears,
  type EntityKind,
  type Role,
  type Visibility,
  VISIBILITY_TIERS,
  visibleFieldsFor,
} from "@sw/schemas";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { type PgColumn } from "drizzle-orm/pg-core";

import * as schema from "./schema";

import type { Database } from "./client";

/**
 * The read path, and the only place spoiler filtering happens.
 *
 * ADR 0005 makes `services/api` the sole importer of this package precisely so that this
 * file can be the single auditable chokepoint. The filtering is done **in the query**:
 * columns above the reader's clearance are not selected, so they are never fetched, never
 * held in memory, and cannot be leaked by a later change to how responses are shaped.
 * Fetching everything and deleting keys afterwards would be one refactor away from a leak
 * every time.
 */

/**
 * The tiers a holder of `clearance` may see, as a list Postgres can match with `IN`.
 *
 * Derived from `clears()` rather than written out, so the two cannot disagree — and an
 * unknown clearance value yields an empty list, which makes the resulting `IN ()` match
 * nothing. Fail-closed by construction: a bad clearance returns no rows rather than all
 * of them.
 */
export function tiersVisibleTo(clearance: Visibility): Visibility[] {
  return VISIBILITY_TIERS.filter((tier) => clears(clearance, tier));
}

/** The role to treat a user as when the column is null. See the note on `user.role`. */
export function roleOf(row: { role: Role | null } | undefined): Role {
  return row?.role ?? "viewer";
}

/** Detail table per kind, so a query can find the columns belonging to a kind. */
const DETAIL_TABLES = {
  npc: schema.npc,
  location: schema.location,
  faction: schema.faction,
  item: schema.item,
  session: schema.gameSession,
  lore: schema.lore,
  player_character: schema.playerCharacter,
  handout: schema.handout,
  rule: schema.rule,
} as const satisfies Record<EntityKind, unknown>;

/**
 * Every column a kind can produce, keyed by the field name @sw/schemas uses.
 *
 * The join between "what the clearance map calls a field" and "what Drizzle calls a
 * column" happens here and nowhere else. A field present in the clearance map but absent
 * from a table simply never appears in a select — it cannot be leaked, only missing,
 * which is the safe direction for this particular mistake.
 */
function columnsFor(kind: EntityKind): Record<string, PgColumn> {
  const detail = DETAIL_TABLES[kind] as unknown as Record<string, PgColumn>;

  const base: Record<string, PgColumn> = {
    id: schema.entity.id,
    kind: schema.entity.kind,
    slug: schema.entity.slug,
    title: schema.entity.title,
    summary: schema.entity.summary,
    body: schema.entity.body,
    visibility: schema.entity.visibility,
    published: schema.entity.published,
    authorId: schema.entity.authorId,
    createdAt: schema.entity.createdAt,
    updatedAt: schema.entity.updatedAt,
  };

  const detailColumns: Record<string, PgColumn> = {};
  for (const [field, column] of Object.entries(detail)) {
    // `entityId` is the join key, not content; it duplicates `entity.id`.
    if (field === "entityId") continue;
    detailColumns[field] = column;
  }

  return { ...base, ...detailColumns };
}

/**
 * The columns to SELECT for a reader at `clearance`.
 *
 * Exported because it is worth testing directly: asserting that the column set for a
 * player contains no DM column is a much sharper check than asserting a response body
 * happens not to mention one.
 */
export function selectionFor(kind: EntityKind, clearance: Visibility): Record<string, PgColumn> {
  const available = columnsFor(kind);
  const selection: Record<string, PgColumn> = {};

  for (const field of visibleFieldsFor(kind, clearance)) {
    const column = available[field];
    if (column) selection[field] = column;
  }

  return selection;
}

export interface Reader {
  /** Null for an anonymous request. */
  readonly userId: string | null;
  readonly clearance: Visibility;
  /**
   * Whether this reader may see other people's unpublished drafts.
   *
   * Passed in rather than derived from a role here, because the decision belongs to
   * `can()` in @sw/authz and this package must not grow a second opinion about
   * permissions. @sw/db does not import @sw/authz — layering forbids it — so the API
   * answers the question and hands the answer down.
   */
  readonly canSeeDrafts: boolean;
}

/**
 * The WHERE clause every content read shares: tier, then draft state.
 *
 * Both halves are required. Filtering only by tier would expose a Co-DM's unpublished
 * player-tier draft to every player the moment it was created.
 */
function readableWhere(reader: Reader): SQL | undefined {
  const tierGate = inArray(schema.entity.visibility, tiersVisibleTo(reader.clearance));

  if (reader.canSeeDrafts) return tierGate;

  const draftGate = reader.userId
    ? or(eq(schema.entity.published, true), eq(schema.entity.authorId, reader.userId))
    : eq(schema.entity.published, true);

  return and(tierGate, draftGate);
}

export interface ListOptions {
  readonly kind: EntityKind;
  readonly reader: Reader;
  readonly limit?: number;
  readonly offset?: number;
}

/** Entities of one kind, filtered to what the reader may see, newest first. */
export async function listEntities(
  db: Database,
  { kind, reader, limit = 50, offset = 0 }: ListOptions,
): Promise<Record<string, unknown>[]> {
  const detail = DETAIL_TABLES[kind];

  return db
    .select(selectionFor(kind, reader.clearance))
    .from(schema.entity)
    .innerJoin(detail, eq(detail.entityId, schema.entity.id))
    .where(and(eq(schema.entity.kind, kind), readableWhere(reader)))
    .orderBy(schema.entity.title)
    .limit(limit)
    .offset(offset);
}

/**
 * One entity by kind and slug, or undefined.
 *
 * Undefined covers both "no such entity" and "you may not see it", and that conflation is
 * deliberate: a 404 that differs from a 403 tells an unauthorised reader that the page
 * exists, and on this wiki the existence of a page is itself a spoiler (ADR 0002).
 */
export async function getEntityBySlug(
  db: Database,
  kind: EntityKind,
  slug: string,
  reader: Reader,
): Promise<Record<string, unknown> | undefined> {
  const detail = DETAIL_TABLES[kind];

  const rows = await db
    .select(selectionFor(kind, reader.clearance))
    .from(schema.entity)
    .innerJoin(detail, eq(detail.entityId, schema.entity.id))
    .where(and(eq(schema.entity.kind, kind), eq(schema.entity.slug, slug), readableWhere(reader)))
    .limit(1);

  return rows[0];
}

/**
 * Edges out of an entity, filtered by the edge's own visibility.
 *
 * Both gates are applied: the edge must be visible, *and* the entity it points at must
 * be. A player-visible edge to a DM-tier NPC would otherwise disclose that the NPC
 * exists and what its id is, which is most of what hiding it was for.
 */
export async function linksFrom(db: Database, entityId: string, reader: Reader) {
  const tiers = tiersVisibleTo(reader.clearance);
  const target = schema.entity;

  return db
    .select({
      id: schema.entityLink.id,
      relation: schema.entityLink.relation,
      note: schema.entityLink.note,
      toEntityId: schema.entityLink.toEntityId,
      toKind: target.kind,
      toSlug: target.slug,
      toTitle: target.title,
    })
    .from(schema.entityLink)
    .innerJoin(target, eq(target.id, schema.entityLink.toEntityId))
    .where(
      and(
        eq(schema.entityLink.fromEntityId, entityId),
        inArray(schema.entityLink.visibility, tiers),
        inArray(target.visibility, tiers),
        reader.canSeeDrafts ? undefined : eq(target.published, true),
      ),
    );
}

/**
 * The role currently stored for a user, or `viewer` if the row is missing or unset.
 *
 * Lives here rather than in the API so that `services/api` never writes SQL of its own.
 * The boundary rules permit the API to import this package; they do not make it a good
 * idea for query construction to leak upward, because "the only place that touches the
 * database" is a much weaker guarantee if half the queries are written elsewhere.
 */
export async function getUserRole(db: Database, userId: string): Promise<Role> {
  const rows = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return roleOf(rows[0]);
}

/** Sets a user's role. The caller is responsible for having checked `can()` first. */
export async function setUserRole(db: Database, userId: string, role: Role): Promise<void> {
  await db
    .update(schema.user)
    .set({ role, updatedAt: new Date() })
    .where(eq(schema.user.id, userId));
}

/**
 * Appends to the audit log.
 *
 * Every mutation calls this. It is a plain insert with no update path, because the value
 * of the table is that rows cannot be revised after the fact.
 */
export async function recordAudit(
  db: Database,
  entry: {
    actorId: string | null;
    actorRole: Role;
    impersonatedBy?: string | null;
    action: string;
    subjectKind: string;
    subjectId?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
  },
): Promise<void> {
  await db.insert(schema.auditLog).values({
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    impersonatedBy: entry.impersonatedBy ?? null,
    action: entry.action,
    subjectKind: entry.subjectKind,
    subjectId: entry.subjectId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
  });
}
