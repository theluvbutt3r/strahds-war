import { roleSchema, visibilitySchema } from "@sw/schemas";
import { z } from "zod";

/**
 * @sw/api-client — the typed client apps use to reach the API.
 *
 * This is how apps read data: never Postgres directly, always the API, so visibility
 * filtering happens server-side before anything crosses the wire.
 *
 * PHASE 1 SCOPE. The plan's end state is a client *generated* from the OpenAPI document,
 * so it cannot drift from what the server accepts. That generation is deferred until
 * Phase 3, when there are content endpoints worth generating: a codegen pipeline
 * maintained against a single hand-checkable endpoint costs more than it protects. What
 * is here instead is small, hand-written, and — importantly — validates responses at the
 * boundary rather than casting them, so a server that changes shape fails loudly here
 * rather than as `undefined` somewhere in a component.
 */

/**
 * The response from `GET /me`.
 *
 * `capabilities` is `string[]` rather than an enum because the authoritative list lives
 * in @sw/authz, which this package sits below and may not import. Consumers should treat
 * an unrecognised capability as absent — the list is only ever used to decide whether to
 * render an affordance, and the server re-checks every action regardless.
 */
export const meSchema = z.object({
  authenticated: z.boolean(),
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  role: roleSchema,
  clearance: visibilitySchema,
  impersonating: z.boolean(),
  capabilities: z.array(z.string()),
});

export type Me = z.infer<typeof meSchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  /** Injectable for tests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
}

export function createApiClient({ baseUrl, fetch: fetchImpl = fetch }: ApiClientOptions) {
  const request = async <T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> => {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      /**
       * Sessions are cookie-based and the API is a different origin from the web app, so
       * the cookie only travels when credentials are included. Without this the API sees
       * every request as anonymous — which fails safe, but presents as "signing in did
       * nothing", the single most confusing symptom this whole layer can produce.
       */
      credentials: "include",
      headers: { Accept: "application/json", ...init?.headers },
    });

    if (!response.ok) {
      throw new ApiError(`GET ${path} failed`, response.status);
    }

    const body: unknown = await response.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      // Validated rather than cast. A silently-changed response shape would otherwise
      // surface as an undefined field deep in a component, long after the cause.
      throw new ApiError(`GET ${path} returned an unexpected shape: ${parsed.error.message}`, 502);
    }

    return parsed.data;
  };

  return {
    /** Who the caller is, according to the server. */
    getMe: (init?: RequestInit) => request("/me", meSchema, init),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
