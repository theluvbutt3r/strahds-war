# 0001. Modular monorepo, with boundaries enforced by machine

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The original request was for modular code **instead of** a monorepo, so that one portion could be edited without affecting the whole.

That goal is right. The reasoning behind it conflates two independent things. The property wanted is **low coupling** — that touching the editor package cannot silently break the mobile app, and that the blast radius of a change is knowable. What a monorepo actually is, is **a single `git clone`**. Those are orthogonal. Famously tangled polyrepos exist; so do famously clean monorepos.

The project has several deployable pieces (web app, HTTP API, later a phone app and possibly a Discord bot) sharing one content model. The dominant cost in that shape is changing a shared type.

|                             | Modular monorepo                     | Separate repos                         |
| --------------------------- | ------------------------------------ | -------------------------------------- |
| Change a shared type        | Edit once, compiler shows all breaks | Publish to npm, bump in 3 repos, 3 PRs |
| Deploy just the web app     | Yes — Turborepo sees what changed    | Yes                                    |
| Enforce boundaries          | Lint rules that fail the build       | Yes, by physical separation            |
| Atomic change across pieces | One commit, one CI run               | Coordinated multi-repo release dance   |

Separate repos would mean an npm publish cycle every time a field is added to the NPC model, before it could be used in the app. That makes editing portions _harder_ — it is the failure mode being avoided, wearing a different hat.

## Decision

A **modular monorepo with mechanically enforced boundaries**. Isolation comes from lint rules and package manifests rather than from repository walls:

1. **pnpm workspaces** with `node-linker=isolated` — a package physically cannot import what its own `package.json` does not declare.
2. **`eslint-plugin-boundaries`** — declares which layers may import which. Violations fail CI.
3. **`dependency-cruiser`** — forbidden edges and, critically, circular dependencies, which are the actual mechanism by which "editing one thing breaks everything" happens.
4. **Turborepo** — task graph and caching, so changing one package runs only what depends on it.
5. **Independent deploy targets** — the pieces are separate running services that happen to share a repo.

None of that is worth anything if it quietly stops working, which is the normal way this fails: a resolver change or a config refactor, nothing errors, the rules simply stop matching. So `scripts/verify-boundaries.ts` writes genuinely illegal code and requires each mechanism to reject it independently, with positive controls to catch a lint setup broken in the other direction.

## Consequences

**Easy.** One clone, one install. A shared-type change surfaces every break at compile time. Atomic cross-cutting commits. CI on a docs-only change finishes in seconds.

**Hard.** The boundary configuration is real work and non-obvious — four files' worth, plus the harness that proves they bite. Someone reading the repo for the first time meets a lot of policy before they meet any feature code. That cost is paid once and is the price of the guarantee.

**Foreclosed:** nothing permanent. Every package is self-contained with its own manifest and no illegal imports, so any one can be extracted with `git subtree split` — full history preserved, no rewrite. If separate repos are still wanted in six months, that is an afternoon. Building polyrepo-first and wanting to consolidate is the expensive direction, which is why this is the safe default rather than a bet.

## Alternatives considered

**Separate repositories per package.** Rejected above: it taxes the single most common operation in this project. Kept available via `git subtree split`.

**A monorepo without enforcement** — boundaries as convention and code review. Rejected: this is what actually produces the tangled monorepos that give the pattern its reputation. A boundary nobody checks is a comment.

**Nx instead of Turborepo.** More capable, more configuration. Turborepo's task graph plus caching covers what a repo this size needs.
