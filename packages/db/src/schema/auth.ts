import { ROLES } from "@sw/schemas";
import { boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Better Auth's tables.
 *
 * THE SHAPE OF THESE IS NOT OURS TO CHOOSE. Better Auth's Drizzle adapter looks up
 * columns by name, so a renamed or retyped column here is not a schema preference — it
 * is a runtime failure at sign-in, and often a confusing one. The definitions below
 * mirror `getAuthTables()` from better-auth 1.6.26 with the `admin` plugin enabled,
 * which is where `role`, `banned`, `banReason`, `banExpires` and `session.impersonatedBy`
 * come from.
 *
 * If Better Auth is upgraded, re-derive rather than assume: the library can print its
 * expected tables, and a diff against this file is the check worth running.
 *
 * `text` primary keys rather than `uuid` because Better Auth mints these ids itself and
 * they are not UUIDs. See the note on `userIdSchema` in @sw/schemas.
 */

/**
 * Roles as a Postgres enum, derived from the single list in @sw/schemas.
 *
 * The database refuses an unknown role rather than storing it, which matters because
 * `can()` fails closed on an unrecognised role: without this, a typo in a manual UPDATE
 * would silently lock someone out of everything instead of being rejected at write time.
 */
export const roleEnum = pgEnum("role", ROLES);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    /**
     * Nullable because Better Auth writes the row before our hook assigns a role.
     * Readers must treat null as `viewer` — the least capable role — rather than as
     * "no restrictions". `roleOf()` in ../queries.ts is the one place that decides.
     */
    role: roleEnum("role"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_role_idx").on(table.role)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * Set by Better Auth's admin plugin while an Overlord is viewing as someone else.
     *
     * This column is what makes impersonation auditable: it is the only evidence that a
     * session's actions were driven by a different person than the one it authenticates
     * as. The API copies it onto the Actor, `can()` restricts an impersonating actor to
     * reads, and the audit log records it.
     */
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    /** "google" or "discord" — which provider this credential came from. */
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Unused today: there is no password sign-in. Better Auth expects the column. */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
