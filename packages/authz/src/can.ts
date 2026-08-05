import { type Action, type Actor, type Subject } from "./types";

/**
 * The single question the rest of the system is allowed to ask about permissions.
 *
 *   can(actor, "publish", page)     // yes
 *   if (user.role === "co-dm")      // no — a lint rule rejects this
 *
 * Asking capability-first is what makes adding a sixth role an edit to one table in this
 * package rather than a hunt through scattered role comparisons.
 *
 * PHASE 0: this is the signature and nothing else. It returns `false` for everything,
 * which is the correct stub for a security primitive — fail closed, so that wiring it up
 * prematurely denies access rather than granting it. The real matrix, and the
 * table-driven test that asserts all 5 roles against all 12 actions, land in Phase 1
 * (docs/PLAN.md §9).
 */
export function can(_actor: Actor, _action: Action, _subject: Subject): boolean {
  return false;
}
