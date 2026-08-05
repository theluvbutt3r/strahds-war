import { ROLES } from "@sw/schemas";
import { describe, expect, it } from "vitest";

import { can } from "./can";
import { ACTIONS, type Actor, type Subject } from "./types";

const subject: Subject = { kind: "npc", visibility: "dm", published: true };

describe("can (Phase 0 stub)", () => {
  it("fails closed for every role and every action", () => {
    // The real matrix arrives in Phase 1. Until then the only property worth asserting
    // is that the stub denies rather than permits — if someone wires an enforcement site
    // to `can()` early, the failure mode should be a locked door, not an open one.
    for (const role of ROLES) {
      const actor: Actor = { id: `test-${role}`, role };
      for (const action of ACTIONS) {
        expect(can(actor, action, subject)).toBe(false);
      }
    }
  });

  it("covers every declared action in the sweep above", () => {
    expect(ACTIONS.length).toBeGreaterThan(0);
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});
