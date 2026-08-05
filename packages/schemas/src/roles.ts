import { z } from "zod";

import { type Visibility } from "./visibility";

/**
 * The five roles from docs/PLAN.md §5, ordered by increasing capability.
 *
 * Note that ordering here is descriptive, not an authorization mechanism — code must
 * never branch on `role >= x`. Capability questions go to `can()` in @sw/authz; a lint
 * rule in @sw/eslint-config rejects direct role comparisons for exactly this reason.
 */
export const ROLES = ["viewer", "player", "chronicler", "co-dm", "overlord"] as const;

export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/**
 * The highest content tier each role may read.
 *
 * `viewer` maps to `public`, but the front door requires a login regardless — an
 * unauthenticated request reaches the sign-in page and nothing else, so in practice no
 * `public` content is served anonymously today. Keeping the tier distinct leaves room
 * for a shared handout link later without reworking the model.
 */
export const ROLE_CLEARANCE: Record<Role, Visibility> = {
  viewer: "public",
  player: "player",
  chronicler: "player",
  "co-dm": "dm",
  overlord: "dm",
};

/**
 * A `chronicler` can write lore but must not see DM-only material — which means
 * write capability and read clearance are genuinely independent axes, not one scale.
 * @sw/authz models them separately for that reason.
 */
export function clearanceFor(role: Role): Visibility {
  return ROLE_CLEARANCE[role];
}
