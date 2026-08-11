# 0006. Field-level visibility, enforced by column selection

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

ADR [0002](0002-players-only-front-door.md) settled visibility for a whole record: an entity carries a tier, and a reader below that tier does not see it. That is not sufficient for the content this wiki actually holds.

The load-bearing case is an NPC who is **simultaneously public and secret**. Strahd von Zarovich is known to every peasant in the valley — his name, his castle, his title. What he wants, and why he wants it, is the campaign. The same record has to be readable and withheld at once, which means the unit of visibility cannot be the record.

Two further constraints shaped the answer:

- **Somebody will add a field and forget to classify it.** Not hypothetically — this is a solo project edited at 1am before sessions. Whatever happens to an unclassified field is what will happen to a meaningful fraction of all fields ever added.
- **Filtering after fetching is one refactor away from a leak.** If a query returns every column and a later step deletes the secret keys, then every future change to how responses are assembled — a new serialiser, a debug log, an error that echoes the row, a `select *` in a new endpoint — is a chance to skip that step.

## Decision

**Visibility is declared per field, and enforced by not selecting the column.**

Each entity kind has a clearance map in `packages/schemas/src/entities.ts` typed as `Record<keyof Fields, Visibility>` — a _total_ map, not a partial one. Adding a field to a Zod schema without classifying it is a compile error.

`visibleFieldsFor(kind, clearance)` turns a clearance into the list of field names that clearance may see. `selectionFor()` in `packages/db/src/queries.ts` turns that list into the Drizzle column selection for the query. Fields above the reader's clearance are **absent from the generated SQL**: never fetched, never in memory, never serialised.

`projectFields()` exists alongside it for rows already in hand — revision snapshots, seeds, audit diffs — and drops any key with no declared clearance rather than passing it through.

Edges carry their own visibility for the same reason. `Ireena — related_to → Tatyana` is a spoiler while both endpoints are player-visible: the connection is the secret, not the nodes.

## Consequences

**Easy.** A record can be public in its name and DM-only in its motives without splitting it into two records that then have to be kept in step. Asserting the property is cheap and does not need a database — `selectionFor("npc", "player")` either contains `secrets` or it does not, and that is a unit test.

**The dangerous mistake is now a compile error rather than a disclosure.** Adding an unclassified field fails the build; if it somehow reaches runtime, `projectFields` drops it. Both directions fail closed.

**Hard — and this is the real cost:** there are now two places a field must be named, the Zod schema and the clearance map, and a third if it needs a database column. The type system enforces the first two agreeing. Nothing enforces that the _chosen tier is correct_ — classifying `secrets` as `player` compiles perfectly and leaks. Judgement is still required; the mechanism only guarantees that judgement was exercised.

**Hard:** query results are dynamically shaped, so they are typed as `Record<string, unknown>` rather than as a row type. Static typing at the call site is genuinely lost. Accepted deliberately: the alternative is a static type that claims fields the query did not fetch, which is a lie the compiler would then help propagate.

**Forecloses** `SELECT *` anywhere in the read path. That is the point.

**Not yet solved:** per-_block_ visibility inside prose. PLAN.md §5 wants DM-only regions inside a body, which arrives with the editor in Phase 4. Until then `body` carries the entity's own tier and DM prose belongs in the separately-gated `secrets` field. A DM-only block marker inside `body` today would be decoration, not enforcement.

## Alternatives considered

**Two tables per kind — public columns and a `_secret` sibling, joined only when cleared.** Genuinely appealing: the enforcement becomes "do not join", which is harder to get wrong than "do not select". Rejected because it doubles the table count to eighteen, splits every write across two statements needing a transaction, and makes a field's tier a _schema migration_ rather than a one-line edit. Worth revisiting if the selection approach ever fails in practice.

**Fetch everything, strip in the serialiser.** Rejected as the thing this ADR exists to prevent. It is correct exactly as long as every future code path remembers, and the failure is silent.

**Row-level and column-level security in Postgres.** The strongest option on paper — the database itself would refuse. Rejected because it requires a session-scoped role per request, which does not compose with connection pooling without care, and because policy would then live in migrations where it cannot be unit-tested against the matrix in `@sw/authz`. Reconsider if the API ever stops being the only client.

**A single `visibility` per record, with secrets split into separate entities.** Rejected: it turns one NPC into two pages that must be kept in sync by hand, and the link between them is itself a spoiler.
