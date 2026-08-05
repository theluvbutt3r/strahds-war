# 0004. Capability-based authorization, and the lint rule that enforces it

- **Status:** Accepted
- **Date:** 2026-08-05

> This ADR is quoted by name in the ESLint error a developer sees when they compare a role directly. If you arrived here from that message, the short answer is in **Decision**; the reason the rule is worded so broadly is in **Consequences**.

## Context

There are five roles — `viewer`, `player`, `chronicler`, `co-dm`, `overlord` — and twelve actions. Two things make the obvious approach wrong.

**Roles are not a single ascending scale.** A `chronicler` can write lore but must never read DM-only material. Write capability and read clearance are genuinely independent axes. Any code shaped like `if (role >= chronicler)` is wrong for that role specifically, and `chronicler` is the role most likely to be handled by someone reasoning about the list as a ladder.

**Scattered role checks rot silently.** A comparison written against a five-role world keeps compiling in a six-role world. It just quietly stops matching the intended set, and nothing fails.

## Decision

Authorization is asked as a **capability question**, through one pure function:

```ts
can(actor: Actor, action: Action, subject: Subject): boolean
```

`packages/authz` has no database access, no network, and no framework imports — enforced by lint and by `dependency-cruiser`. That purity is the point: the entire permission matrix can be asserted in a table-driven test, all 5 roles against all 12 actions. An I/O call anywhere in the package ends that property.

Identity and capability are deliberately separate. Better Auth answers _who you are_; this package answers _what you may do_.

Both the API and the UI import the same `can()`, so the interface never offers an action the server will reject. **Only the API's use is enforcement.** The UI's use decides whether to render an Edit button. That distinction is repeated at every call site because it is exactly the thing a future reader gets wrong.

At Phase 0 `can()` returns `false` for everything. That is the correct stub for a security primitive: wiring an enforcement site to it prematurely produces a locked door, not an open one.

### The lint rule

Direct role comparison is a lint error — `no-restricted-syntax`, configured in `tooling/eslint-config/restricted-syntax.js`. It rejects five spellings:

```ts
actor.role === "co-dm"                      // the obvious one
actor["role"] === "co-dm"                   // spelled around the first rule
const { role } = actor; role === "overlord" // destructured
["co-dm", "overlord"].includes(actor.role)  // membership test
switch (actor.role) { ... }                 // switch
```

The destructured and array forms match on the _literal_ rather than on a `.role` access, because a selector cannot see where a bare `role` variable came from. Only `chronicler`, `co-dm` and `overlord` are matched as literals: `player` and `viewer` are omitted because `"player"` is also a Visibility tier, and banning it would reject `visibility === "player"`, which is legitimate and common. The three that remain are unambiguous, and they are the ones where a mistaken comparison _grants_ access rather than withholding it.

`packages/schemas/src/roles.ts`, `packages/authz/**` and test files may write role literals — the list has to exist somewhere and the matrix has to name roles. They may still not write `actor.role === …`; even the policy package expresses the matrix as data.

## Consequences

**Easy.** Adding a sixth role is an edit to one table in `authz`. The matrix is exhaustively testable, and a gap in its coverage is visible as a gap in the permission matrix rather than as a missing branch somewhere in the UI.

**Hard — and this is the honest cost:** the rule has false positives at the edges. A selector cannot distinguish a role comparison from a coincidental string comparison against the word `"overlord"`. The exemption list exists to absorb the legitimate cases, and `scripts/verify-boundaries.ts` carries positive controls asserting that legal code still passes, because a rule that cries wolf earns an inline `eslint-disable` — which then suppresses genuine findings on that line forever.

**The rule is verified, not merely configured.** Mechanism 4 of `scripts/verify-boundaries.ts` writes each illegal spelling into every scope — apps/web as a server component, a plain module and a client component, plus packages/ui, packages/editor and services/api — and requires all of them to be rejected.

That check exists because the rule was silently dead in the entire view layer for the whole of Phase 0. `react.js` had declared its own `no-restricted-syntax` for the `'use client'` ban, and ESLint flat config replaces a rule's options rather than merging them, so the role ban disappeared from apps/web, packages/ui and packages/editor while continuing to work in services/api. Nothing failed. `next.js` then set the same rule to `"off"` for client components, removing what remained — in the files most likely to contain a role check. See `docs/AUDIT-REMEDIATION.md`.

The generalisable lesson, and the reason Mechanism 4 is written to be extended: **a security rule that is correct today is not the same as one that stays correct.** The difference is whether something writes illegal code and checks.

## Alternatives considered

**Role checks at each call site.** The thing being rejected. Fails on the chronicler axis and rots on role addition.

**Better Auth's `createAccessControl()` primitive.** Capable, and it would work. Rejected because it puts the permission matrix inside the auth library's runtime, which makes it awkward to unit-test exhaustively and couples policy to identity — the separation this ADR is built on. Better Auth still handles identity, sessions, and the admin plugin's user management.

**Type-level enforcement — branding `Role` so bare comparison does not typecheck.** Attractive, and it would catch the destructured case exactly rather than heuristically. Rejected for now because `Role` is `z.infer<>` of a Zod enum, and branding it fights every place a role is legitimately a string. Worth revisiting if the lint rule's false-positive rate becomes annoying in practice.
