import { ROLES } from "@sw/schemas";
import { describe, expect, it, vi } from "vitest";

import { DISCORD_SCOPES, isGuildMember, roleAfterDiscordSignIn } from "./discord";

describe("roleAfterDiscordSignIn", () => {
  it("promotes a viewer to player on verified membership", () => {
    expect(
      roleAfterDiscordSignIn({ currentRole: "viewer", isMember: true, guildConfigured: true }),
    ).toBe("player");
  });

  it("never promotes anybody past player", () => {
    // Guild membership proves someone is at the table. It says nothing about whether they
    // should be able to write lore or read secrets, and the table must not quietly say
    // otherwise.
    const promoted = ROLES.map((currentRole) =>
      roleAfterDiscordSignIn({ currentRole, isMember: true, guildConfigured: true }),
    );

    expect(promoted).toEqual(["player", "player", "chronicler", "co-dm", "overlord"]);
  });

  it("never demotes anybody", () => {
    // A Co-DM who leaves the Discord server keeps their role. Membership grants; it does
    // not revoke, because revocation through an unrelated side effect is the kind of
    // thing nobody debugs successfully at 1am.
    const demoted = ROLES.filter(
      (currentRole) =>
        roleAfterDiscordSignIn({ currentRole, isMember: false, guildConfigured: true }) !==
        currentRole,
    );

    expect(demoted).toEqual([]);
  });

  it("changes nothing when no guild is configured", () => {
    // The invite-only configuration. Nothing is auto-granted, so roles are assigned by
    // hand — a deliberate setup rather than a broken one.
    const changed = ROLES.filter(
      (currentRole) =>
        roleAfterDiscordSignIn({ currentRole, isMember: true, guildConfigured: false }) !==
        currentRole,
    );

    expect(changed).toEqual([]);
  });

  it("changes nothing when the user is not a member", () => {
    expect(
      roleAfterDiscordSignIn({ currentRole: "viewer", isMember: false, guildConfigured: true }),
    ).toBe("viewer");
  });
});

describe("DISCORD_SCOPES", () => {
  it("requests guilds, without which the membership check cannot work", () => {
    expect(DISCORD_SCOPES).toContain("guilds");
  });

  it("requests nothing beyond identity, email and guild list", () => {
    // A scope creeping in here would widen what a sign-in grants us access to. Pinning
    // the exact set makes that an explicit edit.
    expect([...DISCORD_SCOPES]).toEqual(["identify", "email", "guilds"]);
  });
});

describe("isGuildMember", () => {
  const guildId = "112233445566778899";

  const respondWith = (body: unknown, ok = true) =>
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    } as unknown as Response);

  it("finds the configured guild in the user's list", async () => {
    const fetchImpl = respondWith([{ id: "000" }, { id: guildId }]);
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(true);
  });

  it("returns false when the guild is absent", async () => {
    const fetchImpl = respondWith([{ id: "000" }]);
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(false);
  });

  it("sends the access token as a bearer credential", async () => {
    const fetchImpl = respondWith([]);
    await isGuildMember("secret-token", guildId, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://discord.com/api/v10/users/@me/guilds",
      expect.objectContaining({
        headers: { Authorization: "Bearer secret-token" },
      }),
    );
  });

  it("returns false when Discord refuses the request", async () => {
    const fetchImpl = respondWith({ message: "401: Unauthorized" }, false);
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(false);
  });

  it("returns false when Discord returns something that is not a list", async () => {
    const fetchImpl = respondWith({ message: "You are being rate limited." });
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(false);
  });

  it("returns false when the network fails", async () => {
    // The property that matters: an outage must not hand out Player access. Every failure
    // mode collapses to "not a member" so that no caller can treat "could not tell" as
    // good enough.
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(false);
  });

  it("returns false rather than hanging when Discord is slow", async () => {
    // Without the timeout this runs inside the sign-in request, so a slow Discord means a
    // hung sign-in rather than a slightly wrong role.
    const fetchImpl = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    ) as unknown as typeof fetch;

    await expect(isGuildMember("token", guildId, fetchImpl, 5)).resolves.toBe(false);
  });

  it("ignores malformed entries in the guild list", async () => {
    const fetchImpl = respondWith([null, "nonsense", { noId: true }, { id: guildId }]);
    await expect(isGuildMember("token", guildId, fetchImpl)).resolves.toBe(true);
  });
});
