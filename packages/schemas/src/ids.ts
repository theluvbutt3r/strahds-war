import { z } from "zod";

/**
 * An identifier minted by us: entities, links, revisions, audit rows.
 *
 * UUID because we control generation and a random primary key is one less thing to leak
 * — a sequential id tells a reader how many NPCs exist and roughly when each was added,
 * which on this wiki is a small but real disclosure.
 */
export const idSchema = z.uuid();

/**
 * An identifier minted by Better Auth: users, sessions, OAuth accounts.
 *
 * Deliberately *not* `z.uuid()`. Better Auth generates its own ids, and they are not
 * UUIDs — they are short random strings. Validating them as UUIDs would reject every
 * real user the moment the value came back from the auth tables, and the natural "fix"
 * for that (dropping the validation entirely) is worse than never having claimed the
 * format.
 *
 * The alternative — overriding Better Auth's id generation to emit UUIDs — was
 * considered and rejected: it means every future auth code path has to keep honouring
 * the override, and a single one that does not produces a row the database refuses. This
 * way the library owns its own identifiers and we describe them accurately.
 */
export const userIdSchema = z.string().min(1).max(64);
