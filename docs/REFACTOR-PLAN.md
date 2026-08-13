# Refactor & Scalability Plan

**Version 1.0.0** · 2026-08-13 · Status: **Proposed, not started**

## Revision history

| Version | Date       | Change                                              |
| ------- | ---------- | --------------------------------------------------- |
| 1.0.0   | 2026-08-13 | First audit and plan, written at the end of Phase 2 |

**Versioning rule.** This file is the single canonical plan and is revised in place, not
forked into `-v2` copies — links from code comments and ADRs must keep resolving. Bump
**patch** for corrections and clarifications, **minor** when a phase changes scope, **major**
when phases are re-ordered or one is dropped. Append a row above every time. Completed phases
stay in the document marked `Done` rather than being deleted, because the reasoning behind a
finished refactor is exactly what the next reader needs.

---

## 1. What this is, and what it is not

This is an audit of the repository as it stands at the end of Phase 2, and a sequenced plan
to restructure it before Phase 3 adds roughly ten content endpoints and the pages that read
them.

**It is not a rewrite.** The architecture is sound — the boundary enforcement, the
capability matrix, and the fail-closed defaults are the reason this codebase is worth
maintaining, and none of them change here. What changes is the shape of a handful of files
that are already at the size where they hide things, and one genuine single-source-of-truth
break that will bite the first time a tenth entity kind is added.

Everything below is measured. No finding is "this feels large".

### The four goals, and how each is judged

Every step in every phase is justified against these and nothing else. §8 audits the plan
against them and cuts what does not pass.

| Goal                      | What it concretely means here                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Speed**                 | `pnpm verify` stays under ~60s and CI under 90s; the web bundle does not grow; and — mostly — _finding the code you need_ gets faster. |
| **Ease of use**           | The common task ("add an entity kind", "add an endpoint", "add a component") has one obvious path with fewer files to touch.           |
| **Legibility**            | A file fits on a screen or two, and its name predicts its contents. Target ≤200 lines where the file holds logic.                      |
| **Safe isolated updates** | Changing one thing either works or fails **loudly at compile or test time** — never silently, and never in a distant package.          |

The fourth is the one that matters most for this project and the one the audit weighs heaviest.

---

## 2. The codebase as measured

123 source files, 11,010 lines, excluding `node_modules`, build output and coverage.

| Workspace                | Lines | Notes                                       |
| ------------------------ | ----: | ------------------------------------------- |
| `packages/ui`            | 2,611 | 12 components + 12 story files + atmosphere |
| `packages/db`            | 1,676 | schema, queries, seed                       |
| `packages/design-tokens` | 1,353 | tokens + contrast maths + their tests       |
| `services/api`           | 1,314 | 2 endpoints, auth, env, actor mapping       |
| `packages/schemas`       | 1,055 | 9 entity kinds, clearance maps              |
| `packages/authz`         |   773 | matrix + exhaustive test                    |
| `scripts`                |   797 | boundary harness, theme generator           |
| `tooling`                |   748 | eslint / tsconfig / vitest config           |
| `apps/web`               |   560 | two pages                                   |
| `packages/api-client`    |    99 | hand-written, one endpoint                  |

Of that, 17 files are tests and 12 are Storybook stories — a healthy ratio for a codebase
whose main claim is that its rules are enforced rather than documented.

### Files over 200 lines

| Lines | File                                    | Holds                                                 | Verdict           |
| ----: | --------------------------------------- | ----------------------------------------------------- | ----------------- |
|   472 | `scripts/verify-boundaries.ts`          | 4 independent mechanisms + fixture management         | **Split** (R4)    |
|   446 | `packages/authz/src/can.test.ts`        | the exhaustive 5×12 matrix assertion                  | **Keep** — see §8 |
|   425 | `packages/db/src/seed-data.ts`          | Barovia content, as data                              | **Keep** — see §8 |
|   402 | `packages/schemas/src/entities.ts`      | 9 field schemas + 9 clearance maps + 2 registries     | **Split** (R2)    |
|   325 | `scripts/generate-theme.ts`             | 6 section builders + grain SVG + CLI + drift check    | **Split** (R4)    |
|   283 | `packages/db/src/queries.ts`            | column mapping, entity reads, links, users, audit     | **Split** (R4)    |
|   263 | `tooling/eslint-config/boundaries.js`   | the layering policy                                   | **Keep** — see §8 |
|   232 | `packages/db/src/schema/content.ts`     | 8 enums + 11 tables                                   | **Split** (R4)    |
|   226 | `packages/ui/src/base.css`              | reset, focus, prose, animations, atmosphere           | **Split** (R4)    |
|   225 | `services/api/src/app.ts`               | 2 route defs + middleware + OpenAPI doc + composition | **Split** (R3)    |
|   221 | `packages/schemas/src/entities.test.ts` | mirrors `entities.ts`                                 | Follows R2        |
|   214 | `packages/ui/src/tokens.stories.tsx`    | palette + contrast + typography stories               | **Split** (R4)    |

---

## 3. Findings

Severity is judged by one question: **can this cause a silent failure?**

### F1 — The nine entity kinds are declared three times, and nothing reconciles them · **High**

`ENTITY_KINDS` in `packages/schemas/src/entities.ts`, `SUBJECT_KINDS` in
`packages/authz/src/types.ts`, and `CONTENT_KINDS` in `packages/authz/src/policy.ts` each
spell out the same nine strings by hand. `packages/db` correctly derives from `ENTITY_KINDS`;
`packages/authz` does not, even though it already imports from `@sw/schemas` and is permitted
to.

**Why it is the highest-severity finding.** Add a tenth kind — `quest`, say — and you edit
`schemas`. `can()` then returns `false` for every action on `quest`, for every role. That is
fail-closed, which is right, but it is also **completely silent**: no type error, no failing
test. The symptom is "the new kind exists and nobody, including the Overlord, can do anything
with it", and the cause is two packages away from where the work was done.

This is precisely the class of bug the repo's whole design exists to prevent, sitting inside
the design.

### F2 — `services/api/src/app.ts` has no route module structure · **High (for Phase 3)**

225 lines today for **two** endpoints, because each route carries its response schema, its
`createRoute` definition and its handler inline, alongside CORS, error handling, the OpenAPI
document and the app composition.

Phase 3 adds list and detail endpoints for nine kinds, plus search and links. On the current
shape that is a single file of 800–1,000 lines, and it is the file where visibility filtering
is wired — the one place in the codebase where a merge conflict resolved carelessly can leak
DM content. **This must be restructured before Phase 3, not after.**

### F3 — "Add an entity kind" touches ~8 files across 3 packages with no checklist · **Medium**

Measured path today: `schemas/entities.ts` (kind list, field schema, clearance map, two
registries) → `schemas/entities.test.ts` (expected list) → `authz/types.ts` → `authz/policy.ts`
→ `db/schema/content.ts` (table) → `db/queries.ts` (`DETAIL_TABLES`) → a migration → optionally
`db/seed-data.ts`.

Four of those are protected by `satisfies Record<EntityKind, …>` and will fail to compile if
missed. The `authz` ones are not (F1). There is no document that lists the path.

### F4 — `dependency-cruiser` silently drops imports it cannot resolve · **Medium**

Discovered while verifying an unrelated change this session. `vite`, `vitest` and
`@vitejs/plugin-react` never enter the dependency graph at all — the configured
`enhancedResolveOptions` cannot resolve their export maps — so `not-to-dev-dep` cannot see a
runtime import of them from shipping source. `@playwright/test` and `react` _do_ resolve and
_are_ checked.

This is the failure mode `tooling/eslint-config/restricted-syntax.js` warns about in prose: a
rule that looks configured and covers less than its name implies. It is noted in
`.dependency-cruiser.cjs` but not fixed.

### F5 — No integration tests against a real database · **Medium**

`selectionFor()` is unit-tested at the column level, which is genuinely sharper than asserting
on a response body — it proves a player's column set contains no DM column. But nothing proves
the generated SQL runs, that the joins are correct, or that migrations apply cleanly.
PLAN.md §10 calls for integration tests against a Neon branch. Phase 3 is when the first
query actually serves a request.

### F6 — `@sw/api-client` is hand-written · **Low, by design**

Deliberate and documented: generation waits for Phase 3, when there are endpoints worth
generating against. Recorded here so the decision is re-taken on purpose rather than forgotten.

### F7 — `packages/ui/src/index.ts` is a hand-maintained barrel · **Low**

A new component that is not added to the barrel simply is not exported. No test catches it.
Low severity because the failure is immediate and obvious the first time you import it.

### F8 — `packages/content-render` and `packages/editor` are one-line stubs · **Low**

Both sit in the layer graph and the boundary rules already, which is the right order. No action.

### F9 — No bundle budget, no Lighthouse, no CODEOWNERS · **Low**

All Phase 6 items in PLAN.md §9. Listed so the plan does not silently annex them.

---

## 4. What must not change

An audit that only proposes work is a sales pitch. These are load-bearing and the plan
protects them explicitly:

- **The three boundary mechanisms and `verify-boundaries.ts`.** Splitting the harness (R4)
  must not reduce what it asserts; the phase gate is that its output is byte-identical.
- **Fail-closed defaults** — `DEFAULT_VISIBILITY`, `clears()` on unknown input, `can()`
  denying by default, the hex parser throwing.
- **Generated-and-committed artefacts with drift checks** — migrations and `theme.css`. This
  pattern is the single best "safe isolated update" mechanism already in the repo, and the
  plan extends it rather than replacing it.
- **The capability matrix as data**, spelled out per role with no inheritance (ADR 0004).
- **Comment density.** These files explain _why_. Splitting must carry the reasoning with the
  code it explains, not strand it in an old header.

---

## 5. Target principles

1. **One list, derived everywhere.** Any set enumerated in more than one package is a defect.
   Downstream declares `satisfies Record<EntityKind, …>` so omission is a compile error.
2. **Co-locate what changes together.** An entity kind's schema and its clearance map belong
   in one file. Today they are 100 lines apart in two separate sections.
3. **Composition files stay thin.** `app.ts` wires; it does not define.
4. **A file's name predicts its contents**, and logic files stay ≤200 lines. Pure data and
   exhaustive table-driven tests are explicitly exempt (§8).
5. **Prefer a compile error to a test, a test to a lint rule, a lint rule to a document.**

---

## 6. Phases

Each phase is independently mergeable and **leaves `pnpm verify` green**. No phase depends on
a later one.

### R0 — Safety net first · ~half a day

Nothing moves in this phase. It adds the checks that make the later phases safe.

1. **Add a kinds-conformance test** in `packages/authz` asserting every `EntityKind` is
   reachable: at least one role can read it and at least one can create it. This passes today
   and is the test that catches F1's silent failure after R1 makes the lists derived.
2. **Add `max-lines` to ESLint at `warn`, threshold 200**, with explicit per-file overrides
   for the files §8 exempts. Warn, not error — it becomes the phase gate in R5.
3. **Fix F4**: extend `enhancedResolveOptions.conditionNames` so `vite`-family packages
   resolve, then re-run the positive control (`@playwright/test` must still be rejected, and a
   runtime `vite` import must now also be rejected).

**Serves:** safe isolated updates (1, 3), legibility (2). **Gate:** `pnpm verify` green;
`pnpm verify:boundaries` output unchanged.

### R1 — One source of truth for entity kinds · ~half a day

1. `packages/authz/src/types.ts`: `SUBJECT_KINDS = [...ENTITY_KINDS, "media", "user",
"audit_log", …] as const`, importing from `@sw/schemas` (already a legal layer-1 → layer-0
   edge).
2. `packages/authz/src/policy.ts`: `CONTENT_KINDS` becomes `ENTITY_KINDS`, deleted as a
   separate list.
3. The R0 conformance test now guards the property that remains capable of failing — a kind
   with no grants.

**Serves:** safe isolated updates, directly. Kills F1. Removes two of the eight files in F3's
path. **Gate:** `pnpm verify` green; adding a scratch tenth kind produces a _failing test_
rather than silence (verify manually, then revert).

### R2 — Split `schemas/entities.ts` into per-kind modules · ~1 day

The file most edited whenever content changes, and the one where a field and its clearance
currently live far apart.

```
packages/schemas/src/entities/
  index.ts        re-exports (the public surface is unchanged)
  base.ts         ENTITY_KINDS, slug, entityBaseSchema, ENTITY_BASE_CLEARANCE
  clearance.ts    FieldClearance<T>, visibleFieldsFor()
  registry.ts     ENTITY_FIELD_SCHEMAS + ENTITY_FIELD_CLEARANCE
  kinds/npc.ts    npcFieldsSchema AND NPC_FIELD_CLEARANCE, together   (~45 lines)
  kinds/…         one per kind, 8 more
```

`entities.test.ts` splits to follow, as a by-product rather than as its own goal.

**Serves:** legibility and ease of use. The co-location is the point: `FieldClearance<T>`
already makes a missing clearance entry a compile error, so this does not add safety — it
makes the existing safety **visible**, which is what stops someone fighting the type error
without understanding it. **Gate:** no change to `packages/schemas`' public exports; `pnpm verify` green.

### R3 — API route modules, before Phase 3 · ~1 day

```
services/api/src/
  app.ts              composition only (~60 lines)
  openapi.ts          document config + the production gate
  middleware/
    cors.ts
    errors.ts
  routes/
    index.ts          the registry — one line per route
    health.ts
    me.ts
```

Each route module exports its schema, its `createRoute` definition and its handler together.
Phase 3 then adds `routes/entities/list.ts` and `routes/entities/get.ts` beside them instead
of growing one file.

**Serves:** all four, and this is the phase with the largest forward leverage — it is the
difference between Phase 3 adding files and Phase 3 growing a 1,000-line one. **Gate:**
`services/api` tests unchanged and passing; the generated `/openapi.json` is byte-identical
before and after (capture it, diff it).

### R4 — Split the remaining oversized files · ~1.5 days

Independent, parallelisable, low risk. In descending order of value:

| From                                 | To                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `db/queries.ts` (283)                | `queries/{selection,entities,links,users,audit}.ts`                                                        |
| `scripts/verify-boundaries.ts` (472) | `scripts/verify-boundaries/{index,fixtures}.ts` + `mechanisms/{manifests,eslint,depcruise,role-syntax}.ts` |
| `scripts/generate-theme.ts` (325)    | `scripts/theme/{index,grain}.ts` + `sections/{color,type,layout,motion,atmosphere}.ts`                     |
| `db/schema/content.ts` (232)         | `schema/content/{enums,entity,details,links}.ts`                                                           |
| `ui/src/base.css` (226)              | `base.css` importing `base/{reset,typography,motion,atmosphere}.css`                                       |
| `ui/tokens.stories.tsx` (214)        | `{palette,contrast,typography}.stories.tsx`                                                                |

**Serves:** legibility. **Gate for the harness split specifically:** `pnpm verify:boundaries`
output must be byte-identical — this file is a security control and the split must be provably
behaviour-preserving.

### R5 — Close the loop · ~half a day

1. Flip `max-lines` from `warn` to `error`.
2. Write `docs/RECIPES.md` — the F3 checklist, as a short numbered path per common task
   ("add an entity kind", "add an endpoint", "add a component", "change a colour"), each
   ending in the command that proves it worked.
3. Update `CLAUDE.md`'s architecture section to the new layout.

**Serves:** ease of use, legibility. **Gate:** `pnpm verify` green with `max-lines` erroring.

### Deferred, with triggers rather than dates

- **Generate `@sw/api-client` from the OpenAPI document** (F6) — trigger: the third content
  endpoint lands. Two hand-written clients are cheaper than a codegen pipeline; four are not.
- **Integration tests against a Neon branch** (F5) — trigger: the first endpoint that reads
  through `selectionFor()` serves a request. This is a Phase 3 deliverable, not a refactor.

---

## 7. Sequencing and effort

```
R0 ──► R1 ──► R2 ─┐
       │          ├─► R5
       └─► R3 ────┤
           R4 ────┘
```

R2, R3 and R4 are independent of one another once R1 lands. **R3 is the only phase with a
deadline: it must precede Phase 3 feature work.** Total ≈ 4.5 days, and the plan is worth
abandoning halfway — R0 and R1 alone deliver most of the safety benefit.

---

## 8. Analysis of this plan

Required by the brief: every phase and step audited against the four goals, with anything that
fails cut rather than kept for tidiness.

### Scorecard

| Phase | Speed                             | Ease of use                    | Legibility            | Safe isolated updates                 |
| ----- | --------------------------------- | ------------------------------ | --------------------- | ------------------------------------- |
| R0    | neutral                           | neutral                        | + (`max-lines` warns) | **++** (adds two real checks)         |
| R1    | neutral                           | **+** (2 fewer files to touch) | +                     | **++** (kills F1)                     |
| R2    | + (faster to locate a kind)       | **+**                          | **++**                | + (makes existing safety visible)     |
| R3    | + (Phase 3 adds files, not lines) | **++**                         | **++**                | **+** (isolates the filtering wiring) |
| R4    | neutral                           | +                              | **++**                | neutral                               |
| R5    | neutral                           | **++** (recipes)               | +                     | + (`max-lines` errors)                |

No phase scores negative on any goal. R4 is the weakest — pure legibility — and is therefore
the one to drop first if time runs short.

### Cut from this plan

Each of these was considered and rejected. They are recorded so they are not re-proposed.

- **Splitting `db/seed-data.ts` (425).** It is data, not logic: nine Barovia entities as
  literals. Splitting it means opening four files to answer "what does the seed contain".
  Fails legibility on its own terms. → `max-lines` override.
- **Splitting `authz/can.test.ts` (446).** Its value is that the entire permission matrix can
  be read top to bottom in one pass, which is exactly what makes a wrong grant visible.
  Splitting it optimises a number at the cost of the property the file exists for. → override.
- **Splitting `tooling/eslint-config/boundaries.js` (263).** Actively dangerous. ESLint flat
  config _replaces_ a rule's options rather than merging them, and this repo has already
  shipped a bug where a second config block silently deleted the role-comparison ban across
  the entire view layer. Splitting a working policy across more files re-opens that trap to
  buy a line count. → override, with the reason in the override comment.
- **Auto-generating the `packages/ui` barrel (F7).** A script and a drift check to prevent a
  failure that announces itself instantly the first time you import the component. Cost
  exceeds benefit at this size.
- **Renaming for convention** — `*.client.tsx` to `client/*.tsx`, `services/` to `apps/api/`.
  Pure churn. The current names are enforced by lint and explained in `CLAUDE.md`.
- **A repository/service abstraction over Drizzle.** The query builders are already at the
  right level, and an interface layer would hide the one thing that must stay auditable: the
  `WHERE` clause that does visibility filtering. Directly hostile to goal four.
- **Speculative performance work** — memoisation, virtualised lists, bundle splitting. There
  is no measured performance problem in an 11,000-line codebase with two pages. "Speed" in
  this plan means developer speed and holding the CI budget, and saying so is more honest than
  inventing optimisations.

### Where this plan is weak

Three things worth stating plainly rather than discovering later:

1. **R2 and R4 are churn against an unmerged Phase 2.** The design-system work is not yet
   committed. Landing Phase 2 first, then refactoring, keeps both diffs reviewable — a 40-file
   move mixed into a feature branch is not reviewable by anyone.
2. **The plan does not improve test coverage**, and F5 is arguably a bigger risk than any file
   size. It is deferred rather than solved because integration tests need infrastructure that
   does not exist in this environment yet, and pretending otherwise would put an unachievable
   step in a plan.
3. **`max-lines` will be argued with.** The override list is the pressure valve, and every
   override must carry a reason in the config. An override list that grows without reasons is
   how the rule dies.

---

## 9. Risk and rollback

| Risk                                         | Mitigation                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| A split changes behaviour silently           | Byte-identical output gates on `verify-boundaries` and `/openapi.json`     |
| A move strands the comment that explained it | Review rule: reasoning travels with the code, not with the old file header |
| Public package surface changes accidentally  | Each phase asserts the barrel's exports are unchanged                      |
| Refactor collides with Phase 3 work          | R3 lands _before_ Phase 3 starts; R2/R4 do not touch route code            |
| The plan is abandoned halfway                | Phases are ordered by value, so stopping after R1 still leaves a net gain  |

Every phase is a squash-merged PR on its own branch, per `CLAUDE.md`. Rollback is `git revert`
of one commit.

---

## 10. Appendix — target layout

Only the directories that change.

```
packages/schemas/src/
  entities/
    index.ts  base.ts  clearance.ts  registry.ts
    kinds/    npc.ts location.ts faction.ts item.ts session.ts
              lore.ts player-character.ts handout.ts rule.ts

packages/authz/src/
  types.ts        SUBJECT_KINDS derived from ENTITY_KINDS
  policy.ts       CONTENT_KINDS deleted; uses ENTITY_KINDS
  conformance.test.ts

packages/db/src/
  schema/content/ enums.ts entity.ts details.ts links.ts
  queries/        selection.ts entities.ts links.ts users.ts audit.ts

services/api/src/
  app.ts openapi.ts
  middleware/     cors.ts errors.ts
  routes/         index.ts health.ts me.ts

packages/ui/src/
  base.css        imports base/{reset,typography,motion,atmosphere}.css
  palette.stories.tsx  contrast.stories.tsx  typography.stories.tsx

scripts/
  verify-boundaries/  index.ts fixtures.ts mechanisms/*.ts
  theme/              index.ts grain.ts sections/*.ts
```
