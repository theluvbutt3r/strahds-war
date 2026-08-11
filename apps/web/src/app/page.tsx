import Link from "next/link";

import { getMe } from "../lib/api";

import { SignOutButton } from "./components/client/auth-buttons.client";

/**
 * Phase 1's visible half: prove that a session reaches the server and that the API agrees
 * about who you are.
 *
 * A Server Component, so the identity call happens server-side and nothing about the
 * caller's role is decided in the browser. Phase 3 replaces this with the real wiki
 * (docs/PLAN.md §9); what it shows for now is deliberately just the identity, because
 * that is the whole of what Phase 1 delivers.
 */

const rowStyle: React.CSSProperties = { margin: 0, color: "var(--bone)" };

export default async function HomePage() {
  const me = await getMe();

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 3.5rem)", letterSpacing: "0.08em" }}>
        STRAHD&rsquo;S WAR
      </h1>

      {me === null ? (
        <p style={{ color: "var(--ember)", margin: 0, maxWidth: "44ch", lineHeight: 1.6 }}>
          The API could not be reached. Start it with <code>pnpm dev</code>.
        </p>
      ) : me.authenticated ? (
        <>
          <p style={{ color: "var(--mist)", margin: 0, maxWidth: "44ch", lineHeight: 1.6 }}>
            Welcome back, {me.user?.name ?? "traveller"}.
          </p>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto",
              gap: "0.35rem 1.25rem",
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--mist)",
              justifyContent: "center",
            }}
          >
            <dt>Role</dt>
            <dd style={{ ...rowStyle, color: "var(--gold)" }}>{me.role}</dd>
            <dt>Clearance</dt>
            <dd style={rowStyle}>{me.clearance}</dd>
          </dl>

          {me.impersonating ? (
            <p
              role="status"
              style={{
                margin: 0,
                padding: "0.5rem 1rem",
                border: "1px solid var(--ember)",
                color: "var(--ember)",
                fontSize: "0.8125rem",
              }}
            >
              Viewing as another user. Reading only.
            </p>
          ) : null}

          <SignOutButton />
        </>
      ) : (
        <>
          <p style={{ color: "var(--mist)", margin: 0, maxWidth: "44ch", lineHeight: 1.6 }}>
            The mists have not parted for you yet.
          </p>
          <Link href="/sign-in" style={{ color: "var(--ember)" }}>
            Sign in
          </Link>
        </>
      )}
    </main>
  );
}
