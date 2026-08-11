import { type Database, getUserRole, schema, setUserRole } from "@sw/db";
import { DEFAULT_ROLE, ROLES } from "@sw/schemas";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { DISCORD_SCOPES, isGuildMember, roleAfterDiscordSignIn } from "./discord";
import { type ApiConfig } from "./env";

/**
 * Better Auth, configured for this campaign.
 *
 * Better Auth answers *who you are*. It deliberately does not answer *what you may do* —
 * that is `can()` in @sw/authz, kept separate so the permission matrix can be unit-tested
 * without an auth runtime. See ADR 0004, which also records why Better Auth's own
 * `createAccessControl()` was not used for policy.
 *
 * The `admin` plugin is what supplies the `role`, `banned`, `banReason`, `banExpires` and
 * `session.impersonatedBy` columns, and the endpoints behind role assignment, banning and
 * impersonation.
 */
export function createAuth(db: Database, config: ApiConfig) {
  return betterAuth({
    secret: config.authSecret,
    baseURL: config.authUrl,

    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    /**
     * The web app is a different origin from the API (3000 vs 3001 in development), so
     * it has to be named explicitly or Better Auth refuses its requests and rejects the
     * OAuth callback redirect.
     */
    trustedOrigins: [config.webOrigin],

    user: {
      additionalFields: {
        /**
         * Declared so Better Auth includes `role` in the session it returns, saving the
         * API a second query on every authenticated request.
         *
         * `defaultValue` is `viewer` — the least capable role — matching `DEFAULT_ROLE`
         * in @sw/schemas. A new account arrives with no capabilities and is promoted by
         * a check (guild membership) or by hand, rather than starting with access it was
         * never granted.
         */
        role: {
          type: ROLES as unknown as string[],
          defaultValue: DEFAULT_ROLE,
          input: false, // never settable from a request body
        },
      },
    },

    socialProviders: {
      ...(config.google ? { google: config.google } : {}),
      ...(config.discord ? { discord: { ...config.discord, scope: [...DISCORD_SCOPES] } } : {}),
    },

    plugins: [admin()],

    databaseHooks: {
      account: {
        create: {
          /**
           * Discord guild membership auto-grants the Player role.
           *
           * Hooked on *account* creation rather than user creation because this is the
           * only point where the provider's access token is in hand — the user row is
           * written first and knows nothing about Discord.
           *
           * Failures here are swallowed by `isGuildMember`, so the worst case is a user
           * who stays a `viewer` and needs a manual grant. The opposite failure mode —
           * an error path that promotes — is the one worth engineering against.
           */
          after: async (account) => {
            if (account.providerId !== "discord") return;
            if (!config.discordGuildId || !account.accessToken) return;

            const currentRole = await getUserRole(db, account.userId);
            const isMember = await isGuildMember(account.accessToken, config.discordGuildId);
            const nextRole = roleAfterDiscordSignIn({
              currentRole,
              isMember,
              guildConfigured: true,
            });

            if (nextRole === currentRole) return;

            await setUserRole(db, account.userId, nextRole);
          },
        },
      },
    },

    advanced: {
      /**
       * The web app and the API are separate origins, so the session cookie has to be
       * sent cross-site. `sameSite: "none"` requires `secure: true`, which requires
       * HTTPS — hence the development exception, which is scoped to development only.
       */
      defaultCookieAttributes:
        config.nodeEnv === "production"
          ? { sameSite: "none", secure: true, httpOnly: true }
          : { sameSite: "lax", secure: false, httpOnly: true },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
