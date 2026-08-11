/**
 * The complete database schema, in one namespace.
 *
 * Drizzle needs every table in a single object to resolve relations and to generate
 * migrations, and Better Auth's Drizzle adapter needs the auth tables passed to it by
 * name. Both read this.
 */

export * from "./auth";
export * from "./content";
export * from "./history";
