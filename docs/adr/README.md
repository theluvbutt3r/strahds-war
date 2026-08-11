# Architecture Decision Records

Short documents recording decisions that were expensive to reach and would be expensive to reverse. Each captures the state of the world at the time it was written — an ADR is a record, not a living document. When a decision changes, write a new ADR that supersedes the old one rather than editing history.

## Why these exist

Several of them are referenced directly from code and from tooling, including inside a lint error message that a developer sees at the moment a rule fires:

| ADR                                            | Referenced from                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [0001](0001-modular-monorepo.md)               | `docs/PLAN.md` §3                                                                                  |
| [0002](0002-players-only-front-door.md)        | `packages/schemas/src/visibility.ts`, its test, `apps/web/src/app/layout.tsx`, `e2e/smoke.spec.ts` |
| [0003](0003-standalone-http-api.md)            | `services/api/src/app.ts`                                                                          |
| [0004](0004-capability-based-authorization.md) | `tooling/eslint-config/restricted-syntax.js` — **quoted in the lint error itself**                 |
| [0005](0005-db-only-from-api.md)               | `packages/db/src/index.ts`, `.dependency-cruiser.cjs`, `tooling/eslint-config/boundaries.js`       |
| [0006](0006-field-level-visibility.md)         | `packages/schemas/src/entities.ts`, `packages/db/src/queries.ts`                                   |

If you rename or remove one of these files, fix the referring comment in the same commit. A rule that tells you to go read a document that does not exist is worse than a rule with no explanation, because it costs the reader the time it takes to find that out.

## Format

```markdown
# NNNN. Title

- **Status:** Accepted | Superseded by ADR-NNNN | Proposed
- **Date:** YYYY-MM-DD

## Context

What forced a decision. The constraints, not the solution.

## Decision

What we are doing, stated plainly.

## Consequences

What this makes easy, what it makes hard, and what it forecloses. Be honest about the costs — an ADR listing only benefits is marketing, and the reader who finds it in a year needs the costs more than the benefits.

## Alternatives considered

What else was on the table and why it lost. This is usually the most valuable section: it is the part nobody can reconstruct later.
```

Number sequentially. Do not renumber.
