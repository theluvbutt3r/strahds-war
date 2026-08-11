import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { ACTIONS, can } from "@sw/authz";
import { clearanceFor, ROLES, VISIBILITY_TIERS } from "@sw/schemas";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { actorFromSession, type SessionLike } from "./actor";

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

/**
 * "Who am I", as the web app needs it.
 *
 * Returns capabilities alongside the role, and that is a deliberate convenience with a
 * warning attached: the list exists so the UI can decide whether to *render* an Edit
 * button without reimplementing the matrix in the browser. It is not a grant. The server
 * re-checks `can()` at every enforcement site, because a client that posts an action it
 * was not offered must still be refused.
 */
const meResponse = z
  .object({
    authenticated: z.boolean(),
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.email(),
        image: z.url().nullable(),
      })
      .nullable(),
    role: z.enum(ROLES),
    clearance: z.enum(VISIBILITY_TIERS),
    /** True while an Overlord is viewing the wiki as this user. */
    impersonating: z.boolean(),
    /** Capabilities over ordinary published campaign content, for UI affordances only. */
    capabilities: z.array(z.enum(ACTIONS)),
  })
  .openapi("Me");

const meRoute = createRoute({
  method: "get",
  path: "/me",
  summary: "The signed-in user's identity, role and clearance",
  responses: {
    200: {
      content: { "application/json": { schema: meResponse } },
      description: "The caller's identity. Anonymous callers get role `viewer`.",
    },
  },
});

/** Resolves the caller's session. Returns null when there is none. */
export type SessionResolver = (headers: Headers) => Promise<SessionLike | null>;

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

  /**
   * Handler for Better Auth's routes, mounted at /api/auth/*.
   *
   * Injected rather than constructed here so the app can be built — and tested — without
   * a database. Absent means the auth routes are simply not mounted, which is what the
   * route tests want.
   */
  readonly authHandler?: (request: Request) => Promise<Response>;

  /** Resolves a session from request headers. Absent means every caller is anonymous. */
  readonly getSession?: SessionResolver;

  /** Web origin allowed to send credentialed cross-origin requests. */
  readonly webOrigin?: string;
}

export function createApp(options: AppOptions = {}) {
  const exposeOpenApiDoc = options.exposeOpenApiDoc ?? process.env.NODE_ENV !== "production";

  const app = new OpenAPIHono();

  /**
   * CORS, scoped to the one origin that is allowed to carry credentials.
   *
   * `credentials: true` is required for the session cookie to travel from the web app to
   * this service at all, and it is precisely why `origin` must be a single named origin
   * rather than a wildcard — browsers refuse the combination, and a permissive value here
   * would let any site make authenticated requests on a signed-in player's behalf.
   */
  if (options.webOrigin) {
    app.use(
      "*",
      cors({
        origin: options.webOrigin,
        credentials: true,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      }),
    );
  }

  if (options.authHandler) {
    // Better Auth owns everything under this prefix: the OAuth start and callback URLs,
    // session endpoints, and the admin plugin's role, ban and impersonation routes.
    app.all("/api/auth/*", (c) => options.authHandler!(c.req.raw));
  }

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

  app.openapi(meRoute, async (c) => {
    const session = options.getSession ? await options.getSession(c.req.raw.headers) : null;
    const actor = actorFromSession(session);

    // A representative published, player-tier subject. This answers "what can you do with
    // ordinary campaign content", which is what the UI needs to decide about buttons —
    // not a claim about any specific entity, which the server checks when asked.
    const subject = { kind: "npc", visibility: "player", published: true } as const;

    return c.json(
      {
        authenticated: session !== null,
        user: session
          ? {
              id: session.user.id,
              name: (session.user as { name?: string }).name ?? "",
              email: (session.user as { email?: string }).email ?? "",
              image: (session.user as { image?: string | null }).image ?? null,
            }
          : null,
        role: actor.role,
        clearance: clearanceFor(actor.role),
        impersonating: actor.impersonating !== undefined,
        capabilities: ACTIONS.filter((action) => can(actor, action, subject)),
      },
      200,
    );
  });

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
