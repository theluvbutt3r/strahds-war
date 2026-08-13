import { Badge, Card, CardContent, Fog, OrnamentRule } from "@sw/ui";
import Link from "next/link";

import { getMe } from "../lib/api";

import { SignOutButton } from "./components/client/auth-buttons.client";

/**
 * Phase 1's visible half, now wearing Phase 2's clothes: prove a session reaches the server
 * and that the API agrees about who you are.
 *
 * A Server Component, so the identity call happens server-side and nothing about the
 * caller's role is decided in the browser. Phase 3 replaces this with the real wiki
 * (docs/PLAN.md §9); what it shows is deliberately still just the identity, because that is
 * the whole of what Phase 1 delivers.
 *
 * Note that the role is *displayed*, never *compared*. Branching on it here would be both a
 * lint error and the wrong shape — capability questions go to `can()` in @sw/authz
 * (ADR 0004).
 */
export default async function HomePage() {
  const me = await getMe();

  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-8 p-8 text-center">
      {/*
        The landing page and nowhere else — §6 is specific, and it is the right call:
        atmosphere that follows you onto every entity page stops being atmosphere and starts
        being something moving behind text you are trying to read.
      */}
      <Fog />

      <header className="grid justify-items-center gap-4">
        <h1 className="font-display text-4xl font-bold tracking-display desktop:text-5xl">
          STRAHD&rsquo;S WAR
        </h1>
        <OrnamentRule className="w-48" />
      </header>

      {me === null ? (
        <p className="text-text-accent max-w-[44ch] text-sm">
          The API could not be reached. Start it with{" "}
          <code className="bg-raised rounded-sm px-1.5 py-0.5 font-mono text-xs">pnpm dev</code>.
        </p>
      ) : me.authenticated ? (
        <>
          <p className="text-text-muted max-w-[44ch]">
            Welcome back, {me.user?.name ?? "traveller"}.
          </p>

          <Card className="w-full max-w-sm">
            <CardContent className="grid gap-3 pt-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-muted text-sm">Role</span>
                <Badge variant="default">{me.role}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-muted text-sm">Clearance</span>
                <Badge variant={me.clearance === "dm" ? "secret" : "default"}>{me.clearance}</Badge>
              </div>
            </CardContent>
          </Card>

          {me.impersonating ? (
            // A tier check, not a role check — `visibility === "player"` and friends are
            // legitimate and the lint rule deliberately permits them.
            <p
              role="status"
              className="border-ember-lit/60 text-text-accent rounded-sm border px-4 py-2 text-xs"
            >
              Viewing as another user. Reading only.
            </p>
          ) : null}

          <SignOutButton />
        </>
      ) : (
        <>
          <p className="text-text-muted max-w-[44ch]">The mists have not parted for you yet.</p>
          <Link href="/sign-in" className="text-link underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      )}
    </main>
  );
}
