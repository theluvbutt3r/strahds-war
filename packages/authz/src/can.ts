import { clearanceFor, clears } from "@sw/schemas";

import { IMPERSONATION_ALLOWED_ACTIONS, POLICY } from "./policy";
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
 * The role decides only which grants exist (see POLICY in policy.ts). Everything that
 * depends on *which* subject is being acted on is decided by the four gates below, in
 * order, each of which can only ever deny. There is no path through this function that
 * grants something the table did not.
 *
 * Both the API and the UI call this. **Only the API's use is enforcement**; the UI's use
 * decides whether to render an Edit button. Rendering a button the server would reject is
 * a cosmetic bug. Skipping the server check because the button was hidden is a spoiler.
 */
export function can(actor: Actor, action: Action, subject: Subject): boolean {
  // Gate 0 — impersonation. Checked first because it constrains the Overlord, the one
  // role every other gate waves through, and a gate that runs last is a gate that can be
  // reached by a `return true` above it.
  if (actor.impersonating && !IMPERSONATION_ALLOWED_ACTIONS.some((a) => a === action)) {
    return false;
  }

  // An unrecognised role yields no policy and therefore no grants — the fail-closed
  // reading of a role string from a database row written by some future deploy.
  const grant = POLICY[actor.role]?.[action];
  if (!grant) return false;

  // Gate 1 — kind. A grant is always scoped to the kinds it was written for; `delete` on
  // an NPC and `delete` on a user are not the same capability wearing different subjects.
  if (!grant.kinds.includes(subject.kind)) return false;

  // Gate 2 — clearance. Applies to *every* action, not only to reading.
  //
  // This is the gate that makes the chronicler correct. Editing something requires being
  // able to see it, and a write path that skipped this check would let a chronicler open
  // a DM-tier NPC in an editor — which discloses the content just as thoroughly as a read
  // endpoint would, only through a form.
  if (!clears(clearanceFor(actor.role), subject.visibility)) return false;

  // Gate 3 — drafts. Unpublished content is visible to its author and to anyone who can
  // publish it, and to nobody else.
  //
  // `=== false` rather than `!subject.published`: the field is optional, and an absent
  // value means "not applicable" (a user, the audit log) rather than "draft". Treating
  // undefined as unpublished would deny every action on every subject that has no
  // publication state at all.
  if (subject.published === false) {
    const isAuthor = subject.authorId !== undefined && subject.authorId === actor.id;
    const mayPublish = POLICY[actor.role]?.publish?.kinds.includes(subject.kind) ?? false;
    if (!isAuthor && !mayPublish) return false;
  }

  // Gate 4 — ownership. Only for grants that asked for it; the player's own character
  // page is the case it exists for.
  //
  // A subject with no author cannot satisfy an ownership requirement, so it is denied
  // rather than treated as ownerless-therefore-open.
  if (grant.ownOnly && subject.authorId !== actor.id) return false;

  return true;
}
