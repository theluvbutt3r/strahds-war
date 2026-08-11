import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit's configuration, used only by the CLI (`pnpm --filter @sw/db db:generate`).
 *
 * `DATABASE_URL` is read here and nowhere else in this package — the runtime client takes
 * its connection string as an argument instead (see src/client.ts), so importing the
 * schema never requires a configured database.
 *
 * Migrations are generated and committed rather than applied from application code.
 * `db:push` exists in drizzle-kit and is deliberately not wired up: it diffs the schema
 * straight onto a live database with no reviewable artefact, which is fine for a scratch
 * branch and wrong for anything holding campaign content.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Keeps generated SQL readable in review, which is the point of committing it.
  verbose: true,
  strict: true,
});
