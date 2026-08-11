import { clearanceFor, clears, type Role, ROLES, VISIBILITY_TIERS } from "@sw/schemas";
import { describe, expect, it } from "vitest";

import { can } from "./can";
import { CONTENT_KINDS, POLICY } from "./policy";
import { ACTIONS, type Action, type Actor, type Subject, SUBJECT_KINDS } from "./types";

/**
 * The exhaustive permission matrix test PLAN.md §9 makes a Phase 1 exit criterion.
 *
 * The structure matters. `EXPECTED` below is written out by hand as the *intended*
 * matrix, and the first test walks all 5 roles x 12 actions x 12 subject kinds and
 * compares `can()` against it. It deliberately does not derive expectations from POLICY:
 * a test that computes what the code computes asserts only that the computer is
 * consistent with itself, and would pass unchanged if someone granted `delete` to every
 * role. Changing a permission has to mean editing this file on purpose.
 */

const actorFor = (role: Role): Actor => ({ id: `user-${role}`, role });

/**
 * The sweep's subject: published, public-tier, authored by somebody else.
 *
 * `public` on purpose. Every role clears the public tier, so gate 2 lets all of them
 * through and the sweep measures the *kind* grants alone — which is what `EXPECTED`
 * describes. A player-tier subject would make `viewer` fail every row for a reason that
 * has nothing to do with the matrix being tested, and the clearance gate has its own
 * block below.
 */
const subjectOf = (kind: Subject["kind"]): Subject => ({
  kind,
  visibility: "public",
  published: true,
  authorId: "somebody-else",
});

/**
 * The intended matrix: for each role, which subject kinds each action is granted over.
 *
 * An action absent from a role's entry means "denied for every kind". Written as literal
 * lists rather than as references to the constants POLICY uses, so that widening one of
 * those constants shows up here as a failure rather than being silently mirrored.
 */
const ALL_CONTENT = [
  "npc",
  "location",
  "faction",
  "item",
  "session",
  "lore",
  "player_character",
  "handout",
  "rule",
] as const;

const ALL_READABLE = [...ALL_CONTENT, "media"] as const;

/**
 * One expected grant. `ownOnly` is spelled out rather than left implicit, because the
 * sweep uses a subject authored by somebody else: an ownership-scoped grant exists in
 * the policy but must be denied there, and those two facts have to be separable or the
 * parity check below cannot tell "not granted" from "granted, then withheld by gate 4".
 */
interface ExpectedGrant {
  readonly kinds: readonly string[];
  readonly ownOnly?: boolean;
}

type ExpectedRow = Partial<Record<Action, ExpectedGrant>>;

const EXPECTED: Record<Role, ExpectedRow> = {
  viewer: {
    read: { kinds: ALL_READABLE },
  },
  player: {
    read: { kinds: ALL_READABLE },
    comment: { kinds: ALL_CONTENT },
    bookmark: { kinds: ALL_CONTENT },
    create: { kinds: ["player_character"] },
    update: { kinds: ["player_character"], ownOnly: true },
  },
  chronicler: {
    read: { kinds: ALL_READABLE },
    comment: { kinds: ALL_CONTENT },
    bookmark: { kinds: ALL_CONTENT },
    create: { kinds: ["npc", "location", "faction", "item", "lore", "rule", "player_character"] },
    update: { kinds: ["npc", "location", "faction", "item", "lore", "rule"] },
  },
  "co-dm": {
    read: { kinds: ALL_READABLE },
    comment: { kinds: ALL_CONTENT },
    bookmark: { kinds: ALL_CONTENT },
    create: { kinds: ALL_CONTENT },
    update: { kinds: ALL_CONTENT },
    publish: { kinds: ALL_CONTENT },
    manage_media: { kinds: ["media"] },
  },
  overlord: {
    read: { kinds: [...ALL_READABLE, "user"] },
    comment: { kinds: ALL_CONTENT },
    bookmark: { kinds: ALL_CONTENT },
    create: { kinds: ALL_CONTENT },
    update: { kinds: ALL_CONTENT },
    delete: { kinds: [...ALL_CONTENT, "media"] },
    publish: { kinds: ALL_CONTENT },
    manage_media: { kinds: ["media"] },
    assign_roles: { kinds: ["user"] },
    ban_users: { kinds: ["user"] },
    impersonate: { kinds: ["user"] },
    view_audit_log: { kinds: ["audit_log"] },
  },
};

describe("the permission matrix", () => {
  it("matches the intended matrix for every role, action and subject kind", () => {
    const mismatches: string[] = [];

    for (const role of ROLES) {
      for (const action of ACTIONS) {
        for (const kind of SUBJECT_KINDS) {
          const grant = EXPECTED[role][action];
          // The sweep's subject is authored by someone else, so an ownership-scoped
          // grant is expected to be refused here and is asserted separately below.
          const expected =
            grant !== undefined && grant.ownOnly !== true && grant.kinds.includes(kind);
          const actual = can(actorFor(role), action, subjectOf(kind));

          if (actual !== expected) {
            mismatches.push(
              `${role} / ${action} / ${kind}: expected ${String(expected)}, got ${String(actual)}`,
            );
          }
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("covers all 5 roles against all 12 actions", () => {
    // The exit criterion is stated as a count, so assert the count. If an action is added
    // to ACTIONS without a decision about who may do it, this fails rather than the new
    // action silently defaulting to denied-for-everyone and looking intentional.
    expect(ROLES).toHaveLength(5);
    expect(ACTIONS).toHaveLength(12);

    for (const role of ROLES) {
      for (const action of ACTIONS) {
        const expected = EXPECTED[role][action];
        const actual = POLICY[role][action];

        expect(
          actual !== undefined,
          `${role}/${action}: POLICY and the expected matrix disagree`,
        ).toBe(expected !== undefined);

        // Ownership scoping is checked here too. Dropping `ownOnly` from a grant would
        // widen a player's write access from their own character page to everyone's,
        // and the sweep above cannot see it — its subject is always someone else's, so
        // the grant reads as denied either way.
        expect(actual?.ownOnly ?? false, `${role}/${action}: ownOnly disagrees`).toBe(
          expected?.ownOnly ?? false,
        );
      }
    }
  });

  it("grants no capability over a subject kind that does not exist", () => {
    for (const role of ROLES) {
      for (const [action, grant] of Object.entries(EXPECTED[role])) {
        for (const kind of grant.kinds) {
          expect(SUBJECT_KINDS, `${role}/${action} names unknown kind ${kind}`).toContain(kind);
        }
      }
    }
  });
});

describe("gate 2 — clearance", () => {
  it("denies every action on dm-tier content to every role without dm clearance", () => {
    // The campaign-critical property. Chronicler is the role this is really about: it can
    // update an NPC, and must still be refused on an NPC whose record is DM-tier.
    const withoutDm = ROLES.filter((role) => !clears(clearanceFor(role), "dm"));
    expect(withoutDm).toEqual(["viewer", "player", "chronicler"]);

    for (const role of withoutDm) {
      for (const action of ACTIONS) {
        for (const kind of CONTENT_KINDS) {
          const subject: Subject = { kind, visibility: "dm", published: true };
          expect(can(actorFor(role), action, subject), `${role} / ${action} / ${kind}`).toBe(false);
        }
      }
    }
  });

  it("lets a chronicler edit a player-tier NPC but not a dm-tier one", () => {
    const chronicler = actorFor("chronicler");

    expect(can(chronicler, "update", { kind: "npc", visibility: "player", published: true })).toBe(
      true,
    );
    expect(can(chronicler, "update", { kind: "npc", visibility: "dm", published: true })).toBe(
      false,
    );
  });

  it("applies the clearance gate to writes, not only to reads", () => {
    // Guards against the plausible-looking optimisation of checking clearance inside the
    // `read` branch only. An editable-but-unreadable record would disclose its contents
    // through the edit form.
    const chronicler = actorFor("chronicler");
    const dmNpc: Subject = { kind: "npc", visibility: "dm", published: true };

    expect(can(chronicler, "read", dmNpc)).toBe(false);
    expect(can(chronicler, "update", dmNpc)).toBe(false);
    expect(can(chronicler, "comment", dmNpc)).toBe(false);
    expect(can(chronicler, "bookmark", dmNpc)).toBe(false);
  });

  it("stops a viewer at public content", () => {
    expect(can(actorFor("viewer"), "read", { kind: "npc", visibility: "public" })).toBe(true);
    expect(can(actorFor("viewer"), "read", { kind: "npc", visibility: "player" })).toBe(false);
  });

  it("denies an unknown visibility tier at every role", () => {
    // Mirrors the fail-closed test on `clears`. A tier written by an older deploy, or a
    // typo in a seed, must deny rather than fall through to permissive.
    const bogus: Subject = { kind: "npc", visibility: "sealed" as never, published: true };
    const permitted = ROLES.filter((role) => can(actorFor(role), "read", bogus));
    expect(permitted).toEqual([]);
  });
});

describe("gate 3 — drafts", () => {
  const draftBySomeoneElse: Subject = {
    kind: "npc",
    visibility: "player",
    published: false,
    authorId: "another-chronicler",
  };

  it("hides an unpublished entity from readers who cannot publish", () => {
    expect(can(actorFor("player"), "read", draftBySomeoneElse)).toBe(false);
    expect(can(actorFor("chronicler"), "read", draftBySomeoneElse)).toBe(false);
  });

  it("shows an unpublished entity to its author", () => {
    const author = actorFor("chronicler");
    const ownDraft: Subject = { ...draftBySomeoneElse, authorId: author.id };

    expect(can(author, "read", ownDraft)).toBe(true);
    expect(can(author, "update", ownDraft)).toBe(true);
  });

  it("shows an unpublished entity to anyone who can publish it", () => {
    expect(can(actorFor("co-dm"), "read", draftBySomeoneElse)).toBe(true);
    expect(can(actorFor("overlord"), "read", draftBySomeoneElse)).toBe(true);
  });

  it("treats an absent published flag as not-a-draft rather than as a draft", () => {
    // Subjects with no publication state at all — a user record, the audit log. Reading
    // `undefined` as "unpublished" would deny every administrative action.
    expect(can(actorFor("overlord"), "assign_roles", { kind: "user", visibility: "dm" })).toBe(
      true,
    );
    expect(
      can(actorFor("overlord"), "view_audit_log", { kind: "audit_log", visibility: "dm" }),
    ).toBe(true);
  });

  it("still applies clearance to a draft its author cannot read", () => {
    // Authorship is not a clearance grant. A chronicler who drafted a page that was later
    // raised to DM tier must lose access to it.
    const author = actorFor("chronicler");
    const raised: Subject = {
      kind: "npc",
      visibility: "dm",
      published: false,
      authorId: author.id,
    };

    expect(can(author, "read", raised)).toBe(false);
    expect(can(author, "update", raised)).toBe(false);
  });
});

describe("gate 4 — ownership", () => {
  const player = actorFor("player");

  it("lets a player edit their own character page", () => {
    const own: Subject = {
      kind: "player_character",
      visibility: "player",
      published: true,
      authorId: player.id,
    };
    expect(can(player, "update", own)).toBe(true);
  });

  it("refuses a player another player's character page", () => {
    const theirs: Subject = {
      kind: "player_character",
      visibility: "player",
      published: true,
      authorId: "some-other-player",
    };
    expect(can(player, "update", theirs)).toBe(false);
  });

  it("refuses an ownership-scoped grant when the subject has no author at all", () => {
    const ownerless: Subject = { kind: "player_character", visibility: "player", published: true };
    expect(can(player, "update", ownerless)).toBe(false);
  });

  it("does not extend ownership to other kinds", () => {
    // A player who authored a comment on an NPC does not thereby gain edit rights on the
    // NPC. The grant is scoped by kind first, ownership second.
    const ownNpc: Subject = {
      kind: "npc",
      visibility: "player",
      published: true,
      authorId: player.id,
    };
    expect(can(player, "update", ownNpc)).toBe(false);
  });
});

describe("gate 0 — impersonation", () => {
  const impersonating: Actor = {
    id: "user-player",
    role: "player",
    impersonating: { originalActorId: "user-overlord" },
  };

  it("still allows reading, which is the entire point of the feature", () => {
    expect(can(impersonating, "read", subjectOf("npc"))).toBe(true);
  });

  it("refuses every action other than read", () => {
    for (const action of ACTIONS) {
      if (action === "read") continue;
      for (const kind of SUBJECT_KINDS) {
        expect(can(impersonating, action, subjectOf(kind)), `${action} / ${kind}`).toBe(false);
      }
    }
  });

  it("constrains an Overlord impersonating an Overlord", () => {
    // The case a check written as "impersonation drops you to the target's powers" would
    // miss entirely: both roles are `overlord`, so there is nothing to drop.
    const overlordAsOverlord: Actor = {
      id: "user-overlord-2",
      role: "overlord",
      impersonating: { originalActorId: "user-overlord" },
    };

    expect(can(overlordAsOverlord, "read", subjectOf("npc"))).toBe(true);
    expect(can(overlordAsOverlord, "delete", subjectOf("npc"))).toBe(false);
    expect(can(overlordAsOverlord, "ban_users", { kind: "user", visibility: "dm" })).toBe(false);
    expect(can(overlordAsOverlord, "impersonate", { kind: "user", visibility: "dm" })).toBe(false);
  });
});

describe("fail-closed behaviour", () => {
  it("denies everything to a role that is not in the matrix", () => {
    // A role string from a row written by a future deploy, or a hand-edited database.
    // `POLICY[role]` is `undefined` and every action falls through to denied.
    const unknown = { id: "user-x", role: "archmage" as Role };

    for (const action of ACTIONS) {
      for (const kind of SUBJECT_KINDS) {
        expect(can(unknown, action, subjectOf(kind)), `${action} / ${kind}`).toBe(false);
      }
    }
  });

  it("denies an action that is not in the matrix", () => {
    const unknownAction = "seize_the_castle" as Action;
    const permitted = ROLES.filter((role) => can(actorFor(role), unknownAction, subjectOf("npc")));
    expect(permitted).toEqual([]);
  });

  it("denies every action on a subject kind nobody was granted", () => {
    // `audit_log` is reachable only through `view_audit_log`, and only by the Overlord.
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        if (role === "overlord" && action === "view_audit_log") continue;
        const subject: Subject = { kind: "audit_log", visibility: "dm" };
        expect(can(actorFor(role), action, subject), `${role} / ${action}`).toBe(false);
      }
    }
  });
});

describe("invariants that outlive the current matrix", () => {
  it("gives exactly one role the power to delete", () => {
    const deleters = ROLES.filter((role) => can(actorFor(role), "delete", subjectOf("npc")));
    expect(deleters).toEqual(["overlord"]);
  });

  it("gives exactly the two dm-clearance roles the power to publish", () => {
    const publishers = ROLES.filter((role) => can(actorFor(role), "publish", subjectOf("npc")));
    expect(publishers).toEqual(["co-dm", "overlord"]);
  });

  it("reserves every user-administration action to the Overlord", () => {
    const admin: Action[] = ["assign_roles", "ban_users", "impersonate"];
    const subject: Subject = { kind: "user", visibility: "dm" };

    const permittedByAction = admin.map((action) => ({
      action,
      permitted: ROLES.filter((role) => can(actorFor(role), action, subject)),
    }));

    expect(permittedByAction).toEqual([
      { action: "assign_roles", permitted: ["overlord"] },
      { action: "ban_users", permitted: ["overlord"] },
      { action: "impersonate", permitted: ["overlord"] },
    ]);
  });

  it("never lets a role act on content above its own clearance", () => {
    // The general form of the spoiler guarantee, asserted across the entire space rather
    // than at the handful of points above: for every role, action, kind and tier, a grant
    // implies clearance. This is the assertion that would catch a future gate added in
    // the wrong order.
    const uncleared: string[] = [];

    for (const role of ROLES) {
      for (const action of ACTIONS) {
        for (const kind of CONTENT_KINDS) {
          for (const visibility of VISIBILITY_TIERS) {
            const allowed = can(actorFor(role), action, { kind, visibility, published: true });
            if (allowed && !clears(clearanceFor(role), visibility)) {
              uncleared.push(
                `${role} may ${action} a ${visibility}-tier ${kind} without clearance`,
              );
            }
          }
        }
      }
    }

    expect(uncleared).toEqual([]);
  });
});
