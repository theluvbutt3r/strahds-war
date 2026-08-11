import { z } from "zod";

import { userIdSchema } from "./ids";
import { roleSchema } from "./roles";

/**
 * A user account, as the rest of the system sees one.
 *
 * Better Auth owns the authoritative table — sessions, OAuth accounts, verification
 * tokens, password hashes if we ever add them. This schema is deliberately *narrower*
 * than that table: it is the shape the API is willing to serialise, and nothing here is
 * a credential. Deriving the API's user type from the auth library's row type instead
 * would mean every column that library adds is exposed by default, which is the wrong
 * direction for a decision this easy to get wrong.
 */
export const userSchema = z.object({
  id: userIdSchema,
  name: z.string().min(1).max(200),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.url().nullable(),
  role: roleSchema,
  /** Better Auth's admin plugin owns these; mirrored here so the API can surface them. */
  banned: z.boolean(),
  banReason: z.string().max(500).nullable(),
  banExpires: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

/**
 * The default role for a newly created account.
 *
 * `viewer`, not `player`, and this is the same fail-closed instinct as
 * `DEFAULT_VISIBILITY` — a sign-in from someone we do not recognise should land in the
 * least capable role, not in one that can read player-tier campaign content. Discord
 * guild membership promotes to `player` explicitly (see services/api), so the
 * capability arrives as the result of a check rather than as an accident of signing up.
 */
export const DEFAULT_ROLE = "viewer" as const;

/**
 * What the API returns for "who am I". Excludes ban fields, which the account holder
 * cannot act on and which are the moderator's business rather than theirs.
 */
export const sessionUserSchema = userSchema.pick({
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
