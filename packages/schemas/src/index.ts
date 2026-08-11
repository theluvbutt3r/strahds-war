/**
 * @sw/schemas — the single source of truth for content shapes.
 *
 * Layer 0: this package imports no other @sw package, and never will. Everything
 * downstream (the Drizzle tables, the OpenAPI spec, the admin form validation, the
 * mobile app's types) derives from what is defined here, so that adding a field to an
 * NPC is one edit that every consumer fails to compile against until it is handled.
 *
 * The two axes every entity carries are `visibility` and `roles`. Phase 1 adds the
 * entity models themselves, the graph edges between them, and the two append-only
 * histories — revisions and the audit log. See docs/PLAN.md §5.
 */

export * from "./ids";
export * from "./visibility";
export * from "./roles";
export * from "./entities";
export * from "./links";
export * from "./revisions";
export * from "./audit";
export * from "./users";
