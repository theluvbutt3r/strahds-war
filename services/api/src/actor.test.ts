import { ROLES } from "@sw/schemas";
import { describe, expect, it } from "vitest";

import { actorFromSession, readerFor, roleFromSession } from "./actor";

describe("roleFromSession", () => {
  it("accepts every real role", () => {
    const rejected = ROLES.filter((role) => roleFromSession(role) !== role);
    expect(rejected).toEqual([]);
  });

  it("falls back to viewer for anything it does not recognise", () => {
    // The column is a Postgres enum, so these should be impossible — until a manual
    // UPDATE, a restored backup from an older schema, or a renamed role. Falling back to
    // the least capable role means the failure is a locked door.
    for (const bogus of ["dungeon-master", "", "admin", null, undefined]) {
      expect(roleFromSession(bogus)).toBe("viewer");
    }
  });
});

describe("actorFromSession", () => {
  it("treats an absent session as an anonymous viewer", () => {
    // Anonymous is a real actor rather than null, so every call site can ask can() the
    // same way. A nullable actor invites `if (actor) can(...)`, and that branch is the
    // one nobody tests.
    expect(actorFromSession(null)).toEqual({ id: "anonymous", role: "viewer" });
  });

  it("carries the user's id and role", () => {
    const actor = actorFromSession({ user: { id: "user-1", role: "co-dm" } });
    expect(actor).toEqual({ id: "user-1", role: "co-dm" });
  });

  it("marks an impersonated session and records who is behind it", () => {
    const actor = actorFromSession({
      user: { id: "user-player", role: "player" },
      session: { impersonatedBy: "user-overlord" },
    });

    expect(actor.impersonating).toEqual({ originalActorId: "user-overlord" });
  });

  it("does not mark an ordinary session as impersonated", () => {
    const actor = actorFromSession({
      user: { id: "user-1", role: "player" },
      session: { impersonatedBy: null },
    });

    expect(actor.impersonating).toBeUndefined();
  });

  it("downgrades an unrecognised role rather than trusting it", () => {
    const actor = actorFromSession({ user: { id: "user-1", role: "archmage" } });
    expect(actor.role).toBe("viewer");
  });
});

describe("readerFor", () => {
  it("gives an anonymous reader public clearance and no user id", () => {
    const reader = readerFor({ id: "anonymous", role: "viewer" });
    expect(reader).toEqual({ userId: null, clearance: "public", canSeeDrafts: false });
  });

  it("gives a player player-clearance and no access to others' drafts", () => {
    const reader = readerFor({ id: "user-1", role: "player" });
    expect(reader).toEqual({ userId: "user-1", clearance: "player", canSeeDrafts: false });
  });

  it("withholds draft access from a chronicler", () => {
    // A chronicler writes lore but cannot publish, so other people's drafts are not
    // theirs to read. This is the role most likely to be got wrong by treating the list
    // as a ladder.
    expect(readerFor({ id: "user-1", role: "chronicler" }).canSeeDrafts).toBe(false);
  });

  it("gives dm clearance and draft access to the roles that can publish", () => {
    for (const role of ["co-dm", "overlord"] as const) {
      const reader = readerFor({ id: "user-1", role });
      expect(reader.clearance).toBe("dm");
      expect(reader.canSeeDrafts).toBe(true);
    }
  });

  it("withdraws draft access while impersonating", () => {
    // Impersonation is read-only, and `canSeeDrafts` is derived from the publish
    // capability — so viewing as a player shows exactly what that player would see,
    // which is the entire point of the feature.
    const reader = readerFor({
      id: "user-player",
      role: "overlord",
      impersonating: { originalActorId: "user-overlord" },
    });

    expect(reader.canSeeDrafts).toBe(false);
  });
});
