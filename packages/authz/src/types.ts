import { type Role, type Visibility } from "@sw/schemas";

/** Who is asking. Plain data — never a database row, never a session object. */
export interface Actor {
  readonly id: string;
  readonly role: Role;
  /** Set while an Overlord is viewing the wiki as someone else, to verify spoiler boundaries hold. */
  readonly impersonating?: { readonly originalActorId: string };
}

/**
 * What they want to do. Capabilities, not CRUD verbs — `publish` is a distinct
 * capability from `update` because a Chronicler has one and not the other.
 */
export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "publish",
  "comment",
  "bookmark",
  "manage_media",
  "assign_roles",
  "ban_users",
  "impersonate",
  "view_audit_log",
] as const;

export type Action = (typeof ACTIONS)[number];

/** What they want to do it to. */
export interface Subject {
  readonly kind: SubjectKind;
  /** Clearance required to see this subject at all. */
  readonly visibility: Visibility;
  /** Unpublished content is visible to its author and to anyone who can publish. */
  readonly published?: boolean;
  readonly authorId?: string;
}

export const SUBJECT_KINDS = [
  "npc",
  "location",
  "faction",
  "item",
  "session",
  "lore",
  "player_character",
  "handout",
  "rule",
  "media",
  "user",
  "audit_log",
] as const;

export type SubjectKind = (typeof SUBJECT_KINDS)[number];
