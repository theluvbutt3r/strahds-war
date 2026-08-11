import { type EntityKind } from "@sw/schemas";
import { sql } from "drizzle-orm";

import { createDb, type Database } from "./client";
import * as schema from "./schema";
import { SEED_ENTITIES, SEED_LINKS } from "./seed-data";

/**
 * Populates a development database with Barovian content.
 *
 * Run with: pnpm --filter @sw/db db:seed
 *
 * Idempotent by slug: running it twice updates rather than duplicating, so it can be
 * re-run after editing seed-data.ts without dropping the database first.
 *
 * It refuses to touch a database that looks like production. That check is cheap and the
 * mistake it prevents — pointing DATABASE_URL at the real campaign and overwriting a
 * session's worth of prep — is not recoverable from a terminal.
 */

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

export interface SeedResult {
  readonly entities: number;
  readonly links: number;
}

/**
 * Inserts or updates every seeded entity and link.
 *
 * `authorId` is left null: these rows have no human author, and attributing them to the
 * first user in the table would put fictional authorship into the audit trail.
 */
export async function seed(db: Database): Promise<SeedResult> {
  const idBySlug = new Map<string, string>();

  for (const item of SEED_ENTITIES) {
    const [row] = await db
      .insert(schema.entity)
      .values({
        kind: item.kind,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        body: item.body,
        visibility: item.visibility,
        published: item.published,
      })
      .onConflictDoUpdate({
        target: [schema.entity.kind, schema.entity.slug],
        set: {
          title: item.title,
          summary: item.summary,
          body: item.body,
          visibility: item.visibility,
          published: item.published,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.entity.id });

    if (!row) throw new Error(`failed to upsert ${item.kind}/${item.slug}`);
    idBySlug.set(item.slug, row.id);

    const detail = DETAIL_TABLES[item.kind];
    await db
      .insert(detail)
      .values({ entityId: row.id, ...item.detail } as never)
      .onConflictDoUpdate({
        target: [detail.entityId],
        set: item.detail as never,
      });
  }

  let links = 0;
  for (const link of SEED_LINKS) {
    const fromId = idBySlug.get(link.from);
    const toId = idBySlug.get(link.to);

    // A link naming a slug that is not seeded is a typo in seed-data.ts. Failing loudly
    // beats silently seeding a graph with holes in it.
    if (!fromId || !toId) {
      throw new Error(`link ${link.from} -> ${link.to} references an unseeded entity`);
    }

    await db
      .insert(schema.entityLink)
      .values({
        fromEntityId: fromId,
        toEntityId: toId,
        relation: link.relation,
        note: link.note,
        visibility: link.visibility,
      })
      .onConflictDoUpdate({
        target: [
          schema.entityLink.fromEntityId,
          schema.entityLink.toEntityId,
          schema.entityLink.relation,
        ],
        set: { note: link.note, visibility: link.visibility },
      });

    links += 1;
  }

  return { entities: SEED_ENTITIES.length, links };
}

/**
 * Guards against seeding something that is not a development database.
 *
 * Heuristic, not a guarantee — but the two signals it checks are the ones that actually
 * distinguish the cases in practice: an explicit opt-out for anyone who really means it,
 * and a connection string that names a production-looking branch.
 */
function assertSafeTarget(connectionString: string): void {
  if (process.env.SEED_ALLOW_NONLOCAL === "true") return;

  const looksProduction = /prod|production|main-branch/i.test(connectionString);
  if (looksProduction) {
    throw new Error(
      "DATABASE_URL looks like a production database. Refusing to seed.\n" +
        "If you are certain, re-run with SEED_ALLOW_NONLOCAL=true.",
    );
  }
}

/** Runs the seed against DATABASE_URL. Returns what it wrote; the CLI does the printing. */
export async function main(): Promise<SeedResult> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }

  assertSafeTarget(connectionString);

  const { db, client } = createDb({ connectionString, maxConnections: 1 });

  try {
    // Fail early and clearly if migrations have not been applied, rather than failing
    // deep inside the first insert with a Postgres error about a missing relation.
    const [{ exists } = { exists: false }] = await db.execute<{ exists: boolean }>(
      sql`select to_regclass('public.entity') is not null as exists`,
    );
    if (!exists) {
      throw new Error("The `entity` table does not exist. Run `pnpm --filter @sw/db db:migrate`.");
    }

    return await seed(db);
  } finally {
    await client.end();
  }
}
