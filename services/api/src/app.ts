import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { VISIBILITY_TIERS } from "@sw/schemas";
import { HTTPException } from "hono/http-exception";

/**
 * The API is built as an OpenAPIHono app rather than a plain Hono one so that the spec
 * is derived from the same Zod schemas that validate requests — the documentation cannot
 * drift from the implementation, and @sw/api-client is generated from the result.
 *
 * Kept separate from server.ts so tests can exercise routes via `app.request()` without
 * binding a port.
 *
 * See docs/adr/0003-standalone-http-api.md.
 */

const healthResponse = z
  .object({
    status: z.literal("ok"),
    service: z.literal("sw-api"),
    visibilityTiers: z.array(z.enum(VISIBILITY_TIERS)),
  })
  .openapi("Health");

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  summary: "Liveness probe",
  responses: {
    200: {
      content: { "application/json": { schema: healthResponse } },
      description: "The service is up",
    },
  },
});

export interface AppOptions {
  /**
   * Whether to serve the generated OpenAPI document at /openapi.json.
   *
   * Off in production, and that is a spoiler decision rather than a hardening reflex.
   * The document enumerates every endpoint, entity type and field name — including
   * DM-tier field names, because the schema describes fields the visibility filter
   * strips rather than fields that do not exist. On a wiki whose premise is that the
   * shape of the content is itself a spoiler, publishing that anonymously hands over the
   * map. Development serves it; that is where @sw/api-client is generated from.
   */
  readonly exposeOpenApiDoc?: boolean;
}

export function createApp(options: AppOptions = {}) {
  const exposeOpenApiDoc = options.exposeOpenApiDoc ?? process.env.NODE_ENV !== "production";

  const app = new OpenAPIHono();

  app.openapi(healthRoute, (c) =>
    c.json(
      {
        status: "ok" as const,
        service: "sw-api" as const,
        visibilityTiers: [...VISIBILITY_TIERS],
      },
      200,
    ),
  );

  if (exposeOpenApiDoc) {
    // `doc31`, NOT `doc`. Both exist; only this one emits OpenAPI 3.1 schemas.
    //
    // `doc()` emits 3.0 — the `openapi: "3.1.0"` string below is only a label and does
    // not switch generators. Pairing them produces a document that declares 3.1 while
    // containing 3.0 syntax: `nullable: true` rather than `type: ["string", "null"]`.
    // `nullable` is not a keyword in 3.1, so a client generator ignores it and types the
    // field as non-nullable — the generated client then disagrees with the server about
    // exactly those fields most likely to be absent. That is the drift this whole
    // approach exists to prevent, arriving through the mechanism meant to prevent it.
    //
    // Nothing in the health schema is nullable, so it stayed invisible until an entity
    // schema needed it. app.test.ts asserts on generated shape for that reason.
    app.doc31("/openapi.json", {
      openapi: "3.1.0",
      info: {
        title: "Strahd's War API",
        version: "0.0.0",
        description:
          "Every response is filtered to the requester's clearance before serialisation. There is no endpoint that returns unfiltered content.",
      },
    });
  }

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    // Never let an exception body reach the client. On a spoiler-sensitive service an
    // error echoing a failed query is a disclosure, and a stack trace names internals.
    // HTTPException is the deliberate case — its message was written to be seen.
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }

    console.error("unhandled error", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
