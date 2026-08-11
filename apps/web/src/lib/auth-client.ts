import { createAuthClient } from "better-auth/react";

/**
 * The browser-side auth client.
 *
 * It talks to Better Auth running inside `services/api`, not inside Next. That placement
 * follows from ADR 0005: the auth tables live in Postgres, and only the API may reach
 * Postgres, so the API is the only process that can own sessions. The web app holds no
 * database credentials and could not run Better Auth even if we wanted it to.
 *
 * `NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time, which is why it
 * is declared in turbo.json's `build.env` — an undeclared value would let a cached build
 * ship a bundle pointing at the previous API.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

export const { signIn, signOut, useSession } = authClient;
