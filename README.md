# Strahd's War

A campaign wiki for a homebrew _Curse of Strahd_ game. Players look things up on their phones at the table; the DM writes and hides secrets; nobody accidentally reads the twist ending.

**Status: Phase 0 of 7.** The foundation is built and green. The wiki itself is not built yet — that's what you're here to do.

> **New here? Read [§1](#1-what-you-actually-need-to-know) and [§2](#2-get-it-running-10-minutes), run `pnpm dev`, then come back for the rest.** You do not need to understand the whole repo to start.

---

## Table of contents

1. [What you actually need to know](#1-what-you-actually-need-to-know)
2. [Get it running (10 minutes)](#2-get-it-running-10-minutes)
3. [Coming from Python? Start here](#3-coming-from-python-start-here)
4. [The one rule](#4-the-one-rule)
5. [What's in the box](#5-whats-in-the-box)
6. [Everyday commands](#6-everyday-commands)
7. [How to build this with an AI agent](#7-how-to-build-this-with-an-ai-agent)
8. [When something breaks](#8-when-something-breaks)
9. [What to build next](#9-what-to-build-next)
10. [Glossary](#10-glossary)

---

## 1. What you actually need to know

Three sentences:

1. **This is a website with a strict secret-keeping requirement.** Content is tagged `public`, `player`, or `dm`. A player must never be able to see `dm` content — not hidden with CSS, not filtered in the browser. The server never sends it.
2. **The repo is set up so you physically cannot break that by accident.** There are automated guardrails that fail the build if you try. They will yell at you. That is them working.
3. **Everything is verified by one command: `pnpm verify`.** If that passes, you didn't break anything. If it fails, read the error — the errors in this repo are written to explain themselves.

The rest of this README is detail. Those three things are the job.

---

## 2. Get it running (10 minutes)

### Prerequisites

You need **Node.js 22+** and **pnpm**. That's it — no database yet.

```bash
# 1. Node 22. Check what you have:
node --version          # need v22.11.0 or higher

# If you don't have it, install nvm then:
#   nvm install 22 && nvm use 22
# (this repo has a .nvmrc, so plain `nvm use` works too)

# 2. pnpm — the package manager. Easiest way:
corepack enable         # ships with Node; reads the exact version from package.json
pnpm --version          # should print 11.20.0
```

<details>
<summary>If <code>corepack enable</code> gives a permission error</summary>

```bash
sudo corepack enable
# or skip corepack entirely:
npm install -g pnpm@11.20.0
```

</details>

### Run it

```bash
git clone https://github.com/TheASDM/strahds-war.git
cd strahds-war
pnpm install            # ~1 min the first time
pnpm dev                # starts both servers
```

Now open **http://localhost:3000**. You should see a near-black page reading **STRAHD'S WAR — the mists have not yet parted**.

Two things are running:

| What           | Where                              | Try it                                    |
| -------------- | ---------------------------------- | ----------------------------------------- |
| The website    | http://localhost:3000              | open it in a browser                      |
| The API        | http://localhost:3001/health       | `curl localhost:3001/health`              |
| The API's docs | http://localhost:3001/openapi.json | dev only — deliberately off in production |

Stop both with `Ctrl+C`.

### Confirm nothing is broken

```bash
pnpm verify
```

This runs formatting, linting, type checking, tests, dependency rules, and the boundary harness — about 30 seconds. **It should end with `All boundary mechanisms are enforcing.`** Run this before every commit. If it passes, CI will pass.

---

## 3. Coming from Python? Start here

The concepts map over almost one-to-one. You know more of this than you think.

| Python                       | Here                         | Notes                                                   |
| ---------------------------- | ---------------------------- | ------------------------------------------------------- |
| `pip` / `poetry`             | `pnpm`                       | installs packages                                       |
| `pyproject.toml`             | `package.json`               | project metadata + dependency list + scripts            |
| `poetry.lock`                | `pnpm-lock.yaml`             | exact versions. Never edit by hand; commit it           |
| `venv/`                      | `node_modules/`              | installed packages. Never commit it; already gitignored |
| `python -m pytest`           | `pnpm test`                  | tests (this repo uses Vitest, works like pytest)        |
| `mypy`                       | `pnpm typecheck`             | type checking. TypeScript types are enforced, not hints |
| `ruff` / `flake8`            | `pnpm lint`                  | code rules                                              |
| `black`                      | `pnpm format`                | auto-formatting                                         |
| `if __name__ == "__main__":` | `services/api/src/server.ts` | the "run the program" entry point                       |
| type hints (optional)        | TypeScript (**enforced**)    | the build fails on a type error — this is a feature     |
| a package in `src/`          | a folder in `packages/`      | each has its own `package.json`, like a mini-project    |

**The biggest difference:** in Python, type hints are advisory. Here, types are checked and a mismatch stops the build. That feels strict at first and then becomes the thing that lets you change something in one place and immediately see everywhere it breaks — which is exactly how you'll safely add fields to the content model later.

**Second biggest:** `async`/`await` works basically like Python's. `Promise` ≈ `awaitable`.

---

## 4. The one rule

> **Never send `dm` content to someone who isn't cleared for it. Filter on the server, in the query, before the data is serialized.**

Not `display: none`. Not `if (user.isDM) { show() }` in a component. If the data reaches the browser, it's already leaked — anyone can open DevTools and read it.

Three ideas make this workable:

**Clearance tiers.** `public` < `player` < `dm`. Each tier sees everything at or below it. A single NPC can be publicly known by name while their true allegiance is `dm`, in the same database row.

**New content defaults to `player`, not `public`.** If you forget to set visibility, the content hides. Mistakes point toward _too secret_, never _too public_.

**Only one part of the codebase can touch the database.** `services/api` — and nothing else. The website has no database password. It asks the API over HTTP, and the API filters before answering. So "is our secret-keeping correct?" is a question about one folder, not about every page you'll ever write.

That last one is enforced by three independent mechanisms plus a test harness that writes deliberately-illegal code to prove they still work. You'll meet them in [§8](#8-when-something-breaks).

Full reasoning: [`docs/adr/0002`](docs/adr/0002-players-only-front-door.md) and [`docs/adr/0005`](docs/adr/0005-db-only-from-api.md).

---

## 5. What's in the box

```
strahds-war/
├── apps/
│   └── web/              ← the website (Next.js). Pages live in src/app/
├── services/
│   └── api/              ← the HTTP API (Hono). THE ONLY THING THAT TOUCHES THE DATABASE
├── packages/             ← shared libraries, each independently testable
│   ├── schemas/          ← what an NPC/Location/etc. looks like. The source of truth
│   ├── authz/            ← "may this person do this?" — pure functions, no I/O
│   ├── db/               ← database tables + queries        (only services/api may import)
│   ├── api-client/       ← typed wrapper the website uses to call the API
│   ├── ui/               ← React components
│   ├── design-tokens/    ← colors, fonts, spacing
│   ├── editor/           ← the rich-text editor (Phase 4)
│   └── content-render/   ← turns editor content into HTML
├── tooling/              ← shared config (eslint, tsconfig, vitest). Rarely edited
├── docs/
│   ├── PLAN.md           ← the full architecture plan. THE most useful document here
│   ├── AUDIT-REMEDIATION.md ← a code audit + what was fixed
│   └── adr/              ← why each big decision was made
└── scripts/
    └── verify-boundaries.ts ← proves the guardrails actually work
```

**The dependency rule:** apps and services may use packages. Packages may use packages _below_ them in that list. Nothing may use an app. And `db` is special — only `services/api` gets it.

**Why so many folders for so little code?** Because the folders are the security model. Splitting `db` out is what makes "the website cannot leak secrets" a fact about the file system rather than a promise. The structure is built before the features on purpose.

---

## 6. Everyday commands

Run all of these from the repo root.

| Command                          | What it does                                                 |
| -------------------------------- | ------------------------------------------------------------ |
| **`pnpm dev`**                   | **Start everything. This is the one you'll use most**        |
| **`pnpm verify`**                | **Check you didn't break anything. Run before every commit** |
| `pnpm test`                      | Just the tests                                               |
| `pnpm test:watch`                | Tests, re-running as you type                                |
| `pnpm typecheck`                 | Just the type checker                                        |
| `pnpm lint`                      | Just the code rules                                          |
| `pnpm format`                    | Auto-fix formatting (never argue with the formatter)         |
| `pnpm build`                     | Production build                                             |
| `pnpm verify:boundaries`         | Prove the security guardrails still work (the good stuff)    |
| `pnpm --filter @sw/web test:e2e` | Browser tests. Builds first, then drives a real Chrome       |

Working in one package only? `pnpm --filter @sw/authz test` runs just that package's tests. The names are in each `package.json` — `@sw/web`, `@sw/api`, `@sw/schemas`, and so on.

---

## 7. How to build this with an AI agent

You're going to vibe code this, which is a completely reasonable way to build it — the repo was set up to make that safe. A few things will make the difference between this going well and going sideways.

### Start every session by pointing at the plan

The single highest-value prompt in this repo:

> Read `docs/PLAN.md` §9 and tell me what Phase 1 requires. Then read `docs/adr/0004` and `docs/adr/0005`. Before writing any code, tell me which existing constraints apply to this work.

`CLAUDE.md` is loaded automatically each session, so the agent already knows the rules. But making it _restate_ them before a big change catches misunderstandings early and costs you thirty seconds.

### End every session with the same three words

> Run `pnpm verify`.

Then actually read the output. Don't accept "should be working now" — the command either exits clean or it doesn't.

### The one thing that will wreck this project

You will hit an error like:

```
Do not compare roles directly. Ask @sw/authz `can(actor, action, subject)` instead
```

The tempting move — and the one an eager agent may suggest — is _"let's just disable that rule."_

**Don't.** That rule is the spoiler protection. It is not a style preference; it's the thing standing between your friend's campaign and a player reading the twist. Every guardrail in this repo exists because of a specific way this app can leak secrets, and every one has a comment explaining which way.

If a rule blocks you, the right prompt is:

> This lint rule is blocking me. Explain what it's protecting against and show me the correct way to write this — don't disable the rule.

There is always a correct way. The rules were tested against real code.

Ways this goes wrong in practice, all of which you should push back on:

- adding `// eslint-disable-next-line` to make an error go away
- adding `@sw/db` to the website's dependencies "just to get data working"
- putting a database query in a page component
- editing `tooling/eslint-config/` to loosen a rule
- `git commit --no-verify`

If an agent does any of these, ask it to undo it and solve the actual problem.

### Work in small pieces

"Build the admin panel" is too big. "Add the `Location` schema to `packages/schemas`, with tests" is right. Small changes keep `pnpm verify` meaningful — when it fails, you know what caused it.

### Commit often

```bash
git add -A
git commit -m "add Location schema"     # the pre-commit hook auto-formats and lints
git push
```

Every push runs the full CI suite on GitHub. Green check = good.

---

## 8. When something breaks

These are the errors you're most likely to see. Each one is a guardrail doing its job, not a bug.

<details>
<summary><b>"Do not compare roles directly. Ask @sw/authz <code>can(...)</code>"</b></summary>

**What happened:** you wrote something like `user.role === "co-dm"`.

**Why it's blocked:** roles aren't a simple ladder. A `chronicler` can _write_ lore but must never _read_ DM secrets — so "higher role" isn't a meaningful idea. Scattered role checks also silently stop being correct when a role is added later.

**Do this instead:** `can(actor, "publish", subject)` from `@sw/authz`. If the capability you need doesn't exist yet, add it to the list in `packages/authz/src/types.ts` and to the permission table.

Full reasoning: [`docs/adr/0004`](docs/adr/0004-capability-based-authorization.md)

</details>

<details>
<summary><b>"DB_RESTRICTED: only services/api may import @sw/db"</b></summary>

**What happened:** something outside `services/api` tried to reach the database.

**Why it's blocked:** [§4](#4-the-one-rule). The website having database access is how secrets leak.

**Do this instead:** add an endpoint to `services/api` that returns _already-filtered_ data, then call it from the website through `@sw/api-client`.

</details>

<details>
<summary><b>"Layer-0 packages must import no other @sw package"</b></summary>

**What happened:** you imported something into `packages/schemas` or `packages/design-tokens`.

**Why it's blocked:** those two are the foundation everything else builds on. If they depend on nothing, they're safe to change and impossible to tangle.

**Do this instead:** move the shared thing _into_ schemas, or move your code _out_ to a higher layer.

</details>

<details>
<summary><b>"Adding 'use client' pulls this module's data into the browser bundle"</b></summary>

**What happened:** you added `"use client"` to a page.

**Why it's blocked:** pages render on the server so DM-only content never reaches the browser. `"use client"` undoes that.

**Do this instead:** keep the page a Server Component; move just the interactive bit (a button, a dropdown) into a small file named `Something.client.tsx`. Those are allowed.

</details>

<details>
<summary><b><code>pnpm verify:boundaries</code> fails</b></summary>

**This is the serious one.** It means a security guardrail stopped working. The output names exactly which check failed and in which folder.

Do not "fix" it by editing the harness. Find out why the rule stopped firing — usually something in `tooling/eslint-config/` was changed in a way that overwrote a rule. There's a long comment at the top of `tooling/eslint-config/restricted-syntax.js` about how exactly that happens, because it already happened once.

</details>

<details>
<summary><b>Playwright: "Executable doesn't exist"</b></summary>

One-time browser download:

```bash
pnpm --filter @sw/web exec playwright install chromium
```

</details>

<details>
<summary><b>Something is deeply weird after switching branches</b></summary>

```bash
pnpm install          # dependencies changed
pnpm clean            # nuke build caches
```

</details>

**Still stuck?** Paste the whole error into your agent and ask _what the rule is protecting against_, not _how to silence it_.

---

## 9. What to build next

The full plan with time estimates is [`docs/PLAN.md`](docs/PLAN.md) §9. Where things stand:

| Phase                   | What                                                         | Status              |
| ----------------------- | ------------------------------------------------------------ | ------------------- |
| **0 — Foundation**      | Monorepo, TypeScript, lint, tests, CI, boundary enforcement  | ✅ **Done**         |
| **1 — Data & auth**     | Database tables, Google/Discord login, the permission matrix | 👈 **You are here** |
| 2 — Design system       | The Barovian palette and component set                       | Not started         |
| 3 — Read-only wiki      | Entity pages, search, the actual browsable site              | Not started         |
| 4 — Admin & editor      | Rich-text editing, publishing, media. The big one            | Not started         |
| 5 — PWA & offline       | Installs on a phone, works without signal                    | Not started         |
| 6 — Polish & production | Monitoring, backups, the spoiler-leak test suite             | Not started         |

### Your first task

Phase 1 starts with the permission matrix, because it's pure logic with no database and no UI — the best possible place to learn the codebase.

Right now `packages/authz/src/can.ts` returns `false` for everything. That's deliberate: a half-built security function should deny, not allow. Your job is to make it real.

Try this prompt:

> Read `docs/adr/0004-capability-based-authorization.md` and `packages/authz/src/types.ts`. Implement the permission matrix in `can.ts` as a data table covering all 5 roles × all 12 actions, using the role capabilities in `docs/PLAN.md` §5. Write a table-driven test asserting every combination. Then run `pnpm verify`.

It's self-contained, fully testable, needs no database, and when it's done you'll understand the security model by having built it.

**Before you start:** answer the open questions in `docs/PLAN.md` §11 with your friend — especially #2 (who gets accounts) and #3 (is anything public). Those shape Phase 1.

---

## 10. Glossary

| Term                 | Plain English                                                                       |
| -------------------- | ----------------------------------------------------------------------------------- |
| **monorepo**         | one Git repo holding several related projects                                       |
| **workspace**        | one of those projects (`packages/authz` is a workspace)                             |
| **`@sw/...`**        | how workspaces refer to each other. `sw` = Strahd's War                             |
| **Server Component** | a page rendered on the server; its data never reaches the browser. The default here |
| **Client Component** | a page/part that runs in the browser. Must be named `*.client.tsx`                  |
| **Zod**              | describes a data shape once, then validates against it and generates types          |
| **Drizzle**          | writes database queries in TypeScript with real type checking                       |
| **Hono**             | the small web framework the API is built on (like Flask/FastAPI)                    |
| **Turborepo**        | runs commands across workspaces and caches results, so repeat runs are instant      |
| **ADR**              | Architecture Decision Record — a short doc on why a decision was made               |
| **clearance**        | how much someone is allowed to see: `public`, `player`, or `dm`                     |
| **capability**       | a thing someone may do: `read`, `publish`, `ban_users`. Asked via `can()`           |

---

## Reading list, in order

1. This file
2. [`docs/PLAN.md`](docs/PLAN.md) — the architecture plan. Long, worth it, skim §5 and §9 first
3. [`CLAUDE.md`](CLAUDE.md) — the rules your AI agent follows. Read it so you know what it knows
4. [`docs/adr/0004`](docs/adr/0004-capability-based-authorization.md) — permissions, before you touch Phase 1
5. [`docs/AUDIT-REMEDIATION.md`](docs/AUDIT-REMEDIATION.md) — what was audited and fixed. Good example of how this repo reasons

---

_Built with [Claude Code](https://claude.com/claude-code). Licensed UNLICENSED — private project._
