import { describe, expect, it } from "vitest";

import { loadConfig } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
  BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:3001",
};

describe("loadConfig", () => {
  it("accepts a minimal valid environment", () => {
    const config = loadConfig(valid);
    expect(config.databaseUrl).toBe(valid.DATABASE_URL);
    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe("development");
  });

  it("rejects a missing database url", () => {
    const { DATABASE_URL: _omitted, ...withoutDb } = valid;
    expect(() => loadConfig(withoutDb)).toThrow(/DATABASE_URL/);
  });

  it("rejects a placeholder auth secret", () => {
    // The specific failure this guards: `BETTER_AUTH_SECRET="REPLACE_ME"` is what
    // .env.example ships, and nothing else would ever reject it. A short secret in
    // production is not a crash — it is sessions signed with a guessable key.
    expect(() => loadConfig({ ...valid, BETTER_AUTH_SECRET: "REPLACE_ME" })).toThrow(
      /at least 32 characters/,
    );
  });

  it("rejects an auth url that is not a url", () => {
    expect(() => loadConfig({ ...valid, BETTER_AUTH_URL: "localhost:3001" })).toThrow(
      /BETTER_AUTH_URL/,
    );
  });

  it("names every problem at once rather than one per restart", () => {
    const message = (() => {
      try {
        loadConfig({ BETTER_AUTH_SECRET: "short" });
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
    })();

    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("BETTER_AUTH_SECRET");
    expect(message).toContain("BETTER_AUTH_URL");
  });

  it("configures a provider only when both halves of its credential are present", () => {
    const halfDiscord = loadConfig({ ...valid, DISCORD_CLIENT_ID: "id-only" });
    expect(halfDiscord.discord).toBeUndefined();

    const whole = loadConfig({
      ...valid,
      DISCORD_CLIENT_ID: "id",
      DISCORD_CLIENT_SECRET: "secret",
    });
    expect(whole.discord).toEqual({ clientId: "id", clientSecret: "secret" });
  });

  it("does not fail to boot over an incomplete optional provider", () => {
    // Deliberate: half a credential pair yields a sign-in page without that button,
    // rather than a service that will not start and takes down the working providers
    // with it.
    expect(() => loadConfig({ ...valid, GOOGLE_CLIENT_ID: "id-only" })).not.toThrow();
  });

  it("leaves the guild unset when none is configured, which means invite-only", () => {
    expect(loadConfig(valid).discordGuildId).toBeUndefined();
    expect(loadConfig({ ...valid, DISCORD_GUILD_ID: "123" }).discordGuildId).toBe("123");
  });

  it("defaults the web origin to the development web app", () => {
    expect(loadConfig(valid).webOrigin).toBe("http://localhost:3000");
  });
});
