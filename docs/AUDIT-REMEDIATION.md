# Code Audit & Remediation Plan

_Audit date: 2026-08-05 · Scope: entire repo at Phase 0 · Auditor: full-repo review with every finding reproduced_

> **Status: all 16 findings remediated (2026-08-05).** Every fix is verified by running it, not by inspection — see [§7 Remediation record](#7-remediation-record) for what changed, what was verified how, and the three places the implementation deliberately diverged from the plan below. The plan text is left as written so the reasoning stays legible.
>
> Post-remediation state: `format` ✅ `lint` ✅ `typecheck` ✅ `test` ✅ (21 tests, up from 4) `build` ✅ `lint:deps` ✅ `verify:boundaries` ✅ (**45 checks**, up from 12) `e2e` ✅ (4 tests across both projects).

---

## Executive summary

The repo is in better shape than "vibe coded" suggests. The architecture is coherent, the boundary story is genuinely three-layered and genuinely working, and most of the toolchain is correct. Concretely:

| Check                    | Result                                                         |
| ------------------------ | -------------------------------------------------------------- |
| `pnpm format:check`      | ✅ pass                                                        |
| `pnpm lint`              | ❌ **fails — 2 errors** (F1)                                   |
| `pnpm typecheck`         | ✅ pass (10/10, also passes from a clean tree with no `.next`) |
| `pnpm test`              | ✅ pass (4 tests, 2 files)                                     |
| `pnpm build`             | ✅ pass (web + api)                                            |
| `pnpm lint:deps`         | ✅ pass (49 modules, 0 violations)                             |
| `pnpm verify:boundaries` | ✅ **all 12 checks pass** — all three mechanisms bite          |

`verify-boundaries.ts` is the best thing in this repo and it is doing its job. The load-bearing constraint — only `services/api` may reach `@sw/db` — holds against bare specifiers _and_ relative-path bypasses, under all three mechanisms.

The findings below are what that harness does not cover. The important ones are not architectural; they are places where **a guarantee the repo advertises is silently not being enforced**. Two of them (F1, F2) are the exact failure mode `boundaries.js` warns about in its own comments — ESLint flat config replacing rule options wholesale — occurring in a file that didn't get the memo.

**Order of work:** F1 unblocks CI and takes minutes. F2–F4 are the security-guarantee repairs and should land before any Phase 1 code is written, because Phase 1 is when the first real role checks and permission sites appear. Everything else can follow.

### Findings at a glance

| ID  | Severity | Finding                                                              | Status                   |
| --- | -------- | -------------------------------------------------------------------- | ------------------------ |
| F1  | P0       | `pnpm lint` fails — CI is red on the first push                      | Reproduced, fix verified |
| F2  | P1       | Role-comparison ban silently disabled in `apps/web`, `ui`, `editor`  | Reproduced               |
| F3  | P1       | Role-comparison ban fully off in `*.client.tsx`                      | Reproduced               |
| F4  | P1       | Role selector misses destructuring, `includes()`, `switch`           | By inspection            |
| F5  | P1       | `docs/adr/` is empty — 5 references dangle, incl. a lint message     | Confirmed                |
| F6  | P2       | OpenAPI doc claims 3.1 but emits 3.0 schemas                         | Proven with `nullable`   |
| F7  | P2       | `window`/`document` banned in every `.ts`, including web client code | Reproduced               |
| F8  | P2       | Turbo build cache ignores `NEXT_PUBLIC_API_URL`                      | By inspection            |
| F9  | P2       | `test:e2e` fails locally without a prior build                       | By inspection            |
| F10 | P2       | Playwright `mobile` project never runs in CI                         | By inspection            |
| F11 | P2       | API has no graceful shutdown, error handler, or real logger          | By inspection            |
| F12 | P2       | `/openapi.json` served unauthenticated                               | By inspection            |
| F13 | P3       | `pg-native` externalised but not a dependency                        | By inspection            |
| F14 | P3       | A visibility test asserts a tautology                                | By inspection            |
| F15 | P3       | Changesets configured with nothing to release                        | By inspection            |
| F16 | P3       | Assorted hygiene (see §5)                                            | —                        |

**Verified as _not_ problems** (checked because they looked suspicious): `jsdom` resolves correctly under `node-linker=isolated` via Vite's resolver; `pnpm typecheck` works on a clean clone with no `.next/`; `allowBuilds` and `minimumReleaseAgeExclude` are real pnpm 11 settings; the `'use client'` ban fires correctly; `mergeConfig` include-array duplication in the Vitest config is harmless.

---

## 1. P0 — the repo does not currently pass its own CI

### F1 · `pnpm lint` fails with 2 errors

```
packages/design-tokens/vitest.config.ts
  1:1  error  '@sw/vitest-config' import is restricted ... Layer-0 packages must import no other @sw package
packages/schemas/vitest.config.ts
  1:1  error  '@sw/vitest-config' import is restricted ...
```

**Cause.** In `tooling/eslint-config/boundaries.js`, the layer-0 scope is `packages/schemas/**/*.{ts,tsx}`, which matches `vitest.config.ts` at the package root as well as `src/`. The rule bans the pattern `@sw/*` wholesale, so it catches the shared _tooling_ config the package legitimately consumes.

This is a scope bug, not a policy bug. The intent — "layer-0 runtime code depends on nothing" — is right; build tooling was never meant to be in scope. Note the layer-1 rule for `authz` doesn't hit this because it enumerates specific packages rather than globbing `@sw/*`.

**Fix** — narrow the scope to source:

```js
// tooling/eslint-config/boundaries.js
files: ["packages/schemas/src/**/*.{ts,tsx}", "packages/design-tokens/src/**/*.{ts,tsx}"],
```

**Verified.** With this change `pnpm lint` exits 0, and a deliberate `import { can } from "@sw/authz"` in `packages/schemas/src/` is still rejected with the correct message. `pnpm verify:boundaries` still passes all 12 checks.

**Consider also** applying the same `src/**` narrowing to the other three scope blocks in that file for consistency, so a future `packages/db/drizzle.config.ts` doesn't hit the same wall.

---

## 2. P1 — guarantees that are advertised but not enforced

These matter more than F1. F1 is loud; these are silent, which is precisely the class of failure `verify-boundaries.ts` was written to prevent — it just doesn't cover rules outside the boundary set.

### F2 · The role-comparison ban is silently disabled across the entire view layer

`base.js` defines the spoiler-safety rule:

```js
"no-restricted-syntax": ["error", {
  selector: "BinaryExpression[operator=/^[=!]==?$/] > MemberExpression[property.name='role']",
  message: "Do not compare roles directly. Ask @sw/authz `can(...)` instead ..."
}]
```

`react.js` then redefines **the same rule name** for the `'use client'` ban, scoped to `apps/web/**`, `packages/ui/**`, `packages/editor/**`. ESLint flat config **replaces** a rule's options wholesale rather than merging them — so within those three scopes, the `'use client'` selector is the only one configured and the role ban is gone.

**Reproduced.** Identical code, two locations:

```ts
// services/api/src/probe.ts        → error: "Do not compare roles directly..." ✅
// apps/web/src/app/probe.tsx       → no error                                  ❌
// apps/web/src/app/probe_ts.ts     → no error                                  ❌
return user.role === "co-dm";
```

The `apps/web` case is the one that matters — the UI is exactly where someone writes `user.role === "co-dm" && <EditButton/>`, and the rule exists to catch it.

`boundaries.js` documents this hazard in a comment ("Flat config replaces a rule's options wholesale... the rule appears configured while catching nothing") and disciplines its own `no-restricted-imports` scopes accordingly. `no-restricted-syntax` never got the same treatment.

**Fix.** Extract the role selector to a shared constant and compose both selectors wherever the view-layer config applies, rather than letting one overwrite the other:

```js
// tooling/eslint-config/restricted-syntax.js  (new)
export const NO_DIRECT_ROLE_COMPARISON = { selector: "...", message: "..." };
export const NO_USE_CLIENT = {
  selector: "ExpressionStatement > Literal[value='use client']",
  message: "...",
};
```

Then in `react.js`: `"no-restricted-syntax": ["error", NO_DIRECT_ROLE_COMPARISON, NO_USE_CLIENT]`.

**Then close the hole permanently.** Add a fourth mechanism section to `scripts/verify-boundaries.ts` — call it "Mechanism 4 — spoiler-safety lint rules" — that writes a direct role comparison into `apps/web/src/app/`, `packages/ui/src/`, `packages/editor/src/`, and `services/api/src/`, and requires each to be rejected. Without this, the same clobbering will recur the next time someone adds a scoped rule, and nothing will notice. This is the single highest-value change in the plan: it converts a rule that _is_ correct today into a rule that _stays_ correct.

### F3 · The role ban is fully off in client components

`next.js` lifts the restriction for opt-in client files:

```js
files: ["**/*.client.tsx", "**/components/client/**/*.tsx"],
rules: { "no-restricted-syntax": "off" },
```

The intent is to permit `'use client'` there. But `off` disables _every_ selector under that rule — including the role ban, in the files most likely to contain a naive role check. **Reproduced:** a `'use client'` file containing `user.role === "co-dm"` lints completely clean.

**Fix.** Once F2 splits the selectors into named constants, re-enable rather than disable: `"no-restricted-syntax": ["error", NO_DIRECT_ROLE_COMPARISON]` for those files. Keep the role ban, drop only the `'use client'` ban.

### F4 · The role selector is narrow even where it does fire

`MemberExpression[property.name='role']` only catches `something.role === x`. It misses every one of these:

```ts
const { role } = actor;  if (role === "co-dm")        // destructured
["co-dm", "overlord"].includes(actor.role)            // membership test
switch (actor.role) { case "overlord": ... }          // switch
actor["role"] === "co-dm"                             // computed access
```

For a rule described in its own message as the guard on capability-based authorization, that is a lot of surface. Realistically the destructured and `includes()` forms are the likely ones.

**Fix.** Broaden to a small selector set — add `SwitchStatement > MemberExpression[property.name='role']`, a `CallExpression[callee.property.name='includes'] MemberExpression[property.name='role']`, and a computed-access variant. Accept that a lint rule cannot catch the destructured case reliably; cover that instead by making `Actor.role` hard to misuse — e.g. brand the type so a bare `Role` string comparison doesn't typecheck outside `@sw/authz`. Extend the F2 fixture sweep to cover each new form.

### F5 · `docs/adr/` is empty; five references dangle

`docs/adr/` exists as an empty directory — which git does not track, so on a fresh clone it does not exist at all. Referenced from:

- `packages/schemas/src/visibility.ts` → ADR 0002 (annotating the `DEFAULT_VISIBILITY` fail-closed choice)
- `packages/schemas/src/visibility.test.ts` → ADR 0002
- `apps/web/src/app/layout.tsx` → ADR 0002
- `apps/web/e2e/smoke.spec.ts` → ADR 0002
- `tooling/eslint-config/base.js` → ADR 0004, **inside the lint error message a developer sees when the rule fires**

The last one is the worst: the rule tells you to go read a file that isn't there. PLAN.md §9 also lists `docs/adr/` as a Phase 0 deliverable, and `.gitleaks.toml` already allowlists `docs/adr/*.md`.

**Fix.** Write the ADRs. They are already decided — the reasoning is spread across PLAN.md and the code comments; this is transcription, not deliberation:

- `0001-modular-monorepo.md` — PLAN §3, including the `git subtree split` escape hatch
- `0002-players-only-front-door.md` — login-gated wiki, `DEFAULT_VISIBILITY = "player"`, fail-closed
- `0003-standalone-http-api.md` — PLAN §5, why not tRPC, why not Next route handlers
- `0004-capability-based-authorization.md` — `can()` over role checks, and why the lint rule exists
- `0005-db-only-from-api.md` — the load-bearing constraint and its three enforcement mechanisms

Add a `docs/adr/README.md` with the template so the directory is tracked regardless.

---

## 3. P2 — latent bugs that bite in Phase 1

### F6 · The OpenAPI document declares 3.1 but emits 3.0 schemas

`services/api/src/app.ts` calls `app.doc("/openapi.json", { openapi: "3.1.0", ... })`. `@hono/zod-openapi` 1.5.1 exposes **two** methods: `doc()` generates OpenAPI 3.0 schemas, `doc31()` generates 3.1. The `openapi` string in the config is just a label — it does not switch generators.

**Proven.** Same schema, both methods:

```
doc()   -> {"note":{"type":"string","nullable":true}}      ← 3.0 syntax
doc31() -> {"note":{"type":["string","null"]}}             ← 3.1 syntax
```

`nullable` is not a valid keyword in OpenAPI 3.1. A generator reading the document at its declared version will ignore it and type the field as non-nullable.

Nothing breaks today because the health schema has no nullable or optional fields. It breaks in Phase 1, the moment an entity schema uses `.nullable()` — and it breaks _quietly_, producing a `@sw/api-client` whose types disagree with the server. That is the precise failure the "spec derived from the same Zod schemas" argument in PLAN §5 exists to prevent.

**Fix.** Change `app.doc(...)` to `app.doc31(...)`.

**And fix the test that should have caught it.** `app.test.ts` asserts `doc.openapi === "3.1.0"`, which reads back the literal string the code passed in — it can never fail. Replace it with an assertion about generated _shape_: define a route with a nullable field and assert the emitted schema uses `type: [..., "null"]` and contains no `nullable` key. Better still, run the document through a 3.1 validator in CI.

### F7 · `window` and `document` are banned in every `.ts` file, web included

`tooling/eslint-config/node.js` applies `no-restricted-globals` for `window`/`document` to `files: ["**/*.ts"]` — the whole repo. It is never re-enabled for browser scopes. `.tsx` escapes only because the glob doesn't match it.

**Reproduced:** `apps/web/src/app/probe.ts` using `window.innerWidth` → `error: Unexpected use of 'window'. Server-side code has no window.`

That message is wrong in `apps/web`. Any client-side utility module — a `useMediaQuery` helper, a localStorage wrapper for bookmarks, the PWA install prompt in Phase 5 — is a `.ts` file that legitimately touches `window`. Today it costs nothing because no such file exists; by Phase 5 it is a daily annoyance, and the usual outcome is an inline `eslint-disable` that also suppresses genuine findings.

**Fix.** Scope `node.js` to where it's true — `services/**/*.ts`, `packages/{db,schemas,authz,api-client}/**/*.ts`, `scripts/**/*.ts` — rather than `**/*.ts`. Alternatively keep it global and add an override turning it off for `apps/web/**` and `packages/{ui,editor,content-render}/**`. The first is better: it makes the rule's scope match its message.

### F8 · Turbo's build cache ignores the API URL

`turbo.json` declares `globalEnv: ["NODE_ENV", "CI", "PORT"]` and no per-task `env`. `NEXT_PUBLIC_API_URL` is documented in `.env.example` and will be inlined into the client bundle at build time by Next.

Consequence once Phase 1 wires it up: change `NEXT_PUBLIC_API_URL`, rebuild, get a **cache hit**, and ship a bundle with the old API URL baked in. The `turbo/no-undeclared-env-vars` lint rule is the intended guard but won't fire, because Next inlines `NEXT_PUBLIC_*` without any `process.env` reference appearing in app source.

**Fix.** Add to `turbo.json` now, before it can bite:

```json
"build": {
  "env": ["NEXT_PUBLIC_*", "DATABASE_URL", "BETTER_AUTH_URL"],
  ...
}
```

Adopt a standing rule: every variable added to `.env.example` gets added to `turbo.json` in the same commit. Worth a line in the ADR or in `.env.example`'s header comment.

### F9 · `test:e2e` fails locally without a prior build

`playwright.config.ts` sets `webServer.command: "pnpm start"` → `next start`, which requires an existing `.next` production build. CI builds first (`pnpm --filter @sw/web build`); a developer running `pnpm --filter @sw/web test:e2e` on a clean tree gets a confusing server-failed-to-start error.

**Fix.** Either `command: "pnpm build && pnpm start"` (simple, slow on repeat runs) or add a `test:e2e` script that builds first and keep the raw playwright invocation as `test:e2e:only`. Given Phase 6 grows this into the spoiler-leak suite that gets run often, the two-script split is worth it.

### F10 · The mobile Playwright project never runs in CI

`playwright.config.ts` defines `desktop` and `mobile` (Pixel 7), with a comment that mobile is "a first-class target, not an afterthought checked once before release." CI runs `test:e2e --project=desktop` only. Locally, both run — so CI is weaker than local, which is backwards.

**Fix.** Drop `--project=desktop` from the CI step so both run, or run them as an explicit matrix. Phase 0 has one smoke test; the cost is seconds now and the habit is set before Phase 6's spoiler-leak suite, where mobile coverage genuinely matters (players read this on phones).

### F11 · The API has no production hardening

`services/api/src/server.ts` is 8 lines. Missing, in rough priority order:

- **Graceful shutdown.** No `SIGTERM`/`SIGINT` handler. On Fly.io or Railway, every deploy drops in-flight requests. Cheapest real fix in this list.
- **Error handler.** No `app.onError()`. An unhandled throw returns Hono's default 500 — verify it does not include a stack trace in production. On a spoiler-sensitive service, an error body echoing a query is a leak.
- **`notFound` handler** for consistent 404 shape.
- **CORS.** `apps/web` will call this cross-origin from `:3000` → `:3001`. Not configured; will surface as a confusing browser error on the first Phase 1 fetch.
- **Structured logging.** `console.warn` is used for the startup banner — semantically wrong, and chosen to satisfy `no-console`. PLAN §10 specifies pino.
- **Readiness vs. liveness.** `/health` is liveness only. Once Postgres is attached, a separate `/ready` that checks the connection is what a platform should gate traffic on.

**Fix.** Land graceful shutdown, `onError`, and `notFound` now — they are a handful of lines and each is harder to retrofit once routes exist. CORS and pino belong with Phase 1. Add a test per handler; `app.request()` makes them cheap.

### F12 · `/openapi.json` is served unauthenticated

The spec is public on a service whose entire premise is that content shape and existence are themselves spoilers. Once Phase 1 adds entity routes, the spec enumerates every endpoint, every entity type, and every field name — including DM-tier field names, since the schema describes fields the filter strips rather than fields that don't exist.

**Fix.** Gate `/openapi.json` behind auth, or serve it only when `NODE_ENV !== "production"` and generate the client from a build-time artifact instead. Decide before Phase 1 adds routes; note the decision in ADR 0003.

---

## 4. P3 — smaller items

### F13 · `pg-native` is externalised but is not a dependency

`services/api/build.ts` lists `external: ["pg-native"]`. Nothing currently pulls `pg`. If a Postgres driver later reaches for it, esbuild leaves the require in place and it fails at runtime with a module-not-found — in production, not at build time. The file's own comment states the rule ("anything here must exist in node_modules at runtime, which means it also has to be in `dependencies`") and then doesn't follow it. Either add it to `dependencies` when a driver lands, or drop the entry until it's needed.

### F14 · A visibility test asserts a tautology

`packages/schemas/src/visibility.test.ts`:

```ts
it("gives no role clearance beyond dm", () => {
  for (const role of ROLES) expect(VISIBILITY_TIERS).toContain(clearanceFor(role));
});
```

The name promises a bound on clearance; the assertion only checks the value is a member of the tier list — guaranteed by the type signature. It cannot fail. Replace with something that can: assert `clears(clearanceFor(role), "dm")` is true for exactly `co-dm` and `overlord` and false for the other three. The adjacent chronicler test is written correctly and is the model to follow.

### F15 · Changesets is configured with nothing to release

Every package is `private: true` at `0.0.0`, `access: "restricted"`, and there is no release workflow. `pnpm changeset` currently does nothing useful. Either remove it until packages are published or extracted (PLAN §3's `git subtree split` path), or wire it to generate a repo-level changelog. Right now it is ceremony that implies a release process that doesn't exist.

### F16 · Hygiene

- **No `.nvmrc` / `.node-version`.** `engines` requires `>=22.11.0` and `engine-strict=true` will reject a wrong local version, but with no signal to fix it. Add `.nvmrc` with `22`.
- **No Renovate or Dependabot.** Every dependency is exact-pinned — good discipline, but without automation the pins silently rot. Renovate with grouped minor/patch PRs suits a solo repo.
- **`.npmrc` comment is misplaced.** "Refuse to install if the lockfile would need to change in CI. (Overridden locally by the absence of `CI=true`.)" sits above `strict-peer-dependencies` / `auto-install-peers`, neither of which does that, and no `frozen-lockfile` setting is present. CI passes `--frozen-lockfile` explicitly. Delete or correct the comment.
- **Stale depcruise exclude.** `.dependency-cruiser.cjs` excludes `scripts/__boundary-fixtures__/`, which does not exist — `verify-boundaries.ts` writes fixtures into the real package directories instead. Harmless, but misleading: a reader could assume fixtures are excluded from the cruise when the whole point is that they are not.
- **CI `fetch-depth: 0` is unjustified.** Its comment cites `turbo --filter=...[origin/main]`, which no CI step uses. Either add the filter or drop to a shallow clone.
- **`build` and `e2e` jobs both build the web app.** Duplicated work unless the Turbo remote cache is actually configured (`TURBO_TOKEN` may well be unset on a solo repo). Consider building once and passing `.next` as an artifact, or accept it and note why.
- **`apps/web` declares 7 workspace dependencies and uses 1** (`@sw/schemas`). Not wrong — they're coming — but nothing checks for unused deps, so this will not self-correct. `depcruise --no-unresolved` plus a `knip` pass would cover it.
- **No coverage thresholds anywhere.** `passWithNoTests: true` means six packages with zero tests report green. Fine at Phase 0; PLAN §9 promises thresholds for `authz` in Phase 1. Set them there and don't let the others drift indefinitely.
- **No security headers.** No CSP, HSTS, or `X-Frame-Options` in `next.config.ts` or the API. PLAN §10 puts this in Phase 6; a baseline `headers()` block in `next.config.ts` costs little now.
- **No deploy workflow.** PLAN §10 specifies "merge to `main` deploys only the apps whose inputs changed." Not implemented. Phase-appropriate, but it is the one piece of §10 with no scaffolding at all.

---

## 5. Execution plan

### Step 1 — Unblock CI _(~15 min)_

1. F1: narrow the layer-0 ESLint scope to `src/**`.
2. Run `pnpm lint && pnpm verify:boundaries`. Both must pass.

**Done when:** every root script passes on a clean tree.

### Step 2 — Repair the spoiler-safety guarantees _(~half a day)_

3. F2: extract `no-restricted-syntax` selectors into shared constants; compose instead of overwrite in `react.js`.
4. F3: in `next.js`, re-enable the role ban for `*.client.tsx` instead of turning the rule off.
5. F4: broaden the selector set to cover `switch`, `.includes()`, and computed access.
6. **Add Mechanism 4 to `scripts/verify-boundaries.ts`** — fixtures asserting the role ban fires in `apps/web`, `packages/ui`, `packages/editor`, and `services/api`, plus in a `*.client.tsx`. Include a positive control.

**Done when:** an identical role comparison is rejected in all four locations, and `verify:boundaries` fails if any one of them stops being rejected.

This step is the priority. It ends with the repo's central security rule protected by the same harness that already protects its database boundary — which is what the rest of the design assumes is already true.

### Step 3 — Write the ADRs _(~half a day)_

7. F5: author ADRs 0001–0005 plus `docs/adr/README.md`. Verify each referenced path resolves.

Do this before Phase 1: these decisions are freshest now, and the code already points at them.

### Step 4 — Defuse the Phase 1 landmines _(~half a day)_

8. F6: `doc()` → `doc31()`; replace the tautological version assertion with a shape assertion.
9. F8: declare `env` on the `build` task; adopt the ".env.example and turbo.json change together" rule.
10. F7: scope `node.js`'s global ban to server code.
11. F11 (partial): graceful shutdown, `onError`, `notFound`, with tests.

**Done when:** the OpenAPI document validates as genuine 3.1, and `SIGTERM` drains cleanly.

### Step 5 — Test and workflow hygiene _(~half a day)_

12. F14: fix the tautological visibility test.
13. F9: make `test:e2e` build first.
14. F10: run both Playwright projects in CI.
15. F16: `.nvmrc`, Renovate, `.npmrc` comment, stale depcruise exclude, CI `fetch-depth`.

### Step 6 — Decide, don't drift _(~1 hour)_

16. F12: decide whether `/openapi.json` is public; record it in ADR 0003.
17. F15: keep Changesets with a purpose, or remove it.
18. F13: drop the `pg-native` external until a driver needs it.
19. Baseline security headers in `next.config.ts`.

---

## 6. A note on what not to change

Several things here look unusual and are correct — worth recording so a future pass doesn't "fix" them:

- **`scripts/verify-boundaries.ts`.** Matching on rule _messages_ rather than rule _names_, and the positive control at the end, are both deliberate and both right. Extend this file; don't simplify it.
- **Root-only ESLint.** Documented in `eslint.config.js`, and the reasoning holds — `eslint-plugin-boundaries` needs the whole tree to evaluate layering correctly.
- **`DEFAULT_VISIBILITY = "player"`,** with a test asserting it. Fail-closed, guarded.
- **`can()` returning `false` for everything at Phase 0.** The correct stub for a security primitive, with a test that locks it in.
- **`clears()` and `maxClearance()` fail closed on unvalidated input** — an unknown tier yields `undefined` in the rank comparison, which is falsy, so access is denied rather than granted. Worth an explicit test in Phase 1 so it stays true.
- **`packages/db` shipping only a phase constant** while three mechanisms already guard it. Building the fence before the yard is the right order here.
- **Exact-pinned dependencies everywhere.** Consistent and deliberate; pair it with Renovate rather than loosening the ranges.

---

## 7. Remediation record

_Completed 2026-08-05. Every item below was verified by execution._

### Where the implementation diverged from the plan

Three places, all documented in code:

**F1 — kept the broad glob, excluded the two tooling packages by name.** The plan proposed narrowing the layer-0 scope to `packages/*/src/**`. That works, but it costs coverage: `no-restricted-imports` would then stop applying to anything at the package root, so a `@sw/authz` import in `packages/schemas/vitest.config.ts` would go unnoticed. ESLint's `no-restricted-imports` supports gitignore-style negation in a `group`, so the scope stays whole and only the exceptions are named:

```js
group: ["@sw/*", "!@sw/tsconfig", "!@sw/vitest-config"],
```

Verified both directions: `pnpm lint` exits 0, and an illegal `@sw/authz` import is still rejected in `packages/schemas/src/` **and** at the package root.

**F16 — added a `no-console` allowance for server entry points.** Not in the plan, but it fell out of F11. The default allow-list is `warn`/`error`, which is why the original startup banner was a `console.warn` — a mislabelled level, and the audit called that a smell without proposing a fix. Rather than write `console.warn("listening…")` again, `services/*/src/server.ts` may now use `info`. Mislabelled levels are worse than no rule: they train you to ignore warnings.

**F4 — no type-level branding.** The plan floated branding `Role` to catch the destructured comparison exactly. Not done: `Role` is `z.infer<>` of a Zod enum and branding fights every legitimate use. The literal-based selectors cover the case heuristically instead, with the false-positive risk managed by omitting `"player"` and `"viewer"` from the matched literals. Recorded as a revisit in ADR 0004.

### What changed, and how it was verified

| ID       | Change                                                                                                                             | Verification                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| F1       | `boundaries.js` — negation in the layer-0 group                                                                                    | `pnpm lint` 0; violation still caught in `src/` and package root                                       |
| F2/F3/F4 | New `tooling/eslint-config/restricted-syntax.js`; `base.js`/`react.js`/`next.js` all spread instead of redeclaring                 | 10 illegal forms × 6 scopes all rejected; `visibility === "player"` still allowed                      |
| —        | **Mechanism 4** added to `verify-boundaries.ts` (31 new checks + 2 positive controls)                                              | Reintroduced the original `react.js` bug → **20 checks failed, exit 1**; restored → green              |
| F5       | ADRs 0001–0005 + `docs/adr/README.md`                                                                                              | Every referenced path resolves                                                                         |
| F6       | `app.doc()` → `app.doc31()`                                                                                                        | New test asserts `type: ["string","null"]` and absence of `nullable`                                   |
| F7       | `node.js` scoped to server globs; config/build files get Node globals without the browser ban                                      | `window` in `apps/web/**/*.ts` no longer errors; still errors in `services/**`                         |
| F8       | `turbo.json` `build.env` (JSONC comments — Turbo rejects unknown keys like `$comment`)                                             | `pnpm build` parses and runs; `.env.example` carries the standing rule                                 |
| F9       | `test:e2e` builds first; `test:e2e:only` added for CI                                                                              | `playwright test` passes from a clean tree                                                             |
| F10      | CI runs both projects                                                                                                              | **4 passed** — mobile executed for the first time                                                      |
| F11      | `SIGTERM`/`SIGINT` drain with a 10s forced-exit backstop, `onError`, `notFound`                                                    | `node dist/server.js` + SIGTERM → "drained cleanly", **exit 0**; error body proven not to leak a query |
| F12      | `/openapi.json` gated behind `exposeOpenApiDoc`, default off in production                                                         | `NODE_ENV=production` → **404**; `/health` still 200                                                   |
| F13      | `pg-native` removed from esbuild `external`                                                                                        | `pnpm build` clean                                                                                     |
| F14      | Tautological test replaced; **new fail-closed suite** for unvalidated tiers                                                        | 12 schema tests pass (was 5)                                                                           |
| F15      | Changesets removed (`.changeset/`, scripts, dep)                                                                                   | `package.json` valid, lockfile refreshed, no dangling references                                       |
| F16      | `.nvmrc`; CI uses `node-version-file`; Renovate config; `.npmrc` comment corrected; stale depcruise exclude removed; shallow clone | `format:check` clean; depcruise 50 modules, 0 violations                                               |
| —        | Baseline security headers in `next.config.ts`                                                                                      | All five headers confirmed on a live `next start` response                                             |

### The one that mattered most

Mechanism 4 is the durable part. F2 as a one-line repair would have been undone by the next person who scoped a rule to the view layer — which is exactly how it happened the first time, in a repo whose config already carried a comment warning about this precise hazard. The check now writes five illegal spellings into six scopes and requires all thirty to be rejected, with positive controls so a lint setup broken in the other direction cannot read as a pass.

It was validated adversarially rather than assumed: reverting `react.js` to its original form produced **20 failures and a non-zero exit**, with `services/api` still green — reproducing the scope-shaped signature of the original bug. That is the property worth having. A rule that is correct today is not the same as a rule that stays correct.

### Deliberately still open

Phase-appropriate, and listed so they are not mistaken for oversights:

- **CORS and pino** — Phase 1, when the web app first calls the API and there is something to log.
- **Coverage thresholds** — Phase 1 for `authz`, per PLAN §9.
- **CSP** — Phase 6. A useful one needs nonces threaded through rendering; a permissive placeholder reads as protection without being any.
- **Deploy workflow** — PLAN §10's "deploy only what changed" has no scaffolding yet.
- **Unused workspace deps in `apps/web`** — seven declared, one used. Correct for what is coming; worth a `knip` pass once real code lands.
- **`turbo --filter` in CI** — the shallow clone should become `fetch-depth: 0` again the moment affected-only builds are introduced.
