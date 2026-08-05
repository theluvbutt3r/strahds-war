/**
 * @sw/schemas — the single source of truth for content shapes.
 *
 * Layer 0: this package imports no other @sw package, and never will. Everything
 * downstream (the Drizzle tables, the OpenAPI spec, the admin form validation, the
 * mobile app's types) derives from what is defined here, so that adding a field to an
 * NPC is one edit that every consumer fails to compile against until it is handled.
 *
 * Phase 0 defines only the two axes every entity carries. The entity models themselves
 * (NPC, Location, Faction, …) land in Phase 1 — see docs/PLAN.md §5.
 */

export * from "./visibility";
export * from "./roles";
