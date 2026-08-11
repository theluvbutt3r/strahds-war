import { type Actor, can } from "@sw/authz";
import { type Reader } from "@sw/db";
import { clearanceFor, type Role, roleSchema } from "@sw/schemas";

/**
 * Turning a session into an Actor — the one place identity becomes capability.
 *
 * Kept out of the middleware itself so it can be tested without a request, a database or
 * an auth runtime. Everything here is a pure function over the session shape.
 */

/** The subset of Better Auth's session this service actually reads. */
export interface SessionLike {
  readonly user: { readonly id: string; readonly role?: string | null | undefined };
  readonly session?: { readonly impersonatedBy?: string | null | undefined } | undefined;
}

/**
 * The role to treat a session as holding.
 *
 * Parsed rather than cast. The column is a Postgres enum, so a value outside `ROLES`
 * should be impossible — but "should be impossible" is exactly the assumption that stops
 * holding after a manual `UPDATE`, a restored backup from an older schema, or a migration
 * that renamed a role. An unrecognised value becomes `viewer` rather than being passed
 * through to `can()`, which would deny everything anyway but would do so without
 * anybody noticing why.
 */
export function roleFromSession(role: string | null | undefined): Role {
  const parsed = roleSchema.safeParse(role);
  return parsed.success ? parsed.data : "viewer";
}

/**
 * The Actor for a session, or the anonymous actor when there is none.
 *
 * An unauthenticated request is a real actor with the `viewer` role rather than `null`,
 * so that every call site asks `can()` the same way. A nullable actor invites
 * `if (actor) can(...)`, and the branch where it is null is the one nobody writes a test
 * for.
 */
export function actorFromSession(session: SessionLike | null): Actor {
  if (!session) {
    return { id: "anonymous", role: "viewer" };
  }

  const role = roleFromSession(session.user.role);
  const impersonatedBy = session.session?.impersonatedBy;

  return {
    id: session.user.id,
    role,
    ...(impersonatedBy ? { impersonating: { originalActorId: impersonatedBy } } : {}),
  };
}

/**
 * The database reader for an actor: clearance plus whether drafts are visible.
 *
 * `canSeeDrafts` is computed here, by asking `can()`, and handed to @sw/db — which does
 * not import @sw/authz and so cannot form its own opinion. That keeps one answer to
 * "may this person see unpublished work" instead of two that can drift.
 *
 * The subject passed to `can()` is a representative published NPC. Draft visibility is a
 * property of the role's `publish` capability rather than of any particular entity, and
 * every content kind that can be published can be published by the same roles.
 */
export function readerFor(actor: Actor): Reader {
  return {
    userId: actor.id === "anonymous" ? null : actor.id,
    clearance: clearanceFor(actor.role),
    canSeeDrafts: can(actor, "publish", { kind: "npc", visibility: "dm", published: true }),
  };
}
