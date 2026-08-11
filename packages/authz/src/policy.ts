import { type Role } from "@sw/schemas";

import { type Action, type SubjectKind } from "./types";

/**
 * The permission matrix, as data.
 *
 * A table rather than a function body, and that is the design rather than a stylistic
 * preference: a table can be printed, diffed, and asserted in full. `can()` below does
 * nothing but look things up in here and apply the four gates that depend on the
 * *subject* rather than on the role. Nothing in this package compares roles — the role
 * is a key.
 *
 * Grants are written out per role rather than inherited from the role "below", even
 * though that repeats entries. Inheritance would encode the ladder that ADR 0004 exists
 * to reject: a chronicler is not a player with extras, because it gains write
 * capabilities while gaining no read clearance at all. Spelling each role out means the
 * table cannot express "everything the previous role had" by accident.
 */

/** The nine content kinds, which most capabilities apply to uniformly. */
export const CONTENT_KINDS = [
  "npc",
  "location",
  "faction",
  "item",
  "session",
  "lore",
  "player_character",
  "handout",
  "rule",
] as const satisfies readonly SubjectKind[];

/** Content plus uploaded media — everything with a body a reader might want. */
const READABLE = [...CONTENT_KINDS, "media"] as const satisfies readonly SubjectKind[];

/**
 * The kinds a Chronicler may draft.
 *
 * `session` is absent: session notes are the DM's record of what happened at the table,
 * and PLAN.md §5 assigns them to Co-DM. `handout` is absent for the same reason — a
 * handout is a thing you give out in play. `player_character` is absent because it
 * belongs to its player, who edits it through the `ownOnly` grant instead.
 */
const CHRONICLER_WRITABLE = [
  "npc",
  "location",
  "faction",
  "item",
  "lore",
  "rule",
] as const satisfies readonly SubjectKind[];

/**
 * One capability grant: the subject kinds it covers, and whether it is limited to
 * subjects the actor authored.
 */
export interface Grant {
  readonly kinds: readonly SubjectKind[];
  /**
   * When true, the grant applies only where `subject.authorId` is the actor.
   *
   * Used for the player's own character page. A player may write theirs and nobody
   * else's, which is a different shape from "players may write character pages".
   */
  readonly ownOnly?: boolean;
}

export type RolePolicy = Readonly<Partial<Record<Action, Grant>>>;

export const POLICY: Readonly<Record<Role, RolePolicy>> = {
  /**
   * Unauthenticated visitors. Reads only, and their `public` clearance means the tier
   * gate in `can()` stops them at public content regardless of what is listed here.
   */
  viewer: {
    read: { kinds: READABLE },
  },

  /**
   * Players read at the player tier, participate, and own exactly one page: their
   * character. Note that `update` is `ownOnly` while `create` is not — a player creating
   * a character page is authoring it, so there is no prior author to compare against.
   */
  player: {
    read: { kinds: READABLE },
    comment: { kinds: CONTENT_KINDS },
    bookmark: { kinds: CONTENT_KINDS },
    create: { kinds: ["player_character"] },
    update: { kinds: ["player_character"], ownOnly: true },
  },

  /**
   * Chroniclers write lore. They do not publish, and — the part most likely to be got
   * wrong — they hold only `player` clearance, so every gate that consults clearance
   * denies them DM-tier material even on the kinds they may edit. A chronicler can write
   * an NPC's page without ever being able to read that NPC's secrets.
   */
  chronicler: {
    read: { kinds: READABLE },
    comment: { kinds: CONTENT_KINDS },
    bookmark: { kinds: CONTENT_KINDS },
    create: { kinds: [...CHRONICLER_WRITABLE, "player_character"] },
    update: { kinds: CHRONICLER_WRITABLE },
  },

  /**
   * Co-DMs run the campaign alongside you: full read at DM tier, full write, publishing,
   * and media. They cannot delete, assign roles, ban, impersonate, or read the audit log
   * — PLAN.md §5 reserves destructive and administrative operations to the Overlord.
   */
  "co-dm": {
    read: { kinds: READABLE },
    comment: { kinds: CONTENT_KINDS },
    bookmark: { kinds: CONTENT_KINDS },
    create: { kinds: CONTENT_KINDS },
    update: { kinds: CONTENT_KINDS },
    publish: { kinds: CONTENT_KINDS },
    manage_media: { kinds: ["media"] },
  },

  /** Everything. The only role that can delete, and the only one that can act on users. */
  overlord: {
    read: { kinds: [...READABLE, "user"] },
    comment: { kinds: CONTENT_KINDS },
    bookmark: { kinds: CONTENT_KINDS },
    create: { kinds: CONTENT_KINDS },
    update: { kinds: CONTENT_KINDS },
    delete: { kinds: [...CONTENT_KINDS, "media"] },
    publish: { kinds: CONTENT_KINDS },
    manage_media: { kinds: ["media"] },
    assign_roles: { kinds: ["user"] },
    ban_users: { kinds: ["user"] },
    impersonate: { kinds: ["user"] },
    view_audit_log: { kinds: ["audit_log"] },
  },
};

/**
 * Actions permitted while an Overlord is impersonating someone.
 *
 * Read and nothing else. Impersonation exists for one purpose — viewing the wiki exactly
 * as a given player sees it, to confirm the spoiler boundaries hold (PLAN.md §5) — and
 * that purpose is entirely satisfied by reading.
 *
 * The reason to enforce it rather than trust the operator: a write performed inside an
 * impersonated session is attributable to two people at once. The audit log records both
 * (`impersonatedBy`), but the content itself would carry the impersonated user as its
 * author, and "did that player write this, or did you write it as them?" is not a
 * question the history should be able to raise.
 */
export const IMPERSONATION_ALLOWED_ACTIONS = ["read"] as const satisfies readonly Action[];
