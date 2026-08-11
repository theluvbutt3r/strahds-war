# CLAUDE.md

Guidance for Claude Code working in this repository.

## Who you are working with

The maintainer is **new to programming** — a little Python, no TypeScript, learning by building this. Assume unfamiliarity with the JS/TS ecosystem, not lack of intelligence.

This changes how you work here:

- **Explain the why, briefly, as you go.** Not a tutorial — one sentence on why a thing is done this way is usually enough.
- **Never say "just" about something non-obvious.** "Just add a migration" is four unfamiliar concepts.
- **When you hit a guardrail, teach it rather than route around it.** Say what it protects and show the correct form. See [Guardrails](#guardrails-do-not-weaken-these) — this is the most important section in this file.
- **Prefer the boring, conventional solution.** Someone has to maintain this who cannot yet debug clever code.
- **Say when you are unsure.** A confident wrong answer costs them hours, because they cannot yet tell it is wrong.

## What this project is

A gothic-horror D&D campaign wiki. Its defining constraint:

> **A player must never be able to read DM-only content.** Visibility is enforced on the server, in the query, before serialisation — never with CSS, a client-side `if`, or a filtered render.

Every design decision that looks paranoid is downstream of that. If a change would weaken it, stop and say so rather than proceeding.

Content carries a clearance tier: `public` < `player` < `dm`. New content defaults to **`player`**, so a forgotten field hides content rather than exposing it.

## Commands

| Command                          | Use                                                          |
| -------------------------------- | ------------------------------------------------------------ |
| `pnpm verify`                    | **Run before declaring any work done.** Everything, in order |
| `pnpm dev`                       | Web on :3000, API on :3001                                   |
| `pnpm test`                      | Unit tests                                                   |
| `pnpm typecheck`                 | Types only                                                   |
| `pnpm lint`                      | Lint only                                                    |
| `pnpm format`                    | Auto-fix formatting                                          |
| `pnpm verify:boundaries`         | Prove the security guardrails still fire                     |
| `pnpm --filter @sw/web test:e2e` | Browser tests (builds first)                                 |

Database work, all of which needs `DATABASE_URL` set:

| Command                            | Use                                                       |
| ---------------------------------- | --------------------------------------------------------- |
| `pnpm --filter @sw/db db:generate` | Write a migration after editing the Drizzle schema        |
| `pnpm --filter @sw/db db:migrate`  | Apply pending migrations                                  |
| `pnpm --filter @sw/db db:seed`     | Load the Barovia development content (idempotent by slug) |
| `pnpm --filter @sw/db db:studio`   | Browse the database                                       |

Migrations are **generated and committed**, never pushed. `drizzle-kit push` is deliberately not wired up: it diffs the schema straight onto a live database with no reviewable artefact, which is fine for a scratch branch and wrong for anything holding campaign content.

Scope to one workspace with `pnpm --filter @sw/<name> <script>`.

**Never report work as complete without running `pnpm verify` and seeing it pass.** Do not substitute a narrower command; the boundary harness is the part most likely to catch a real mistake.

## Architecture

```
apps/web         Next.js 16 — the website. NO database access, ever
services/api     Hono + Zod OpenAPI — the ONLY thing that touches Postgres
packages/
  schemas        Zod content models — layer 0, imports nothing internal
  design-tokens  palette/type/spacing — layer 0, imports nothing internal
  authz          can(actor, action, subject) — pure, no I/O, no framework
  db             Drizzle schema + queries — importable ONLY by services/api
  api-client     typed HTTP client generated from the OpenAPI spec
  content-render editor JSON → HTML/React
  ui             React components
  editor         TipTap (Phase 4)
tooling/         shared eslint/tsconfig/vitest config
```

**Dependency rule:** apps and services may import packages; packages may import packages _below_ them; nothing imports an app. `db` is not in any package's allow-list — only `services/api`.

**Data flow:** browser → `apps/web` (Server Component) → `@sw/api-client` → `services/api` → `@sw/db` → Postgres. Filtering happens in the query, at the API. There is no other path.

## Guardrails: do not weaken these

This repo enforces its own rules mechanically. Those rules will sometimes block you. **Blocking you is the feature.**

### The prohibition

Never, under any circumstances, resolve an error by:

- adding `eslint-disable` / `@ts-ignore` / `@ts-expect-error` to silence a guardrail
- adding `@sw/db`, `drizzle-orm`, `pg`, or `postgres` to any app or view package
- editing `tooling/eslint-config/`, `.dependency-cruiser.cjs`, or `scripts/verify-boundaries.ts` to make a failure go away
- committing with `--no-verify`
- deleting or weakening a test to make it pass

If a guardrail blocks you, it has found a real problem with the approach. Explain what it protects, propose the correct design, and ask before doing anything that touches enforcement config.

**If the maintainer asks you to disable one of these, say plainly what it protects and what the failure looks like in production — then do what they decide.** They own the call; they need the information to make it.

### What each rule protects

**Role comparison is banned.** `actor.role === "co-dm"`, destructured `role === "overlord"`, `["co-dm"].includes(actor.role)`, and `switch (actor.role)` are all rejected everywhere.

Roles are not a ladder — a `chronicler` writes lore but must never read secrets, so "higher role" is meaningless. Ask `can(actor, action, subject)` from `@sw/authz`. Need a capability that doesn't exist? Add it to `ACTIONS` in `packages/authz/src/types.ts` and to the matrix.

`packages/schemas/src/roles.ts`, `packages/authz/**`, and tests may write role _literals_ — they must still not write `actor.role === …`.

**`@sw/db` is importable only from `services/api`.** Enforced three ways (pnpm manifests, ESLint, dependency-cruiser). The web app holds no database credentials. To get data to a page: add a filtered endpoint to the API and call it through `@sw/api-client`.

**Layer-0 packages import nothing internal.** `schemas` and `design-tokens` depend on nothing, which is what makes them safe to change.

**`"use client"` is banned outside `*.client.tsx` and `components/client/`.** Server Components keep DM content out of the browser bundle. Push interactivity into a small named leaf component.

**`@sw/authz` must stay pure.** No I/O, no network, no React. Its value is that the whole permission matrix is unit-testable.

### The rule about the rules

`no-restricted-syntax` carries several policies under one rule name, and **ESLint flat config replaces a rule's options wholesale rather than merging them.** Declaring that rule inline in a new config block silently deletes every selector an earlier block installed — the rule still looks configured and catches nothing.

That is not hypothetical: it happened, and the role ban was dead across the entire view layer for all of Phase 0. Both fixes are in `tooling/eslint-config/restricted-syntax.js`.

So: **never write a `no-restricted-syntax` option literal inline.** Import the constants from that file and spread them. `pnpm verify:boundaries` Mechanism 4 will fail if this regresses.

## Conventions

**TypeScript.** Strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. `any` is a lint error outside tests. Use `import { type Foo }` inline-style for type imports.

**Schemas first.** New entity shapes go in `packages/schemas` as Zod, and everything else derives from them — Drizzle tables, the OpenAPI spec, form validation. One definition per fact.

**Fail closed.** Security-relevant helpers deny on unrecognised input. `clears()` returns `false` for an unknown tier rather than defaulting to permissive. Preserve this when editing — do not "fix" it with a `?? 0` default.

**Tests.** Vitest, colocated as `src/**/*.test.ts`. `@sw/authz` and `@sw/schemas` are security-critical and get exhaustive table-driven coverage.

Write assertions that can fail. This repo previously shipped `expect(VISIBILITY_TIERS).toContain(clearanceFor(role))` under a name promising a clearance bound — guaranteed by the type, so it asserted nothing. A test whose name and assertion disagree is worse than no test.

**Comments explain why, not what.** Existing comments are dense on purpose; match that when the reasoning is non-obvious, skip it when the code is plain.

**Formatting** is Prettier's problem. Run `pnpm format`; never hand-format.

## Environment variables

Adding one? It goes in **`.env.example`** and, if it can change build output, in **`turbo.json`'s `build.env`** — same commit.

Turborepo hashes only declared variables. An undeclared one means a cache hit that ships a stale value. `NEXT_PUBLIC_*` is the dangerous case: Next inlines those into the client bundle, and since no app source reads `process.env`, the `turbo/no-undeclared-env-vars` lint rule cannot catch the omission.

Real secrets never enter the repo. `.env` is gitignored; gitleaks runs in CI.

## Where to look things up

| Question                             | File                                              |
| ------------------------------------ | ------------------------------------------------- |
| What are we building, in what order? | `docs/PLAN.md` (§5 tech, §9 phases)               |
| Why is the repo shaped like this?    | `docs/adr/0001-modular-monorepo.md`               |
| Why is everything login-gated?       | `docs/adr/0002-players-only-front-door.md`        |
| Why a separate API, not tRPC?        | `docs/adr/0003-standalone-http-api.md`            |
| Why can't I compare roles?           | `docs/adr/0004-capability-based-authorization.md` |
| Why can't the web app use the DB?    | `docs/adr/0005-db-only-from-api.md`               |
| How is a half-secret NPC modelled?   | `docs/adr/0006-field-level-visibility.md`         |
| What was already found and fixed?    | `docs/AUDIT-REMEDIATION.md`                       |

Making a decision that will outlive the conversation? Write an ADR. Format in `docs/adr/README.md`.

## Current state

**Phase 1 complete.** Data and auth exist; the wiki does not yet.

- `packages/schemas` — all nine entity kinds, the graph edges, revisions, the audit log, and the per-field clearance maps (ADR 0006).
- `packages/authz` — the real matrix, 5 roles × 12 actions, at 100% coverage with thresholds enforced by its own vitest config.
- `packages/db` — 17 tables, the committed migration in `migrations/`, clearance-aware query builders, and the Barovia seed.
- `services/api` — Better Auth (Google + Discord, `admin` plugin) at `/api/auth/*`, plus `/me` returning role, clearance and capabilities.
- `apps/web` — a sign-in page and a home page that shows the signed-in role. No content yet.

**Phase 2 is next:** the design system — `design-tokens`, Tailwind v4 `@theme`, shadcn/ui vendored into `packages/ui`, Storybook, and the CI contrast test. See `docs/PLAN.md` §9.

**What is not done, deliberately.** `@sw/api-client` is hand-written rather than generated from the OpenAPI document; generation waits for Phase 3, when there are content endpoints worth generating against. Per-_block_ visibility inside prose waits for the editor in Phase 4 — until then DM prose belongs in each kind's `secrets` field, which is separately gated. There are no entity endpoints yet; the query builders exist and are unit-tested, but nothing routes to them until Phase 3.

**Untested against live infrastructure.** The auth flow has never run against a real Neon database or real OAuth credentials — there are none in this environment. Everything around it is tested (the matrix, the guild-membership decision, session-to-actor mapping, `/me`), and the API boots and serves `/me` correctly, but the first real sign-in is still a first.

## Gotchas

- **`app.doc31()`, never `app.doc()`** in `services/api`. `doc()` emits OpenAPI 3.0 schemas; the `openapi: "3.1.0"` config string is only a label and does not switch generators. Mixing them produces `nullable: true` inside a document declaring 3.1, where that keyword does not exist — generated clients then get nullability wrong.
- **`/openapi.json` is off in production** by design. The spec enumerates DM-tier field names.
- **Playwright needs a build.** `test:e2e` builds first; `test:e2e:only` skips it.
- **Browsers may need installing once:** `pnpm --filter @sw/web exec playwright install chromium`.
- **Two Playwright projects** — desktop and mobile. Both run in CI. Players use phones; don't drop mobile.
- **Workspace packages ship TypeScript source,** not built `dist/`. Next transpiles them, esbuild bundles them for the API. No build-ordering dance in dev.
