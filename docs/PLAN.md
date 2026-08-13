# Strahd's War — Campaign Wiki

## Architecture & Development Plan

_Draft for review — v0.1, August 2026_

---

## 1. What we're building

A gothic-horror campaign wiki for **Strahd's War**, a homebrew reimagining of _Curse of Strahd_. It has to serve three audiences at once:

| Audience                             | Needs                                                                     | Access                            |
| ------------------------------------ | ------------------------------------------------------------------------- | --------------------------------- |
| **Players** (on phone, at the table) | Fast read-only lookup, offline-tolerant, bookmarks, session recaps        | Public / player-tier content only |
| **You, the DM** (on PC, prepping)    | Rich editing, cross-linking, secret content, revision history             | Full                              |
| **Co-DMs / trusted helpers**         | Scoped editing — e.g. can write lore but not touch player data or publish | Role-defined                      |

The single most important architectural constraint is **spoiler safety**. A campaign wiki where a player can view-source and read Strahd's true motives is a broken campaign wiki. Every design decision below that looks paranoid is downstream of this. Visibility is enforced on the server, in the query, before data crosses the wire — never with a CSS class or a client-side `if`.

---

## 2. Languages & runtime

**TypeScript, everywhere, in strict mode.** One language for web UI, mobile app, API, database schema, migrations, and build scripts.

This isn't a fashion choice. The value is that a single Zod schema defines your NPC shape _once_ and that definition drives the database table, the API contract, the admin form validation, and the mobile app's types. Change "NPC has a `faction`" in one file and every consumer of that fact fails to compile until it's handled. For a solo developer maintaining several deployable pieces, that compiler-enforced consistency is worth more than any individual library choice in this document.

Supporting languages, used narrowly:

- **SQL** — hand-written for complex queries (recursive relationship walks, full-text search ranking). Drizzle lets us drop to raw SQL without leaving type safety behind.
- **Node.js 22 LTS** — runtime floor. Next.js 16 requires Node 20+; 22 gives us headroom.
- **Bash** — thin developer scripts only. Anything with branching logic goes in a TypeScript script instead.

**Explicitly rejected:** a Python or Go backend. It would be defensible in isolation, but it would sever the shared-schema property above and force us to maintain the content model in two languages that can't check each other. The wiki is not compute-bound; there is no performance argument that outweighs that.

---

## 3. The repo structure question — I want to push back on one thing

You asked for modular code **instead of a monorepo**, so you can edit one portion without affecting the whole. That goal is exactly right, and it should drive the architecture. But I think "monorepo" is being blamed for something it doesn't actually cause, and I'd rather flag that now than build around a misconception.

**The thing you want to avoid is coupling** — where touching the editor package silently breaks the mobile app, or where you can't reason about the blast radius of a change. **The thing a monorepo actually is** is a single `git clone`. Those are independent properties. Big companies have famously tangled polyrepos and famously clean monorepos.

Here's the practical comparison for a project this size:

|                             | Modular monorepo                                        | Separate repos                                                        |
| --------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Change a shared type        | Edit once, compiler shows every break instantly         | Publish to npm, bump version in 3 repos, 3 PRs, hope you got them all |
| Deploy just the web app     | Yes — Turborepo detects nothing else changed            | Yes                                                                   |
| Test just one package       | Yes — `pnpm --filter @sw/editor test`                   | Yes                                                                   |
| Enforce boundaries          | Yes — lint rules that fail the build on illegal imports | Yes, by physical separation                                           |
| Onboard / set up            | One clone, one install                                  | N clones, N installs, link them manually                              |
| Atomic change across pieces | One commit, one CI run                                  | Coordinated multi-repo release dance                                  |

Separate repos would mean that every time you add a field to the NPC model, you do an npm publish cycle before you can use it in the app. That makes editing portions _harder_, not easier — it's the failure mode you're trying to avoid, wearing a different hat.

### What I recommend instead

A **modular monorepo with mechanically enforced boundaries**. You get real isolation, but from lint rules and package manifests rather than from repository walls:

1. **pnpm workspaces** — each package has its own `package.json` and its own dependencies. Package A physically cannot import package B unless B is a declared dependency; pnpm's strict linking means undeclared imports fail at runtime, not silently work.
2. **`eslint-plugin-boundaries`** — a config that declares which layers may import which. UI cannot import from the database layer. The API cannot import React. Violations fail CI.
3. **Turborepo** — task graph with caching. Changing the mobile app runs the mobile app's tests and nothing else. CI on a docs-only change finishes in seconds.
4. **`dependency-cruiser`** in CI — fails on circular dependencies, which are the actual mechanism by which "editing one thing breaks everything" happens.
5. **Independent deploy targets** — the web app, the API, and the Discord bot deploy separately on separate triggers. They are separate running services that happen to share a repo.

**The escape hatch, so this isn't a one-way door:** because every package is already self-contained with its own manifest and no illegal imports, any one of them can be extracted to its own repository later with `git subtree split` — full history preserved, no rewrite. If we get six months in and you still want them split, that's an afternoon, not a migration. Building modular-monorepo-first keeps that option open. Building polyrepo-first and wanting to consolidate is the expensive direction.

**This is your call to make.** If after reading this you still want physically separate repos, say so and I'll restructure — the package boundaries below are identical either way, so nothing in the rest of this plan is wasted. I just don't want to build the harder version by accident.

---

## 4. Package layout

```
strahds-war/
├── apps/                          # deployable units — each ships independently
│   ├── web/                       # Next.js 16 — public wiki + admin panel
│   ├── mobile/                    # Expo app (Phase 6; PWA covers phones until then)
│   └── bot/                       # Discord bot (Phase 8, optional)
│
├── services/
│   └── api/                       # Hono HTTP API — the only thing that touches the DB
│
├── packages/                      # shared libraries — versioned, independently testable
│   ├── schemas/                   # Zod content models — the source of truth
│   ├── db/                        # Drizzle schema, migrations, query builders
│   ├── authz/                     # permission logic — pure functions, no I/O
│   ├── api-client/                # typed client generated from the API's OpenAPI spec
│   ├── ui/                        # React components (shadcn/ui based)
│   ├── design-tokens/             # colors, type, spacing — platform-agnostic
│   ├── editor/                    # TipTap editor + custom Barovian extensions
│   └── content-render/            # editor JSON → HTML/React, shared web + mobile
│
├── tooling/                       # shared configs, not deployed
│   ├── eslint-config/
│   ├── tsconfig/
│   └── vitest-config/
│
└── docs/                          # this plan, ADRs, content model reference
```

**The dependency rule, in one sentence:** `apps` and `services` may depend on `packages`; `packages` may depend on packages _below them in the list_; nothing ever depends on an app. `packages/authz` and `packages/schemas` depend on nothing at all — they're pure, which makes them trivially testable and safe to change.

The load-bearing constraint here: **only `services/api` imports `packages/db`.** The web app has no database credentials and cannot query Postgres even by accident. This is what makes spoiler enforcement a single auditable chokepoint rather than a property you have to re-verify in every component.

---

## 5. Technology choices

### Web application — Next.js 16 + React 19.2

Next.js 16.2 is the current stable line, with Turbopack as the default bundler and the explicit Cache Components model replacing the old implicit `fetch` caching. App Router, React Server Components.

Server Components matter here specifically because of the spoiler problem: page content is fetched and rendered on the server, and DM-only material never enters the JavaScript bundle sent to a player's browser. The security property we need falls out of the rendering model rather than being bolted on.

- **Tailwind CSS v4** for styling — CSS-first config, so our design tokens live in one `@theme` block that both Tailwind and raw CSS read.
- **shadcn/ui** for components — Radix primitives, copied into `packages/ui` rather than installed as a dependency. Accessible keyboard and screen-reader behavior comes free, and we own the source, so heavy Barovian restyling doesn't fight the library.
- **next-pwa / Serwist** service worker for installability and offline reading.

### API — Hono + Zod OpenAPI, as its own service

A standalone HTTP API rather than putting everything in Next.js route handlers or reaching for tRPC.

The reasoning: three different clients need this data — the web app, a future phone app, and possibly a Discord bot. tRPC is excellent but couples clients to the server's TypeScript types, which means the client must be built and deployed in lockstep. A documented, versioned HTTP contract lets the mobile app run an older API version during a staged rollout, and lets a non-TypeScript consumer exist someday. `@hono/zod-openapi` derives the OpenAPI spec from the same Zod schemas that validate requests, so the docs cannot drift from the implementation. We then generate `packages/api-client` from that spec, which gives us tRPC-grade type safety at the call site anyway — we get both properties.

Hono also runs on Node, Bun, Cloudflare Workers, and Deno unchanged, so hosting isn't a lock-in decision.

### Database — PostgreSQL on Neon, with Drizzle ORM

**Postgres** because we need real relational integrity (an NPC belongs to a faction, appears in sessions, is located in a place — and deleting a faction must not silently orphan NPCs), plus native full-text search and `jsonb` for editor documents. One database, no separate search cluster to start.

**Neon** for hosting, chosen mainly for **database branching**: every pull request gets a real copy-on-write branch of production data, so migrations get tested against realistic content before they touch anything real. Generous free tier, scales to zero.

**Drizzle** over Prisma. Drizzle is ~7kb with zero dependencies versus Prisma's ~1.6MB, which matters for serverless cold starts, and its SQL-first API means the recursive relationship queries we'll need for the entity graph are writable directly instead of fought around. Prisma's developer experience is arguably nicer for simple CRUD, but this schema will get genuinely relational and I'd rather be close to SQL. `drizzle-zod` derives Zod schemas from tables, closing the loop with `packages/schemas`.

### Authentication — Better Auth

Google and Discord OAuth, which is exactly what you asked for. Discord matters more than it looks — your players are already in a Discord server, so "sign in with Discord" means zero-friction onboarding, and we can read their guild membership to auto-grant the player role.

Better Auth over Auth.js/NextAuth: NextAuth v5 has no built-in roles, permissions, or admin user-management, so all of that becomes custom code. Better Auth ships the `admin` plugin with role management, user banning, session revocation, and impersonation, plus a `createAccessControl()` primitive for defining custom roles and permission statements. The current consensus is not to start new projects on NextAuth. It's self-hosted and free — sessions live in our own Postgres, no per-MAU pricing, no third-party holding the user table.

Cookie sessions for web, bearer tokens for mobile. **Impersonation is a genuinely useful feature here**, not just an admin nicety: it lets you view the wiki exactly as a specific player sees it and verify your spoiler boundaries are actually holding.

### Authorization — a separate policy package

Better Auth handles _who you are_. `packages/authz` handles _what you may do_, deliberately kept separate.

It exports one pure function:

```ts
can(actor: Actor, action: Action, subject: Subject): boolean
```

No database access, no network, no framework imports. Which means it's exhaustively unit-testable — we can assert every role against every action in a table-driven test and know the matrix is correct.

Both the API (to enforce) and the UI (to decide whether to render an Edit button) import the same function, so the interface never offers an action the server will reject. The API enforcement is what's real; the UI usage is cosmetic. That distinction gets a comment in the code, because it's the kind of thing a future reader gets wrong.

### Roles

Five roles, additive in capability:

| Role               | Can                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Viewer**         | Read public content. Unauthenticated visitors.                                                   |
| **Player**         | Read player-tier content, bookmark, comment, submit their own character page                     |
| **Chronicler**     | Everything above, plus create and edit lore/NPC/location drafts. Cannot publish or see DM-only.  |
| **Co-DM**          | Publish, see and write DM-only content, manage media, edit session notes                         |
| **Overlord** (you) | Everything, plus role assignment, user banning, impersonation, destructive operations, audit log |

Permissions are **capability-based, not role-checked**, at the enforcement site. Code asks `can(actor, 'publish', page)`, never `if (user.role === 'co-dm')`. Adding a sixth role later then means editing one table in `authz` instead of hunting scattered role comparisons.

Every mutation writes to an append-only **audit log**: actor, action, subject, before/after diff, timestamp, IP. Non-negotiable once more than one person can edit.

### Content model

Typed entities rather than freeform pages — this is what makes the wiki genuinely useful instead of a folder of documents:

**NPC · Location · Faction · Item · Session · Lore · PlayerCharacter · Handout · Rule** (homebrew mechanics)

Each entity has structured fields (an NPC has an allegiance, a status, a location, a portrait) _and_ a rich body. Structure gives us filtering, relationship graphs, and "show me every NPC in Vallaki loyal to Strahd." The body gives us prose.

Two things every entity carries:

**Visibility, per-field and per-block.** `public` / `player` / `dm`. An NPC can be publicly known by name and portrait while their true allegiance is DM-only, in the same record. The API strips fields above the requester's clearance in the query layer, so the payload leaving the server simply does not contain them.

**Revisions, append-only.** Every save writes a new row. Full history, diffs, one-click rollback. You will at some point overwrite something at 1am before a session, and this is the thing that saves it.

### Editor — TipTap 3

Headless, built on ProseMirror, the standard default for knowledge-base and CMS authoring in 2026. Lexical is the alternative and is architecturally cleaner in places, but TipTap's extension ecosystem and Yjs collaboration path are more mature, and we need custom node types more than we need raw performance.

Custom extensions we'll build:

- **`[[Wikilink]]`** — autocomplete against real entities, renders with live status, warns on broken links
- **`@mention`** — inline entity references with hover cards
- **Stat block** — a proper 5e monster block node, not a hand-formatted table
- **DM-only block** — visually distinct in the editor, _stripped server-side_ for anyone without clearance
- **Tarokka card** — the campaign's fortune-telling motif, as a first-class callout
- **Read-aloud box** — boxed descriptive text, the classic module convention

Stored as TipTap JSON in `jsonb` (structured, queryable, transformable) with a rendered HTML cache column for fast reads. `packages/content-render` handles JSON → output so the phone app renders identically without shipping the editor.

### Media — Cloudflare R2

S3-compatible, no egress fees, presigned direct uploads so large map images never pass through our API. Next.js Image handles optimization and AVIF/WebP conversion. Maps need deep zoom, so large images get tiled.

---

## 6. Design direction — Barovian gothic

The aesthetic goal: **an artifact recovered from the Amber Temple**, not a fantasy-themed SaaS dashboard. Dark, heavy, quiet. Restrained ornament — one wax seal is gothic, twelve is a Halloween store.

### Palette

Dark-mode-first. Not a dark variant of a light theme — the light theme, if we build one, is the afterthought.

| Token      | Hex       | Use                                                 |
| ---------- | --------- | --------------------------------------------------- |
| `void`     | `#0B0A0C` | Page background — near-black, warm-shifted          |
| `crypt`    | `#141317` | Cards, surfaces                                     |
| `stone`    | `#1F1D23` | Raised surfaces, inputs, hover states               |
| `mist`     | `#6E6A75` | Muted grey — **fills and borders only**             |
| `mistLit`  | `#948E9C` | Muted **text**, metadata, disabled                  |
| `bone`     | `#E8E3D9` | Primary text — warm off-white, not pure white       |
| `blood`    | `#8B1A1A` | Deep crimson — **fills and borders only**           |
| `ember`    | `#B33636` | Brighter crimson — **fills and large display type** |
| `emberLit` | `#E85550` | Crimson **text** and links                          |
| `gold`     | `#B08D4F` | Tarnished gold — rules, dividers, accents           |
| `moss`     | `#4A5D45` | Svalich woods green — secondary, nature, druidic    |
| `arcane`   | `#5B4B8A` | Muted violet — magic, arcana, the Vistani           |
| `danger`   | `#A32222` | Destructive actions                                 |

**An accessibility note that determines a real constraint:** a colour is either a _fill_ colour or a _text_ colour, and the two sets barely overlap. `blood` (#8B1A1A) on `void` (#0B0A0C) measures 2.13:1 and `ember` (#B33636) measures 3.29:1 — both well under the 4.5:1 WCAG AA needs for body text. So the deep crimsons fill shapes, and `emberLit` (#E85550, 4.65:1 at worst) carries every piece of crimson text and every link. The same split applies to the muted grey: `mist` fills, `mistLit` is the one you set metadata in.

This is worth stating explicitly because "make the accent color the brand red" is the natural instinct and it would quietly make the site hard to read for anyone with reduced contrast sensitivity — including you, at 1am, mid-session.

> **Corrected in Phase 2.** This section originally put `blood` at ~3.9:1 and `ember` at ~5.3:1, and concluded that `ember` passed AA and could carry crimson text. Both figures were wrong; `ember` misses the bar. The contrast test below is what caught it, before any component consumed a token. The full measurements, the two colours added in response, and the alternatives rejected are in [ADR 0007](adr/0007-text-tier-colours.md).

A contrast test runs in CI against every token pair we actually ship, so this can't regress silently. `TEXT_COLORS` in `packages/design-tokens` also makes it a _compile_ error to set text in a fill colour, so the rule holds without anyone having to remember it.

### Typography

- **Display** — _Cinzel_. Roman inscriptional capitals; reads as carved stone. Page titles and section headers only.
- **Serif body** — _Spectral_. Long-form lore and read-aloud text. Bookish, screen-legible.
- **UI sans** — _Inter_. Navigation, forms, admin panel, anything on a phone. Legibility beats atmosphere for functional text, always.
- **Mono** — _JetBrains Mono_. Stat blocks, dice notation, mechanics.

Self-hosted via `next/font` — no external font requests, no layout shift, no Google Fonts dependency.

### Texture & motion

Subtle: a fine parchment grain on card surfaces, a soft vignette at viewport edges, hairline gold rules between sections, a slow drifting fog layer on the landing page only. Transitions are slow and eased — 250–400ms, a crypt door rather than a modern app's snap.

All of it behind `prefers-reduced-motion`, and the fog layer also disables on low-power devices so we don't burn a player's phone battery at the table.

> **Built in Phase 2.** The two page-level layers render _behind_ content rather than over it, and neither may lighten its surface past `stone` — so the contrast guarantees in [ADR 0007](adr/0007-text-tier-colours.md) still describe what actually renders. "Low-power" needs JavaScript, since CSS has no battery query: the fog reads core count, device memory, save-data and battery level, and suppresses itself when any of them says the device is constrained. [ADR 0008](adr/0008-atmosphere-behind-content.md) has the reasoning and the costs.

---

## 7. Layouts

### Desktop (≥1280px) — three columns

```
┌──────────────────────────────────────────────────────────────┐
│  ✦ STRAHD'S WAR          [⌘K search]        [avatar ▾]      │
├────────────┬─────────────────────────────────┬───────────────┤
│ Campaign   │   The Burgomaster of Vallaki    │  ON THIS PAGE │
│  ▸ NPCs    │   ───────────────────────────   │   Overview    │
│  ▸ Places  │                                 │   History     │
│  ▸ Factions│   [portrait]  Status: Alive      │   Secrets 🔒  │
│  ▸ Sessions│               Faction: Vallaki   │               │
│  ▸ Lore    │                                 │  RELATED      │
│  ▸ Items   │   Body prose, wikilinks,         │   Vallaki     │
│            │   stat blocks, read-aloud…       │   Izek Strazni│
│  [+ New]   │                                 │   [graph ▸]   │
└────────────┴─────────────────────────────────┴───────────────┘
```

Left rail is the campaign tree. Center is content, max ~72ch measure for readability. Right rail carries table of contents, relationships, and metadata. `⌘K` command palette for navigation and admin actions — it becomes the primary interface once you know the content.

### Tablet (768–1279px)

Right rail collapses into tabs under the content. Left rail becomes an overlay drawer. Two columns.

### Mobile (<768px) — single column, thumb-first

```
┌─────────────────────┐
│ ☰   STRAHD'S WAR  🔍│
├─────────────────────┤
│  [portrait]         │
│  The Burgomaster    │
│  of Vallaki         │
│  ─────────────────  │
│  Alive · Vallaki    │
│                     │
│  Body prose…        │
│                     │
│  ▸ Related (3)      │
│  ▸ Appears in (5)   │
├─────────────────────┤
│ 🏠   🔍   ⭐   📖   👤│
│Home Srch Mark Sess Me│
└─────────────────────┘
```

Bottom tab bar, because the top of a phone screen is not reachable one-handed while you're holding a character sheet. Detail panels are bottom sheets. Admin editing on mobile is deliberately limited to quick edits — a full TipTap editor on a 390px screen is a bad experience and pretending otherwise wastes effort. Bookmarked pages cache for offline reading, since table wifi is a myth.

---

## 8. Phones: PWA first, native app later

You asked for a phone app. I'd recommend getting there in two steps.

**Phase 1 — Installable PWA.** The Next.js app gets a service worker, a manifest, and offline caching. It installs to the home screen with its own icon, launches without browser chrome, and works on the subway. iOS has supported web push since 16.5, so notifications are possible, though still more limited than native.

The reason to start here: it's roughly two days of work on top of the web app we're already building, versus several weeks for a real native app — and it costs nothing in App Store fees, review delays, or release cycles. For a wiki, which is fundamentally _reading content_, a well-built PWA is genuinely hard to distinguish from native.

**Phase 2 — Expo / React Native**, if and when the PWA's limits actually bite. The honest triggers would be: you want reliable push for session reminders, or offline-first sync rather than offline-caching, or a dice roller with haptics. Because `schemas`, `authz`, `api-client`, and `content-render` are all platform-agnostic packages, the native app reuses the entire data and permission layer and only reimplements the view layer. That's the payoff for the boundaries in section 4.

I'd rather you use the PWA for a month and discover which native features you actually miss than guess now and build the wrong ones.

---

## 9. Development phases

Each phase ends with something deployed and usable. No phase is a prerequisite for _using_ the app, only for using more of it.

### Phase 0 — Foundation _(~3 days)_

pnpm workspace, Turborepo, strict TypeScript configs, ESLint with boundary rules, Prettier, Vitest, Playwright, Husky + lint-staged, Changesets, GitHub Actions with Turborepo remote cache. Neon project with `main`/`preview` branching. `docs/adr/` for decision records.

**Done when:** `pnpm dev` starts everything, CI runs green on an empty PR in under 90 seconds, an illegal cross-package import fails the build.

### Phase 1 — Data & auth _(~1 week)_

Drizzle schema for all entity types, users, roles, revisions, audit log. Better Auth with Google + Discord. `packages/authz` with the full permission matrix and its exhaustive table-driven test. Hono API skeleton with auth middleware and OpenAPI generation. Seed script with real Barovia content for development.

**Done when:** you can sign in with Discord, the API returns your role, and the permission matrix test passes for all 5 roles × all actions.

### Phase 2 — Design system _(~4 days)_

`design-tokens` with the palette and type scale. Tailwind v4 `@theme` config. shadcn/ui vendored into `packages/ui` and restyled to Barovian. Storybook for component review. The CI contrast test.

**Done when:** every shipped token pair passes AA and Storybook shows the full component set in theme.

### Phase 3 — Read-only wiki _(~1.5 weeks)_

Public site. Entity pages, list/filter views, navigation, `⌘K` command palette, Postgres full-text search, responsive layouts across all three breakpoints. Server-side visibility filtering with a test suite that asserts DM-only content never appears in an unauthorized response payload.

**Done when:** players can browse seeded content on phone and desktop, and an authenticated-as-player integration test proves no DM field leaks.

### Phase 4 — Admin panel & editor _(~2.5 weeks)_

The big one. TipTap with all custom Barovian extensions. Entity CRUD with schema-driven forms. Draft/review/publish workflow. Revision history with visual diffs and rollback. Media library with R2 uploads. User and role management. Audit log viewer. Bulk import from Markdown, so existing prep notes come in without retyping.

**Done when:** you can run a full prep session — write an NPC, link it to a location, mark a secret DM-only, upload a portrait, publish — without touching the database directly.

### Phase 5 — PWA & offline _(~3 days)_

Service worker, manifest, icons, offline shell, bookmark caching, install prompt.

**Done when:** it installs on your phone and bookmarked pages open in airplane mode.

### Phase 6 — Polish & production _(~1 week)_

Sentry + OpenTelemetry, structured logging with pino, rate limiting, automated Neon backups with a _tested restore_, Lighthouse budgets in CI, full Playwright e2e suite, security review pass, real content migration.

**Done when:** you've restored a backup successfully and Lighthouse passes on mobile.

### Phase 7+ — Optional, driven by actual use

Expo native app · Discord bot (`/lookup strahd` in your campaign channel) · interactive Barovia map with pins · initiative/encounter tracker · session timeline · Yjs real-time collaborative editing · player-submitted journals.

**Rough total to a fully usable wiki (Phases 0–6): 6–8 weeks of focused part-time work.** Phase 4 is over a third of it, and that estimate is the one most likely to move.

---

## 10. Quality & operations

**Testing** — Vitest for unit (`authz` gets exhaustive coverage; it's pure and it's security-critical). Integration tests against a real Neon branch, not mocks, because the visibility filtering we care about lives in SQL and a mock would happily lie to us. Playwright for e2e including a dedicated **spoiler-leak suite**: log in as each role, crawl every page, assert no higher-clearance content appears in any response body.

**CI/CD** — GitHub Actions. Every PR: typecheck, lint, boundary check, unit + integration tests, Lighthouse budget, and a Neon preview branch with a live deploy. Merge to `main` deploys only the apps whose inputs changed.

**Hosting** — Vercel for the web app (Next.js 16 native support, edge CDN, preview deploys). Fly.io or Railway for the Hono API — long-running, connection pooling, no cold starts. Neon for Postgres, R2 for media. All have workable free or near-free tiers at this scale; expect roughly $0–20/month until content grows substantially.

**Secrets** — nothing in the repo. `.env.example` documents required variables; real values live in the platform's secret store and in your password manager. A `gitleaks` pre-commit hook as a backstop.

---

## 11. Open questions for you

Things I'd want answered before or during Phase 1 — none block starting:

1. **Repo structure** — modular monorepo as recommended in §3, or do you want physically separate repos? Nothing else in this plan changes either way.
2. **Player accounts** — invite-only, or Discord-guild-gated (anyone in your server gets Player automatically)?
3. **Public reading** — is any of the wiki visible without login, or is it players-only from the front door?
4. **Existing content** — do you have prep notes already? Format matters for the Phase 4 importer. World Anvil, Notion, Obsidian, and plain Markdown are all straightforward; a Google Doc is more manual.
5. **Homebrew mechanics** — how much rules content is there? A lot of custom mechanics might justify a dedicated `Rule` entity with its own presentation rather than folding it into `Lore`.
6. **Domain name** — needed before Phase 6, not before Phase 0.

---

## 12. Summary

**Languages:** TypeScript everywhere (strict), SQL where it earns its place, Node 22.

**Stack:** Next.js 16 · React 19.2 · Tailwind v4 · shadcn/ui · Hono + Zod OpenAPI · PostgreSQL on Neon · Drizzle · Better Auth (Google + Discord) · TipTap 3 · Cloudflare R2 · Vitest + Playwright · Turborepo + pnpm.

**Structure:** modular monorepo, isolation enforced by lint rules and package manifests rather than repo walls, every package extractable later without a rewrite.

**Mobile:** installable PWA in Phase 5, native Expo app in Phase 6+ only if the PWA's real limits bite.

**The through-line:** one type definition per fact, server-side spoiler enforcement at a single chokepoint, and boundaries a machine checks instead of boundaries you have to remember.

---

_Sources consulted: [Next.js docs](https://nextjs.org/docs) · [Next.js 16 + React 19.2 in production](https://dev.to/x4nent/complete-guide-to-nextjs-16-react-192-in-production-rsc-security-view-transitions-turbopack-5090) · [Better Auth admin plugin](https://www.better-auth.com/docs/plugins/admin) · [Better Auth vs NextAuth vs Clerk](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk) · [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/) · [Prisma/Drizzle/TypeORM on Postgres — Neon](https://neon.com/guides/prisma-drizzle-typeorm-postgres) · [TipTap vs Lexical 2026](https://www.pkgpulse.com/guides/tiptap-vs-lexical-vs-slate-vs-quill-rich-text-editor-2026) · [pnpm + Turborepo monorepo architecture](https://dev.to/malloc72p/frontend-monorepo-architecture-a-practical-guide-with-pnpm-workspaces-and-turborepo-4dbk) · [PWA vs native with Expo](https://www.appik-studio.ch/en/blog/pwa-vs-native-app-expo-best-choice/)_
