import { z } from "zod";

/**
 * Clearance tiers. Ordered — each tier can see everything at or below its own level.
 *
 * This is the axis the whole campaign depends on: an NPC can be publicly known by name
 * and portrait while their true allegiance is `dm`, in the same record. Enforcement
 * happens in the query layer in services/api, so material above the requester's
 * clearance is never serialised, let alone sent.
 */
export const VISIBILITY_TIERS = ["public", "player", "dm"] as const;

export const visibilitySchema = z.enum(VISIBILITY_TIERS);
export type Visibility = z.infer<typeof visibilitySchema>;

/**
 * The default clearance for newly created content.
 *
 * `player`, not `public`, and that choice is load-bearing: a forgotten visibility field
 * should hide content, not expose it. See docs/adr/0002-players-only-front-door.md.
 */
export const DEFAULT_VISIBILITY: Visibility = "player";

const TIER_RANK: Record<Visibility, number> = {
  public: 0,
  player: 1,
  dm: 2,
};

/**
 * Whether a viewer holding `clearance` may see content marked `required`.
 *
 * Pure and total, so it is safe to call anywhere — but calling it in a React component
 * is cosmetic only. The authoritative check is the one the API makes before the data
 * crosses the wire.
 */
export function clears(clearance: Visibility, required: Visibility): boolean {
  return TIER_RANK[clearance] >= TIER_RANK[required];
}

/** The highest tier a viewer may see, given a set of granted tiers. */
export function maxClearance(tiers: readonly Visibility[]): Visibility {
  return tiers.reduce<Visibility>(
    (highest, tier) => (TIER_RANK[tier] > TIER_RANK[highest] ? tier : highest),
    "public",
  );
}
