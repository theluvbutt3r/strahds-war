/**
 * @sw/db — Drizzle schema, migrations and query builders.
 *
 * THE LOAD-BEARING CONSTRAINT: only `services/api` may import this package. The web app
 * holds no database credentials and cannot query Postgres even by accident, which is what
 * reduces spoiler enforcement to a single auditable chokepoint instead of a property that
 * has to be re-verified in every component.
 *
 * That rule is enforced three ways, none of which rely on anyone remembering it:
 *   1. pnpm manifests — no app declares @sw/db, so the import does not resolve
 *   2. eslint-plugin-boundaries + no-restricted-imports (DB_RESTRICTED)
 *   3. dependency-cruiser's `db-only-from-api` rule
 * scripts/verify-boundaries.ts asserts all three still bite.
 *
 * The chokepoint itself is `queries.ts`: reads select only the columns the requester's
 * clearance permits, so DM-tier material is never fetched rather than being fetched and
 * then withheld.
 */

export * as schema from "./schema";
export * from "./schema";
export * from "./client";
export * from "./queries";
