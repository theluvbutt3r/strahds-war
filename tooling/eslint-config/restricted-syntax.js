/**
 * Selectors for `no-restricted-syntax`, defined once and composed at every use site.
 *
 * WHY THIS FILE EXISTS. `no-restricted-syntax` is a single rule name carrying several
 * unrelated policies, and ESLint flat config *replaces* a rule's options wholesale when a
 * later config object names the same rule — it does not merge them. So a second config
 * block that configures `no-restricted-syntax` for its own purpose silently deletes every
 * selector an earlier block installed. The rule still appears configured. It simply stops
 * catching the thing it was written for.
 *
 * That is not hypothetical here: `react.js` used to declare its own `no-restricted-syntax`
 * for the 'use client' ban, scoped to apps/web, packages/ui and packages/editor — which
 * silently disabled the role-comparison ban across the entire view layer, the exact place
 * it matters most. `next.js` then set the rule to "off" for client components, removing
 * what was left. Both were caught by the Phase 0 audit; see docs/AUDIT-REMEDIATION.md.
 *
 * The fix is structural rather than a one-time repair: no config file may write a
 * `no-restricted-syntax` option literal inline. Every use site spreads the constants below,
 * so adding a policy is an edit here and composing it is a spread there. Mechanism 4 of
 * scripts/verify-boundaries.ts writes deliberately illegal code into every scope and
 * requires each to be rejected, so a regression fails CI rather than going unnoticed.
 */

const ROLE_MESSAGE =
  "Do not compare roles directly. Ask @sw/authz `can(actor, action, subject)` instead — see docs/adr/0004-capability-based-authorization.md";

/**
 * Privileged role names, as a selector-embeddable regex.
 *
 * `viewer` and `player` are deliberately absent. "player" is also a Visibility tier, so
 * banning the literal would reject `visibility === "player"`, which is entirely legitimate
 * and common. The three names here are unambiguous — they exist only as roles — and they
 * are the ones where a mistaken comparison *grants* access rather than withholding it,
 * which is the direction that actually leaks spoilers.
 */
const PRIVILEGED_ROLE = "/^(chronicler|co-dm|overlord)$/";

/**
 * Role branching reached through a `.role` property access.
 *
 * Applies everywhere, including inside @sw/authz: the permission matrix is meant to be a
 * data table keyed by role, not a chain of comparisons.
 */
export const NO_DIRECT_ROLE_COMPARISON = [
  {
    // actor.role === "co-dm"
    selector: "BinaryExpression[operator=/^[=!]==?$/] > MemberExpression[property.name='role']",
    message: ROLE_MESSAGE,
  },
  {
    // actor["role"] === "co-dm" — the same thing, spelled around the rule above
    selector:
      "BinaryExpression[operator=/^[=!]==?$/] > MemberExpression[computed=true][property.value='role']",
    message: ROLE_MESSAGE,
  },
  {
    // switch (actor.role)
    selector: "SwitchStatement > MemberExpression[property.name='role']",
    message: ROLE_MESSAGE,
  },
  {
    // ["co-dm", "overlord"].includes(actor.role) / ROLE_SET.has(actor.role)
    selector:
      "CallExpression[callee.property.name=/^(includes|has)$/] > MemberExpression[property.name='role']",
    message: ROLE_MESSAGE,
  },
];

/**
 * Role branching that never mentions `.role` — the destructured form.
 *
 *   const { role } = actor;
 *   if (role === "overlord") ...
 *
 * A selector cannot see that `role` came from an Actor, so these match on the *literal*
 * instead: comparing anything to a privileged role name, or listing one in an array.
 * That catches the destructured case and the `["co-dm"].includes(r)` case without needing
 * to know the left-hand side.
 *
 * Separated from the set above because it needs exemptions the other does not — the role
 * list has to be written down somewhere, and the permission matrix has to name roles.
 * See `ROLE_LITERAL_EXEMPT_FILES`.
 */
export const NO_ROLE_LITERAL_BRANCHING = [
  {
    // role === "overlord", where `role` was destructured out of an actor
    selector: `BinaryExpression[operator=/^[=!]==?$/] > Literal[value=${PRIVILEGED_ROLE}]`,
    message: ROLE_MESSAGE,
  },
  {
    // case "overlord":
    selector: `SwitchCase > Literal[value=${PRIVILEGED_ROLE}]`,
    message: ROLE_MESSAGE,
  },
  {
    // ["co-dm", "overlord"].includes(r)
    selector: `ArrayExpression > Literal[value=${PRIVILEGED_ROLE}]`,
    message: ROLE_MESSAGE,
  },
];

/**
 * The files allowed to write privileged role names as literals.
 *
 * Kept as narrow as it can be: the canonical role list, the policy package whose entire
 * job is to map roles to capabilities, and tests — which legitimately enumerate every
 * role in order to assert the matrix. Note that `NO_DIRECT_ROLE_COMPARISON` still applies
 * in all of these; only the literal-based selectors are lifted.
 */
export const ROLE_LITERAL_EXEMPT_FILES = [
  "packages/schemas/src/roles.ts",
  "packages/authz/**/*.{ts,tsx}",
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "scripts/**/*.ts",
];

/**
 * Server Components are load-bearing for spoiler safety: DM-only material is fetched and
 * rendered on the server so it never enters the client bundle. An accidental "use client"
 * at the top of a page undoes that silently.
 */
export const NO_USE_CLIENT = {
  selector: "ExpressionStatement > Literal[value='use client']",
  message:
    "Adding 'use client' pulls this module's data into the browser bundle. If it renders any entity content, keep it a Server Component and push interactivity into a small leaf component instead — name the file *.client.tsx or put it under components/client/ to opt in. See PLAN.md §5.",
};

/**
 * The default set: everything, for code that is neither a client component nor exempt.
 * Spread this rather than rebuilding the list, so a new policy reaches every scope.
 */
export const ALL_RESTRICTED_SYNTAX = [...NO_DIRECT_ROLE_COMPARISON, ...NO_ROLE_LITERAL_BRANCHING];
