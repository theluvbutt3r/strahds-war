import { z } from "zod";

/**
 * The environment this service needs, validated once at startup.
 *
 * Validated rather than read ad hoc, because the failure mode of a missing auth variable
 * is not a crash — it is an auth provider that silently does not appear on the sign-in
 * page, or a session cookie signed with the string "undefined". Both look like working
 * software. Checking at boot converts them into a process that refuses to start and says
 * which variable is wrong.
 *
 * Every variable here is documented in .env.example, and anything that can change build
 * output is also declared in turbo.json's `build.env`.
 */

/** A social provider is configured only when both halves of its credential are present. */
interface ProviderCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

/**
 * An http(s) URL.
 *
 * The protocol constraint is not decorative. Bare `z.url()` accepts `localhost:3001` —
 * the URL parser reads `localhost` as the scheme and `3001` as the path, so a value
 * written without its `http://` validates cleanly and then produces OAuth redirects to
 * a URL no browser will follow. Requiring http or https rejects it at boot instead.
 */
const httpUrl = z.url({ protocol: /^https?$/ });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required — see .env.example"),

  /**
   * Minimum length rather than just "present". A short secret is the kind of placeholder
   * that survives into production precisely because nothing rejects it; 32 bytes base64
   * is what `openssl rand -base64 32` produces and what .env.example tells you to run.
   */
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: httpUrl,

  /** Where the web app runs. Needed for CORS and for the post-sign-in redirect allowlist. */
  WEB_ORIGIN: httpUrl.default("http://localhost:3000"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  /**
   * Members of this guild are auto-granted the Player role on sign-in.
   *
   * Optional on purpose: leaving it unset makes the wiki invite-only, because nothing
   * then promotes anybody above `viewer` automatically and roles are assigned by hand.
   * That is a deliberate configuration, not a broken one.
   */
  DISCORD_GUILD_ID: z.string().optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface ApiConfig {
  readonly nodeEnv: RawEnv["NODE_ENV"];
  readonly port: number;
  readonly databaseUrl: string;
  readonly authSecret: string;
  readonly authUrl: string;
  readonly webOrigin: string;
  readonly google?: ProviderCredentials;
  readonly discord?: ProviderCredentials;
  readonly discordGuildId?: string;
}

/**
 * Parses and validates the environment.
 *
 * A provider is configured only when *both* halves of its credential pair are present.
 * Half a pair is treated as absent rather than as an error, and that choice is worth
 * stating: it means a deploy that sets `DISCORD_CLIENT_ID` and forgets the secret gets a
 * sign-in page without a Discord button, instead of a service that will not boot. The
 * alternative — failing hard — was rejected because it makes an incomplete optional
 * provider take down authentication that was otherwise working.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${problems}\n\nSee .env.example.`);
  }

  const env = parsed.data;

  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : undefined;

  const discord =
    env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
      ? { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET }
      : undefined;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    authSecret: env.BETTER_AUTH_SECRET,
    authUrl: env.BETTER_AUTH_URL,
    webOrigin: env.WEB_ORIGIN,
    ...(google ? { google } : {}),
    ...(discord ? { discord } : {}),
    ...(env.DISCORD_GUILD_ID ? { discordGuildId: env.DISCORD_GUILD_ID } : {}),
  };
}
