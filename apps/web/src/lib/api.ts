import { type Me, createApiClient } from "@sw/api-client";
import { headers } from "next/headers";

/**
 * Server-side access to the API.
 *
 * The cookie is forwarded explicitly. A Server Component's `fetch` does not inherit the
 * incoming request's headers, so without this every server-rendered call reaches the API
 * anonymously — which fails safe (you get `viewer`) and therefore looks exactly like
 * "signing in did nothing". Worth stating plainly because the symptom points nowhere near
 * the cause.
 */

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getMe(): Promise<Me | null> {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  const client = createApiClient({ baseUrl: apiUrl });

  try {
    return await client.getMe(cookie ? { headers: { cookie } } : undefined);
  } catch {
    // The wiki should still render if the API is down — as a signed-out shell, since
    // that is the only thing we can honestly claim when identity cannot be confirmed.
    return null;
  }
}
