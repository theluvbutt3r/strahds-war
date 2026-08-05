# 0002. Players-only front door, and content that defaults to hidden

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The wiki serves a live campaign. A player who can read Strahd's true motives has had the campaign spoiled, and no amount of good design elsewhere compensates for that. Spoiler safety is the constraint the rest of the architecture is downstream of.

Two questions follow, and they are separable:

1. Is any of the wiki readable without logging in?
2. What clearance does a piece of content have when nobody said?

The second is the dangerous one. Content gets created in a hurry, at 1am, mid-prep. Whatever happens when the visibility field is left unset is what will happen to a meaningful fraction of all content ever written.

## Decision

**The front door requires a login.** An unauthenticated request reaches the sign-in page and nothing else. There is no anonymous read path.

**New content defaults to `player`, not `public`** — `DEFAULT_VISIBILITY` in `packages/schemas/src/visibility.ts`, with a test asserting it.

The `public` tier still exists and `viewer` still maps to it. Keeping the tier distinct costs nothing and leaves room for a shared handout link later without reworking the model — but no `public` content is served anonymously today.

Consequences elsewhere in the codebase:

- `apps/web/src/app/layout.tsx` sets `robots: { index: false, follow: false }`. A search result leaking an entity _title_ is a spoiler in itself, and there is nothing here for a crawler to index anyway. `e2e/smoke.spec.ts` asserts the tag survives future layout edits.
- Enforcement is in the query layer in `services/api`, before serialisation. Material above the requester's clearance is never sent — not sent-and-hidden. See ADR [0005](0005-db-only-from-api.md) for why that can be a single chokepoint.
- `clears()` and `maxClearance()` are pure and total, so they are safe to call anywhere, including in a React component. Calling them in a component is **cosmetic**. The authoritative check is the one the API makes before the data crosses the wire.

## Consequences

**The failure mode is a locked door rather than an open one.** A forgotten visibility field hides content. Someone will be briefly confused about why their new NPC is not visible to a viewer; that is the correct direction for the mistake to point.

**Fails closed on bad input, too.** `clears()` looks up an unknown tier in a rank table and gets `undefined`; the comparison is then false and access is denied. This holds even for a tier string that never passed Zod validation — worth an explicit test so it stays true.

**Cost:** no public marketing page or shareable link for the wiki without a deliberate later decision. Accepted; this is a tool for one table, not a publication.

**Cost:** every integration test needs an authenticated session. Real, and the reason the Phase 6 spoiler-leak suite is specified as "log in as each role and crawl" rather than something cheaper.

## Alternatives considered

**Default `public`, mark secrets explicitly.** Rejected outright. It makes the common oversight — forgetting a field — into a disclosure. The whole point is that the dangerous direction should require typing something.

**Public wiki with DM-only sections.** Rejected: entity titles, the shape of the entity graph, and even the existence of a page are all spoilers. Hiding bodies while exposing structure leaks more than it looks like it does.

**Client-side filtering with a full payload.** Rejected as not a design at all — "view source" defeats it. Recorded because it is the thing that gets reinvented under deadline pressure, and it is what the `'use client'` lint rule in `tooling/eslint-config/restricted-syntax.js` exists to make awkward.
