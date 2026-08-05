# 0003. A standalone HTTP API, not tRPC and not route handlers

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

Three clients need this data: the web app, a future phone app, and possibly a Discord bot. The obvious options were Next.js route handlers (keep everything in one app), tRPC (best-in-class type safety), or a standalone service.

tRPC is excellent and would be the default choice for a single-client project. Its cost is that it couples clients to the server's TypeScript _types_, which means clients build and deploy in lockstep with the server. A phone app cannot be redeployed on the App Store's schedule and the API's schedule at the same time.

## Decision

A standalone **Hono** service in `services/api`, with **`@hono/zod-openapi`** deriving the OpenAPI document from the same Zod schemas that validate requests. `packages/api-client` is generated from that document.

This gets both properties: a documented, versioned HTTP contract that a staged mobile rollout or a non-TypeScript consumer can hold onto, _and_ tRPC-grade type safety at the call site, because the generated client cannot drift from what the server accepts.

Hono runs unchanged on Node, Bun, Cloudflare Workers and Deno, so hosting is not a lock-in decision.

Two implementation notes that are load-bearing and easy to get wrong:

**Use `app.doc31()`, never `app.doc()`.** The library has both. `doc()` emits OpenAPI **3.0** schemas; `doc31()` emits 3.1. The `openapi: "3.1.0"` string in the config object is only a label and does not switch generators. Calling `doc()` with that label produces a document that declares 3.1 and contains 3.0 syntax — `nullable: true` instead of `type: ["string", "null"]`. `nullable` is not a keyword in 3.1, so a generator reads the field as non-nullable and the generated client's types silently disagree with the server. That is precisely the drift this ADR exists to prevent, arriving through the mechanism meant to prevent it. `services/api/src/app.test.ts` asserts on generated _shape_ rather than on the version string, because an assertion that reads back the literal we passed in cannot fail.

**`/openapi.json` is not served in production.** The spec enumerates every endpoint, entity type and field name — including DM-tier field names, since the schema describes fields the visibility filter strips rather than fields that do not exist. On a service whose premise is that the shape of the content is itself a spoiler, that is a disclosure. The document is served in development, where the client is generated from it; production returns 404. See ADR [0002](0002-players-only-front-door.md).

## Consequences

**Easy.** The mobile app can run against an older API version during a staged rollout. A Discord bot in any language can consume the same contract. Documentation cannot drift from the implementation, because both derive from one Zod schema.

**Hard.** Two processes to run and deploy instead of one, and CORS between them. `pnpm dev` starts both; CORS is configured in the API.

**Cost:** a code-generation step. `packages/api-client` is generated from a document that must be produced first, so a stale client is possible if generation is skipped. Generation runs against the dev server, and the shape test guards the document itself.

## Alternatives considered

**tRPC.** Rejected for the lockstep-deploy coupling. Genuinely the better choice if the web app were the only client.

**Next.js route handlers.** Rejected: it makes the phone app a second-class consumer of an app that was not designed to be an API, and it puts database access inside the web app — which ADR [0005](0005-db-only-from-api.md) exists to prevent.

**GraphQL.** Rejected as solving a problem this project does not have. The clients want whole entities; the cost is a resolver layer and a new class of authorization bug, where field-level visibility has to be re-enforced per resolver instead of once in the query.
