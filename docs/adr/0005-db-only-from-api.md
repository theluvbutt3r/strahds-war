# 0005. Only `services/api` may import `@sw/db`

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

Visibility filtering is the property the whole project rests on (ADR [0002](0002-players-only-front-door.md)). The question is not _how_ to filter — it is **how many places have to be correct** for the guarantee to hold.

If the web app can query Postgres, then every Server Component that fetches data is a place where a `WHERE visibility <= $clearance` clause could be forgotten. The guarantee becomes a property to re-verify in every component, forever, including in components not yet written. No amount of care makes that reliably true, because the failure is an omission and omissions do not show up in review.

## Decision

**Only `services/api` imports `packages/db`.** The web app holds no database credentials and cannot query Postgres even by accident. It reads through `packages/api-client` over HTTP, so filtering happens server-side in the query, once, at a single auditable chokepoint.

Note this is _not_ plain layering. `db` is a low layer, so ordinary layering rules would happily let `ui` import it as a "lower" package — which is exactly the edge that must not exist. `db` therefore appears in no package's allow-list at all, at any layer.

Enforced three ways, none of which rely on anyone remembering:

1. **pnpm manifests** (`node-linker=isolated`) — no app declares `@sw/db`, so the import does not resolve.
2. **ESLint** — `eslint-plugin-boundaries` layering, plus a `no-restricted-imports` rule with the `DB_RESTRICTED` marker in its message. The rules duplicate each other deliberately: `boundaries/dependencies` only fires on dependencies it can _resolve_, and an import of an undeclared workspace package resolves to nothing — so the violation that matters most is the one it cannot see.
3. **dependency-cruiser** — the `db-only-from-api` rule, which reasons about resolved files and therefore catches the bypass the others cannot: a relative path like `../../db/src/index` that walks around the manifest entirely.

`scripts/verify-boundaries.ts` writes genuinely illegal code — both a bare specifier and a relative-path reach — and requires each mechanism to reject it independently, with a positive control asserting legal imports still pass.

## Consequences

**Easy.** Spoiler enforcement is one place to audit. Reviewing "can a player see DM content?" means reading the API's query layer, not the whole web app. The mobile app and the Discord bot inherit the same guarantee for free, because they consume the same filtered HTTP contract.

**Hard.** The web app cannot do a quick direct query, ever — including for something obviously harmless like a count on a public page. Every read is an API round trip and, where it matters, an endpoint that has to be designed. That is a real ongoing tax and it is the point: the moment there is one exception, the guarantee is back to being a property of every component.

**Cost:** two processes in local development, and a network hop where a function call would do. Acceptable at this scale; the wiki is not compute-bound.

**Cost:** three overlapping enforcement mechanisms are more configuration than one. Justified because the way this fails is silent — a resolver change or a config refactor, nothing errors, the rules stop matching — and the first sign of trouble would otherwise be a spoiler in production.

## Alternatives considered

**Database access in the web app with a shared query helper** that always applies the filter. Rejected: it relies on remembering to use the helper. The failure is an omission, and nothing catches an omission.

**Row-level security in Postgres.** Genuinely attractive — enforcement in the database is the strongest possible position, and worth revisiting in Phase 6 as defence in depth. Rejected as the _primary_ mechanism because per-field visibility (an NPC publicly known by name while their allegiance is DM-only) is awkward to express as RLS, and because it would mean the web app holds credentials, which loses the property that a mistake cannot even reach the database.

**A single Next.js app with database access confined to a `server/` directory by convention.** Rejected: a convention is not a mechanism. This is the same argument as ADR [0001](0001-modular-monorepo.md) — a boundary nobody checks is a comment.
