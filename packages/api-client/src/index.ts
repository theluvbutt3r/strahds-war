/**
 * @sw/api-client — typed client generated from the API's OpenAPI spec.
 *
 * This is how apps read data: never Postgres directly, always the API, so visibility
 * filtering happens server-side before anything crosses the wire. Because the spec is
 * derived from the same Zod schemas that validate requests, the generated client cannot
 * drift from what the server actually accepts — which buys us tRPC-grade safety at the
 * call site without coupling clients to the server's TypeScript types.
 *
 * Phase 1 fills this in (docs/PLAN.md §9).
 */

export const API_CLIENT_PHASE = 1 as const;
