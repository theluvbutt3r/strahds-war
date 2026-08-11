import { describe, expect, it } from "vitest";

import { type SessionLike } from "./actor";
import { createApp } from "./app";

/**
 * `/me` is the endpoint Phase 1's exit criterion names — "the API returns your role".
 *
 * Built with an injected session resolver rather than a real Better Auth instance, so
 * these run without a database or an OAuth provider. What is being tested is the mapping
 * from session to role, clearance and capabilities; Better Auth's own correctness is its
 * business.
 */

const appWith = (session: SessionLike | null) =>
  createApp({ getSession: () => Promise.resolve(session) });

const meFor = async (session: SessionLike | null) => {
  const res = await appWith(session).request("/me");
  expect(res.status).toBe(200);
  return (await res.json()) as {
    authenticated: boolean;
    user: { id: string; name: string; email: string } | null;
    role: string;
    clearance: string;
    impersonating: boolean;
    capabilities: string[];
  };
};

describe("GET /me", () => {
  it("reports an anonymous caller as a viewer with public clearance", async () => {
    const body = await meFor(null);

    expect(body.authenticated).toBe(false);
    expect(body.user).toBeNull();
    expect(body.role).toBe("viewer");
    expect(body.clearance).toBe("public");
  });

  it("returns the signed-in user's role and clearance", async () => {
    const body = await meFor({
      user: { id: "user-1", role: "co-dm", name: "Kenny", email: "kenny@example.com" },
    } as SessionLike);

    expect(body.authenticated).toBe(true);
    expect(body.role).toBe("co-dm");
    expect(body.clearance).toBe("dm");
    expect(body.user?.id).toBe("user-1");
  });

  it("gives a player player-clearance, not dm", async () => {
    const body = await meFor({ user: { id: "user-2", role: "player" } });
    expect(body.clearance).toBe("player");
  });

  it("keeps a chronicler below dm clearance", async () => {
    // The role that breaks any implementation treating the list as a ladder.
    const body = await meFor({ user: { id: "user-3", role: "chronicler" } });
    expect(body.clearance).toBe("player");
  });

  it("never reports dm clearance for a role that does not have it", async () => {
    const clearances = await Promise.all(
      ["viewer", "player", "chronicler"].map(async (role) => {
        const body = await meFor({ user: { id: "u", role } });
        return { role, clearance: body.clearance };
      }),
    );

    expect(clearances).toEqual([
      { role: "viewer", clearance: "public" },
      { role: "player", clearance: "player" },
      { role: "chronicler", clearance: "player" },
    ]);
  });

  it("downgrades an unrecognised role to viewer", async () => {
    const body = await meFor({ user: { id: "user-4", role: "archmage" } });
    expect(body.role).toBe("viewer");
    expect(body.clearance).toBe("public");
  });

  it("reports capabilities that match the matrix", async () => {
    const player = await meFor({ user: { id: "user-5", role: "player" } });
    expect(player.capabilities).toContain("read");
    expect(player.capabilities).toContain("comment");
    expect(player.capabilities).not.toContain("publish");
    expect(player.capabilities).not.toContain("delete");

    const overlord = await meFor({ user: { id: "user-6", role: "overlord" } });
    expect(overlord.capabilities).toContain("publish");
    expect(overlord.capabilities).toContain("delete");
  });

  it("flags an impersonated session and strips it back to reading", async () => {
    const body = await meFor({
      user: { id: "user-player", role: "player" },
      session: { impersonatedBy: "user-overlord" },
    });

    expect(body.impersonating).toBe(true);
    expect(body.capabilities).toEqual(["read"]);
  });

  it("does not reveal who is impersonating", async () => {
    // The flag is enough for the UI to show a banner. Naming the Overlord in a response
    // the impersonated player's own browser could fetch would defeat the purpose.
    const res = await appWith({
      user: { id: "user-player", role: "player" },
      session: { impersonatedBy: "user-overlord" },
    }).request("/me");

    expect(await res.text()).not.toContain("user-overlord");
  });

  it("treats a caller as anonymous when no session resolver is configured", async () => {
    const res = await createApp().request("/me");
    const body = (await res.json()) as { authenticated: boolean; role: string };

    expect(body.authenticated).toBe(false);
    expect(body.role).toBe("viewer");
  });
});
