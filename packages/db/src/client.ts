import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * The database connection.
 *
 * `postgres-js` over a long-lived pool rather than Neon's serverless HTTP driver: the API
 * runs as a persistent process on Fly or Railway (PLAN.md §10), so a real pool is both
 * available and cheaper per query than one HTTP round trip each time.
 *
 * Nothing here reads `process.env` at module load. A module that connects on import
 * cannot be imported by a test, a migration script, or a tool that only wants the schema
 * — and it turns a missing variable into a crash at import time, before any code has had
 * the chance to say what was missing.
 */

export interface DbOptions {
  readonly connectionString: string;
  /**
   * Pool ceiling. Neon's free tier allows a limited number of connections and a
   * long-running API is not the only thing that wants one — migrations and the seed
   * script connect too.
   */
  readonly maxConnections?: number;
}

export function createDb(options: DbOptions) {
  const client = postgres(options.connectionString, {
    max: options.maxConnections ?? 10,
    // Neon requires TLS. Left explicit rather than relying on the URL's sslmode, because
    // a connection string pasted without `?sslmode=require` would otherwise silently
    // downgrade to plaintext.
    ssl: "require",
  });

  return { db: drizzle(client, { schema }), client };
}

export type Database = ReturnType<typeof createDb>["db"];
