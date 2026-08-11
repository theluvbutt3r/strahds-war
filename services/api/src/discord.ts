import { type Role } from "@sw/schemas";

/**
 * Discord guild gating: your players are already in your server, so membership is the
 * cheapest possible onboarding check (PLAN.md §5).
 *
 * Split deliberately into a pure decision and a thin fetch. The decision is where the
 * security property lives and it is unit-tested exhaustively; the fetch is the part that
 * cannot be tested without a network and is kept as small as it can be.
 */

/**
 * What a verified guild member's role becomes.
 *
 * A lookup table rather than `if (role === "viewer")`, and not only because the lint rule
 * forbids the comparison. Written this way, two properties are visible at a glance rather
 * than argued about:
 *
 *   - **Nobody is ever demoted.** Every role maps to itself or upward. A Co-DM who
 *     happens to leave the Discord server does not lose their powers here.
 *   - **Nobody is promoted past `player`.** Guild membership proves someone is at your
 *     table. It says nothing about whether they should be able to write lore or read
 *     secrets, and those roles stay a deliberate manual grant.
 *
 * Adding a sixth role makes this table fail to compile until somebody decides what guild
 * membership means for it — which is the question that should be asked.
 */
const ON_VERIFIED_MEMBERSHIP: Record<Role, Role> = {
  viewer: "player",
  player: "player",
  chronicler: "chronicler",
  "co-dm": "co-dm",
  overlord: "overlord",
};

export interface MembershipDecision {
  readonly currentRole: Role;
  /** Whether the account is a member of the configured guild. */
  readonly isMember: boolean;
  /** Absent when no guild is configured, which makes the wiki invite-only. */
  readonly guildConfigured: boolean;
}

/**
 * The role a user should hold after a Discord sign-in.
 *
 * Returns the role unchanged whenever the answer is anything other than a confirmed
 * membership — no guild configured, not a member, lookup failed. That is the fail-closed
 * direction: a Discord API outage must not hand out Player access, and it must not strip
 * it either.
 */
export function roleAfterDiscordSignIn(decision: MembershipDecision): Role {
  if (!decision.guildConfigured || !decision.isMember) return decision.currentRole;
  return ON_VERIFIED_MEMBERSHIP[decision.currentRole];
}

/**
 * The scopes Discord sign-in requests.
 *
 * `guilds` is what makes the membership check possible at all; without it the token
 * cannot read the user's server list. It is the only scope here beyond the minimum, and
 * it grants read access to guild names only — not messages, not members.
 */
export const DISCORD_SCOPES = ["identify", "email", "guilds"] as const;

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Whether the access token's owner is in `guildId`.
 *
 * Returns `false` on any failure — a non-200, a malformed body, a network error, a
 * timeout. Callers cannot distinguish "not a member" from "could not tell", and that is
 * intentional: both must produce the same conservative outcome, and offering the
 * distinction invites a caller to treat "could not tell" as good enough.
 *
 * The timeout matters more than it looks. Without one this runs inside the sign-in
 * request, so a slow Discord means a hung sign-in rather than a slightly wrong role.
 */
export async function isGuildMember(
  accessToken: string,
  guildId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5_000,
): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => {
    abort.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: abort.signal,
    });

    if (!response.ok) return false;

    const body: unknown = await response.json();
    if (!Array.isArray(body)) return false;

    return body.some((guild) => {
      if (typeof guild !== "object" || guild === null) return false;
      const id: unknown = (guild as { id?: unknown }).id;
      return id === guildId;
    });
  } catch {
    // Deliberately swallowed. See the note above: every failure is "not a member".
    return false;
  } finally {
    clearTimeout(timer);
  }
}
